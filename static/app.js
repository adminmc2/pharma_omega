/**
 * Omega - App Principal
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
    chatPhotoBtn: document.getElementById('chat-photo-btn'),
    chatMicBtn: document.getElementById('chat-mic-btn'),
    chatSendBtn: document.getElementById('chat-send-btn'),
    chatStatus: document.getElementById('chat-status'),

    // Plan screen
    planScreen: document.getElementById('plan-screen'),
    planBackBtn: document.getElementById('plan-back-btn'),
    planOverviewChips: document.querySelectorAll('.plan-filter-chip'),
    navChatBtn: document.getElementById('nav-chat-btn'),
    navOrb: document.getElementById('nav-orb'),

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
// Búsquedas Recientes
// ============================================
const RECENT_SEARCHES_KEY = 'puro_omega_recent_searches';
const MAX_RECENT_SEARCHES = 10;

// Iconos según tipo de búsqueda
const SEARCH_ICONS = {
    product:   'package',
    objection: 'shield',
    argument:  'trend-up',
    voice:     'microphone',
    default:   'clock'
};

function classifySearchIcon(query) {
    const q = query.toLowerCase();
    if (/producto|omega|dha|epa|dosis|ficha|cápsul/i.test(q)) return 'product';
    if (/objeción|objecion|caro|no funciona|metales|otra marca/i.test(q)) return 'objection';
    if (/argumento|venta|presentar|cardiólogo|ginecólogo|perfil|ventaja/i.test(q)) return 'argument';
    return 'default';
}

function getSearchDescription(query) {
    const type = classifySearchIcon(query);
    switch (type) {
        case 'product':   return 'Consulta sobre productos Omega-3';
        case 'objection': return 'Manejo de objeciones médicas';
        case 'argument':  return 'Estrategia de argumentación comercial';
        default:          return 'Conversación con el asistente';
    }
}

function loadRecentSearches() {
    try {
        const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveRecentSearch(query, isVoice = false) {
    const searches = loadRecentSearches();

    // No duplicar la misma consulta (case-insensitive)
    const idx = searches.findIndex(s => s.query.toLowerCase() === query.toLowerCase());
    if (idx !== -1) {
        searches.splice(idx, 1);
    }

    const icon = isVoice ? 'voice' : classifySearchIcon(query);
    const desc = getSearchDescription(query);

    searches.unshift({
        query,
        icon,
        desc,
        timestamp: Date.now()
    });

    // Limitar a MAX
    if (searches.length > MAX_RECENT_SEARCHES) {
        searches.length = MAX_RECENT_SEARCHES;
    }

    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
    renderRecentSearches();
}

/**
 * Actualiza la búsqueda reciente más reciente que coincida con la query,
 * añadiendo la respuesta completa del agente para persistencia.
 */
function updateRecentSearchAnswer(query, answer) {
    const searches = loadRecentSearches();
    const idx = searches.findIndex(s => s.query.toLowerCase() === query.toLowerCase());
    if (idx !== -1) {
        searches[idx].answer = answer;
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
    }
}

