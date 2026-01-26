"""
PURO OMEGA - Sistema Multi-Agente con RAG
Aplicacion Chainlit con orquestador y agentes especializados
"""
import chainlit as cl
from agents import get_orchestrator


# Inicializar orquestador (carga RAG y agentes)
orchestrator = get_orchestrator()


WELCOME_MESSAGE = """# Puro Omega

Tu asistente de ventas con IA especializada.

| Agente | Especialidad |
|--------|--------------|
| **Productos** | Informacion tecnica, indicaciones, dosis |
| **Objeciones** | Precio, eficacia, seguridad |
| **Argumentos** | Estrategias por especialidad |

**En que puedo ayudarte?**"""


AGENT_LABELS = {
    "Agente Productos": "Productos",
    "Agente Objeciones": "Objeciones",
    "Agente Argumentos": "Argumentos"
}


@cl.on_chat_start
async def on_chat_start():
    """Inicializa la sesion de chat."""
    cl.user_session.set("history", [])
    await cl.Message(content=WELCOME_MESSAGE).send()


@cl.on_message
async def on_message(message: cl.Message):
    """Procesa mensajes usando el orquestador multi-agente."""
    query = message.content
    history = cl.user_session.get("history", [])

    # Crear mensaje de respuesta
    msg = cl.Message(content="")
    await msg.send()

    try:
        full_response = ""
        agent_name = ""
        intent = ""

        # Obtener respuesta del orquestador (streaming)
        async for token, detected_intent, detected_agent in orchestrator.get_response(
            query,
            history=history
        ):
            full_response += token
            intent = detected_intent
            agent_name = detected_agent
            await msg.stream_token(token)

        # Anadir indicador del agente usado
        agent_label = AGENT_LABELS.get(agent_name, "Asistente")
        agent_indicator = f"\n\n---\n*{agent_label}*"
        await msg.stream_token(agent_indicator)
        full_response += agent_indicator

        await msg.update()

        # Actualizar historial
        history.append({"role": "user", "content": query})
        history.append({"role": "assistant", "content": full_response})
        cl.user_session.set("history", history)

    except Exception as e:
        error_msg = f"Error procesando tu mensaje: {str(e)}"
        await msg.stream_token(error_msg)
        await msg.update()


if __name__ == "__main__":
    print("Ejecuta con: chainlit run app_agents.py")
