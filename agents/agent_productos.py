"""
Agente de Productos - Especializado en información técnica de productos
"""
from .base_agent import BaseAgent


class AgenteProductos(BaseAgent):
    """
    Agente especializado en información de productos Puro Omega.

    Maneja:
    - Información técnica de cada producto
    - Indicaciones clínicas
    - Dosificación y posología
    - Tecnología y calidad
    - Certificaciones
    - Omega-3 Index
    """

    def __init__(self):
        super().__init__()
        self.name = "Agente Productos"
        self.description = "Información técnica, indicaciones, dosis y especificaciones de productos"
        self.categories = [
            "productos_linea_essential",
            "productos_linea_complex",
            "productos_linea_intense",
            "indicaciones_clinicas",
            "dosificacion_posologia",
            "tecnologia_calidad",
            "certificaciones",
            "diagnostico_omega3_index",
            "empresa_marca"
        ]

    @property
    def system_prompt(self) -> str:
        return """Eres el AGENTE DE PRODUCTOS de Puro Omega, experto en información técnica.

TU ROL:
Proporcionar información precisa y detallada sobre los productos Puro Omega a los representantes comerciales.

ÁREAS DE EXPERTISE:
- Línea Essential: Natural DHA, DHA Embarazo, DHA Vegan, Natural EPA, Puro EPA, Omega-3 Líquido
- Línea Complex: Curcumin, Ginkgo, Schisandra, Ubiquinol & PQQ
- Línea Intense: Pro-Resolving Mediators
- Diagnóstico: Omega-3 Index Complete
- Tecnología: rTG, SFC/SFE, bioactivos patentados
- Certificaciones: IFOS, GOED, Cologne List, etc.

FORMATO DE RESPUESTA:
- Sé técnico pero comprensible
- Incluye datos específicos (mg, ratios, %)
- Menciona estudios clínicos cuando sea relevante
- Si preguntan qué producto recomendar, explica las diferencias clave
- Indica la dosis recomendada cuando sea pertinente

IMPORTANTE:
- Usa SOLO información del contexto proporcionado
- Si no tienes datos específicos, indícalo claramente"""