function renderRecentSearches() {
    const container = document.getElementById('recent-searches-list');
    const section = document.getElementById('recent-searches');
    const emptyMsg = document.getElementById('recent-searches-empty');
    if (!container || !section) return;

    const searches = loadRecentSearches();

    if (searches.length === 0) {
        section.classList.add('recent-searches--empty');
        if (emptyMsg) emptyMsg.style.display = '';
        container.innerHTML = '';
        return;
    }

    section.classList.remove('recent-searches--empty');
    if (emptyMsg) emptyMsg.style.display = 'none';
    container.innerHTML = '';

    // Mostrar hasta 5 en la pantalla principal
    const visible = searches.slice(0, 5);

    for (const item of visible) {
        const iconName = SEARCH_ICONS[item.icon] || SEARCH_ICONS.default;

        const el = document.createElement('button');
        el.className = 'recent-search-item';
        el.innerHTML = `
            <div class="recent-search-item__icon">
                <i class="ph ph-${iconName}"></i>
            </div>
            <div class="recent-search-item__text">
                <span class="recent-search-item__query">${escapeHtml(item.query)}</span>
                <span class="recent-search-item__desc">${escapeHtml(item.desc)}</span>
            </div>
            <div class="recent-search-item__arrow">
                <i class="ph ph-arrow-right"></i>
            </div>
        `;
        el.addEventListener('click', () => {
            if (item.answer) {
                showChatScreenWithAnswer(item.query, item.answer);
            } else {
                showChatScreen(item.query, isActionableQuery(item.query));
            }
        });
        container.appendChild(el);
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================
// Sistema de Plan — Datos y renderizado
// ============================================

// Tareas mock con fechas reales relativas a hoy (27 enero 2026)
const PLAN_TASKS = [
    // --- En proceso (fecha de hoy) ---
    { id: 1, title: 'Visita Dr. García — Cardiología', date: '2026-01-27', project: 'visitas', status: 'in_progress', tasks: 2, subtasks: 1 },
    { id: 2, title: 'Estudiar ficha Natural DHA', date: '2026-01-27', project: 'formacion', status: 'in_progress', tasks: 1, subtasks: 0 },
    { id: 3, title: 'Preparar argumentario Ginecología', date: '2026-01-27', project: 'visitas', status: 'in_progress', tasks: 3, subtasks: 2 },
    // --- Por hacer (futuro cercano) ---
    { id: 4, title: 'Visita Dra. López — Pediatría', date: '2026-01-28', project: 'visitas', status: 'todo', tasks: 2, subtasks: 0 },
    { id: 5, title: 'Informe semanal de ventas', date: '2026-01-29', project: 'admin', status: 'todo', tasks: 1, subtasks: 0 },
    { id: 6, title: 'Llamada farmacia central', date: '2026-01-30', project: 'visitas', status: 'todo', tasks: 1, subtasks: 1 },
    { id: 7, title: 'Revisar catálogo Puro EPA', date: '2026-01-31', project: 'formacion', status: 'todo', tasks: 2, subtasks: 0 },
    { id: 8, title: 'Reunión equipo zona norte', date: '2026-02-02', project: 'admin', status: 'todo', tasks: 1, subtasks: 0 },
    { id: 9, title: 'Visita Dr. Fernández — Neurología', date: '2026-02-03', project: 'visitas', status: 'todo', tasks: 2, subtasks: 1 },
    { id: 10, title: 'Actualizar CRM contactos', date: '2026-02-05', project: 'admin', status: 'todo', tasks: 1, subtasks: 0 },
    { id: 11, title: 'Preparar presentación PRM', date: '2026-02-07', project: 'formacion', status: 'todo', tasks: 3, subtasks: 2 },
    // --- Retrasadas (antes de hoy) ---
    { id: 12, title: 'Seguimiento Dr. Martínez', date: '2026-01-26', project: 'visitas', status: 'overdue', tasks: 1, subtasks: 1 },
    { id: 13, title: 'Completar módulo Omega-3 Index', date: '2026-01-25', project: 'formacion', status: 'overdue', tasks: 2, subtasks: 0 },
    { id: 14, title: 'Enviar muestras Hospital Clínic', date: '2026-01-24', project: 'visitas', status: 'overdue', tasks: 1, subtasks: 0 },
    // --- Completadas ---
    { id: 15, title: 'Visita Dr. Ruiz — Cardiología', date: '2026-01-23', project: 'visitas', status: 'done', tasks: 2, subtasks: 1 },
    { id: 16, title: 'Curso online rTG vs Etil Éster', date: '2026-01-22', project: 'formacion', status: 'done', tasks: 1, subtasks: 0 },
];

// Proyectos con sus colores
const PLAN_PROJECTS = {
    visitas:   { label: 'Visitas médicas', color: 'var(--md-sys-color-primary)' },
    formacion: { label: 'Formación',       color: 'var(--md-sys-color-secondary)' },
    admin:     { label: 'Administración',  color: 'var(--md-sys-color-tertiary)' }
};

// Grupos de estado con config visual
const STATUS_GROUPS = [
    { key: 'in_progress', label: 'En proceso', dotClass: 'plan-task-group__dot--in-progress' },
    { key: 'todo',        label: 'Por hacer',  dotClass: 'plan-task-group__dot--todo' },
    { key: 'overdue',     label: 'Retrasadas', dotClass: 'plan-task-group__dot--overdue' },
    { key: 'done',        label: 'Completadas', dotClass: 'plan-task-group__dot--done' }
];

// Estado actual del filtro overview
let currentOverview = 'hoy';

// Nombres de meses en español
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatTaskDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getDate()} ${MESES_CORTO[d.getMonth()]}`;
}

// Calcular rango de fechas según overview
function getOverviewRange(overview) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = new Date(today);

    switch (overview) {
        case 'hoy':
            end.setHours(23, 59, 59, 999);
            break;
        case 'semana':
            // Lunes a domingo de esta semana
            const dayOfWeek = today.getDay(); // 0=dom, 1=lun...
            const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
            end.setDate(today.getDate() + daysToSunday);
            end.setHours(23, 59, 59, 999);
            break;
        case 'quincena':
            end.setDate(today.getDate() + 14);
            end.setHours(23, 59, 59, 999);
            break;
    }

    return { today, end };
}

// Clasificar tareas según el overview seleccionado
// SOLO incluye tareas cuya fecha cae dentro del rango (o retrasadas/completadas relevantes)
function classifyTasks(overview) {
    const { today, end } = getOverviewRange(overview);

    const result = {
        in_progress: [],
        todo: [],
        overdue: [],
        done: []
    };

    for (const task of PLAN_TASKS) {
        const taskDate = new Date(task.date + 'T00:00:00');

        // Completadas: solo mostrar si su fecha cae dentro del rango
        if (task.status === 'done') {
            if (taskDate >= today && taskDate <= end) {
                result.done.push(task);
            }
            continue;
        }

        // Retrasadas: fecha anterior a hoy — siempre se muestran (son pendientes atrasadas)
        if (taskDate < today) {
            result.overdue.push(task);
            continue;
        }

        // Fuera del rango del overview: no mostrar
        if (taskDate > end) {
            continue;
        }

        // Dentro del rango: clasificar según su status original
        if (task.status === 'in_progress') {
            result.in_progress.push(task);
        } else {
            result.todo.push(task);
        }
    }

    return result;
}

// Aplicar filtros de la sección de tareas
function applyTaskFilters(classified) {
    const projectFilter = document.getElementById('filter-project')?.value || 'all';
    const statusFilter = document.getElementById('filter-status')?.value || 'all';

    const filtered = {};
    for (const [status, tasks] of Object.entries(classified)) {
        filtered[status] = tasks.filter(t => {
            if (projectFilter !== 'all' && t.project !== projectFilter) return false;
            if (statusFilter !== 'all' && status !== statusFilter) return false;
            return true;
        });
    }
    return filtered;
}

// Actualizar contadores de stat cards (solo tareas visibles en el overview)
function updatePlanStats(classified) {
    const el = (id) => document.getElementById(id);

    // Reunir todas las tareas visibles
    const allVisible = [
        ...classified.in_progress,
        ...classified.todo,
        ...classified.overdue,
        ...classified.done
    ];
    const visibleProjects = new Set(allVisible.map(t => t.project));

    if (el('stat-in-progress')) el('stat-in-progress').textContent = classified.in_progress.length;
    if (el('stat-todo'))        el('stat-todo').textContent = classified.todo.length;
    if (el('stat-overdue'))     el('stat-overdue').textContent = classified.overdue.length;
    if (el('stat-projects'))    el('stat-projects').textContent = visibleProjects.size;
    if (el('stat-total'))       el('stat-total').textContent = allVisible.length;
}

// Renderizar la lista de tareas agrupadas
function renderPlanTasks() {
    const container = document.getElementById('plan-tasks-list');
    if (!container) return;

    const classified = classifyTasks(currentOverview);

    // Actualizar stats
    updatePlanStats(classified);

    // Aplicar filtros de sección
    const filtered = applyTaskFilters(classified);

    // Limpiar
    container.innerHTML = '';

    // Renderizar cada grupo que tenga tareas
    for (const group of STATUS_GROUPS) {
        const tasks = filtered[group.key];
        if (!tasks || tasks.length === 0) continue;

        const groupDiv = document.createElement('div');
        groupDiv.className = 'plan-task-group';

        // Label del grupo
        const label = document.createElement('h3');
        label.className = 'plan-task-group__label';
        label.innerHTML = `<span class="plan-task-group__dot ${group.dotClass}"></span> ${group.label}`;
        groupDiv.appendChild(label);

        // Task cards
        for (const task of tasks) {
            const card = document.createElement('div');
            card.className = 'plan-task-card' + (group.key === 'overdue' ? ' plan-task-card--overdue' : '') + (group.key === 'done' ? ' plan-task-card--done' : '');
            card.dataset.status = group.key;
            card.dataset.project = task.project;

            const metaParts = [];
            if (task.tasks > 0) metaParts.push(`${task.tasks} tarea${task.tasks > 1 ? 's' : ''}`);
            if (task.subtasks > 0) metaParts.push(`${task.subtasks} sub-tarea${task.subtasks > 1 ? 's' : ''}`);

            card.innerHTML = `
                <div class="plan-task-card__left">
                    <span class="plan-task-card__date">${formatTaskDate(task.date)}</span>
                    <span class="plan-task-card__title">${task.title}</span>
                    <span class="plan-task-card__meta">
                        <i class="ph ph-check-circle"></i> ${metaParts.join(' · ')}
                    </span>
                </div>
                <button class="plan-task-card__menu" title="Opciones">
                    <i class="ph ph-dots-three-vertical"></i>
                </button>
            `;
            groupDiv.appendChild(card);
        }

        container.appendChild(groupDiv);
    }

    // Si no hay tareas
    if (container.children.length === 0) {
        container.innerHTML = '<p class="plan-tasks-empty">No hay tareas para este filtro</p>';
    }
}

// ============================================
// Navegación entre pantallas
// ============================================
function showChatScreen(initialMessage, showSelector = false) {
    // Fade out welcome
    elements.welcomeScreen.classList.add('fade-out');

    setTimeout(() => {
        elements.welcomeScreen.classList.add('hidden');
        elements.welcomeScreen.classList.remove('fade-out');
        elements.chatScreen.classList.remove('hidden');

        // Crear orb en el header del chat
        if (window.orbCreateChatHeader) window.orbCreateChatHeader();

        // Añadir mensaje del usuario
        if (initialMessage) {
            addMessage(initialMessage, 'user');
            if (showSelector) {
                showResponseModeSelector(initialMessage);
            } else {
                sendToWebSocket(initialMessage);
            }
        }

        // Focus en input
        elements.chatInput.focus();
    }, 300);
}

function showChatScreenWithAnswer(question, answer) {
    elements.welcomeScreen.classList.add('fade-out');

    setTimeout(() => {
        elements.welcomeScreen.classList.add('hidden');
        elements.welcomeScreen.classList.remove('fade-out');
        elements.chatScreen.classList.remove('hidden');

        // Crear orb en el header del chat
        if (window.orbCreateChatHeader) window.orbCreateChatHeader();

        // Mostrar pregunta y respuesta hardcodeadas
        addMessage(question, 'user');
        addMessage(answer, 'assistant');

        elements.chatInput.focus();
    }, 300);
}

function showWelcomeScreen() {
    elements.chatScreen.classList.add('hidden');
    elements.planScreen?.classList.add('hidden');
    elements.welcomeScreen.classList.remove('hidden');

    // Limpiar chat
    elements.chatMessages.innerHTML = '';

    // Cerrar WebSocket si existe
    if (state.websocket) {
        state.websocket.close();
        state.websocket = null;
    }

    // Actualizar búsquedas recientes
    renderRecentSearches();
}

function showPlanScreen() {
    // Fade out welcome
    elements.welcomeScreen.classList.add('fade-out');

    setTimeout(() => {
        elements.welcomeScreen.classList.add('hidden');
        elements.welcomeScreen.classList.remove('fade-out');
        elements.planScreen.classList.remove('hidden');

        // Renderizar tareas con el overview actual
        renderPlanTasks();

        // Crear orb en el nav
        if (window.orbCreateNav) window.orbCreateNav();
    }, 300);
}

function showWelcomeFromPlan() {
    elements.planScreen.classList.add('hidden');
    elements.welcomeScreen.classList.remove('hidden');
    renderRecentSearches();
}

function showChatFromPlan() {
    elements.planScreen.classList.add('hidden');
    elements.chatScreen.classList.remove('hidden');
    // Crear orb en el header del chat
    if (window.orbCreateChatHeader) window.orbCreateChatHeader();
}

// ============================================
// Markdown rendering + Phosphor icon enrichment
// ============================================

// Map of keywords to Phosphor icon names for semantic enrichment
const ICON_MAP_HEADERS = {
    // Product-related
    'producto':     'package',
    'productos':    'package',
    'omega':        'drop',
    'dha':          'drop',
    'epa':          'drop',
    'natural dha':  'leaf',
    'puro omega':   'drop',
    'puro epa':     'drop',
    'composición':  'flask',
    'composicion':  'flask',
    'ingrediente':  'flask',
    'formulación':  'flask',
    'formulacion':  'flask',
    // Clinical / medical
    'indicación':   'heartbeat',
    'indicacion':   'heartbeat',
    'indicaciones': 'heartbeat',
    'clínic':       'heartbeat',
    'clinic':       'heartbeat',
    'dosis':        'eyedropper',
    'dosificación': 'eyedropper',
    'posología':    'eyedropper',
    'beneficio':    'star',
    'beneficios':   'star',
    'ventaja':      'star',
    'ventajas':     'star',
    // Quality & tech
    'calidad':      'seal-check',
    'certificación':'seal-check',
    'certificacion':'seal-check',
    'tecnología':   'gear',
    'tecnologia':   'gear',
    'rtg':          'gear',
    'pureza':       'shield-check',
    'seguridad':    'shield-check',
    // Sales
    'argumento':    'megaphone',
    'argumentos':   'megaphone',
    'venta':        'trend-up',
    'ventas':       'trend-up',
    'estrategia':   'strategy',
    'presentación': 'presentation-chart',
    'presentacion': 'presentation-chart',
    // Objections
    'objeción':     'shield',
    'objecion':     'shield',
    'objeciones':   'shield',
    'precio':       'currency-circle-dollar',
    'costo':        'currency-circle-dollar',
    'coste':        'currency-circle-dollar',
    'eficacia':     'chart-line-up',
    'resultado':    'chart-line-up',
    'resultados':   'chart-line-up',
    // Medical specialties
    'cardio':       'heart',
    'cardiología':  'heart',
    'cardiologia':  'heart',
    'ginecología':  'gender-female',
    'ginecologia':  'gender-female',
    'neurología':   'brain',
    'neurologia':   'brain',
    'pediatría':    'baby',
    'pediatria':    'baby',
    'psiquiatría':  'brain',
    'psiquiatria':  'brain',
    'reumatología': 'bone',
    'reumatologia': 'bone',
    // Specialist
    'especialista': 'user-circle',
    'médico':       'stethoscope',
    'medico':       'stethoscope',
    'doctor':       'stethoscope',
    'paciente':     'user',
    'perfil':       'user-focus',
    // Sections
    'reconocimiento': 'handshake',
    'reencuadre':     'arrows-clockwise',
    'guion':          'quotes',
    'guión':          'quotes',
    'script':         'quotes',
    'datos clave':    'chart-bar',
    'evidencia':      'article',
    'estudio':        'book-open-text',
    'estudios':       'book-open-text',
    'referencia':     'book-open-text',
    'comparativa':    'scales',
    'comparación':    'scales',
    'comparacion':    'scales',
    'diferencia':     'scales',
    'diferenciación': 'star-four',
    'diferenciacion': 'star-four',
    'conclusión':     'check-circle',
    'conclusion':     'check-circle',
    'resumen':        'list-bullets',
    'recomendación':  'lightbulb',
    'recomendacion':  'lightbulb',
    'tip':            'lightbulb',
    'nota':           'note',
    'importante':     'warning-circle',
    'advertencia':    'warning',
    'interacción':    'warning',
    'interaccion':    'warning',
    'contraindicación': 'prohibit'
};

// Icon for table header cells based on content
const ICON_MAP_TABLE = {
    'producto':       'package',
    'nombre':         'tag',
    'composición':    'flask',
    'composicion':    'flask',
    'dosis':          'eyedropper',
    'concentración':  'flask',
    'concentracion':  'flask',
    'indicación':     'heartbeat',
    'indicacion':     'heartbeat',
    'presentación':   'pill',
    'presentacion':   'pill',
    'precio':         'currency-circle-dollar',
    'beneficio':      'star',
    'ventaja':        'star',
    'característica': 'check-circle',
    'caracteristica': 'check-circle',
    'aspecto':        'list-bullets',
    'dato':           'chart-bar',
    'detalle':        'info',
    'componente':     'flask',
    'epa':            'drop',
    'dha':            'drop',
    'forma':          'shapes',
    'certificación':  'seal-check',
    'certificacion':  'seal-check',
    'paso':           'number-circle-one',
    'acción':         'lightning',
    'accion':         'lightning',
    'argumento':      'megaphone',
    'objeción':       'shield',
    'objecion':       'shield',
    'respuesta':      'chat-circle-text'
};

/**
 * Find the best matching Phosphor icon for a text string.
 */
function findIconForText(text, iconMap) {
    const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const lowerOriginal = text.toLowerCase();

    // Try exact or partial match
    for (const [keyword, icon] of Object.entries(iconMap)) {
        const kwNorm = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (lowerOriginal.includes(keyword) || lower.includes(kwNorm)) {
            return icon;
        }
    }
    return null;
}

/**
 * Post-process rendered HTML to inject Phosphor icons at semantic points.
 * - Before h2/h3 headings
 * - In table header cells
 * - Before blockquotes (as a quote icon)
 * - Before list items (subtle icon for key terms)
 */
function enrichWithIcons(html) {
    const container = document.createElement('div');
    container.innerHTML = html;

    // 1. Headings — inject icon before text
    container.querySelectorAll('h2, h3').forEach(heading => {
        const text = heading.textContent;
        const icon = findIconForText(text, ICON_MAP_HEADERS);
        if (icon) {
            const iconEl = document.createElement('i');
            iconEl.className = `ph ph-${icon} md-icon-heading`;
            heading.insertBefore(iconEl, heading.firstChild);
            // Add a space after icon
            heading.insertBefore(document.createTextNode(' '), iconEl.nextSibling);
        }
    });

    // 2. Table header cells — inject icon before text
    container.querySelectorAll('thead th').forEach(th => {
        const text = th.textContent;
        const icon = findIconForText(text, ICON_MAP_TABLE);
        if (icon) {
            const iconEl = document.createElement('i');
            iconEl.className = `ph ph-${icon} md-icon-th`;
            th.insertBefore(iconEl, th.firstChild);
            th.insertBefore(document.createTextNode(' '), iconEl.nextSibling);
        }
    });

    // 3. Blockquotes — add quote icon at the start
    container.querySelectorAll('blockquote').forEach(bq => {
        const firstP = bq.querySelector('p') || bq;
        if (!firstP.querySelector('.md-icon-bq')) {
            const iconEl = document.createElement('i');
            iconEl.className = 'ph ph-quotes md-icon-bq';
            firstP.insertBefore(iconEl, firstP.firstChild);
            firstP.insertBefore(document.createTextNode(' '), iconEl.nextSibling);
        }
    });

    // 4. Strong text inside list items — add contextual icon
    container.querySelectorAll('li').forEach(li => {
        const strong = li.querySelector('strong');
        if (strong) {
            const icon = findIconForText(strong.textContent, ICON_MAP_HEADERS);
            if (icon) {
                const iconEl = document.createElement('i');
                iconEl.className = `ph ph-${icon} md-icon-li`;
                li.insertBefore(iconEl, li.firstChild);
                li.insertBefore(document.createTextNode(' '), iconEl.nextSibling);
            }
        }
    });

    // 5. Source badge — replace external source markers with visual badge
    const GENERAL_MARKERS = [
        '(fuente externa no empresarial)',
        '(fuente externa no empresarial)',
        '*(fuente externa no empresarial)*',
        // Legacy markers (backward compat)
        '(información de la web)',
        '(informacion de la web)',
        '*(información de la web)*',
        '*(informacion de la web)*',
        '(conocimiento científico general)',
        '(conocimiento cientifico general)',
        '*(conocimiento científico general)*',
        '*(conocimiento cientifico general)*'
    ];
    const badgeHTML = '<span class="source-badge-general" tabindex="0"><i class="ph ph-warning-circle"></i> Fuente externa</span>';

    let finalHTML = container.innerHTML;
    for (const marker of GENERAL_MARKERS) {
        // Replace both the <em> wrapped version and raw text version
        const emWrapped = `<em>${marker.replace(/^\*|\*$/g, '')}</em>`;
        if (finalHTML.includes(emWrapped)) {
            finalHTML = finalHTML.split(emWrapped).join(badgeHTML);
        }
        if (finalHTML.includes(marker)) {
            finalHTML = finalHTML.split(marker).join(badgeHTML);
        }
    }

    // 6. Wrap tables in responsive scroll container
    finalHTML = finalHTML.replace(/<table([\s\S]*?)<\/table>/gi, (match) => {
        return `<div class="table-responsive">${match}</div>`;
    });

    return finalHTML;
}

/**
 * Render markdown to HTML.
 * @param {string} text - raw markdown
 * @param {boolean} enrich - if true, inject Phosphor icons (use false during streaming for performance)
 */
function renderMarkdown(text, enrich = true) {
    if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
        const html = marked.parse(text);
        const clean = DOMPurify.sanitize(html);
        return enrich ? enrichWithIcons(clean) : clean;
    }
    // Fallback: escape HTML
    return escapeHtml(text);
}

function stripMarkdown(text) {
    return text
        .replace(/#{1,6}\s+/g, '')           // headers
        .replace(/\*\*(.+?)\*\*/g, '$1')     // bold
        .replace(/\*(.+?)\*/g, '$1')         // italic
        .replace(/_(.+?)_/g, '$1')           // italic alt
        .replace(/~~(.+?)~~/g, '$1')         // strikethrough
        .replace(/`(.+?)`/g, '$1')           // inline code
        .replace(/```[\s\S]*?```/g, '')      // code blocks
        .replace(/>\s+/g, '')                // blockquotes
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // images
        .replace(/\|[^\n]+\|/g, '')          // table rows
        .replace(/[-|]+\s*/g, '')            // table separators
        .replace(/[-*+]\s+/g, '')            // unordered lists
        .replace(/\d+\.\s+/g, '')            // ordered lists
        .replace(/\n{2,}/g, '. ')            // double newlines to period
        .replace(/\n/g, ' ')                 // single newlines to space
        .replace(/\s{2,}/g, ' ')             // collapse spaces
        .trim();
}

// ============================================
// Responsive tables — scroll hints
// ============================================
/**
 * Initialise scroll-hint classes on .table-responsive wrappers
 * inside a given container (message element).
 */
function initResponsiveTables(container) {
    if (!container) return;
    container.querySelectorAll('.table-responsive').forEach(wrapper => {
        const update = () => {
            const { scrollLeft, scrollWidth, clientWidth } = wrapper;
            const scrollable = scrollWidth > clientWidth + 1;
            wrapper.classList.toggle('is-scrollable', scrollable && scrollLeft < 4);
            wrapper.classList.toggle('scrolled-mid', scrollable && scrollLeft >= 4 && scrollLeft + clientWidth < scrollWidth - 4);
            wrapper.classList.toggle('scrolled-end', scrollable && scrollLeft + clientWidth >= scrollWidth - 4);
        };
        wrapper.addEventListener('scroll', update, { passive: true });
        // Initial check (schedule to run after layout)
        requestAnimationFrame(update);
    });
}

// ============================================
// Mensajes del chat
// ============================================
function addMessage(text, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    if (role === 'assistant' && text) {
        messageDiv.innerHTML = renderMarkdown(text);
    } else {
        messageDiv.textContent = text;
    }

    if (role === 'assistant') {
        // Wrapper: orb arriba + burbuja abajo
        const row = document.createElement('div');
        row.className = 'message-row assistant';
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        // Crear orb animado real dentro del avatar
        if (window.orbCreateInElement) {
            window.orbCreateInElement(avatar, 28);
        }
        row.appendChild(avatar);
        row.appendChild(messageDiv);
        elements.chatMessages.appendChild(row);
    } else {
        elements.chatMessages.appendChild(messageDiv);
    }

    // Init responsive table wrappers
    initResponsiveTables(messageDiv);

    // Scroll al final
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

    return messageDiv;
}

/**
 * Inserta un banner de advertencia cuando la cobertura RAG es baja o media.
 * Se muestra antes de la respuesta del asistente.
 */
function insertRagCoverageWarning(coverage, maxScore) {
    const warning = document.createElement('div');
    const isLow = coverage === 'low';

    warning.className = `rag-coverage-warning ${isLow ? 'rag-coverage-warning--low' : 'rag-coverage-warning--medium'}`;

    if (isLow) {
        warning.innerHTML = `
            <div class="rag-coverage-warning__icon">
                <i class="ph ph-warning-circle"></i>
            </div>
            <div class="rag-coverage-warning__content">
                <strong>Fuentes externas</strong>
                <span>Esta consulta no está cubierta en la base de conocimiento de Puro Omega. La respuesta usa información externa general.</span>
            </div>
        `;
    } else {
        warning.innerHTML = `
            <div class="rag-coverage-warning__icon">
                <i class="ph ph-info"></i>
            </div>
            <div class="rag-coverage-warning__content">
                <strong>Cobertura parcial</strong>
                <span>Parte de esta respuesta puede incluir información de fuentes externas, marcada con el indicador correspondiente.</span>
            </div>
        `;
    }

    elements.chatMessages.appendChild(warning);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function addTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'message-row assistant';
    row.id = 'typing-indicator';
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    if (window.orbCreateInElement) {
        window.orbCreateInElement(avatar, 28);
    }
    const indicator = document.createElement('div');
    indicator.className = 'message assistant typing';
    indicator.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    row.appendChild(avatar);
    row.appendChild(indicator);
    elements.chatMessages.appendChild(row);
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
function sendToWebSocket(message, responseMode = 'full') {
    // Mostrar indicador de escritura
    addTypingIndicator();
    elements.chatStatus.textContent = 'Escribiendo...';

    // Crear WebSocket
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    state.websocket = new WebSocket(`${wsProtocol}//${window.location.host}/ws/chat`);

    state.currentMessage = '';
    state.currentQuery = message; // Guardar query para persistencia
    let assistantMessage = null;

    state.websocket.onopen = () => {
        const payload = { message, response_mode: responseMode };
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
                // Insertar warning de cobertura RAG si es baja o media
                if (state.pendingRagCoverage && state.pendingRagCoverage !== 'high') {
                    insertRagCoverageWarning(state.pendingRagCoverage, state.pendingRagScore);
                }
                assistantMessage = addMessage('', 'assistant');
            }

            state.currentMessage += data.content;
            // During streaming: render markdown without icon enrichment (performance)
            assistantMessage.innerHTML = renderMarkdown(state.currentMessage, false);
            elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
        }
        else if (data.type === 'end') {
            // Final render with full icon enrichment
            if (assistantMessage && state.currentMessage) {
                assistantMessage.innerHTML = renderMarkdown(state.currentMessage, true);
                initResponsiveTables(assistantMessage);
                // DESHABILITADO: Infografía — para re-activar, descomentar las 2 líneas siguientes
                // const messageRow = assistantMessage.closest('.message-row') || assistantMessage;
                // appendInfographicCTA(messageRow, state.currentMessage);

                // Persistir respuesta en búsquedas recientes
                if (state.currentQuery) {
                    updateRecentSearchAnswer(state.currentQuery, state.currentMessage);
                }
            }
            elements.chatStatus.textContent = 'En línea';
            // Limpiar estado de cobertura RAG
            state.pendingRagCoverage = null;
            state.pendingRagScore = 0;
        }
        else if (data.type === 'agent_info') {
            console.log('Agente:', data.agent, '- Documentos:', data.context_docs, '- Cobertura RAG:', data.rag_coverage);
            // Guardar cobertura RAG para mostrar warning cuando llegue la respuesta
            state.pendingRagCoverage = data.rag_coverage || 'high';
            state.pendingRagScore = data.max_score || 0;
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
    elements.orbCard?.classList.toggle('listening', recording);

    // Chat screen
    elements.chatMicBtn?.classList.toggle('recording', recording);

    // Plan screen add button (sin estado listening)

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
            // Guardar en búsquedas recientes (como voz)
            saveRecentSearch(data.text, true);
            const actionable = isActionableQuery(data.text);

            if (!elements.chatScreen.classList.contains('hidden')) {
                addMessage(data.text, 'user');
                if (actionable) {
                    showResponseModeSelector(data.text);
                } else {
                    sendToWebSocket(data.text);
                }
            } else {
                elements.planScreen?.classList.add('hidden');
                showChatScreen(data.text, actionable);
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
// Detección de consultas con contenido real
// ============================================
/**
 * Determina si un mensaje contiene una consulta real sobre
 * productos, objeciones o argumentos de Puro Omega.
 * Solo muestra el selector de formato cuando hay contenido pharma relevante.
 * Cualquier otra cosa (saludos, frases vagas, charla) se envía directo.
 */
function isActionableQuery(text) {
    const t = text.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Palabras clave que indican consulta real sobre el dominio pharma/ventas
    const pharmaKeywords = [
        // Productos y sustancias
        /omega/i, /epa\b/i, /dha\b/i, /capsul/i, /suplemento/i,
        /aceite/i, /pescado/i, /rtg/i, /etil/i, /triglicerido/i,
        /natural dha/i, /puro epa/i, /resolving/i, /prm\b/i,
        // Médico / clínico
        /medico/i, /doctor/i, /paciente/i, /prescri/i, /dosis/i,
        /posologi/i, /indicaci/i, /tratamiento/i, /clinico/i,
        /embaraz/i, /cardio/i, /gineco/i, /neuro/i, /pediatr/i,
        /psiquiatr/i, /reumat/i, /dermato/i, /oftalmol/i, /urolog/i,
        /endocrino/i, /gastro/i, /neumol/i, /oncol/i, /geriatr/i,
        /traumat/i, /internist/i, /medicina general/i,
        // Especialidades y condiciones
        /especialidad/i, /especialista/i, /colesterol/i, /inflamac/i,
        /cardiovascular/i, /diabetes/i, /hipertens/i, /artritis/i,
        /cerebr/i, /cognitiv/i, /depres/i, /ansiedad/i, /retina/i,
        /fertil/i, /gestacion/i, /prenatal/i, /menopausia/i,
        // Objeciones
        /caro/i, /costoso/i, /precio/i, /barato/i, /coste/i,
        /no funciona/i, /no sirve/i, /metales pesados/i,
        /efecto.? secundario/i, /interacci/i, /contraindicac/i,
        /otra marca/i, /competencia/i, /objecion/i,
        // Ventas y argumentos
        /argumento/i, /vender/i, /venta/i, /presentar/i, /visita/i,
        /represent/i, /estrategi/i, /perfil/i, /diferenci/i,
        /ventaja/i, /evidencia/i, /estudio/i, /ensayo/i,
        // Marca
        /puro omega/i, /omega.?3 index/i, /ifos/i, /certificac/i,
        // Producto genérico
        /producto/i, /composici/i, /concentraci/i, /biodisponib/i,
        /absorci/i, /calidad/i, /pureza/i,
        // Acciones del dominio
        /recomiend/i, /recomendar/i, /prescrib/i, /comparar/i, /comparativ/i,
        /que es\b/i, /para que sirve/i, /como funciona/i, /como respondo/i,
        /como presento/i, /como vendo/i,
    ];

    return pharmaKeywords.some(kw => kw.test(t));
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

    // Guardar en búsquedas recientes
    saveRecentSearch(message);

    const actionable = isActionableQuery(message);

    // Si estamos en welcome, ir al chat
    if (!elements.welcomeScreen.classList.contains('hidden')) {
        showChatScreen(message, actionable); // solo mostrar selector si es consulta real
    } else {
        addMessage(message, 'user');
        if (actionable) {
            showResponseModeSelector(message);
        } else {
            sendToWebSocket(message); // enviar directo sin selector
        }
    }
}

/**
 * Muestra un selector de modo de respuesta (resumida/extendida)
 * debajo del mensaje del usuario. Al elegir, envía al WebSocket.
 */
function showResponseModeSelector(message) {
    const selector = document.createElement('div');
    selector.className = 'response-mode-selector';
    selector.innerHTML = `
        <div class="response-mode-selector__header">
            <i class="ph ph-chat-dots"></i>
            <span>Formato de respuesta</span>
        </div>
        <div class="response-mode-selector__buttons">
            <button class="response-mode-btn response-mode-btn--short" data-mode="short">
                <div class="response-mode-btn__icon">
                    <i class="ph ph-list-bullets"></i>
                </div>
                <div class="response-mode-btn__text">
                    <strong>Resumida</strong>
                    <span>Datos clave y directa</span>
                </div>
            </button>
            <button class="response-mode-btn response-mode-btn--full" data-mode="full">
                <div class="response-mode-btn__icon">
                    <i class="ph ph-article"></i>
                </div>
                <div class="response-mode-btn__text">
                    <strong>Extendida</strong>
                    <span>Argumentario completo</span>
                </div>
            </button>
        </div>
    `;

    elements.chatMessages.appendChild(selector);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

    // Handlers
    selector.querySelectorAll('.response-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            // Reemplazar selector con indicador del modo elegido
            const chosen = document.createElement('div');
            chosen.className = 'response-mode-chosen';
            chosen.innerHTML = mode === 'short'
                ? '<i class="ph ph-list-bullets"></i> Resumida'
                : '<i class="ph ph-article"></i> Extendida';
            selector.replaceWith(chosen);
            // Enviar al WebSocket con el modo
            sendToWebSocket(message, mode);
        });
    });
}

