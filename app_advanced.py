"""
PURO OMEGA - Asistente de Ventas RAG (Versión Avanzada)
Sistema con embeddings de alta calidad usando sentence-transformers
"""
import os
import json
import numpy as np
from typing import List, Tuple, Optional
import chainlit as cl
from openai import AsyncOpenAI

# Intentar importar sentence-transformers (opcional pero recomendado)
try:
    from sentence_transformers import SentenceTransformer
    HAVE_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAVE_SENTENCE_TRANSFORMERS = False
    print("sentence-transformers no disponible, usando TF-IDF básico")

# Cliente para DeepSeek (LLM)
llm_client = AsyncOpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)


class AdvancedRAG:
    """Sistema RAG avanzado con sentence-transformers o fallback a TF-IDF"""

    def __init__(self, knowledge_base_path: str, use_semantic: bool = True):
        self.qa_pairs = []
        self.embeddings = None
        self.use_semantic = use_semantic and HAVE_SENTENCE_TRANSFORMERS
        self.model = None

        if self.use_semantic:
            print("Cargando modelo de embeddings semánticos...")
            # Modelo multilingüe de alta calidad
            self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
            print("Modelo cargado correctamente")

        self.load_knowledge_base(knowledge_base_path)
        self.compute_embeddings()

    def load_knowledge_base(self, path: str):
        """Carga la base de conocimiento desde JSON"""
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        self.qa_pairs = data['qa_pairs']
        print(f"Cargadas {len(self.qa_pairs)} preguntas de la base de conocimiento")

    def compute_embeddings(self):
        """Calcula embeddings para todas las preguntas"""
        if self.use_semantic:
            # Usar solo las preguntas para embeddings (más eficiente para búsqueda)
            questions = [qa['pregunta'] for qa in self.qa_pairs]
            self.embeddings = self.model.encode(questions, convert_to_numpy=True)
            print(f"Embeddings semánticos calculados: {self.embeddings.shape}")
        else:
            self._compute_tfidf_embeddings()

    def _compute_tfidf_embeddings(self):
        """Fallback a TF-IDF cuando no hay sentence-transformers"""
        from collections import Counter
        import math

        documents = [qa['pregunta'] + " " + qa['respuesta'] for qa in self.qa_pairs]

        # Construir vocabulario
        all_words = []
        for doc in documents:
            words = self._tokenize(doc)
            all_words.extend(words)

        vocab = list(set(all_words))
        self.word_to_idx = {word: idx for idx, word in enumerate(vocab)}

        # Calcular IDF
        doc_freq = Counter()
        for doc in documents:
            unique_words = set(self._tokenize(doc))
            for word in unique_words:
                doc_freq[word] += 1

        n_docs = len(documents)
        self.idf = {word: math.log(n_docs / (freq + 1)) for word, freq in doc_freq.items()}

        # Calcular TF-IDF
        self.embeddings = []
        for doc in documents:
            vec = self._get_tfidf_vector(doc)
            self.embeddings.append(vec)

        self.embeddings = np.array(self.embeddings)
        self.vocab = vocab
        print(f"Embeddings TF-IDF calculados: vocabulario de {len(vocab)} palabras")

    def _tokenize(self, text: str) -> List[str]:
        """Tokeniza texto con normalización básica"""
        import re
        text = text.lower()
        # Remover puntuación pero mantener números
        text = re.sub(r'[^\w\s]', ' ', text)
        words = text.split()
        # Filtrar stopwords básicas en español
        stopwords = {'el', 'la', 'los', 'las', 'de', 'del', 'en', 'un', 'una', 'y', 'a', 'que', 'es', 'por', 'para', 'con', 'se', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o'}
        return [w for w in words if w not in stopwords and len(w) > 2]

    def _get_tfidf_vector(self, text: str) -> np.ndarray:
        """Obtiene vector TF-IDF de un texto"""
        from collections import Counter
        words = self._tokenize(text)
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
        """Busca los documentos más relevantes"""
        if self.use_semantic:
            query_vec = self.model.encode([query], convert_to_numpy=True)[0]
            # Similitud de coseno
            similarities = np.dot(self.embeddings, query_vec) / (
                np.linalg.norm(self.embeddings, axis=1) * np.linalg.norm(query_vec) + 1e-8
            )
        else:
            query_vec = self._get_tfidf_vector(query)
            similarities = np.dot(self.embeddings, query_vec)

        # Obtener top_k
        top_indices = np.argsort(similarities)[::-1][:top_k]

        results = []
        for idx in top_indices:
            results.append((self.qa_pairs[idx], float(similarities[idx])))

        return results

    def search_by_category(self, query: str, category: str, top_k: int = 3) -> List[Tuple[dict, float]]:
        """Busca dentro de una categoría específica"""
        filtered_pairs = [(i, qa) for i, qa in enumerate(self.qa_pairs) if qa['categoria'] == category]

        if not filtered_pairs:
            return []

        if self.use_semantic:
            query_vec = self.model.encode([query], convert_to_numpy=True)[0]
            similarities = []
            for i, qa in filtered_pairs:
                sim = np.dot(self.embeddings[i], query_vec) / (
                    np.linalg.norm(self.embeddings[i]) * np.linalg.norm(query_vec) + 1e-8
                )
                similarities.append((qa, float(sim)))
        else:
            query_vec = self._get_tfidf_vector(query)
            similarities = []
            for i, qa in filtered_pairs:
                sim = np.dot(self.embeddings[i], query_vec)
                similarities.append((qa, float(sim)))

        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]


