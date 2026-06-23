# FLUJO GENERAL DEL COMPORTAMIENTO DEL AGENTE

El agente de busqueda no puede limitarse a lanzar una consulta a una base de datos vectorial. Tiene que replicar el proceso cognitivo, analítico y jurídico de un Perito Aduanero humano y su comportamiento debe seguir una estructura puramente deductiva y legal.

---

### FLUJO GENERAL DEL COMPORTAMIENTO DEL AGENTE

#### 1 Estado de admisión y purificación

El agente recibe los datos de la factura proforma o el input del usuario con una lista de productos.

- **El comportamiento del agente:** Actúa como un filtro de ruido. Su primera tareas es traducir el lenguaje caótico del mercado al "Lenguaje Técnico del Sistema Armonizado" y generar una **ficha técnica merceológica estandarizada**.

- **Resultado de este paso:** Ficha tecnica limpia que contiene únicamente el Sustantivo Base + Adjetivo Clasificatorio Mínimo.

---

#### 2 Búsqueda semántica y enriquecimiento contextual

Con la ficha técnica purificada, el agente ya no recorre el árbol arancelario nivel por nivel. En lugar de eso, transforma la descripción técnica en un vector semántico y lanza una búsqueda por similitud sobre la totalidad de la base de conocimiento.

- **El comportamiento del agente:** Convierte la ficha técnica en un embedding semántico que captura la naturaleza del producto, su materia constitutiva, función principal y presentación. Este vector se compara contra los 11.000 códigos arancelarios indexados, recuperando los más cercanos por similitud coseno.

- **Consulta al Grafo:** Por cada candidato recuperado, el agente extrae de forma masiva:
  - La jerarquía completa (capítulo, partida, subpartidas, código nacional)
  - Los regímenes legales y artículos aplicables
  - Las notas legales del capítulo correspondiente

  Todo esto ocurre en una única operación sobre el grafo, sin recorridos iterativos ni llamadas encadenadas.

- **Comportamiento adaptativo:** En un primer intento el agente recupera los 3 candidatos más cercanos. Si ninguno es aceptado en la fase de veredicto, el agente expande su búsqueda a 15 candidatos en un segundo intento.

- **Resultado de este paso:** Un conjunto acotado de candidatos arancelarios, cada uno con su ruta jerárquica completa, notas legales del capítulo y régimen legal asociado. El agente tiene todo el contexto necesario para decidir sin tener que volver al grafo.

---

#### 3 Veredicto clasificatorio con redirección

El agente tiene los candidatos y su contexto legal completo. Ahora debe aplicar las reglas del Sistema Armonizado para determinar cuál —si alguno— clasifica correctamente el producto.

- **El comportamiento del agente:** Aplica las Reglas Generales Interpretativas (RGI 1-6) sobre los candidatos disponibles. Evalúa los textos de partida y subpartida, contrasta con las notas legales de sección, capítulo y subpartida, y verifica la coherencia técnica del producto con cada código.

- **Flujo de Decisión:**
  - **Si un candidato clasifica correctamente:** El agente selecciona el código, y emite un dictamen con la ruta de clasificación completa y una justificación técnica por cada nivel jerárquico (capítulo, partida, subpartida SA, subpartida nacional, código).
  - **Si ningún candidato clasifica correctamente:** El agente redirige. El paso 2 se ejecuta nuevamente con un universo de búsqueda ampliado (15 candidatos en lugar de 3). En este segundo intento, el agente está obligado a seleccionar el mejor candidato disponible.

- **Resultado de este paso:** Dictamen pericial final con el código arancelario seleccionado, su tasa AEC, unidad física, ruta de clasificación jerárquica y justificación técnico-legal. Si la búsqueda semántica no encontró un candidato adecuado en el primer intento, la redirección garantiza que siempre haya una clasificación de respaldo.

---

### Resumen del flujo

```
[Input del usuario]
       │
       ▼
┌─────────────────────────────┐
│ 1. Admisión y purificación  │  ← LLM: ficha técnica estandarizada
│    (distil)                 │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ 2. Búsqueda semántica       │  ← Embedding + vector search
│    (candidateSearch)        │     + enrichment (jerarquía,
│                             │     regímenes, notas)
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ 3. Veredicto clasificatorio │  ← LLM: RGI 1-6, selección
│    (verdict)                │     o redirección
└─────────────┬───────────────┘
              │
              ▼
       [Dictamen final]
```

El flujo completo ejecuta un máximo de 2-3 llamadas a LLM (una para la ficha técnica, una o dos para el veredicto) y 3 consultas al grafo (vector search, enrichment y notas), reemplazando el recorrido lineal y determinista del árbol arancelario por una búsqueda semántica guiada por similitud vectorial.