// ============================================
// Infographic Feature
// ============================================

const INFOGRAPHIC_THEMES = {
    productos:  { primary: '#6B5B95', primaryDark: '#4A3D6B', light: '#D8D0E8', accent: '#8B78B4', bg: '#EDEAF0', badge: '#F0ECF5', border: '#D5CDE0' },
    objeciones: { primary: '#7B6B95', primaryDark: '#524068', light: '#DDD0E8', accent: '#9B88B4', bg: '#EFECF2', badge: '#F2EEF7', border: '#D8CFE3' },
    argumentos: { primary: '#5B6B95', primaryDark: '#3D4A6B', light: '#D0D8E8', accent: '#7888B4', bg: '#EAEDF2', badge: '#ECF0F5', border: '#CDD5E0' }
};

function appendInfographicCTA(messageRow, fullResponse) {
    if (!messageRow || !fullResponse) return;

    const cta = document.createElement('div');
    cta.className = 'infographic-cta';
    cta.innerHTML = `
        <i class="ph ph-image-square"></i>
        <span class="infographic-cta__text">¿Quieres una infografía resumida para mostrar al médico?</span>
        <div class="infographic-cta__actions">
            <button class="infographic-cta__btn infographic-cta__btn--yes">
                <i class="ph ph-check"></i> Sí, generar
            </button>
            <button class="infographic-cta__btn infographic-cta__btn--no">
                <i class="ph ph-x"></i> No, gracias
            </button>
        </div>
    `;

    // Insert after the message row
    messageRow.after(cta);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

    // Button handlers
    cta.querySelector('.infographic-cta__btn--yes').addEventListener('click', () => {
        requestInfographic(fullResponse, cta);
    });
    cta.querySelector('.infographic-cta__btn--no').addEventListener('click', () => {
        cta.classList.add('infographic-cta--exiting');
        cta.addEventListener('animationend', () => cta.remove());
    });
}

