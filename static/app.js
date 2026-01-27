/**
 * Puro Omega - App Principal
 * Chat con voz y transiciones
 */

// Configuración del mood
const MOOD_CONFIG = {
    labels: [
        { min: 0,  max: 30,  label: 'MAL',         category: 'sad' },
        { min: 31, max: 65,  label: 'NO MUY BIEN',  category: 'neutral' },
        { min: 66, max: 100, label: 'BIEN',          category: 'happy' }
    ],
    reactions: {
        sad:     'Lamento que no te encuentres bien. Estoy aquí para ayudarte en lo que necesites.',
        neutral: 'Gracias por compartirlo. Vamos a hacer que tu día mejore.',
        happy:   'Me alegra saber que estás bien. Sigamos con energía.'
    },
    orbPresets: {
        sad: 'a',
        neutral: 'b',
        happy: 'c'
    },
    // Colores dinámicos del overlay — bg (fondo) y fg (textos/iconos)
    // Tres stops: 0 = sad, 50 = neutral, 100 = happy
    colors: {
        stops: [
            { at: 0,   bg: [235, 168, 157], fg: [120, 40, 30]  },   // Salmón / coral
            { at: 50,  bg: [245, 215, 140], fg: [100, 75, 20]  },   // Dorado / ámbar
            { at: 100, bg: [220, 200, 240], fg: [60, 10, 55]   }    // Lavanda cálido
        ]
    }
};

// Estado global
const state = {
    isRecording: false,
    mediaRecorder: null,
    audioChunks: [],
    websocket: null,
    currentMessage: '',
    orbMode: 'minimize', // Opción fija: orb minimizado flotante en chat
    // Detección de silencio
    audioContext: null,
    analyser: null,
    silenceTimer: null,
    audioStream: null,
    // Mood
    mood: {
        value: 100,
        label: 'BIEN',
        category: 'happy',
        submitted: false,
        timestamp: null
    }
};

// Elementos
const elements = {
    // Welcome screen
    welcomeScreen: document.getElementById('welcome-screen'),
    profileBtn: document.getElementById('profile-btn'),
    messageInput: document.getElementById('message-input'),
    micBtn: document.getElementById('mic-btn'),
    voiceStatus: document.getElementById('voice-status'),

    // Bento cards
    orbCard: document.getElementById('orb-card'),
    moodCard: document.getElementById('mood-card'),
    planCard: document.getElementById('plan-card'),
    faqSection: document.getElementById('faq-section'),

    // Chat screen
    chatScreen: document.getElementById('chat-screen'),
    backBtn: document.getElementById('back-btn'),
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    chatMicBtn: document.getElementById('chat-mic-btn'),
    chatSendBtn: document.getElementById('chat-send-btn'),
    chatStatus: document.getElementById('chat-status'),

    // Orb flotante
    orbFloating: document.getElementById('orb-floating'),

    // Mood overlay
    moodOverlay: document.getElementById('mood-overlay'),
    moodCloseBtn: document.getElementById('mood-close-btn'),
    moodInfoBtn: document.getElementById('mood-info-btn'),
    moodSlider: document.getElementById('mood-slider'),
    moodLabel: document.getElementById('mood-label'),
    moodSubmitBtn: document.getElementById('mood-submit-btn'),
    moodReaction: document.getElementById('mood-reaction'),
    moodEyeLeft: document.getElementById('mood-eye-left'),
    moodEyeRight: document.getElementById('mood-eye-right'),
    moodMouth: document.getElementById('mood-mouth')
};

// ============================================
// Sistema de Mood
// ============================================
function lerpChannel(a, b, t) {
    return Math.round(a + (b - a) * t);
}

function getMoodColors(value) {
    const stops = MOOD_CONFIG.colors.stops;
    // Encontrar entre qué dos stops estamos
    let lower = stops[0], upper = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
        if (value >= stops[i].at && value <= stops[i + 1].at) {
            lower = stops[i];
            upper = stops[i + 1];
            break;
        }
    }
    const range = upper.at - lower.at || 1;
    const t = (value - lower.at) / range;
    const bg = [
        lerpChannel(lower.bg[0], upper.bg[0], t),
        lerpChannel(lower.bg[1], upper.bg[1], t),
        lerpChannel(lower.bg[2], upper.bg[2], t)
    ];
    const fg = [
        lerpChannel(lower.fg[0], upper.fg[0], t),
        lerpChannel(lower.fg[1], upper.fg[1], t),
        lerpChannel(lower.fg[2], upper.fg[2], t)
    ];
    return {
        bg: `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`,
        fg: `rgb(${fg[0]}, ${fg[1]}, ${fg[2]})`
    };
}

