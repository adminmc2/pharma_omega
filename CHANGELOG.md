# Changelog

Todos los cambios notables del proyecto Puro Omega.

---

## Tareas Pendientes v3.0

### Registro de Progreso

| Fecha | Tarea | Estado | Observaciones |
|-------|-------|--------|---------------|
| 26-ene-26 | Verificar `main.py` arranca | ✅ | Corregido: acceso a RAG, route_query(), Groq opcional, módulo groq instalado |
| 26-ene-26 | Probar `/api/health` | ✅ | OK: status ok, 3 agentes, 215 docs |
| - | Probar `/api/voice` | ⏳ | Requiere GROQ_API_KEY |
| 26-ene-26 | Probar WebSocket `/ws/chat` | ✅ | Streaming OK, clasificación correcta productos/objeciones |
| 26-ene-26 | Configurar .env (GROQ) | ✅ | API key añadida al .env |
| 26-ene-26 | Crear `style.css` | ✅ | Mobile First, colores corporativos, responsive tablet/desktop |
| 26-ene-26 | Crear `app.js` | ✅ | WebSocket, chat streaming, STT (Groq), TTS (Web Speech API) |
| 26-ene-26 | Crear `orb.js` | ✅ | Esfera 3D con shaders, partículas, animación fluida |
| 26-ene-26 | Entrada de voz | ✅ | MediaRecorder + Whisper transcription |
| 26-ene-26 | Salida de voz (TTS) | ✅ | Web Speech API con voz es-ES |
| - | Logo Puro Omega | ⏳ | Añadir al header |
| - | Diseño responsive | ⏳ | Probar en móvil |
| 26-ene-26 | Cuenta Groq creada | ✅ | Email personal de Google (GitHub no funcionaba) |
| 26-ene-26 | API key Groq | ✅ | Configurada en .env |
| - | Transcripción español | ⏳ | Probar con audio real |
| - | TTS navegador | ⏳ | Web Speech API |
| - | Voz es-ES | ⏳ | Ajustar configuración |
| 26-ene-26 | Orquestador clasificación | ✅ | Ruteo correcto por reglas |
| 26-ene-26 | Agente productos | ✅ | Respuestas con contexto RAG, 5 docs |
| 26-ene-26 | Agente objeciones | ✅ | Manejo correcto de objeción de precio |
| - | Agente argumentos | ⏳ | Probar respuestas |
| - | Contexto RAG | ⏳ | Verificar en respuestas |
| - | Dockerfile | ⏳ | Para HF Spaces |
| - | README HF metadata | ⏳ | Configurar |
| - | Subir a HF Spaces | ⏳ | Deploy |
| - | Probar producción | ⏳ | Test en HF |
| - | Compartir URL | ⏳ | Con el equipo |
| - | Test flujo chat | ⏳ | Completo |
| - | Test voz E/S | ⏳ | Entrada + salida |
| - | Test móvil | ⏳ | Dispositivo real |
| - | Colores corporativos | ⏳ | Verificar |
| - | Mensajes error | ⏳ | Revisar UX |

**Leyenda:** ✅ Completado | ⏳ Pendiente | ❌ Bloqueado

---

## [3.0.0] - 2026-01-26

### Cambiado
- **Arquitectura migrada a FastAPI + Frontend Custom** para control total de UI
- Backend con WebSocket para streaming en tiempo real
- Frontend HTML/CSS/JS completamente personalizable
- Header con Orb 3D animado (Three.js) + saludo "Hola, Usuario"

### Añadido
- `main.py` - Backend FastAPI con WebSocket y API REST
- `static/index.html` - Frontend principal
- `static/style.css` - Estilos corporativos completos
- `static/app.js` - Lógica de chat + WebSocket + voz
- `static/orb.js` - Orb 3D animado con Three.js
- **Entrada de voz** - Micrófono con Whisper (Groq) gratuito
- **Salida de voz** - Text-to-Speech nativo del navegador
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