async function requestInfographic(agentResponse, ctaElement) {
    console.log('[Infographic] Requesting infographic via POST...');

    // Replace CTA with loading spinner
    const loading = document.createElement('div');
    loading.className = 'infographic-loading';
    loading.innerHTML = `
        <div class="infographic-loading__spinner"></div>
        <span class="infographic-loading__text">Generando infografía...</span>
    `;
    ctaElement.replaceWith(loading);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

    try {
        const response = await fetch('/api/infographic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent_response: agentResponse })
        });

        const result = await response.json();
        console.log('[Infographic] Response:', result.success);

        if (result.success && result.data) {
            console.log('[Infographic] Data received, rendering card');
            const insertAfter = loading.previousElementSibling || elements.chatMessages.lastElementChild;
            loading.remove();
            renderInfographic(result.data, insertAfter);
        } else {
            console.error('[Infographic] Error:', result.error || result.detail);
            loading.innerHTML = `
                <div class="infographic-error">
                    <i class="ph ph-warning-circle"></i>
                    <span>No se pudo generar la infografía: ${result.error || 'Error desconocido'}</span>
                </div>
            `;
            loading.className = 'infographic-error-container';
        }
    } catch (err) {
        console.error('[Infographic] Fetch error:', err);
        loading.innerHTML = `
            <div class="infographic-error">
                <i class="ph ph-warning-circle"></i>
                <span>Error de conexión al generar la infografía.</span>
            </div>
        `;
        loading.className = 'infographic-error-container';
    }
}

