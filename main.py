"""
Puro Omega - Asistente de Ventas RAG v3.0
Backend FastAPI con WebSocket para streaming
"""

import os
import json
import asyncio
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from openai import OpenAI
from groq import Groq

# Importar sistema de agentes
from agents.orchestrator import Orchestrator

load_dotenv()

# Clientes API
deepseek_client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

# Cliente Groq (opcional - solo para transcripción de voz)
groq_api_key = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=groq_api_key) if groq_api_key else None
if not groq_client:
    print("⚠️  GROQ_API_KEY no configurada - Transcripción de voz deshabilitada")

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
    title="Puro Omega - Asistente de Ventas",
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

        # Crear archivo temporal para Groq
        temp_filename = f"temp_audio.{audio.filename.split('.')[-1] if audio.filename else 'webm'}"

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
            user_message = message_data.get("message", "")

            if not user_message.strip():
                continue

            try:
                # Clasificar intención con reglas (rápido y sin API call)
                intent = orchestrator.classify_intent_rules(user_message)

                # Obtener agente correspondiente
                agent = orchestrator.get_agent(intent)

                # Buscar contexto relevante en RAG
                results = agent.search_knowledge(user_message, top_k=5)
                context = agent.format_context(results, min_score=0.1)

                # Enviar info del agente seleccionado
                await websocket.send_json({
                    "type": "agent_info",
                    "agent": intent,
                    "context_docs": len([r for r in results if r[1] >= 0.1])
                })

                # Preparar prompt completo con contexto RAG
                full_prompt = f"""{agent.system_prompt}

INFORMACIÓN DE CONTEXTO (Base de conocimiento):
{context}

---
Responde basándote en el contexto anterior. Si no tienes información específica, indícalo."""

                # Stream de respuesta con DeepSeek
                stream = deepseek_client.chat.completions.create(
                    model="deepseek-chat",
                    messages=[
                        {"role": "system", "content": full_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    stream=True,
                    max_tokens=1000,
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
