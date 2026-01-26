"""
Motor RAG - Base de conocimiento compartida por todos los agentes
"""
import json
import numpy as np
from collections import Counter
from typing import List, Tuple, Optional
import math
import os


class RAGEngine:
    """Motor de búsqueda RAG que usan todos los agentes"""

    def __init__(self, knowledge_base_path: str):
        self.qa_pairs = []
        self.embeddings = []
        self.vocab = []
        self.word_to_idx = {}
        self.idf = {}

        self.load_knowledge_base(knowledge_base_path)
        self.compute_embeddings()

    def load_knowledge_base(self, path: str):
        """Carga la base de conocimiento desde JSON"""
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        self.qa_pairs = data['qa_pairs']
        print(f"[RAG] Cargadas {len(self.qa_pairs)} preguntas")

    def _tokenize(self, text: str) -> List[str]:
        """Tokeniza texto con normalización"""
        import re
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        words = text.split()
        stopwords = {
            'el', 'la', 'los', 'las', 'de', 'del', 'en', 'un', 'una',
            'y', 'a', 'que', 'es', 'por', 'para', 'con', 'se', 'su',
            'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o',
            'qué', 'cómo', 'cuál', 'cuáles', 'dónde', 'cuándo'
        }
        return [w for w in words if w not in stopwords and len(w) > 2]

    def compute_embeddings(self):
        """Calcula embeddings TF-IDF para todas las Q&A"""
        documents = [qa['pregunta'] + ' ' + qa['respuesta'] for qa in self.qa_pairs]

        # Construir vocabulario
        all_words = []
        for doc in documents:
            all_words.extend(self._tokenize(doc))

        self.vocab = list(set(all_words))
        self.word_to_idx = {word: idx for idx, word in enumerate(self.vocab)}

        # Calcular IDF
        doc_freq = Counter()
        for doc in documents:
            unique_words = set(self._tokenize(doc))
            for word in unique_words:
                doc_freq[word] += 1

        n_docs = len(documents)
        self.idf = {word: math.log(n_docs / (freq + 1)) for word, freq in doc_freq.items()}

        # Calcular embeddings
        self.embeddings = []
        for doc in documents:
            vec = self._get_vector(doc)
            self.embeddings.append(vec)

        print(f"[RAG] Embeddings calculados: {len(self.vocab)} palabras en vocabulario")

    def _get_vector(self, text: str) -> np.ndarray:
        """Obtiene vector TF-IDF de un texto"""
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

    def search(self, query: str, top_k: int = 5, categories: Optional[List[str]] = None) -> List[Tuple[dict, float]]:
        """
        Busca documentos relevantes.

        Args:
            query: Texto de búsqueda
            top_k: Número de resultados
            categories: Lista de categorías para filtrar (None = todas)

        Returns:
            Lista de (qa_pair, score)
        """
        query_vec = self._get_vector(query)

        results = []
        for i, (qa, emb) in enumerate(zip(self.qa_pairs, self.embeddings)):
            # Filtrar por categoría si se especifica
            if categories and qa['categoria'] not in categories:
                continue

            score = np.dot(query_vec, emb)
            results.append((qa, float(score)))

        # Ordenar por score descendente
        results.sort(key=lambda x: x[1], reverse=True)

        return results[:top_k]

    def get_categories(self) -> List[str]:
        """Retorna todas las categorías disponibles"""
        return list(set(qa['categoria'] for qa in self.qa_pairs))


# Singleton del motor RAG
_rag_instance = None

def get_rag_engine() -> RAGEngine:
    """Obtiene la instancia singleton del RAG"""
    global _rag_instance
    if _rag_instance is None:
        base_path = os.path.dirname(os.path.dirname(__file__))
        kb_path = os.path.join(base_path, 'knowledge_base.json')
        _rag_instance = RAGEngine(kb_path)
    return _rag_instance