function renderInfographic(data, afterElement) {
    const theme = INFOGRAPHIC_THEMES[data.color_tema] || INFOGRAPHIC_THEMES.productos;

    // Build sections HTML (NotebookLM style: white cards with circular icon badges)
    const sectionsHTML = (data.secciones || []).map(sec => `
        <div class="infographic-card__section">
            <div class="infographic-card__section-header">
                <div class="infographic-card__section-icon">
                    <i class="ph ph-${sec.icono || 'circle'}"></i>
                </div>
                <span class="infographic-card__section-title">${sec.titulo}</span>
            </div>
            <ul class="infographic-card__section-list">
                ${(sec.puntos || []).map(p => `<li>${p}</li>`).join('')}
            </ul>
        </div>
    `).join('');

    // Build data grid HTML (KPI badges)
    const dataGridHTML = (data.datos_tabla || []).map(d => `
        <div class="infographic-card__kpi">
            <span class="infographic-card__kpi-value">${d.valor}</span>
            <span class="infographic-card__kpi-label">${d.etiqueta}</span>
        </div>
    `).join('');

    // Product highlight (circular icon badge)
    const prod = data.producto_destacado;
    const productHTML = (prod && prod.nombre) ? `
        <div class="infographic-card__product">
            <div class="infographic-card__product-icon">
                <i class="ph ph-package"></i>
            </div>
            <div class="infographic-card__product-info">
                <strong>${prod.nombre}</strong>
                ${prod.dosis ? `<span>${prod.dosis}</span>` : ''}
                ${prod.indicacion ? `<span>${prod.indicacion}</span>` : ''}
            </div>
        </div>
    ` : '';

    // Key phrase
    const quoteHTML = data.frase_clave ? `
        <blockquote class="infographic-card__quote">
            ${data.frase_clave}
        </blockquote>
    ` : '';

    // Build full card (NotebookLM style)
    const card = document.createElement('div');
    card.className = 'infographic-card';
    card.style.setProperty('--nblm-bg', theme.bg);
    card.style.setProperty('--nblm-primary', theme.primary);
    card.style.setProperty('--nblm-primary-dark', theme.primaryDark);
    card.style.setProperty('--nblm-primary-light', theme.light);
    card.style.setProperty('--nblm-accent', theme.accent);
    card.style.setProperty('--nblm-badge-bg', theme.badge);
    card.style.setProperty('--nblm-border', theme.border);
    card.innerHTML = `
        <div class="infographic-card__header">
            <div class="infographic-card__brand">
                <i class="ph-bold ph-pulse"></i>
                <span>Omega</span>
            </div>
            <h3 class="infographic-card__title">${data.titulo || 'Resumen'}</h3>
            ${data.subtitulo ? `<p class="infographic-card__subtitle">${data.subtitulo}</p>` : ''}
        </div>
        ${dataGridHTML ? `<div class="infographic-card__data-grid">${dataGridHTML}</div>` : ''}
        <div class="infographic-card__body">
            ${sectionsHTML}
            ${productHTML}
            ${quoteHTML}
        </div>
        <div class="infographic-card__footer">
            <span>Omega &middot; Infograf&iacute;a generada por IA</span>
        </div>
        <div class="infographic-actions">
            <button class="infographic-actions__download" title="Descargar PNG">
                <i class="ph ph-download-simple"></i> Descargar
            </button>
        </div>
    `;

    // Insert into chat
    if (afterElement && afterElement.parentNode) {
        afterElement.after(card);
    } else {
        elements.chatMessages.appendChild(card);
    }
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

    // Download handler
    card.querySelector('.infographic-actions__download').addEventListener('click', () => {
        downloadInfographicAsPNG(card);
    });
}

