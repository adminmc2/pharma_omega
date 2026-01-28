# Changelog

Todos los cambios notables del proyecto Puro Omega.

---

## Tareas Pendientes

### Registro de Progreso

| Fecha | Tarea | Estado | Observaciones |
|-------|-------|--------|---------------|
| 26-ene-26 | Verificar `main.py` arranca | ✅ | Corregido: acceso a RAG, route_query(), Groq opcional |
| 26-ene-26 | Probar `/api/health` | ✅ | OK: status ok, 3 agentes, 215 docs |
| 26-ene-26 | Probar `/api/voice` | ✅ | Funcional con GROQ_API_KEY |
| 26-ene-26 | Probar WebSocket `/ws/chat` | ✅ | Streaming OK, clasificación correcta |
| 26-ene-26 | Configurar .env (GROQ) | ✅ | API key añadida al .env |
| 26-ene-26 | Crear `style.css` | ✅ | Mobile First, Material Design 3, colores corporativos |
| 26-ene-26 | Crear `app.js` | ✅ | WebSocket, chat streaming, STT (Groq), TTS nativo |
| 26-ene-26 | Crear `orb.js` | ✅ | Esfera 3D con Canvas 2D, partículas Fibonacci, presets de mood |
| 26-ene-26 | Entrada de voz | ✅ | MediaRecorder + Whisper (Groq) |
| 26-ene-26 | Salida de voz (TTS) | ✅ | Web Speech API con voz es-ES |
| 26-ene-26 | Cuenta Groq creada | ✅ | Email personal de Google |
| 26-ene-26 | API key Groq | ✅ | Configurada en .env |
| 26-ene-26 | Transcripción español | ✅ | Whisper large-v3 vía Groq, idioma es |
| 26-ene-26 | TTS navegador | ✅ | Web Speech API nativo |
| 26-ene-26 | Voz es-ES | ✅ | Configurada en speechSynthesis |
| 26-ene-26 | Orquestador clasificación | ✅ | Ruteo correcto por reglas |
| 26-ene-26 | Agente productos | ✅ | Respuestas con contexto RAG, 5 docs |
| 26-ene-26 | Agente objeciones | ✅ | Manejo correcto de objeción de precio |
| 26-ene-26 | Agente argumentos | ✅ | Funcional con RAG |
| 26-ene-26 | Contexto RAG | ✅ | TF-IDF + cosine similarity, 215 docs |
| 27-ene-26 | Colores corporativos | ✅ | Cyan #31BEEF, Violet #994E95, Soft Blue #A1B8F2 |
| 27-ene-26 | Diseño responsive | ✅ | Mobile-first, breakpoints tablet (600px) y desktop (1024px) |
| 27-ene-26 | Mood overlay | ✅ | Cara SVG animada, slider, reacción AI, localStorage |
| 27-ene-26 | Orb presets por mood | ✅ | Brisa suave / Oleaje vivo / Tormenta líquida |
| 27-ene-26 | Global mood tinting | ✅ | Orb + cara tarjeta + texto reflejan mood |
| 27-ene-26 | UI cleanup | ✅ | Mic redundante eliminado, border-radius coherente, FAQ desc |
| 27-ene-26 | Test flujo chat | ✅ | WebSocket streaming funcional |
| 27-ene-26 | Mensajes error | ✅ | Manejo de errores en WebSocket y voz |
| 27-ene-26 | Aurora gradient + glassmorphism | ✅ | Fondo multi-blob radial con frosted glass en tarjetas |
| 27-ene-26 | Deep Blue palette | ✅ | Reemplazar cyan #31BEEF por Deep Blue #2D5BA0 en botones |
| 27-ene-26 | Pantalla Plan | ✅ | Stats grid, tareas dinámicas, filtros, bottom nav con orb |
| 27-ene-26 | Bottom nav rediseñado | ✅ | Orb central, chat navega al chat, botones disabled |
| 27-ene-26 | Perfil avatar 52px | ✅ | Aumentado de 40px a 52px |
| 27-ene-26 | Tarjeta plan renombrada | ✅ | "Mi plan" → "Mis tareas", border-radius unificado |
| 27-ene-26 | Phosphor Icons | ✅ | Migración completa de Material Symbols a Phosphor |
| 27-ene-26 | Chat bottom bar | ✅ | Estilo nav-bar (rounded, elevation, blur), 72px |
| 27-ene-26 | Chat header con orb | ✅ | Back + orb + título + help icon |
| 27-ene-26 | Burbujas chat rediseñadas | ✅ | Avatar orb encima, assistant full-width |
| 27-ene-26 | Búsquedas recientes | ✅ | localStorage, iconos por tipo, respuestas hardcodeadas |
| 27-ene-26 | Análisis sistema RAG | ✅ | Diagnóstico: sin markdown rendering, prompts sin templates, muletillas, sin TTS opt |
| 27-ene-26 | Análisis prompts agentes | ✅ | Productos, objeciones, argumentos — sin formato obligatorio ni CO-STAR |
| 27-ene-26 | Investigación LLMs alternativos | ✅ | Comparados: Llama 3.3 70B, Llama 4 Scout, Llama 4 Maverick, Kimi K2 |
| 27-ene-26 | Benchmark formato/tablas | ✅ | Kimi K2: 9.25/10 markdown, 100% structured output conformance |
| 27-ene-26 | Investigación Groq modelos | ✅ | Disponibles: Kimi K2, Llama 4 Scout/Maverick, Llama 3.3, Qwen3 32B |
| 27-ene-26 | Investigación CO-STAR framework | ✅ | Context, Objective, Style, Tone, Audience, Response — para prompts pharma |
| 27-ene-26 | Investigación markdown rendering | ✅ | marked.js (~28KB) + DOMPurify para sanitización HTML |
| 27-ene-26 | Investigación TTS optimización | ✅ | Strip markdown antes de speech, frases cortas (max 20 palabras) |
| 27-ene-26 | Selección LLM | ✅ | Recomendado: Kimi K2 en Groq (mejor formato, tablas, structured output) |
| 27-ene-26 | Plan mejora RAG definido | ✅ | 5 pasos: prompts CO-STAR, LLM Kimi K2, marked.js, CSS chat, TTS strip |
| 28-ene-26 | Logo Puro Omega | ✅ | Añadido al header, bot renombrado a "Omega" |
| 28-ene-26 | Wake word "Hola Omega" → "Hola Omia" | ✅ | Renombrado para evitar conflicto con producto Omega 3 |
| 28-ene-26 | Botón voice orb en chat | ✅ | Phosphor waveform, auto-activación por voz, toggle TTS |
| 28-ene-26 | ElevenLabs TTS | ✅ | Camila MX, resumen conversacional LLM, streaming proxy |
| 28-ene-26 | Bot renombrado a "Omia" | ✅ | HTML, JS, CSS, backend — "Puro Omega" y "Omega 3" intactos |
| 28-ene-26 | Toggle "Hola, Omia · on/off" | ✅ | Formato con coma y separador ·, altura 40px, gap 8px coherente |
| 28-ene-26 | Cache-busting estáticos | ✅ | Query string `?v=3.5.1` en style.css para evitar cache del navegador |
| 28-ene-26 | Mood slider thumb oscuro | ✅ | Círculo del slider usa `--md-sys-color-primary` (#2D5BA0) |
| - | Dockerfile | ⏳ | Para HF Spaces |
| - | README HF metadata | ⏳ | Configurar |
| - | Subir a HF Spaces | ⏳ | Deploy |
| - | Probar producción | ⏳ | Test en HF |
| - | Compartir URL | ⏳ | Con el equipo |
| - | Test voz E/S | ⏳ | Prueba completa entrada + salida |
| - | Test móvil | ⏳ | Dispositivo real |

**Leyenda:** ✅ Completado | ⏳ Pendiente | ❌ Bloqueado

---

## [3.5.2] - 2026-01-28

### Cambiado
- **Mood slider thumb** — Círculo del slider ahora usa `--md-sys-color-primary` (#2D5BA0) en vez de `--mood-fg` con opacity 0.6
  - Mismo color oscuro que el botón de enviar, sin transparencia
  - Aplicado a webkit y moz

---

## [3.5.1] - 2026-01-28

### Cambiado
- **Toggle "Hola, Omia"** — Nuevo formato con coma y separador: `Hola, Omia · on` / `Hola, Omia · off`
  - Texto actualizado en HTML (welcome + chat header) y JS (`updateWakeWordToggle()`)
  - Tooltips: "Activar Hola, Omia" / "Desactivar Hola, Omia"
- **Espaciado header coherente** — `header-actions` gap de 4px → 8px, `align-items: center`
- **Toggle height** — 36px → 40px con padding ajustado (más proporcionado con header-icon-btn de 48px)
- **Cache-busting** — `style.css?v=3.5.1` para evitar que el navegador sirva CSS cacheado

---

## [3.5.0] - 2026-01-28

### Añadido
- **Bot renombrado a "Omia"** — Nuevo nombre para evitar conflicto con el producto "Omega 3"
  - Wake word cambiado de "Hola Omega" a **"Hola Omia"** (también "Hey Omia", "Oye Omia", "OK Omia")
  - Patrón solo: `om[ií]a` en vez de `omega` — ya no interfiere con menciones del producto
  - `stripWakeWord()` actualizado en frontend y backend: solo limpia "omia", no toca "omega"
  - Título de página, chat header, greeting, infografías, tooltips, localStorage keys → todo "Omia"
  - TTS summary prompt: "Eres Omia, asistente de ventas de Puro Omega"
  - Todas las referencias a marca "Puro Omega" y producto "Omega-3" se mantienen intactas
- **Botón de voz (voice orb)** en la barra inferior del chat
  - Icono Phosphor `ph-waveform` dentro de un círculo oscuro (estilo Claude)
  - Usa clase base `chat-nav-btn` para renderizado consistente con cámara/mic/enviar
  - Estado activo: fondo `--md-sys-color-on-primary-container` con glow pulsante
  - Estado inactivo: fondo `--md-sys-color-surface-variant`
  - Se activa automáticamente al usar "Hola Omia", botón de micrófono, o tarjeta "Habla conmigo"
  - Toggle: click para desactivar/activar lectura en voz alta de respuestas
- **ElevenLabs TTS integrado** — Voz Camila MX (Flash v2.5), proxy streaming via httpx
  - Resumen conversacional generado por Kimi K2 (50-80 palabras) antes de enviar a ElevenLabs
  - Botón speaker en cada mensaje para reproducir individualmente
  - Auto-play cuando TTS está habilitado al finalizar respuesta

### Cambiado
- Barra inferior del chat: botones reducidos a 30px, padding `10px 12px`, gap `6px`, min-height `52px`
- Input del chat: padding `6px 14px`, font-size `0.875rem`

### Arreglado
- **"Omega 3" ya no se borra de transcripciones de voz** — el strip solo elimina "omia", preservando todas las menciones del producto

---

## [3.4.0] - 2026-01-28

### Añadido
- **Wake word "Hola Omega"** - Activación por voz con SpeechRecognition (renombrado a "Hola Omia" en v3.5.0)
  - Detecta "Hola Omega", "Hey Omega", "Oye Omega", "OK Omega" o simplemente "Omega"
  - Patterns flexibles sin `\b` para compatibilidad con transcripción española
  - `maxAlternatives: 3` — comprueba múltiples hipótesis del reconocedor
  - Auto-restart rápido (150ms) cuando Chrome detiene el modo continuo por silencio
  - Beep de confirmación audible (880Hz sine, 250ms) al detectar wake word
  - Toggle "Micro off" / "Micro on" en header (welcome + chat) con icono dinámico
  - Botón coherente con el estilo de la barra: outlined pill, tonal fill al activar
  - Toast visual "Omega te escucha..." al detectar wake word
  - Se pausa durante grabación y se reanuda tras transcripción
  - Estado persistido en localStorage
- **Bot renombrado a "Omega"** - El asistente se llama "Omega" en el chat header, título de página, greeting y infografías
- **Logo Puro Omega** - Integrado en el header de la app
- **Selector de modo de respuesta** - Resumida / Extendida antes de cada consulta
  - Templates por agente: productos (tabla + dato diferenciador), objeciones (tabla + guion), argumentos (insight + guion)
  - Solo aparece para consultas pharma reales (whitelist de keywords)
- **Detección de consultas pharma (whitelist)** - `isActionableQuery()` en frontend y `is_greeting_or_vague()` en backend
  - Saludos y frases vagas se envían directo sin selector de formato
  - Respuesta de greeting sin Unicode emojis, compatible con Phosphor Icons
- **Cobertura RAG baja: redirección** - Respuesta corta sin argumentario fabricado
  - No inventa cifras ni porcentajes
  - Usa consenso médico general sin datos exactos
  - Sugiere 2-3 preguntas sobre temas cubiertos por Puro Omega
- **Infografía** - Backend handler + html2canvas CDN + render/download PNG (deshabilitado temporalmente)
- **Persistencia de chat** - Respuestas se guardan en búsquedas recientes vía `updateRecentSearchAnswer()`
- **System prompts CO-STAR** - Agentes con técnicas de venta completas
  - Productos: FAB + Anchoring + Autoridad
  - Objeciones: Feel-Felt-Found + Boomerang + Aversión a la pérdida
  - Argumentos: SPIN Selling + Challenger Sale + Social Proof + Prescription Pathway

### Cambiado
- **Orquestador**: migrado a Kimi K2 (`moonshotai/kimi-k2-instruct`) vía Groq
- **Cobertura RAG media**: marcador `*(fuente externa no empresarial)*` obligatorio para datos no-RAG
- **Cobertura RAG alta**: complemento externo solo para datos críticos faltantes
- **max_tokens**: 400 (low coverage) / 500 (short) / 1000 (extended)

### Arreglado
- **Wake word no se envía como mensaje** — `stripWakeWord()` limpia "Hola Omega" de la transcripción antes de enviar al chat; si solo se dijo el wake word, se ignora
- Selector de formato ya no aparece para mensajes absurdos o saludos
- Greeting response usa markdown compatible con `enrichWithIcons()` (Phosphor, no Unicode)
- Cobertura RAG baja ya no genera argumentarios completos con datos inventados

---

## [3.3.0] - 2026-01-27

### Investigación y análisis

- **Diagnóstico del sistema RAG** - Análisis completo del pipeline de respuestas
  - `addMessage()` en `app.js` usa `textContent` — markdown no se renderiza (asteriscos literales)
  - System prompts sin formato obligatorio de salida (no templates, no secciones)
  - Muletilla "Basándome en la información proporcionada" no prohibida en prompts
  - Sin optimización para TTS (frases largas, markdown leído literalmente)
  - Contexto RAG inyectado como Q&A raw sin estructura
- **Análisis de system prompts** - Revisión de los 3 agentes especializados
  - `agent_productos.py`: instrucciones vagas ("Sé técnico pero comprensible"), sin template
  - `agent_objeciones.py`: técnica de 4 pasos pero sin formato markdown obligatorio
  - `agent_argumentos.py`: estructura de 5 pasos pero sin enforcement de formato
  - Ningún agente prohíbe frases de relleno ni define secciones obligatorias
- **Comparativa de LLMs para formato estructurado** - Evaluación de 4 modelos en Groq
  - Llama 3.3 70B: bueno en formato, MMLU 86%, MGSM 91.1, ~1200 tok/s
  - Llama 4 Scout (17B MoE, 16 expertos): Meta corrigió "headers, lists, tables", ~2600 tok/s, $0.11/1M tokens
  - Llama 4 Maverick (17B MoE, 128 expertos): más potente que Scout, más caro
  - **Kimi K2** (1T total, 32B activos, 384 expertos): **9.25/10 en markdown** (empata con Claude Opus 4), **100% conformance** en structured output con JSON schema
- **Investigación de mejores prácticas RAG**
  - Framework CO-STAR (Context, Objective, Style, Tone, Audience, Response) para prompts médicos/pharma
  - Markdown-KV: mejor formato de entrada tabular para LLMs (60.7% accuracy, +16pp sobre CSV)
  - `marked.js` (~28KB) para renderizado markdown → HTML en el frontend
  - DOMPurify para sanitización de HTML generado
  - Strip de markdown antes de TTS + frases cortas (max 20 palabras)

### Decisiones tomadas

- **LLM seleccionado**: Kimi K2 en Groq (`moonshotai/kimi-k2-instruct`) — ya se dispone de API key Groq
- **Plan de mejora en 5 pasos**:
  1. Reescribir system prompts con CO-STAR + templates obligatorios
  2. Migrar LLM de DeepSeek a Kimi K2 en Groq
  3. Agregar `marked.js` para renderizado de markdown en burbujas de chat
  4. CSS para tablas, negritas, listas dentro de mensajes del asistente
  5. Post-procesamiento TTS: strip markdown antes de lectura en voz alta

---

## [3.2.0] - 2026-01-27

### Añadido
- **Phosphor Icons** - Migración completa de Material Symbols Rounded a Phosphor Icons
  - 3 pesos cargados via CDN: regular, bold, fill
  - 20+ iconos mapeados: help→question, menu_book→book-open, send→paper-plane-tilt, etc.
- **Chat bottom bar estilo nav** - Barra inferior del chat rediseñada
  - Estilo floating con rounded corners, elevation shadow, backdrop blur
  - Layout: [camera] [mic] [input] [send] con botones 48px
  - Min-height 72px, mismo estilo visual que `plan-bottom-nav`
- **Chat header con orb** - Top bar del chat con back, orb animado, título y help
- **Burbujas de chat rediseñadas** - Avatar orb encima de mensajes del asistente, full-width
- **Pantalla de Plan** - Dashboard con estadísticas y tareas
  - Stats grid: en proceso, pendientes, atrasadas, proyectos, total
  - Sparklines SVG en cada stat card
  - Filtros por overview (Semana/Mes/Todo) y por estado/proyecto
  - Tareas agrupadas por estado con fechas relativas (Hoy, Mañana, etc.)
  - Bottom nav con orb central, chat y add buttons
- **Aurora gradient background** - Fondo multi-blob con gradientes radiales corporativos
  - Glassmorphism (frosted glass) en tarjetas bento y búsquedas recientes
- **Búsquedas recientes** - Sistema de historial con localStorage
  - Clasificación automática por tipo (producto, objeción, argumento, voz)
  - Iconos contextuales según tipo de consulta
  - Seed data con 2 respuestas hardcodeadas de ejemplo
  - Click en búsqueda reabre el chat con pregunta y respuesta

### Cambiado
- **Paleta de color**: cyan agresivo #31BEEF → Deep Blue #2D5BA0 en botones, iconos y acentos
- Foto de perfil aumentada de 40px a 52px
- Tarjeta plan renombrada: "Mi plan" → "Mis tareas"
- Border-radius unificado en bottom nav del plan
- Iconos de toda la app migrados a sintaxis Phosphor (`<i class="ph ph-icon">`)
- CSS: selectores `.material-symbols-rounded` → `.ph` en todos los componentes
- JS: templates de búsquedas recientes y tareas del plan usan Phosphor

### Eliminado
- Dependencia de Google Material Symbols Rounded (CSS CDN)
- Estilos CSS de `.chat-input-container`, `.chat-action-btn`, `.chat-send-btn` (reemplazados por nav-bar)
- Orb flotante (mini orb) — eliminado del CSS y JS
- Referencias a `font-variation-settings` para iconos activos

---

## [3.1.0] - 2026-01-27

### Añadido
- **Mood Overlay** - Pantalla completa con cara SVG kawaii animada
  - Slider 0–100 que anima ojos y boca en tiempo real
  - Labels: MAL / NO MUY BIEN / BIEN según rango
  - Reacción AI contextual al enviar mood
  - Persistencia en localStorage con reset diario (solo estado interno, UI limpia)
- **Orb mood presets** - 3 niveles de movimiento según ánimo
  - `a` Brisa suave (mood triste): movimiento calmado
  - `b` Oleaje vivo (mood neutral): movimiento moderado
  - `c` Tormenta líquida (mood feliz): movimiento intenso
- **Global mood tinting** - El color del mood tiñe sutilmente (18%) las partículas del orb
- **Bento card grid** - Layout tipo bento: mood card (tall), orb card, plan card
- **FAQ por agentes** - Sección con chips organizados por Productos, Objeciones, Argumentos
  - Descripción explicando el sistema de agentes especializados
- `static/orb-preview.html` - Página de previsualización para comparar los 3 presets del orb

### Cambiado
- Cara SVG de la tarjeta mood refleja el estado actual (ojos + boca)
- Texto de tarjeta mood cambia a "Hoy: BIEN" tras enviar
- Orb en tarjeta "Habla conmigo" se activa como punto de entrada a voz
- Border-radius de barra de búsqueda: `--md-sys-shape-extra-large` (28px) → `--md-sys-shape-large` (16px) para coherencia visual
- Reducido margin de título FAQ para acomodar descripción

### Eliminado
- Botón de micrófono redundante en barra de búsqueda (la tarjeta "Habla conmigo" ya cumple esa función)
- Div de estado de voz (`#voice-status`) de la pantalla principal
- Estilos CSS de `.mic-btn` y `.voice-status` (~70 líneas)

---

## [3.0.0] - 2026-01-26

### Cambiado
- **Arquitectura migrada a FastAPI + Frontend Custom** para control total de UI
- Backend con WebSocket para streaming en tiempo real
- Frontend HTML/CSS/JS completamente personalizable
- Pantalla de bienvenida con Orb 3D + saludo "Hola, Armando"

### Añadido
- `main.py` - Backend FastAPI con WebSocket y API REST
- `static/index.html` - Frontend con pantalla de bienvenida + chat
- `static/style.css` - Estilos Material Design 3, colores corporativos, mobile-first
- `static/app.js` - Lógica de chat + WebSocket + voz (STT/TTS)
- `static/orb.js` - Orb 3D con Canvas 2D, partículas Fibonacci, efecto gota de agua
- **Entrada de voz** - MediaRecorder + Whisper large-v3 (Groq) gratuito
- **Salida de voz** - Text-to-Speech nativo del navegador (es-ES)
- Endpoint `/api/voice` para transcripción de audio
- Endpoint `/ws/chat` para chat con streaming
- Soporte para español en reconocimiento de voz

### Eliminado
- Dependencias de Gradio y Chainlit
- Archivos de configuración legacy

### Mantenido
- Sistema multi-agente (Orquestador + 3 agentes especializados)
- Motor RAG con TF-IDF y búsqueda semántica
- Base de conocimiento con 215 pares Q&A
- Integración con DeepSeek API

## [1.0.0] - 2026-01-24

### Añadido
- **Sistema Multi-Agente** con orquestador inteligente
  - Clasificación de intención con LLM
  - Agente Productos (información técnica)
  - Agente Objeciones (manejo de dudas)
  - Agente Argumentos (estrategias de venta)
- **Motor RAG** con TF-IDF
  - 215 pares pregunta-respuesta
  - Búsqueda semántica por cosine similarity
  - Contexto relevante para cada respuesta
- **Integración DeepSeek API**
  - Compatible con OpenAI SDK
  - Streaming de respuestas

## [0.1.0] - 2026-01-20

### Añadido
- Estructura inicial del proyecto
- Base de conocimiento JSON
- Fichas de producto (documentos fuente)
- Configuración de entorno (.env.example)

---

## Tipos de cambios

- **Añadido**: Nuevas funcionalidades
- **Cambiado**: Cambios en funcionalidades existentes
- **Obsoleto**: Funcionalidades que serán eliminadas
- **Eliminado**: Funcionalidades eliminadas
- **Arreglado**: Corrección de bugs
- **Seguridad**: Correcciones de vulnerabilidades
