"""
Omia - Asistente de Ventas RAG v3.0
Backend FastAPI con WebSocket para streaming
"""

import os
import re
import json
import asyncio
from typing import Optional
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from groq import Groq

# Importar sistema de agentes
from agents.orchestrator import Orchestrator

load_dotenv()

# Clientes API
groq_api_key = os.getenv("GROQ_API_KEY")

# Cliente Groq para LLM (Kimi K2) — usando OpenAI SDK compatible
llm_client = OpenAI(
    api_key=groq_api_key,
    base_url="https://api.groq.com/openai/v1"
) if groq_api_key else None

LLM_MODEL = "moonshotai/kimi-k2-instruct"

# Modelo dedicado para infografías (JSON estructurado) — Llama 3.3 es más fiable para JSON
INFOGRAPHIC_MODEL = "llama-3.3-70b-versatile"

# Prompt para generación de infografías resumidas
INFOGRAPHIC_PROMPT = """Eres un diseñador de infografías médicas. Tu tarea es convertir la respuesta de un agente de ventas farmacéutico en un JSON estructurado para renderizar una infografía visual.

REGLAS ESTRICTAS:
1. Responde SOLO con JSON válido, sin markdown ni texto adicional.
2. Máximo 4 secciones.
3. Máximo 3 puntos por sección.
4. Cada punto máximo 100 caracteres.
5. Título máximo 60 caracteres.
6. Subtítulo máximo 80 caracteres.
7. Frase clave máximo 150 caracteres.
8. Prioriza datos concretos: cifras, porcentajes, nombres de estudios, dosis.
9. Determina color_tema según el contenido:
   - "productos" si habla de composición, dosis, FAB, especificaciones técnicas
   - "objeciones" si maneja dudas, precio, eficacia, seguridad, rebate
   - "argumentos" si presenta estrategia de venta, SPIN, argumentario, cierre

SCHEMA JSON:
{
  "titulo": "string (max 60 chars)",
  "subtitulo": "string (max 80 chars)",
  "color_tema": "productos | objeciones | argumentos",
  "secciones": [
    {
      "icono": "nombre icono Phosphor sin prefijo ph- (ej: heart-pulse, shield-check, trend-up, pill, flask, chart-line, clipboard-text, user, star)",
      "titulo": "string (max 40 chars)",
      "puntos": ["string max 100 chars", "..."]
    }
  ],
  "producto_destacado": {
    "nombre": "string o null",
    "dosis": "string o null",
    "indicacion": "string o null"
  },
  "frase_clave": "string o null (max 150 chars) — la frase más impactante para el médico",
  "datos_tabla": [
    { "etiqueta": "string corto", "valor": "string con número/dato" }
  ]
}

Extrae la información más relevante y visual. Si no hay producto específico, pon null. datos_tabla debe tener 2-4 entradas con los KPIs más impactantes."""

# Cliente Groq nativo (para transcripción de voz con Whisper)
groq_client = Groq(api_key=groq_api_key) if groq_api_key else None

if not groq_api_key:
    print("⚠️  GROQ_API_KEY no configurada - LLM y transcripción deshabilitados")

# ElevenLabs TTS (voz de Omia)
elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY")
elevenlabs_voice_id = os.getenv("ELEVENLABS_VOICE_ID", "NWqMOQLlMBaUbjKYdhbW")

if not elevenlabs_api_key:
    print("⚠️  ELEVENLABS_API_KEY no configurada - TTS deshabilitado")

