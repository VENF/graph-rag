# FLUJO GENERAL DEL COMPORTAMIENTO DEL AGENTE

El agente de busqueda no puede limitarse a lanzar una consulta a una base de datos vectorial. Tiene que replicar el proceso cognitivo, analítico y jurídico de un Perito Aduanero humano y su comportamiento debe seguir una estructura puramente deductiva y legal.

---

### FLUJO GENERAL DEL COMPORTAMIENTO DEL AGENTE

#### 1 Estado de admisión y purificación

El agente recibe los datos de la factura proforma o el input del usuario con una lista de productos.

- **El comportamiento del agente:** Actúa como un filtro de ruido. Su primera tareas es traducir el lenguaje caótico del mercado al "Lenguaje Técnico del Sistema Armonizado" y generar una **ficha técnica merceológica estandarizada**.

- **Resultado de este paso:** Ficha tecnica limpia que contiene únicamente el Sustantivo Base + Adjetivo Clasificatorio Mínimo.


#### 2  Determinación del universo de búsqueda

Con el término purificado, el agente debe mirar el mapa completo del arancel para no perder tiempo buscando en los 11,000 nodos terminales a la vez.

- **El comportamiento del agente:** Analiza semánticamente a qué Capítulo (**2 dígitos**) pertenece la mercancía.

- **Resultado de este paso:** El agente toma una decisión de enrutamiento y bloquea el resto de la base de datos. Si determina que es el Capítulo 85, el agente emite una orden interna: "A partir de este momento, queda prohibido mirar nodos que no empiecen por 85".

#### 3 Auditoría de notas legales

Antes de tocar una sola subpartida, el agente está obligado a validar las reglas del juego de ese capítulo.

- **El comportamiento del agente:** Extrae del grafo todas las **Notas Legales** (de Sección y de Capítulo) asociadas al universo macro que seleccionó en el Paso 2.

- **Proceso de evaluación:** El agente lee estas notas y se pregunta: ¿Este producto está excluido explícitamente por alguna nota? ¿Cumple con las definiciones técnicas que exige el capítulo?

- **Flujo de Decisión:**
    - **Si una nota lo excluye:** El agente detiene el flujo actual, redirige la mercancía hacia el capítulo que la nota le ordene y vuelve al Paso 2 **(Comportamiento iterativo de corrección).**

    - **Si ninguna nota lo excluye:** El agente da luz verde para avanzar a la fase micro.


#### 4 Anclaje de la partida y subpartida nacional

El agente ya sabe el capítulo y sabe que no está excluido por ley.

- **El comportamiento del Agente:** Ejecuta la búsqueda de similitud semántica comparando el texto purificado del Paso 1 únicamente contra los nodos hoja **Fracciones de 10 dígitos** que viven dentro del capítulo aprobado.

- **Resultado de este paso:** El agente encuentra el nodo definitivo con el score de certeza más alto (el "Candidato Ganador").

#### 5 Construcción del Expediente de Evidencias

Una vez que el agente tiene el código de 10 dígitos ganador, su comportamiento cambia de "buscador" a "auditor". No puede entregar el resultado sin pruebas.

- **El comportamiento del Agente:** Camina el grafo al revés **(Traceback)**. Partiendo del nodo de 10 dígitos, sube por las relaciones jerárquicas y recolecta:

    - Los textos de los nodos intermedios (NCM, Subpartida SA, Partida) para armar la línea del árbol.

    - Las Reglas generales de Interpretación (RGI) aplicables a esa estructura.

    - Los requisitos de Régimen Legal (permisos) y Régimen Fiscal (tasas e impuestos base) amarrados a ese código de 10 dígitos.

#### 6 Redacción del dictamen pericial

El último estado del agente es la formalización jurídica. El agente consolida toda la información que extrajo del grafo en un documento con estructura de informe legal.

- **El comportamiento del agente:** Toma los ladrillos de información (Textos de partidas, contenido exacto de las notas validadas, tasas, etc.) y los organiza bajo un formato estricto de dictamen: Identificación $\rightarrow$ Jerarquía $\rightarrow$ Fundamento de Reglas $\rightarrow$ Notas de Coherencia $\rightarrow$ Tarifa Fiscal y Cierre.

