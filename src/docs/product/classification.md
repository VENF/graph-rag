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


#### 4 Determinación de la fracción arancelaria 

El objetivo de este paso es navegar la jerarquía arancelaria desde el nivel de partida (4 dígitos) hasta el código nacional (10 dígitos), aplicando las Reglas Generales de Interpretación (RGI) de forma secuencial: RGI 1 para la selección de partida y RGI 6 para la clasificación en subpartidas.

El agente recorre el árbol de forma lineal y determinista, reduciendo el universo de búsqueda en cada nivel:

```
[Capítulo Aprobado]
       │
       ▼
[Sub-paso 4.1] ──► Selección de Partida (4 dígitos)
       │
       ▼
[Sub-paso 4.2] ──► Selección de Subpartida SA (6 dígitos)
       │
       ▼
[Sub-paso 4.3] ──► Anclaje de Fracción Arancelaria Nacional (10 dígitos)
       │
       ▼
[Grafo State actualizado con jerarquía completa]
```

#### Sub-paso 4.1: Selección de partida (4 dígitos)

- **Entrada operativa:** El objeto **technicalSheet** unificado del Paso 1 y las Notas Legales obtenidas en el Paso 3.

- **Consulta al Grafo:** Extracción determinista de todas las Partidas (4 dígitos) indexadas bajo el capítulo aprobado.


- **El comportamiento del Agente:** El agente selecciona la partida con mayor probabilidad de encaje legal según la RGI 1 (texto de las partidas y notas de sección o capítulo). La partida seleccionada determina el universo del sub-paso siguiente.


#### Sub-paso 4.2: Selección de subpartida (6 dígitos)

- **Entrada operativa:** La partida (4 dígitos) seleccionada en el sub-paso anterior + el technicalSheet + las Notas Legales.

- **Consulta al Grafo:** Extracción de todas las Subpartidas SA (6 dígitos) que pertenecen a la partida seleccionada.

- **El comportamiento del Agente:** Aplica la RGI 6 (clasificación en subpartidas) para elegir la subpartida correcta. Si hay notas de subpartida (MODIFICA_CRITERIO) que afecten el rango, el agente las evalúa para confirmar o redirigir la selección.


#### Sub-paso 4.3: Anclaje de fracción arancelaria nacional (10 dígitos)

- **Entrada operativa:** La subpartida SA (6 dígitos) seleccionada en el sub-paso anterior.

- **Consulta al Grafo:** Extracción final de los nodos hoja correspondientes a las Fracciones Arancelarias Nacionales (10 dígitos) de la legislación de la aduana de destino (Arancel de la República Bolivariana de Venezuela).

- **El comportamiento del Agente:** Evalúa los desgloses nacionales donde se discriminan criterios técnicos ultraespecíficos (frecuencias de bandas, potencias nominales, empaque industrial) para seleccionar el código de 10 dígitos definitivo. El código ganador incluye su tasa AEC, unidad física y regímenes aplicables.

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