# Inicializar RAG
knowledge_base_path = os.path.join(os.path.dirname(__file__), 'knowledge_base.json')
rag = AdvancedRAG(knowledge_base_path, use_semantic=HAVE_SENTENCE_TRANSFORMERS)


SYSTEM_PROMPT = """Eres un asistente de ventas experto de Puro Omega, una marca premium de suplementos de Omega-3 de Beps Biopharm.

Tu rol es ayudar a los representantes comerciales durante sus visitas a médicos y profesionales de la salud.

INSTRUCCIONES CLAVE:
1. Usa ÚNICAMENTE la información del contexto proporcionado
2. Si no tienes información específica, dilo claramente
3. Sé conciso pero completo
4. Incluye datos numéricos y estudios cuando estén disponibles
5. Si hay varios productos relevantes, explica las diferencias

FORMATO:
- Respuestas estructuradas con viñetas
- Destaca datos clave (porcentajes, dosis, resultados)
- Sugiere cómo presentar la información al médico cuando sea útil

INFORMACIÓN DE CONTEXTO:
{context}

---
Responde basándote SOLO en el contexto anterior."""


WELCOME_MESSAGE = """Hola, soy tu asistente de ventas Puro Omega con sistema RAG.

Tengo acceso a una base de conocimiento con **215 preguntas y respuestas** sobre:

- **Productos** - 12 fórmulas especializadas
- **Argumentos de venta** - Por especialidad médica
- **Estudios clínicos** - Evidencia científica
- **Objeciones** - Precio, eficacia, seguridad
- **Comparativas** - Versus competencia
- **Omega-3 Index** - Test diagnóstico

¿En qué puedo ayudarte?"""


def format_context(results: List[Tuple[dict, float]], min_score: float = 0.2) -> str:
    """Formatea los resultados de búsqueda como contexto"""
    context_parts = []

    for qa, score in results:
        if score >= min_score:
            context_parts.append(
                f"[Categoría: {qa['categoria']}] [Relevancia: {score:.2f}]\n"
                f"P: {qa['pregunta']}\n"
                f"R: {qa['respuesta']}"
            )

    if not context_parts:
        return "No se encontró información específica en la base de conocimiento para esta consulta."

    return "\n\n---\n\n".join(context_parts)


@cl.on_chat_start
async def on_chat_start():
    """Inicializa la sesión"""
    cl.user_session.set("history", [])
    await cl.Message(content=WELCOME_MESSAGE).send()


@cl.on_message
async def on_message(message: cl.Message):
    """Procesa mensajes con RAG"""
    query = message.content

    # Buscar contexto relevante
    results = rag.search(query, top_k=5)
    context = format_context(results)

    # Preparar prompt
    system_with_context = SYSTEM_PROMPT.format(context=context)

    # Historial
    history = cl.user_session.get("history", [])

    messages = [
        {"role": "system", "content": system_with_context},
    ]

    # Añadir historial reciente
    for h in history[-6:]:
        messages.append(h)

    messages.append({"role": "user", "content": query})

    # Respuesta con streaming
    msg = cl.Message(content="")
    await msg.send()

    try:
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