function applyMoodColors(value) {
    if (!elements.moodOverlay) return;
    const colors = getMoodColors(value);
    elements.moodOverlay.style.setProperty('--mood-bg', colors.bg);
    elements.moodOverlay.style.setProperty('--mood-fg', colors.fg);
}

// Tintado sutil global — aplica una capa muy tenue del mood a toda la app
function applyGlobalMoodTint(value) {
    const stops = MOOD_CONFIG.colors.stops;
    let lower = stops[0], upper = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
        if (value >= stops[i].at && value <= stops[i + 1].at) {
            lower = stops[i];
            upper = stops[i + 1];
            break;
        }
    }
    const range = upper.at - lower.at || 1;
    const t = (value - lower.at) / range;
    const r = lerpChannel(lower.bg[0], upper.bg[0], t);
    const g = lerpChannel(lower.bg[1], upper.bg[1], t);
    const b = lerpChannel(lower.bg[2], upper.bg[2], t);

    document.body.style.setProperty('--mood-tint', `${r}, ${g}, ${b}`);
    document.body.style.setProperty('--mood-tint-strength', '0.07'); // 7% — apenas perceptible
    document.body.setAttribute('data-mood-active', '');

    // Propagar al orb si la API existe
    if (window.orbSetMoodTint) {
        window.orbSetMoodTint(r, g, b);
    }
}

function getMoodCategory(value) {
    for (const cfg of MOOD_CONFIG.labels) {
        if (value >= cfg.min && value <= cfg.max) {
            return { label: cfg.label, category: cfg.category };
        }
    }
    return { label: 'BIEN', category: 'happy' };
}

function updateMoodFace(value) {
    const t = value / 100; // 0 = sad, 1 = happy

    // Ojos redondos: rx=12 siempre, ry varía poco (14 sad → 11 happy squint suave)
    const eyeRx = 12;
    const eyeRy = 14 - 3 * t;    // 14 → 11 (sutil, siempre redondos)
    const eyeCy = 40 + 2 * t;    // 40 → 42 (movimiento mínimo)

    if (elements.moodEyeLeft) {
        elements.moodEyeLeft.setAttribute('rx', eyeRx);
        elements.moodEyeLeft.setAttribute('ry', eyeRy);
        elements.moodEyeLeft.setAttribute('cy', eyeCy);
    }
    if (elements.moodEyeRight) {
        elements.moodEyeRight.setAttribute('rx', eyeRx);
        elements.moodEyeRight.setAttribute('ry', eyeRy);
        elements.moodEyeRight.setAttribute('cy', eyeCy);
    }

    // Boca: controlY de 58 (frown suave) a 78 (smile)
    const controlY = 58 + 20 * t;
    if (elements.moodMouth) {
        elements.moodMouth.setAttribute('d', `M42 68 Q50 ${controlY} 58 68`);
    }
}

function updateCardFace(value) {
    const t = value / 100;
    const eyeRx = 12;
    const eyeRy = 14 - 3 * t;
    const eyeCy = 40 + 2 * t;
    const controlY = 58 + 20 * t;

    // Actualizar la cara en la tarjeta del bento grid
    const card = elements.moodCard;
    if (!card) return;

    const eyeL = card.querySelector('ellipse:first-of-type');
    const eyeR = card.querySelector('ellipse:last-of-type');
    const mouth = card.querySelector('path');

    if (eyeL) { eyeL.setAttribute('rx', eyeRx); eyeL.setAttribute('ry', eyeRy); eyeL.setAttribute('cy', eyeCy); }
    if (eyeR) { eyeR.setAttribute('rx', eyeRx); eyeR.setAttribute('ry', eyeRy); eyeR.setAttribute('cy', eyeCy); }
    if (mouth) { mouth.setAttribute('d', `M42 68 Q50 ${controlY} 58 68`); }
}

function updateMoodLabel(value) {
    const { label } = getMoodCategory(value);
    if (elements.moodLabel) {
        elements.moodLabel.textContent = label;
    }
}

