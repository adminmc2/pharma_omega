/**
 * Puro Omega - App Principal
 * Chat con voz y transiciones
 */

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
    audioStream: null
};

// Elementos
const elements = {
    // Welcome screen
    welcomeScreen: document.getElementById('welcome-screen'),
    profileBtn: document.getElementById('profile-btn'),
    messageInput: document.getElementById('message-input'),
    micBtn: document.getElementById('mic-btn'),
    orbBtn: document.getElementById('orb-btn'),
    orbHint: document.getElementById('orb-hint'),
    voiceStatus: document.getElementById('voice-status'),

    // Chat screen
    chatScreen: document.getElementById('chat-screen'),
    backBtn: document.getElementById('back-btn'),
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    chatMicBtn: document.getElementById('chat-mic-btn'),
    chatSendBtn: document.getElementById('chat-send-btn'),
    chatStatus: document.getElementById('chat-status'),

    // Orb flotante
    orbFloating: document.getElementById('orb-floating')
};

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
        state.websocket.send(JSON.stringify({ message }));
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
    elements.orbBtn?.classList.toggle('listening', recording);

    // Chat screen
    elements.chatMicBtn?.classList.toggle('recording', recording);
    elements.orbFloating?.classList.toggle('listening', recording);

    // Orb 3D
    if (window.orbSetListening) window.orbSetListening(recording);

    // Textos
    if (elements.orbHint) {
        elements.orbHint.textContent = recording ? 'Escuchando...' : (processing ? 'Procesando...' : 'Toca para hablar');
    }
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

    // Orb principal (welcome)
    elements.orbBtn?.addEventListener('click', toggleRecording);

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

    console.log('Puro Omega inicializado');
}

// Iniciar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