# Orquestador de agentes
orchestrator: Optional[Orchestrator] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializar el orquestador al arrancar"""
    global orchestrator
    print("Inicializando sistema multi-agente...")
    orchestrator = Orchestrator()
    # Acceder al RAG a través de cualquier agente (comparten la misma instancia singleton)
    rag = orchestrator.agents['productos'].rag
    print(f"Sistema listo. Base de conocimiento: {len(rag.qa_pairs)} documentos")
    yield
    print("Cerrando aplicación...")

app = FastAPI(
    title="Omia - Asistente de Ventas",
    version="3.0.0",
    lifespan=lifespan
)

# Servir archivos estáticos
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    """Servir el frontend principal"""
    return FileResponse("static/index.html")


@app.get("/api/health")
async def health_check():
    """Verificar estado del sistema"""
    return {
        "status": "ok",
        "version": "3.0.0",
        "agents": ["productos", "objeciones", "argumentos"],
        "knowledge_base_size": len(orchestrator.agents['productos'].rag.qa_pairs) if orchestrator else 0
    }


@app.get("/api/test-infographic")
async def test_infographic():
    """Endpoint de diagnóstico para probar la generación de infografías"""
    if not llm_client:
        return {"success": False, "error": "LLM client no configurado (falta GROQ_API_KEY)"}

    test_text = "Puro Omega 3 TG contiene 900mg de EPA+DHA por cápsula. Indicado para hipertrigliceridemia. Reducción de triglicéridos del 30% en 8 semanas según estudios clínicos."

    try:
        data = await asyncio.to_thread(_generate_infographic_sync, test_text)
        return {"success": True, "model": INFOGRAPHIC_MODEL, "data": data}
    except Exception as e:
        import traceback
        return {
            "success": False,
            "model": INFOGRAPHIC_MODEL,
            "error": str(e),
            "traceback": traceback.format_exc()
        }


class InfographicRequest(BaseModel):
    agent_response: str


@app.post("/api/infographic")
async def generate_infographic(req: InfographicRequest):
    """Generar infografía JSON a partir de la respuesta del agente"""
    if not llm_client:
        raise HTTPException(status_code=503, detail="LLM client no configurado")

    if not req.agent_response.strip():
        raise HTTPException(status_code=400, detail="agent_response vacío")

    try:
        data = await asyncio.to_thread(_generate_infographic_sync, req.agent_response)
        return {"success": True, "data": data}
    except Exception as e:
        print(f"[Infographic] Error: {e}")
        return {"success": False, "error": str(e)}


@app.post("/api/voice")
async def transcribe_voice(audio: UploadFile = File(...)):
    """
    Transcribir audio a texto usando Whisper (Groq)
    Soporta: webm, mp3, wav, m4a, ogg
    """
    # Verificar si Groq está configurado
    if not groq_client:
        return {"text": "", "success": False, "error": "GROQ_API_KEY no configurada"}

    try:
        # Leer el archivo de audio
        audio_bytes = await audio.read()

        # Crear archivo temporal para Groq (usar /tmp para permisos en Docker)
        import tempfile
        ext = audio.filename.split('.')[-1] if audio.filename else 'webm'
        temp_filename = os.path.join(tempfile.gettempdir(), f"temp_audio_{os.getpid()}.{ext}")

        with open(temp_filename, "wb") as f:
            f.write(audio_bytes)

        # Transcribir con Whisper via Groq
        with open(temp_filename, "rb") as audio_file:
            transcription = groq_client.audio.transcriptions.create(
                model="whisper-large-v3",
                file=audio_file,
                language="es"
            )

        # Limpiar archivo temporal
        os.remove(temp_filename)

        return {"text": transcription.text, "success": True}

    except Exception as e:
        return {"text": "", "success": False, "error": str(e)}


# Prompt para generar resumen conversacional para TTS
TTS_SUMMARY_PROMPT = """Eres Omia, una asistente de ventas de Puro Omega. Convierte la siguiente respuesta escrita en un RESUMEN HABLADO conversacional y natural.

REGLAS:
1. Habla como si estuvieras conversando con el representante de ventas, en tono cercano y profesional.
2. NUNCA leas tablas, filas, columnas, pipes (|), separadores (---) ni datos tabulares. Extrae solo los 2-3 datos más relevantes de la tabla y menciónalos de forma conversacional. Ejemplo: "El Natural DHA tiene 250 miligramos de DHA y está indicado para embarazadas."
3. Máximo 3-4 oraciones (50-80 palabras). Sé concisa pero informativa.
4. Menciona solo el dato más importante (nombre de producto, dosis clave, o argumento principal).
5. Si hay un guion sugerido para el médico, menciónalo brevemente: "podrías decirle al doctor..."
6. NO uses markdown, asteriscos, viñetas, listas ni formato. Solo texto plano corrido para ser leído en voz alta por un sintetizador de voz.
7. NO digas "aquí tienes", "en resumen", "la respuesta es". Ve directo al contenido.
8. Usa vocabulario mexicano natural: "mira", "fíjate que", "lo que te recomiendo es".
9. Termina con algo útil: un tip, una frase para el médico, o un dato que el representante pueda recordar fácilmente.
10. NUNCA incluyas caracteres especiales como |, *, #, >, -, ni guiones al inicio de líneas. El texto debe sonar 100% natural al escucharlo."""


