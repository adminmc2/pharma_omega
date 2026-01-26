"""
Clase base para todos los agentes
"""
from typing import List, Tuple, Optional
from abc import ABC, abstractmethod
from .rag_engine import get_rag_engine


class BaseAgent(ABC):
    """Clase base abstracta para agentes especializados"""

    def __init__(self):
        self.rag = get_rag_engine()
        self.name = "BaseAgent"
        self.description = ""
        self.categories = []  # Categorías del RAG que este agente maneja

    @property
    @abstractmethod
    def system_prompt(self) -> str:
        """Prompt de sistema específico del agente"""
        pass

    def search_knowledge(self, query: str, top_k: int = 5) -> List[Tuple[dict, float]]:
        """Busca en la base de conocimiento filtrado por las categorías del agente"""
        return self.rag.search(query, top_k=top_k, categories=self.categories if self.categories else None)

    def format_context(self, results: List[Tuple[dict, float]], min_score: float = 0.1) -> str:
        """Formatea los resultados de búsqueda como contexto para el LLM"""
        context_parts = []

        for qa, score in results:
            if score >= min_score:
                context_parts.append(
                    f"[Relevancia: {score:.2f}]\n"
                    f"P: {qa['pregunta']}\n"
                    f"R: {qa['respuesta']}"
                )

        if not context_parts:
            return "No encontré información específica para esta consulta en mi base de conocimiento."

        return "\n\n---\n\n".join(context_parts)

    def get_response_prompt(self, query: str, context: str) -> str:
        """Construye el prompt completo con contexto"""
        return f"""{self.system_prompt}

CONTEXTO DE LA BASE DE CONOCIMIENTO:
{context}

---
PREGUNTA DEL USUARIO: {query}

Responde basándote ÚNICAMENTE en el contexto proporcionado."""
