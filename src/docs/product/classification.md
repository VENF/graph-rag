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

---


#### 4 Determinación de la fracción arancelaria mediante análisis de hipótesis concurrentes

El objetivo de este paso es emular el rigor metodológico del aforo aduanero, evaluando en paralelo múltiples líneas de clasificación (hipótesis) basadas en las Reglas Generales de Interpretación (RGI), específicamente la RGI 1 (Texto de las partidas y de las Notas de Sección o Capítulo) y la RGI 3 (Mercancías susceptibles de clasificarse en dos o más partidas).

Este proceso se ejecuta de manera secuencial y restrictiva a través de tres sub-nodos cognitivos:

```
[Capítulo Aprobado]
       │
       ▼
[Sub-paso 4.1] ──► Apertura de 3 Partidas (4 dígitos) Concurrentes
       │
       ▼
[Sub-paso 4.2] ──► Apertura de Subpartidas (6 dígitos) y Poda por RGI
       │
       ▼
[Sub-paso 4.3] ──► Anclaje de la Fracción Arancelaria Nacional (10 dígitos)
```

#### Sub-paso 4.1: Apertura de hipótesis y asignación de partidas (4 dígitos)

- **Entrada operativa:** El objeto **technicalSheet** unificado del Paso 1, 2 y  el vector de texto de las Notas Legales obtenido en el Paso 3.

- **Consulta al Grafo:** El sistema realiza una extracción determinista de todas las Partidas (4 dígitos) indexadas bajo el capítulo aprobado (ej. Capítulo 85).

- **El comportamiento del Agente:** El agente debe seleccionar obligatoriamente las tres partidas con mayor probabilidad de encaje legal, ordenadas por su grado de convicción y sustentadas bajo la RGI 1.

- **Estructura del output:** Un arreglo de tres objetos de datos con estructura de prioridad:
    - Partida (4 digitos)
    - score de certeza


#### Sub-paso 4.2: análisis de subpartidas (6 dígitos) y poda de ramas por RGI

- **Entrada operativa:** El arreglo de las 3 partidas concurrentes seleccionadas en el sub-paso anterior.

- **Consulta al Grafo:** Ejecuta una consulta agrupada para extraer de forma masiva únicamente las Subpartidas del Sistema Armonizado (6 dígitos) que dependen directamente de las tres partidas finalistas.

- **El comportamiento del Agente:** El agente recibe el árbol parcial y aplica las reglas de descarte e inclusión. Aquí se ejecuta la RGI 3(a) (la partida más específica tendrá prioridad sobre las partidas de alcance más general) y la RGI 6 (clasificación en subpartidas).
   
    - Mecanismo de poda: El agente redacta la justificación legal de descarte para las ramas débiles. Por ejemplo: "Se descarta la hipótesis de la partida 85.28 aplicando la Nota 7 del Capítulo 85, la cual otorga prioridad absoluta a la partida 85.24 y 85.17 sobre cualquier otra partida de la nomenclatura en función de su carácter esencial".

- **Estructura del output:** El árbol se reduce en vivo. El agente retorna únicamente las dos subpartidas internacionales (6 dígitos) finalistas que resistieron el análisis de ponderación jurídica.


#### Sub-paso 4.3: Anclaje de la fracción arancelaria nacional (10 dígitos)

- **Entrada operativa:** Las dos subpartidas a nivel internacional (6 dígitos) que sobrevivieron al filtro aduanero.

- **Consulta al Grafo:** Extracción final de los nodos hoja correspondientes a las Fracciones Arancelarias Nacionales (10 dígitos) específicas de la legislación de la aduana de destino (Arancel de la República Bolivariana de Venezuela).

- **El comportamiento del Agente:** El modelo evalúa los desgloses nacionales (apéndices de subpartidas regionales y nacionales) donde se discriminan criterios técnicos ultraespecíficos como frecuencias de bandas, potencias nominales o características de empaque industrial.

- **Estructura del output:** El agente cierra el flujo heurístico declarando un veredicto definitivo unificado en el JSON


---

#### 5 Construcción del Expediente de Evidencias

Una vez que el agente tiene el código de 10 dígitos ganador, su comportamiento cambia de "buscador" a "auditor". No puede entregar el resultado sin pruebas.

- **El comportamiento del Agente:** Camina el grafo al revés **(Traceback)**. Partiendo del nodo de 10 dígitos, sube por las relaciones jerárquicas y recolecta:

    - Los textos de los nodos intermedios (NCM, Subpartida SA, Partida) para armar la línea del árbol.

    - Las Reglas generales de Interpretación (RGI) aplicables a esa estructura.

    - Los requisitos de Régimen Legal (permisos) y Régimen Fiscal (tasas e impuestos base) amarrados a ese código de 10 dígitos.

#### 6 Redacción del dictamen pericial

El último estado del agente es la formalización jurídica. El agente consolida toda la información que extrajo del grafo en un documento con estructura de informe legal.

- **El comportamiento del agente:** Toma los ladrillos de información (Textos de partidas, contenido exacto de las notas validadas, tasas, etc.) y los organiza bajo un formato estricto de dictamen: Identificación $\rightarrow$ Jerarquía $\rightarrow$ Fundamento de Reglas $\rightarrow$ Notas de Coherencia $\rightarrow$ Tarifa Fiscal y Cierre.