def _generate_tts_summary(agent_response: str) -> str:
    """Genera un resumen conversacional corto del texto del agente para TTS."""
    if not llm_client:
        return ""

    try:
        response = llm_client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": TTS_SUMMARY_PROMPT},
                {"role": "user", "content": agent_response}
            ],
            stream=False,
            max_tokens=200,
            temperature=0.6
        )
        summary = response.choices[0].message.content.strip()
        # Limpiar cualquier markdown residual
        summary = re.sub(r'\*+', '', summary)           # bold/italic
        summary = re.sub(r'#{1,6}\s+', '', summary)     # headings
        summary = re.sub(r'^>\s*', '', summary, flags=re.MULTILINE)  # blockquotes
        summary = re.sub(r'\|', ' ', summary)            # table pipes
        summary = re.sub(r'^[\s\-:]+$', '', summary, flags=re.MULTILINE)  # table separators (---|---)
        summary = re.sub(r'^[-•]\s+', '', summary, flags=re.MULTILINE)    # list bullets
        summary = re.sub(r'^\d+\.\s+', '', summary, flags=re.MULTILINE)   # numbered lists
        summary = re.sub(r'\s{2,}', ' ', summary)       # collapse multiple spaces
        summary = re.sub(r'\n{2,}', '. ', summary)      # multiple newlines → period
        summary = summary.strip()
        print(f"[TTS] Summary ({len(summary)} chars): {summary[:100]}...")
        return summary
    except Exception as e:
        print(f"[TTS] Error generating summary: {e}")
        return ""


class TTSRequest(BaseModel):
    text: str
    skip_summary: bool = False  # True = send text directly to ElevenLabs without LLM summary


@app.post("/api/tts")
async def text_to_speech(req: TTSRequest):
    """Genera audio TTS via ElevenLabs.
    1. El LLM resume la respuesta en un discurso conversacional corto (unless skip_summary).
    2. Ese resumen se envía a ElevenLabs para generar audio."""
    if not elevenlabs_api_key:
        raise HTTPException(status_code=503, detail="ELEVENLABS_API_KEY no configurada")

    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Texto vacío")

    # Paso 1: Generar resumen conversacional con el LLM (or use text directly)
    if req.skip_summary:
        summary = req.text.strip()
    else:
        summary = await asyncio.to_thread(_generate_tts_summary, req.text)
        if not summary:
            raise HTTPException(status_code=500, detail="No se pudo generar resumen para TTS")

    # Paso 2: Enviar resumen a ElevenLabs
    url = (
        f"https://api.elevenlabs.io/v1/text-to-speech/{elevenlabs_voice_id}/stream"
        f"?output_format=mp3_44100_128"
    )
    headers = {
        "xi-api-key": elevenlabs_api_key,
        "Content-Type": "application/json",
    }
    body = {
        "text": summary,
        "model_id": "eleven_multilingual_v2",
        "language_code": "es",
        "voice_settings": {
            "stability": 0.35,          # Más bajo = más expresiva y natural
            "similarity_boost": 0.80,   # Mantener la voz reconocible
            "style": 0.45,              # Más estilo = más emocional/cálida
            "use_speaker_boost": True,
        },
    }

    async def stream_audio():
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("POST", url, headers=headers, json=body) as resp:
                if resp.status_code != 200:
                    error_body = await resp.aread()
                    print(f"[TTS] ElevenLabs error {resp.status_code}: {error_body[:200]}")
                    return
                async for chunk in resp.aiter_bytes(chunk_size=4096):
                    yield chunk

    return StreamingResponse(
        stream_audio(),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-cache"},
    )