function openMoodOverlay() {
    if (!elements.moodOverlay) return;

    // Resetear estado visual
    elements.moodReaction.textContent = '';
    elements.moodReaction.classList.remove('visible');
    elements.moodSubmitBtn.disabled = false;
    elements.moodSubmitBtn.textContent = state.mood.submitted ? 'Actualizar' : 'Enviar';

    // Poner slider en el valor actual
    elements.moodSlider.value = state.mood.value;
    updateMoodFace(state.mood.value);
    updateMoodLabel(state.mood.value);
    applyMoodColors(state.mood.value);

    // Mostrar overlay con animación
    elements.moodOverlay.classList.remove('hidden');
    elements.moodOverlay.style.animation = 'moodOverlayEnter 0.4s var(--md-sys-motion-easing-emphasized-decelerate) forwards';
}

function closeMoodOverlay() {
    if (!elements.moodOverlay) return;

    elements.moodOverlay.style.animation = 'moodOverlayExit 0.3s var(--md-sys-motion-easing-emphasized-accelerate) forwards';
    elements.moodOverlay.addEventListener('animationend', function handler() {
        elements.moodOverlay.classList.add('hidden');
        elements.moodOverlay.style.animation = '';
        elements.moodOverlay.removeEventListener('animationend', handler);
    });
}

function onMoodSliderInput(e) {
    const value = parseInt(e.target.value, 10);
    updateMoodFace(value);
    updateMoodLabel(value);
    applyMoodColors(value);
}

function submitMood() {
    const value = parseInt(elements.moodSlider.value, 10);
    const { label, category } = getMoodCategory(value);
    const wasAlreadySubmitted = state.mood.submitted;

    // Actualizar estado
    state.mood.value = value;
    state.mood.label = label;
    state.mood.category = category;
    state.mood.submitted = true;
    state.mood.timestamp = Date.now();

    // Propagar a la tarjeta
    updateCardFace(value);
    const cardTitle = elements.moodCard?.querySelector('.bento-card__title');
    if (cardTitle) {
        cardTitle.textContent = `Hoy: ${label}`;
    }

    // Propagar al orb
    const orbPreset = MOOD_CONFIG.orbPresets[category];
    if (window.orbSetMoodPreset) window.orbSetMoodPreset(orbPreset);

    // Aplicar tintado global sutil
    applyGlobalMoodTint(value);

    // Guardar en localStorage
    saveMoodToStorage();

    // Mostrar reacción AI
    const reaction = wasAlreadySubmitted
        ? 'Actualizado. ' + MOOD_CONFIG.reactions[category]
        : MOOD_CONFIG.reactions[category];
    elements.moodReaction.textContent = reaction;
    elements.moodReaction.classList.add('visible');
    elements.moodSubmitBtn.disabled = true;

    // Cerrar overlay tras 2 segundos
    setTimeout(() => {
        closeMoodOverlay();
    }, 2000);
}

// Fecha local YYYY-MM-DD (sin depender de UTC)
function getLocalDateStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function saveMoodToStorage() {
    const data = {
        value: state.mood.value,
        label: state.mood.label,
        category: state.mood.category,
        date: getLocalDateStr(),
        timestamp: state.mood.timestamp
    };
    localStorage.setItem('puro_omega_mood', JSON.stringify(data));
}

function loadMoodFromStorage() {
    try {
        const raw = localStorage.getItem('puro_omega_mood');
        if (!raw) return;

        const data = JSON.parse(raw);
        const today = getLocalDateStr();

        // Reset diario: si es otro día, borrar y empezar de cero
        if (data.date !== today) {
            const utcToday = new Date().toISOString().slice(0, 10);
            if (data.date !== utcToday) {
                localStorage.removeItem('puro_omega_mood');
                return;
            }
        }

        // Solo restaurar estado interno (para enviar mood en WebSocket)
        // La UI siempre arranca limpia con la pregunta "¿Cómo te encuentras hoy?"
        state.mood.value = data.value;
        state.mood.label = data.label;
        state.mood.category = data.category;
        state.mood.submitted = true;
        state.mood.timestamp = data.timestamp;

    } catch (e) {
        console.error('Error cargando mood:', e);
    }
}

// ============================================
// Navegación entre pantallas
// ============================================
function showChatScreen(initialMessage) {
    // Fade out welcome
    elements.welcomeScreen.classList.add('fade-out');

    setTimeout(() => {
        elements.welcomeScreen.classList.add('hidden');
        elements.welcomeScreen.classList.remove('fade-out');
        elements.chatScreen.classList.remove('hidden');

        // Mostrar orb según modo
        if (state.orbMode === 'minimize') {
            elements.orbFloating.classList.remove('hidden');
            // Crear mini orb si no existe
            if (window.orbCreateMini) window.orbCreateMini();
        }

        // Añadir mensaje del usuario
        if (initialMessage) {
            addMessage(initialMessage, 'user');
            sendToWebSocket(initialMessage);
        }

        // Focus en input
        elements.chatInput.focus();
    }, 300);
}

