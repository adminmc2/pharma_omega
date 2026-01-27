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
| - | Logo Puro Omega | ⏳ | Añadir al header |
| - | Dockerfile | ⏳ | Para HF Spaces |
| - | README HF metadata | ⏳ | Configurar |
| - | Subir a HF Spaces | ⏳ | Deploy |
| - | Probar producción | ⏳ | Test en HF |
| - | Compartir URL | ⏳ | Con el equipo |
| - | Test voz E/S | ⏳ | Prueba completa entrada + salida |
| - | Test móvil | ⏳ | Dispositivo real |

**Leyenda:** ✅ Completado | ⏳ Pendiente | ❌ Bloqueado

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