def _generate_infographic_sync(agent_response: str) -> dict:
    """Llamada sincrónica al LLM para generar infografía (se ejecuta en thread pool)"""
    print(f"[Infographic] Llamando a {INFOGRAPHIC_MODEL} con {len(agent_response)} chars...")
    response = llm_client.chat.completions.create(
        model=INFOGRAPHIC_MODEL,
        messages=[
            {"role": "system", "content": INFOGRAPHIC_PROMPT},
            {"role": "user", "content": agent_response}
        ],
        stream=False,
        max_tokens=1500,
        temperature=0.3,
        response_format={"type": "json_object"}
    )
    raw = response.choices[0].message.content.strip()
    print(f"[Infographic] Respuesta raw ({len(raw)} chars): {raw[:200]}...")
    # Limpiar posibles bloques markdown ```json ... ```
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3].strip()
    return json.loads(raw)


async def handle_infographic_request(websocket: WebSocket, agent_response: str):
    """Genera una infografía resumida a partir de la respuesta del agente"""
    print(f"[Infographic] Recibida solicitud ({len(agent_response)} chars)")
    await websocket.send_json({"type": "infographic_loading"})
    try:
        # Ejecutar en thread pool para no bloquear el event loop
        data = await asyncio.to_thread(_generate_infographic_sync, agent_response)
        print(f"[Infographic] JSON generado: {data.get('titulo', '?')}")
        await websocket.send_json({"type": "infographic_data", "data": data})
    except json.JSONDecodeError as e:
        await websocket.send_json({
            "type": "infographic_error",
            "message": f"Error al parsear JSON de infografía: {str(e)}"
        })
    except Exception as e:
        await websocket.send_json({
            "type": "infographic_error",
            "message": f"Error generando infografía: {str(e)}"
        })


def strip_wake_word(message: str) -> str:
    """Elimina variantes del wake word 'Hola Omia' del mensaje.
    Si lo que queda es solo un saludo vacío, retorna cadena vacía."""
    import unicodedata
    t = message.strip()
    # Remove wake word patterns (case-insensitive)
    wake_patterns = [
        r'(?:hola|hey|oye|ok|ola)\s*om[ií]a',
        r'\bom[ií]a\b',
    ]
    for p in wake_patterns:
        t = re.sub(p, '', t, flags=re.IGNORECASE).strip()
    # Remove leftover punctuation/whitespace
    t = re.sub(r'^[,\s.!?]+', '', t).strip()
    # If only a bare greeting remains, return empty
    bare = unicodedata.normalize('NFD', t.lower())
    bare = re.sub(r'[\u0300-\u036f]', '', bare).strip()
    if re.match(r'^(hola|hey|oye|ok|buenas?|buenos?|que tal|como estas?|gracias?|adios|hasta luego)?[.!?,\s]*$', bare):
        return ''
    return t