function showWelcomeScreen() {
    elements.chatScreen.classList.add('hidden');
    elements.welcomeScreen.classList.remove('hidden');
    elements.orbFloating.classList.add('hidden');

    // Limpiar chat
    elements.chatMessages.innerHTML = '';

    // Cerrar WebSocket si existe
    if (state.websocket) {
        state.websocket.close();
        state.websocket = null;
    }
}

// ============================================
// Mensajes del chat
// ============================================
function addMessage(text, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.textContent = text;
    elements.chatMessages.appendChild(messageDiv);

    // Scroll al final
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

    return messageDiv;
}

function addTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'message assistant typing';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    elements.chatMessages.appendChild(indicator);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    return indicator;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}

// ============================================
// WebSocket
// ============================================
function sendToWebSocket(message) {
    // Mostrar indicador de escritura
    addTypingIndicator();
    elements.chatStatus.textContent = 'Escribiendo...';

    // Crear WebSocket
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    state.websocket = new WebSocket(`${wsProtocol}//${window.location.host}/ws/chat`);

    state.currentMessage = '';
    let assistantMessage = null;

    state.websocket.onopen = () => {
        const payload = { message };
        if (state.mood.submitted) {
            payload.mood = {
                value: state.mood.value,
                label: state.mood.label,
                category: state.mood.category
            };
        }
        state.websocket.send(JSON.stringify(payload));
    };

    state.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'token') {
            // Quitar indicador de escritura en el primer token
            if (!assistantMessage) {
                removeTypingIndicator();
                assistantMessage = addMessage('', 'assistant');
            }

            state.currentMessage += data.content;
            assistantMessage.textContent = state.currentMessage;
            elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
        }
        else if (data.type === 'end') {
            elements.chatStatus.textContent = 'En línea';
        }
        else if (data.type === 'agent_info') {
            // Info del agente usado (opcional: mostrar en UI)
            console.log('Agente:', data.agent, '- Documentos:', data.context_docs);
        }
        else if (data.type === 'error') {
            removeTypingIndicator();
            addMessage('Error: ' + data.message, 'assistant');
            elements.chatStatus.textContent = 'En línea';
        }
    };

    state.websocket.onerror = () => {
        removeTypingIndicator();
        addMessage('Error de conexión', 'assistant');
        elements.chatStatus.textContent = 'Desconectado';
    };

    state.websocket.onclose = () => {
        elements.chatStatus.textContent = 'En línea';
    };
}

// ============================================
// Grabación de voz
// ============================================
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        state.audioStream = stream;

        state.mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });

        state.audioChunks = [];

        state.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                state.audioChunks.push(event.data);
            }
        };

        state.mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
            stopSilenceDetection();
            await transcribeAudio(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };

        state.mediaRecorder.start();
        state.isRecording = true;

        // Actualizar UI
        updateRecordingUI(true);

        // Iniciar detección de silencio
        startSilenceDetection(stream);

    } catch (error) {
        console.error('Error micrófono:', error);
        if (elements.voiceStatus) {
            elements.voiceStatus.textContent = 'Error: No se pudo acceder al micrófono';
        }
    }
}

function stopRecording() {
    if (state.mediaRecorder && state.isRecording) {
        state.mediaRecorder.stop();
        state.isRecording = false;
        stopSilenceDetection();
        updateRecordingUI(false, true); // processing = true
    }
}

// ============================================
// Detección automática de silencio
// ============================================
function startSilenceDetection(stream) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.3;
    source.connect(analyser);

    state.audioContext = audioContext;
    state.analyser = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const SILENCE_THRESHOLD = 15;   // Nivel de ruido considerado silencio
    const SILENCE_DURATION = 1800;  // ms de silencio para auto-parar
    const MIN_RECORDING = 800;      // ms mínimo de grabación antes de detectar silencio

    let silenceStart = null;
    const recordStart = Date.now();

    function checkSilence() {
        if (!state.isRecording) return;

        analyser.getByteFrequencyData(dataArray);

        // Calcular volumen promedio
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const avg = sum / dataArray.length;

        const elapsed = Date.now() - recordStart;

        if (avg < SILENCE_THRESHOLD && elapsed > MIN_RECORDING) {
            // Hay silencio
            if (!silenceStart) {
                silenceStart = Date.now();
            } else if (Date.now() - silenceStart > SILENCE_DURATION) {
                // Silencio prolongado: parar grabación automáticamente
                stopRecording();
                return;
            }
        } else {
            // Hay sonido: resetear timer de silencio
            silenceStart = null;
        }

        state.silenceTimer = requestAnimationFrame(checkSilence);
    }

    checkSilence();
}

