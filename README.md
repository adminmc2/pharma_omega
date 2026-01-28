---
title: Omia - Puro Omega
emoji: 🌊
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
license: mit
app_port: 7860
---

# Puro Omega - Asistente de Ventas IA

Chatbot multi-agente con RAG para representantes de ventas farmacéuticos de Puro Omega (suplementos Omega-3).

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│           FRONTEND CUSTOM (HTML/CSS/JS)                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │     Header: "Hola, Usuario" + Orb 3D Animado    │   │
│  ├─────────────────────────────────────────────────┤   │
│  │                                                  │   │
│  │              Área de Chat                        │   │
│  │         (Streaming de respuestas)               │   │
│  │                                                  │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  [Input]  [🎤 Mic]  [🔊 TTS]  [Enviar]          │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ WebSocket
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   FastAPI Backend                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │  /ws/chat  │  │ /api/voice │  │  /static   │        │
│  │ (streaming)│  │  (Whisper) │  │  (files)   │        │
│  └─────┬──────┘  └─────┬──────┘  └────────────┘        │
│        │               │                                │
│        └───────┬───────┘                                │
│                ▼                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Orquestador Multi-Agente              │   │
│  │    productos | objeciones | argumentos          │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐  ┌────────────┐  ┌──────────┐
    │   RAG    │  │  DeepSeek  │  │   Groq   │
    │ (TF-IDF) │  │    API     │  │ Whisper  │
    │ 215 Q&A  │  │  (Chat)    │  │  (STT)   │
    └──────────┘  └────────────┘  └──────────┘
```

## Tecnologías

| Componente | Tecnología | Costo |
|------------|------------|-------|
| **Frontend** | HTML/CSS/JS + Three.js | Gratis |
| **Backend** | FastAPI + WebSocket | Gratis |
| **LLM (Chat)** | DeepSeek API | Bajo costo |
| **Speech-to-Text** | Whisper via Groq | Gratis |
| **Text-to-Speech** | Web Speech API | Gratis |
| **RAG** | TF-IDF + Cosine Similarity | Gratis |
| **Deploy** | Hugging Face Spaces | Gratis |

## Estructura del Proyecto

```
puro_omega/
├── main.py                # FastAPI backend (WebSocket + API)
├── requirements.txt       # Dependencias
├── knowledge_base.json    # Base de conocimiento (215 Q&A)
├── .env                   # Variables de entorno
├── static/
│   ├── index.html         # Frontend principal
│   ├── style.css          # Estilos corporativos
│   ├── app.js             # Chat + WebSocket + Voice
│   └── orb.js             # Orb 3D animado (Three.js)
└── agents/
    ├── __init__.py
    ├── orchestrator.py    # Orquestador multi-agente
    ├── base_agent.py      # Clase base de agentes
    ├── agent_productos.py # Agente de productos
    ├── agent_objeciones.py# Agente de objeciones
    ├── agent_argumentos.py# Agente de argumentos
    └── rag_engine.py      # Motor RAG con TF-IDF
```

## Instalación

```bash
# Clonar repositorio
git clone https://github.com/adminmc2/pharma_omega.git
cd pharma_omega

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus API keys
```

## Configuración

### Variables de Entorno (.env)
```
DEEPSEEK_API_KEY=tu_deepseek_api_key
GROQ_API_KEY=tu_groq_api_key
```

## Ejecución

```bash
python main.py
# Abre http://localhost:7860
```

## Funcionalidades

### Entrada de Voz
- Micrófono para dictar mensajes
- Transcripción con Whisper (Groq) - Gratis
- Soporte para español

### Salida de Voz
- Text-to-Speech nativo del navegador
- Lectura de respuestas del asistente

### Chat Inteligente
- Streaming de respuestas en tiempo real
- Historial de conversación
- Indicador del agente usado

## Agentes Especializados

### Agente Productos
- Información técnica de productos
- Indicaciones clínicas
- Dosis y presentaciones
- Tecnología rTG y certificaciones

### Agente Objeciones
- Manejo de objeciones de precio
- Respuestas sobre eficacia
- Dudas de seguridad
- Comparativas con competencia

### Agente Argumentos
- Estrategias por especialidad médica
- Perfiles de paciente ideal
- Argumentos de venta
- Diferenciación competitiva

## Portafolio de Productos

| Línea | Productos |
|-------|-----------|
| **Essential** | Natural DHA, DHA Embarazo, DHA Vegan, Natural EPA, Puro EPA, Omega-3 Líquido |
| **Complex** | Curcumin, Ginkgo, Schisandra, Ubiquinol & PQQ |
| **Intense** | Pro-Resolving Mediators |
| **Diagnóstico** | Omega-3 Index Complete |

## Design System

### Colores Corporativos
- **Prisma Navy**: #101B2C
- **Prisma Carbon**: #36454F
- **Clinical White**: #FAF9F6
- **Tech Cyan**: #31BEEF
- **Visionary Violet**: #994E95
- **Soft Blue**: #A1B8F2

### Tipografía
- **Títulos**: Quicksand (500, 600, 700)
- **Cuerpo**: Source Sans 3 (400, 500, 600)

## Deploy en Hugging Face Spaces

1. Crear Space en huggingface.co/spaces
2. Seleccionar SDK: Docker o Static
3. Conectar con repositorio de GitHub
4. Configurar Secrets:
   - `DEEPSEEK_API_KEY`
   - `GROQ_API_KEY`
5. El Space se actualiza automáticamente con cada push

## API Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/` | GET | Frontend principal |
| `/ws/chat` | WebSocket | Chat con streaming |
| `/api/voice` | POST | Transcripción de audio |
| `/api/health` | GET | Health check |

## Licencia

Proyecto propietario - Puro Omega / MC2 Therapeutics

---

*Sistema RAG Multi-Agente | v3.0 | Enero 2026*