def is_greeting_or_vague(message: str) -> bool:
    """Detecta si un mensaje NO contiene consulta pharma real.
    Usa whitelist: si no hay ninguna palabra clave del dominio, es vago."""
    import unicodedata
    t = unicodedata.normalize('NFD', message.lower().strip())
    t = re.sub(r'[\u0300-\u036f]', '', t)  # quitar acentos

    # Palabras clave que indican consulta real sobre el dominio pharma/ventas
    pharma_patterns = [
        # Productos y sustancias
        r'omega', r'\bepa\b', r'\bdha\b', r'capsul', r'suplemento',
        r'aceite', r'pescado', r'\brtg\b', r'etil', r'triglicerido',
        r'natural dha', r'puro epa', r'resolving', r'\bprm\b',
        # Médico / clínico
        r'medico', r'doctor', r'paciente', r'prescri', r'dosis',
        r'posologi', r'indicaci', r'tratamiento', r'clinico',
        r'embaraz', r'cardio', r'gineco', r'neuro', r'pediatr',
        r'psiquiatr', r'reumat', r'dermato', r'oftalmol', r'urolog',
        r'endocrino', r'gastro', r'neumol', r'oncol', r'geriatr',
        r'traumat', r'internist', r'medicina general',
        # Especialidades y condiciones
        r'especialidad', r'especialista', r'colesterol', r'inflamac',
        r'cardiovascular', r'diabetes', r'hipertens', r'artritis',
        r'cerebr', r'cognitiv', r'depres', r'ansiedad', r'retina',
        r'fertil', r'gestacion', r'prenatal', r'menopausia',
        # Objeciones
        r'\bcaro\b', r'costoso', r'precio', r'barato', r'coste',
        r'no funciona', r'no sirve', r'metales pesados',
        r'efecto.? secundario', r'interacci', r'contraindicac',
        r'otra marca', r'competencia', r'objecion',
        # Ventas y argumentos
        r'argumento', r'vender', r'\bventa\b', r'presentar', r'visita',
        r'represent', r'estrategi', r'perfil', r'diferenci',
        r'ventaja', r'evidencia', r'estudio', r'ensayo',
        # Marca
        r'puro omega', r'omega.?3 index', r'\bifos\b', r'certificac',
        # Producto genérico
        r'producto', r'composici', r'concentraci', r'biodisponib',
        r'absorci', r'calidad', r'pureza',
        # Acciones del dominio
        r'recomiend', r'recomendar', r'prescrib', r'comparar', r'comparativ',
        r'que es\b', r'para que sirve', r'como funciona', r'como respondo',
        r'como presento', r'como vendo',
    ]

    return not any(re.search(p, t) for p in pharma_patterns)


GREETING_RESPONSE = """Soy **Omia**, tu asistente de ventas. Para poder ayudarte, cuéntame qué necesitas. Por ejemplo:

- **Producto**: *"¿Qué es Natural DHA y para qué sirve?"*
- **Objeción**: *"Un médico dice que es caro, ¿cómo respondo?"*
- **Argumento**: *"¿Cómo presento Puro Omega a un cardiólogo?"*

> Puedes usar las **preguntas sugeridas** en la pantalla de inicio o escribir tu consulta directamente."""


