"""
PURO OMEGA - Asistente de Ventas RAG
Sistema con Retrieval Augmented Generation para agentes comerciales
"""
import os
import json
import numpy as np
from typing import List, Tuple
import chainlit as cl
from openai import AsyncOpenAI

# Cliente para DeepSeek (LLM)
llm_client = AsyncOpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

# Cliente para embeddings (usamos OpenAI o alternativa)
# Para producción, considera usar sentence-transformers local o Cohere
EMBEDDINGS_MODEL = "text-embedding-3-small"

class SimpleRAG:
    """Sistema RAG simple usando similitud de coseno"""

    def __init__(self, knowledge_base_path: str):
        self.qa_pairs = []
        self.embeddings = []
        self.load_knowledge_base(knowledge_base_path)

    def load_knowledge_base(self, path: str):
        """Carga la base de conocimiento desde JSON"""
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        self.qa_pairs = data['qa_pairs']
        print(f"Cargadas {len(self.qa_pairs)} preguntas de la base de conocimiento")

    def compute_embeddings_simple(self):
        """
        Embeddings simplificados usando TF-IDF básico.
        Para producción, usar sentence-transformers o API de embeddings.
        """
        from collections import Counter
        import math

        # Preprocesar textos
        documents = [qa['pregunta'] + " " + qa['respuesta'] for qa in self.qa_pairs]

        # Construir vocabulario
        all_words = []
        for doc in documents:
            words = doc.lower().split()
            all_words.extend(words)

        vocab = list(set(all_words))
        word_to_idx = {word: idx for idx, word in enumerate(vocab)}

        # Calcular IDF
        doc_freq = Counter()
        for doc in documents:
            unique_words = set(doc.lower().split())
            for word in unique_words:
                doc_freq[word] += 1

        n_docs = len(documents)
        idf = {word: math.log(n_docs / (freq + 1)) for word, freq in doc_freq.items()}

        # Calcular TF-IDF para cada documento
        self.embeddings = []
        for doc in documents:
            words = doc.lower().split()
            tf = Counter(words)
            vec = np.zeros(len(vocab))
            for word, count in tf.items():
                if word in word_to_idx:
                    vec[word_to_idx[word]] = count * idf.get(word, 0)
            # Normalizar
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            self.embeddings.append(vec)

        self.vocab = vocab
        self.word_to_idx = word_to_idx
        self.idf = idf
        print(f"Embeddings calculados: vocabulario de {len(vocab)} palabras")

    def get_query_embedding(self, query: str) -> np.ndarray:
        """Obtiene embedding de una consulta"""
        from collections import Counter
        words = query.lower().split()
        tf = Counter(words)
        vec = np.zeros(len(self.vocab))
        for word, count in tf.items():
            if word in self.word_to_idx:
                vec[self.word_to_idx[word]] = count * self.idf.get(word, 0)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec

    def search(self, query: str, top_k: int = 5) -> List[Tuple[dict, float]]:
        """Busca los documentos más relevantes para una consulta"""
        query_vec = self.get_query_embedding(query)

        # Calcular similitud de coseno
        similarities = []
        for i, doc_vec in enumerate(self.embeddings):
            sim = np.dot(query_vec, doc_vec)
            similarities.append((self.qa_pairs[i], sim))

        # Ordenar por similitud descendente
        similarities.sort(key=lambda x: x[1], reverse=True)

        return similarities[:top_k]


# Inicializar RAG
knowledge_base_path = os.path.join(os.path.dirname(__file__), 'knowledge_base.json')
rag = SimpleRAG(knowledge_base_path)
rag.compute_embeddings_simple()


SYSTEM_PROMPT = """Eres un asistente de ventas experto de Puro Omega, una marca premium de suplementos de Omega-3.

Tu rol es ayudar a los representantes comerciales durante sus visitas a médicos y profesionales de la salud.

INSTRUCCIONES:
1. Usa ÚNICAMENTE la información del contexto proporcionado para responder
2. Si la pregunta no está cubierta en el contexto, di que no tienes esa información específica
3. Sé conciso pero completo en tus respuestas
4. Cuando menciones estudios, incluye los datos clave (autor, año, resultados principales)
5. Si hay múltiples productos relevantes, explica las diferencias y cuándo usar cada uno
6. Mantén un tono profesional pero cercano, como un colega experto

FORMATO DE RESPUESTA:
- Respuestas claras y estructuradas
- Usa viñetas para listas
- Destaca datos numéricos importantes
- Si es relevante, sugiere cómo presentar la información al médico

CONTEXTO RECUPERADO:
{context}

Responde a la pregunta del usuario basándote en este contexto."""


WELCOME_MESSAGE = """Hola, soy tu asistente de ventas Puro Omega.

Puedo ayudarte con:
- **Información de productos** (indicaciones, dosis, estudios)
- **Argumentos de venta** por especialidad médica
- **Manejo de objeciones** (precio, eficacia, seguridad)
- **Comparativas** con la competencia
- **Perfiles de paciente** ideales para cada producto

¿Qué necesitas para tu próxima visita?"""


@cl.on_chat_start
async def on_chat_start():
    """Inicializa la sesión de chat"""
    cl.user_session.set("history", [])
    await cl.Message(content=WELCOME_MESSAGE).send()


@cl.on_message
async def on_message(message: cl.Message):
    """Procesa cada mensaje del usuario"""

    # Buscar contexto relevante
    query = message.content
    results = rag.search(query, top_k=5)

    # Construir contexto
    context_parts = []
    for qa, score in results:
        if score > 0.1:  # Umbral de relevancia
            context_parts.append(f"**Pregunta:** {qa['pregunta']}\n**Respuesta:** {qa['respuesta']}\n**Categoría:** {qa['categoria']}")

    context = "\n---\n".join(context_parts) if context_parts else "No se encontró información específica en la base de conocimiento."

    # Preparar prompt con contexto
    system_with_context = SYSTEM_PROMPT.format(context=context)

    # Obtener historial
    history = cl.user_session.get("history", [])

    # Construir mensajes para el LLM
    messages = [
        {"role": "system", "content": system_with_context},
    ]

    # Añadir historial reciente (últimos 6 mensajes)
    for h in history[-6:]:
        messages.append(h)

    # Añadir mensaje actual
    messages.append({"role": "user", "content": query})

    # Crear mensaje de respuesta
    msg = cl.Message(content="")
    await msg.send()

    try:
        # Llamar al LLM con streaming
        stream = await llm_client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            stream=True,
            temperature=0.7,
            max_tokens=1000
        )

        full_response = ""
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                token = chunk.choices[0].delta.content
                full_response += token
                await msg.stream_token(token)

        await msg.update()

        # Actualizar historial
        history.append({"role": "user", "content": query})
        history.append({"role": "assistant", "content": full_response})
        cl.user_session.set("history", history)

    except Exception as e:
        await msg.update()
        await cl.Message(content=f"Error: {str(e)}").send()
