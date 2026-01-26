# Changelog

Todos los cambios notables del proyecto Puro Omega.

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