@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """
    WebSocket para chat con streaming en tiempo real
    """
    await websocket.accept()

    try:
        while True:
            # Recibir mensaje del usuario
            data = await websocket.receive_text()
            message_data = json.loads(data)
            msg_type = message_data.get("type", "chat")

            # Branch: solicitud de infografía
            if msg_type == "infographic_request":
                agent_response = message_data.get("agent_response", "")
                if agent_response.strip():
                    await handle_infographic_request(websocket, agent_response)
                continue

            user_message = message_data.get("message", "")
            response_mode = message_data.get("response_mode", "full")  # "short" o "full"

            if not user_message.strip():
                continue

            # Strip wake word ("Hola Omia") from the message
            cleaned = strip_wake_word(user_message)
            if not cleaned:
                # Message was only a wake word — ignore silently
                continue
            user_message = cleaned

            # Saludos y mensajes vagos: responder directamente sin agente ni RAG
            if is_greeting_or_vague(user_message):
                await websocket.send_json({
                    "type": "agent_info",
                    "agent": "saludo",
                    "context_docs": 0,
                    "rag_coverage": "high",
                    "max_score": 0
                })
                # Enviar en chunks de ~20 chars para simular streaming natural
                chunk_size = 20
                for i in range(0, len(GREETING_RESPONSE), chunk_size):
                    await websocket.send_json({
                        "type": "token",
                        "content": GREETING_RESPONSE[i:i + chunk_size]
                    })
                    await asyncio.sleep(0.02)
                await websocket.send_json({"type": "end"})
                continue

            try:
                # Clasificar intención con reglas (rápido y sin API call)
                intent = orchestrator.classify_intent_rules(user_message)

                # Obtener agente correspondiente
                agent = orchestrator.get_agent(intent)

                # Buscar contexto relevante en RAG
                results = agent.search_knowledge(user_message, top_k=5)
                context = agent.format_context(results, min_score=0.1)

                # Evaluar cobertura RAG
                relevant_docs = [r for r in results if r[1] >= 0.1]
                strong_docs = [r for r in results if r[1] >= 0.35]
                max_score = max((r[1] for r in results), default=0.0)
                rag_coverage = "high" if len(strong_docs) >= 2 else ("medium" if len(relevant_docs) >= 1 else "low")

                # Enviar info del agente + cobertura RAG al frontend
                await websocket.send_json({
                    "type": "agent_info",
                    "agent": intent,
                    "context_docs": len(relevant_docs),
                    "rag_coverage": rag_coverage,
                    "max_score": round(max_score, 2)
                })

                # Instrucciones dinámicas según cobertura RAG
                if rag_coverage == "low":
                    rag_instruction = """⚠️ INSTRUCCIÓN CRÍTICA — COBERTURA RAG: BAJA (la base de conocimiento tiene poca o ninguna información específica para esta consulta).

REGLAS OBLIGATORIAS:
1. NO generes un argumentario completo ni una respuesta extensa. La respuesta debe ser CORTA (máximo 150 palabras).
2. NO inventes cifras, porcentajes ni datos específicos. NUNCA escribas cosas como "reduce el riesgo en un 25%" si ese dato no está en el contexto RAG.
3. SÍ puedes mencionar consenso médico general sin cifras exactas. Ejemplo correcto: "El omega-3 podría contribuir a reducir el riesgo residual cardiovascular." Ejemplo INCORRECTO: "El omega-3 reduce el riesgo cardiovascular en un 25% *(fuente externa)*."
4. Si HAY algún dato relevante en el contexto RAG de arriba (aunque sea tangencial), menciónalo. Esos datos SÍ son verificados de Puro Omega.
5. Sé honesto: indica que no tienes información específica de Puro Omega sobre ese tema exacto.
6. Redirige al usuario hacia temas que SÍ puedes cubrir. Sugiere 2-3 preguntas relacionadas con productos o indicaciones de Puro Omega.

FORMATO OBLIGATORIO para cobertura baja:
## [Tema consultado]

Actualmente no tengo información específica de Puro Omega sobre [tema exacto].

[Si hay datos RAG relevantes: "Sin embargo, en la base de conocimiento de Puro Omega encontré que..." + datos del contexto RAG]

[Si aplica: 1-2 frases de consenso médico general SIN cifras inventadas, usando lenguaje como "podría contribuir", "se ha asociado con", "la evidencia sugiere"]

**Te puedo ayudar con:**
- [Pregunta sugerida 1 sobre productos/indicaciones de Puro Omega]
- [Pregunta sugerida 2]
- [Pregunta sugerida 3]"""
                elif rag_coverage == "medium":
                    rag_instruction = """⚠️ INSTRUCCIÓN CRÍTICA — COBERTURA RAG: PARCIAL.

REGLAS OBLIGATORIAS:
1. Usa PRIMERO la información del contexto RAG anterior. Esos datos NO necesitan marcador.
2. CADA dato que NO esté en el contexto RAG DEBE ir seguido INMEDIATAMENTE de *(fuente externa no empresarial)*. Sin excepciones.
3. Ejemplo: Si el contexto RAG dice "EPA 900mg" eso NO lleva marcador. Pero si tú añades "reduce inflamación vesical" y eso NO está en el contexto, DEBES poner: "reduce inflamación vesical *(fuente externa no empresarial)*".
4. NO omitas el marcador. Si un dato no aparece literalmente en el contexto RAG de arriba, NECESITA marcador.
5. Minimiza el uso de información externa (máximo 1-2 datos puntuales). Prioriza siempre el contexto RAG."""
                else:
                    rag_instruction = """Responde basándote en el contexto anterior. Solo si falta un dato CRÍTICO, complementa con conocimiento general y márcalo con *(fuente externa no empresarial)*."""

                # Instrucción de longitud según modo de respuesta
                # Si cobertura baja, el formato ya está definido en rag_instruction — no aplicar templates de agente
                if rag_coverage == "low":
                    length_instruction = ""  # El formato de respuesta corta ya está en rag_instruction
                elif response_mode == "short":
                    # Formato resumido adaptado a cada agente — preserva los elementos de diseño clave
                    if intent == "productos":
                        length_instruction = """MODO RESUMIDO — Usa EXACTAMENTE este formato reducido (markdown):

## [Nombre del producto o tema]

| Parámetro | Valor |
|-----------|-------|
| (los 3-4 datos más importantes: EPA, DHA, forma, concentración) |

**Indicación principal**: Una frase directa con FAB.

**Posología**: Dosis y frecuencia en una línea.

**Dato diferenciador**
> Frase clave FAB que el representante puede usar literalmente con el médico. OBLIGATORIO.

REGLAS DE MODO RESUMIDO:
- Máximo 200-250 palabras totales.
- La tabla, la indicación FAB y el dato diferenciador (blockquote) son OBLIGATORIOS.
- NO incluyas evidencia clínica, caso clínico ni secciones adicionales.
- El dato diferenciador SIEMPRE debe ser un blockquote (>) con una frase memorable."""
                    elif intent == "objeciones":
                        length_instruction = """MODO RESUMIDO — Usa EXACTAMENTE este formato reducido (markdown):

## Objeción: "[Resumen breve]"

### Reconocimiento
> Frase empática Feel-Felt-Found condensada en 2 líneas máximo.

### Datos clave
| Dato | Valor |
|------|-------|
| (2-3 datos que desmonta la objeción) |

### Reencuadre
Una frase de Boomerang o aversión a la pérdida. Máximo 2 líneas.

### Guion sugerido
> "Doctor/a, [frase lista para usar literalmente]." OBLIGATORIO.

REGLAS DE MODO RESUMIDO:
- Máximo 200-250 palabras totales.
- La tabla, el reconocimiento y el guion sugerido (blockquote) son OBLIGATORIOS.
- No incluyas secciones adicionales."""
                    else:  # argumentos
                        length_instruction = """MODO RESUMIDO — Usa EXACTAMENTE este formato reducido (markdown):

## Argumentario: [Especialidad]

### Insight clave
> Dato sorprendente en 1-2 líneas. OBLIGATORIO.

### Producto recomendado
| Producto | Dosis | Indicación |
|----------|-------|------------|
| (1 producto principal) |

### Argumentos clave
1. **[Argumento 1]**: Dato concreto en 1 línea.
2. **[Argumento 2]**: Dato concreto en 1 línea.

### Guion de apertura
> "Doctor/a, [frase de apertura lista para usar]." OBLIGATORIO.

REGLAS DE MODO RESUMIDO:
- Máximo 200-250 palabras totales.
- El insight (blockquote), la tabla y el guion de apertura (blockquote) son OBLIGATORIOS.
- NO incluyas SPIN, perfil de paciente, caso clínico ni plan de prescripción."""
                else:
                    length_instruction = "MODO EXTENDIDO: Responde con el formato completo y detallado según tu estructura habitual."

                # Preparar prompt completo con contexto RAG
                full_prompt = f"""{agent.system_prompt}

INFORMACIÓN DE CONTEXTO (Base de conocimiento):
{context}

---
{rag_instruction}

{length_instruction}"""

                # Tokens según modo (low coverage siempre corto)
                if rag_coverage == "low":
                    max_tokens = 400
                elif response_mode == "short":
                    max_tokens = 500
                else:
                    max_tokens = 1000

                # Stream de respuesta con Kimi K2 (Groq)
                stream = llm_client.chat.completions.create(
                    model=LLM_MODEL,
                    messages=[
                        {"role": "system", "content": full_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    stream=True,
                    max_tokens=max_tokens,
                    temperature=0.7
                )

                # Enviar chunks al frontend
                full_response = ""
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        token = chunk.choices[0].delta.content
                        full_response += token
                        await websocket.send_json({
                            "type": "token",
                            "content": token
                        })

                # Señal de fin de mensaje
                await websocket.send_json({
                    "type": "end",
                    "full_response": full_response
                })

            except Exception as e:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Error procesando mensaje: {str(e)}"
                })

    except WebSocketDisconnect:
        print("Cliente desconectado")
    except Exception as e:
        print(f"Error WebSocket: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=7860,
        reload=True
    )