function downloadInfographicAsPNG(cardElement) {
    if (typeof html2canvas === 'undefined') {
        console.error('html2canvas not loaded');
        return;
    }

    const actionsBar = cardElement.querySelector('.infographic-actions');
    if (actionsBar) actionsBar.style.display = 'none';

    html2canvas(cardElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#EDEAF0',
        logging: false
    }).then(canvas => {
        if (actionsBar) actionsBar.style.display = '';
        canvas.toBlob(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'infografia-puro-omega.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/png');
    }).catch(err => {
        if (actionsBar) actionsBar.style.display = '';
        console.error('Error generating PNG:', err);
    });
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

    elements.planCard?.addEventListener('click', showPlanScreen);

    // FAQ chips (event delegation)
    elements.faqSection?.addEventListener('click', (e) => {
        const chip = e.target.closest('.faq-chip');
        if (chip && chip.dataset.question) {
            saveRecentSearch(chip.dataset.question);
            showChatScreen(chip.dataset.question, true); // true = mostrar selector
        }
    });

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

    // Plan screen
    elements.planBackBtn?.addEventListener('click', showWelcomeFromPlan);
    elements.navChatBtn?.addEventListener('click', showChatFromPlan);
    elements.navOrb?.addEventListener('click', toggleRecording);

    // Overview filter chips
    elements.planOverviewChips.forEach(chip => {
        chip.addEventListener('click', () => {
            elements.planOverviewChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentOverview = chip.dataset.filter;
            renderPlanTasks();
        });
    });

    // Task section filters (project, time, status)
    document.getElementById('filter-project')?.addEventListener('change', renderPlanTasks);
    document.getElementById('filter-time')?.addEventListener('change', () => {
        // Sync time filter with overview
        const timeFilter = document.getElementById('filter-time');
        if (timeFilter) {
            currentOverview = timeFilter.value;
            // Sync overview chips
            elements.planOverviewChips.forEach(c => {
                c.classList.toggle('active', c.dataset.filter === currentOverview);
            });
            renderPlanTasks();
        }
    });
    document.getElementById('filter-status')?.addEventListener('change', renderPlanTasks);

    // Mood overlay
    elements.moodCloseBtn?.addEventListener('click', closeMoodOverlay);
    elements.moodSlider?.addEventListener('input', onMoodSliderInput);
    elements.moodSubmitBtn?.addEventListener('click', submitMood);
    elements.moodInfoBtn?.addEventListener('click', () => {
        alert('Selecciona cómo te encuentras hoy moviendo el control deslizante. Tu estado de ánimo personaliza la experiencia de la app.');
    });

    // Cargar mood del día desde localStorage
    loadMoodFromStorage();

    // Seed: insertar búsquedas de ejemplo con respuesta hardcodeada
    // Si no hay búsquedas, o si las existentes no tienen 'answer' (versión vieja), reemplazar
    const SEED_DATA = [
        {
            query: '¿Qué diferencia hay entre Natural DHA y Puro Omega 3?',
            icon: 'product',
            desc: 'Consulta sobre productos Omega-3',
            timestamp: Date.now() - 3600000,
            answer: 'Natural DHA está formulado con DHA de alta concentración (700 mg por cápsula) orientado a neurodesarrollo, embarazo y función cognitiva. Puro Omega 3, en cambio, ofrece un balance EPA+DHA (1000 mg totales) pensado para salud cardiovascular general. Ambos utilizan aceite de pescado de origen sostenible con certificación IFOS 5 estrellas, pero la indicación principal y el perfil de ácidos grasos los diferencia.'
        },
        {
            query: '¿Cómo manejar la objeción de que el precio es alto?',
            icon: 'objection',
            desc: 'Manejo de objeciones médicas',
            timestamp: Date.now() - 7200000,
            answer: 'Cuando un médico menciona el precio, es clave reencuadrar el valor:\n\n1) Comparar el coste diario (menos de 1 € al día) frente al beneficio clínico demostrado.\n2) Destacar la concentración real de EPA/DHA — muchos productos baratos requieren 3-4 cápsulas para igualar una sola de Puro Omega.\n3) Mencionar la certificación IFOS y la pureza libre de metales pesados, que evita riesgos al paciente.\n4) Ofrecer el cálculo: "Doctor, si comparamos coste por gramo de omega-3 activo, Puro Omega resulta más económico que la mayoría de alternativas".'
        },
    ];
    const existing = loadRecentSearches();
    const needsSeed = existing.length === 0 || (existing.length <= 2 && !existing[0].answer);
    if (needsSeed) {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(SEED_DATA));
    }

    // Renderizar búsquedas recientes
    renderRecentSearches();

    console.log('Omega inicializado');
}

// Iniciar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