function stopSilenceDetection() {
    if (state.silenceTimer) {
        cancelAnimationFrame(state.silenceTimer);
        state.silenceTimer = null;
    }
    if (state.audioContext) {
        state.audioContext.close().catch(() => {});
        state.audioContext = null;
    }
    state.analyser = null;
}

function updateRecordingUI(recording, processing = false) {
    // Welcome screen
    elements.micBtn?.classList.toggle('recording', recording);
    elements.orbCard?.classList.toggle('listening', recording);

    // Chat screen
    elements.chatMicBtn?.classList.toggle('recording', recording);
    elements.orbFloating?.classList.toggle('listening', recording);

    // Orb 3D
    if (window.orbSetListening) window.orbSetListening(recording);

    // Textos
    if (elements.voiceStatus) {
        elements.voiceStatus.textContent = recording ? 'Grabando...' : (processing ? 'Procesando...' : '');
        elements.voiceStatus.classList.toggle('active', recording);
    }
}

async function transcribeAudio(audioBlob) {
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        const response = await fetch('/api/voice', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success && data.text) {
            // Si estamos en welcome screen, ir al chat
            if (!elements.welcomeScreen.classList.contains('hidden')) {
                showChatScreen(data.text);
            } else {
                // Ya estamos en chat, enviar mensaje
                addMessage(data.text, 'user');
                sendToWebSocket(data.text);
            }
        } else {
            console.error('Error transcripción:', data.error);
        }

        updateRecordingUI(false);

    } catch (error) {
        console.error('Error transcripción:', error);
        updateRecordingUI(false);
    }
}

function toggleRecording() {
    if (state.isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

// ============================================
// Enviar mensaje por texto
// ============================================
function sendMessage() {
    const input = elements.welcomeScreen.classList.contains('hidden')
        ? elements.chatInput
        : elements.messageInput;

    const message = input.value.trim();
    if (!message) return;

    input.value = '';

    // Si estamos en welcome, ir al chat
    if (!elements.welcomeScreen.classList.contains('hidden')) {
        showChatScreen(message);
    } else {
        addMessage(message, 'user');
        sendToWebSocket(message);
    }
}

// ============================================
// Event Listeners
// ============================================
function init() {
    // Welcome screen
    elements.profileBtn?.addEventListener('click', () => {
        alert('Pantalla de cuenta - próximamente');
    });

    // Bento cards
    elements.orbCard?.addEventListener('click', toggleRecording);

    elements.moodCard?.addEventListener('click', openMoodOverlay);

    elements.planCard?.addEventListener('click', () => {
        alert('Plan diario y semanal - próximamente');
    });

    // FAQ chips (event delegation)
    elements.faqSection?.addEventListener('click', (e) => {
        const chip = e.target.closest('.faq-chip');
        if (chip && chip.dataset.question) {
            showChatScreen(chip.dataset.question);
        }
    });

    // Micrófono en barra de búsqueda (welcome)
    elements.micBtn?.addEventListener('click', toggleRecording);

    // Input en welcome
    elements.messageInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });

    // Chat screen
    elements.backBtn?.addEventListener('click', showWelcomeScreen);

    elements.chatMicBtn?.addEventListener('click', toggleRecording);

    elements.chatSendBtn?.addEventListener('click', sendMessage);

    elements.chatInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });

    // Orb flotante (chat)
    elements.orbFloating?.addEventListener('click', toggleRecording);

    // Mood overlay
    elements.moodCloseBtn?.addEventListener('click', closeMoodOverlay);
    elements.moodSlider?.addEventListener('input', onMoodSliderInput);
    elements.moodSubmitBtn?.addEventListener('click', submitMood);
    elements.moodInfoBtn?.addEventListener('click', () => {
        alert('Selecciona cómo te encuentras hoy moviendo el control deslizante. Tu estado de ánimo personaliza la experiencia de la app.');
    });

    // Cargar mood del día desde localStorage
    loadMoodFromStorage();

    console.log('Puro Omega inicializado');
}

// Iniciar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
