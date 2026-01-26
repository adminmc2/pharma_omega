"""
Orquestador - Detecta intención y delega al agente apropiado
"""
import os
import re
from typing import Optional, Tuple
from openai import AsyncOpenAI

from .agent_productos import AgenteProductos
from .agent_objeciones import AgenteObjeciones
from .agent_argumentos import AgenteArgumentos
from .base_agent import BaseAgent


# Cliente LLM lazy (se inicializa cuando se usa)
_llm_client = None

def get_llm_client():
    """Obtiene el cliente LLM (lazy initialization)"""
    global _llm_client
    if _llm_client is None:
        _llm_client = AsyncOpenAI(
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            base_url="https://api.deepseek.com"
        )
    return _llm_client


class Orchestrator:
    """
    Orquestador del sistema multi-agente.

    Analiza la intención del usuario y delega al agente especializado.
    """

    AGENT_MAP = {
        "productos": AgenteProductos,
        "objeciones": AgenteObjeciones,
        "argumentos": AgenteArgumentos
    }

    CLASSIFICATION_PROMPT = """Eres un clasificador de intenciones para un asistente de ventas de Puro Omega (suplementos Omega-3).

Analiza el mensaje del usuario y clasifícalo en UNA de estas categorías:

1. **productos** - Preguntas sobre:
   - Información técnica de productos (ingredientes, dosis, presentaciones)
   - Indicaciones clínicas
   - Tecnología y calidad (rTG, certificaciones)
   - Omega-3 Index (test diagnóstico)
   - Qué producto recomendar para X condición
   - Diferencias entre productos de la marca

2. **objeciones** - Cuando el usuario menciona:
   - Objeciones de PRECIO ("es caro", "muy costoso", "hay más baratos")
   - Objeciones de EFICACIA ("no funciona", "no hay resultados", "cuánto tarda")
   - Objeciones de SEGURIDAD ("metales pesados", "efectos secundarios", "interacciones")
   - Comparativas negativas ("ya uso otra marca", "por qué cambiar")
   - Cualquier duda o rechazo que necesite ser rebatido

3. **argumentos** - Preguntas sobre:
   - Cómo vender a un especialista específico (cardiólogo, ginecólogo, etc.)
   - Argumentos de venta por especialidad
   - Perfiles de paciente ideal
   - Cómo presentar el producto
   - Estrategias de venta
   - Diferenciación frente a competencia (desde perspectiva de venta)

REGLAS:
- Si hay duda entre categorías, prioriza: objeciones > argumentos > productos
- Los saludos o preguntas generales van a "productos"
- Las comparativas van a "objeciones" si son negativas, a "argumentos" si buscan diferenciación

Responde SOLO con una palabra: productos, objeciones o argumentos"""

    def __init__(self):
        self.agents = {
            name: agent_class()
            for name, agent_class in self.AGENT_MAP.items()
        }
        self.default_agent = "productos"

    async def classify_intent(self, message: str) -> str:
        """
        Clasifica la intención del usuario usando el LLM.

        Returns:
            str: 'productos', 'objeciones' o 'argumentos'
        """
        try:
            response = await get_llm_client().chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": self.CLASSIFICATION_PROMPT},
                    {"role": "user", "content": message}
                ],
                temperature=0.1,
                max_tokens=20
            )

            intent = response.choices[0].message.content.strip().lower()

            # Validar que sea una categoría válida
            if intent in self.AGENT_MAP:
                return intent

            # Intentar extraer la categoría del texto
            for category in self.AGENT_MAP.keys():
                if category in intent:
                    return category

            return self.default_agent

        except Exception as e:
            print(f"Error en clasificación: {e}")
            return self.default_agent

    def classify_intent_rules(self, message: str) -> str:
        """
        Clasificación basada en reglas (fallback rápido).
        """
        message_lower = message.lower()

        # Patrones de objeciones
        objection_patterns = [
            r'\bcaro\b', r'\bcostoso\b', r'\bprecio\b', r'\bbarato\b',
            r'\bno funciona\b', r'\bno sirve\b', r'\bno veo resultado',
            r'\bmetales pesados\b', r'\bseguridad\b', r'\bseguro\b',
            r'\befecto.? secundario', r'\binteracci', r'\bcontraindicac',
            r'\botra marca\b', r'\bcompetencia\b', r'\bya uso\b',
            r'\bobjeci[oó]n', r'\bduda\b', r'\bpreocupa'
        ]

        for pattern in objection_patterns:
            if re.search(pattern, message_lower):
                return "objeciones"

        # Patrones de argumentos
        argument_patterns = [
            r'\bc[oó]mo vend', r'\bc[oó]mo present', r'\bargumento',
            r'\bcardi[oó]logo', r'\bginec[oó]logo', r'\bneur[oó]logo',
            r'\bpsiquiatra\b', r'\bpediatra\b', r'\breumat[oó]logo',
            r'\bespecialista\b', r'\bespecialidad\b',
            r'\bperfil.? de paciente', r'\bestrategi',
            r'\bdiferencia.* competencia', r'\bventaja'
        ]

        for pattern in argument_patterns:
            if re.search(pattern, message_lower):
                return "argumentos"

        # Default a productos
        return "productos"

    def get_agent(self, agent_name: str) -> BaseAgent:
        """Obtiene una instancia del agente especificado."""
        return self.agents.get(agent_name, self.agents[self.default_agent])

    async def process_message(
        self,
        message: str,
        history: list = None,
        use_llm_classification: bool = True
    ) -> Tuple[str, BaseAgent, str]:
        """
        Procesa un mensaje y devuelve la respuesta del agente apropiado.

        Args:
            message: Mensaje del usuario
            history: Historial de conversación
            use_llm_classification: Si usar LLM para clasificar (más preciso pero más lento)

        Returns:
            Tuple[intent, agent, context]: Intención detectada, agente usado y contexto RAG
        """
        # Clasificar intención
        if use_llm_classification:
            intent = await self.classify_intent(message)
        else:
            intent = self.classify_intent_rules(message)

        # Obtener agente
        agent = self.get_agent(intent)

        # Buscar contexto relevante
        results = agent.search_knowledge(message, top_k=5)
        context = agent.format_context(results, min_score=0.1)

        return intent, agent, context

    async def get_response(
        self,
        message: str,
        history: list = None
    ):
        """
        Obtiene respuesta con streaming del sistema.

        Args:
            message: Mensaje del usuario
            history: Historial de conversación

        Yields:
            Tuple[token, intent, agent_name]
        """
        intent, agent, context = await self.process_message(message, history)

        # Construir prompt con contexto
        system_prompt = f"""{agent.system_prompt}

INFORMACIÓN DE CONTEXTO (Base de conocimiento):
{context}

---
Responde basándote en el contexto anterior. Si no tienes información específica, indícalo."""

        # Construir mensajes
        messages = [{"role": "system", "content": system_prompt}]

        # Añadir historial
        if history:
            for h in history[-6:]:  # Últimos 6 mensajes
                messages.append(h)

        messages.append({"role": "user", "content": message})

        # Generar respuesta con streaming
        response = await get_llm_client().chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            stream=True,
            temperature=0.7,
            max_tokens=1000
        )

        async for chunk in response:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content, intent, agent.name

    async def get_response_sync(
        self,
        message: str,
        history: list = None
    ) -> Tuple[str, str, str]:
        """
        Obtiene respuesta completa (sin streaming).

        Args:
            message: Mensaje del usuario
            history: Historial de conversación

        Returns:
            Tuple[response, intent, agent_name]
        """
        intent, agent, context = await self.process_message(message, history)

        # Construir prompt con contexto
        system_prompt = f"""{agent.system_prompt}

INFORMACIÓN DE CONTEXTO (Base de conocimiento):
{context}

---
Responde basándote en el contexto anterior. Si no tienes información específica, indícalo."""

        # Construir mensajes
        messages = [{"role": "system", "content": system_prompt}]

        # Añadir historial
        if history:
            for h in history[-6:]:
                messages.append(h)

        messages.append({"role": "user", "content": message})

        response = await get_llm_client().chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            stream=False,
            temperature=0.7,
            max_tokens=1000
        )
        return response.choices[0].message.content, intent, agent.name


# Singleton del orquestador
_orchestrator_instance = None

def get_orchestrator() -> Orchestrator:
    """Obtiene la instancia singleton del orquestador."""
    global _orchestrator_instance
    if _orchestrator_instance is None:
        _orchestrator_instance = Orchestrator()
    return _orchestrator_instance
