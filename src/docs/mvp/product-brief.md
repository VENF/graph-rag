# Vesta Compliance

El estándar digital para el cumplimiento aduanero avanzado.

SaaS de ingeniería legal que automatiza el análisis de riesgo y optimiza la carga fiscal en las importaciones venezolanas. Contrasta documentación de importación contra gacetas y decretos en tiempo real mediante un motor de inferencia basado en Grafos Jurídicos, entregando un dictamen auditable con trazabilidad normativa exacta para corporaciones **(B2B)** y agencias aduaneras **(B2B2C)**.


### El problema 

El comercio exterior en Venezuela opera bajo **incertidumbre jurídica sistémica**. El Arancel de Aduanas cambia constantemente mediante **"Reformas Parciales"** y **"Decretos de Exoneración"** temporales que modifican impuestos y permisos según el uso o sector del producto, creando un entorno volátil y difícil de rastrear.

#### El costo del error

Una clasificación arancelaria incorrecta genera contingencias financieras críticas:

- **Multas severas calculadas sobre el valor de la carga.**

- **Costos por retrasos diarios (sobreestadía y custodia en puertos).**

- **Pérdida total de activos por retención o comiso al omitir permisos ministeriales.**

#### Cómo se resuelve hoy

El mercado utiliza sistemas de consulta tradicionales como buscadores indexados estáticos combinados con verificación humana. Estas herramientas solo muestran datos aislados; no procesan documentos ni conectan las leyes. El análisis final sigue siendo manual: los analistas deben cruzar los códigos del sistema con PDFs de Gacetas Oficiales, un método lento, ineficiente y propenso a errores por omisión de última hora.

#### La oportunidad

Hay un vacío absoluto de tecnología regulatoria (RegTech) en la región. Al resolver la capa de complejidad de Venezuela usando un motor de grafos adaptado al Sistema Armonizado global, validamos una tecnología exportable. Capturamos el mercado local para luego expandir el software hacia el resto de Latinoamérica, que sufre de burocracia y volatilidad similar.

---

### Audiencia y perfiles de usuario

El MVP de Vesta Compliance atiende a dos actores clave del ecosistema aduanero bajo un modelo híbrido **B2B y B2B2C.**

#### Perfil A: El importador directo | Modelo B2B

- **Quién es:** Gerentes de operaciones, finanzas o dueños de empresas medianas/grandes que importan mercancía recurrentemente.

- **Meta:** Conocer el costo real de desembarque y los requisitos legales antes de que la mercancía salga de origen.

- **Frustración:** La impredecibilidad financiera y depender a ciegas del criterio de terceros, arriesgando su flujo de caja y sus márgenes de ganancia.

#### Perfil B: El agente de aduanas | Modelo B2B2C

- **Quién es:** El profesional técnico con licencia aduanera y los analistas encargados de clasificar y nacionalizar mercancía de terceros.

- **Meta:** Reducir el tiempo de cotización/auditoría y garantizar que no existan errores u omisiones legales en la declaración.

- **Frustración:** El cuello de botella operativo de cruzar gacetas manualmente bajo presión de tiempo y el alto riesgo de recibir sanciones o perder la licencia por un error de clasificación.

---

### La Solución y propuesta de valor

#### Visión del Producto

Vesta Compliance es un motor de inferencia jurídica que automatiza la auditoría arancelaria y predice el impacto fiscal de las operaciones de comercio exterior en Venezuela.

#### Mecanismo Único

A diferencia de las soluciones de IA tradicionales que leen documentos y alucinan, Vesta traduce la legislación aduanera a un grafo que opera bajo reglas lógicas estrictas: no inventa respuestas, sino que traza rutas matemáticas verificables que le permiten citar la Gaceta Oficial y el artículo exacto en cada recomendación. Su estructura permite inyectar actualizaciones normativas infinitas sin alterar el núcleo del sistema.

---

### Flujo del producto en el MVP

El usuario sube una factura proforma o un documento con una lista de productos y la plataforma ejecuta:

- **Caminos legales:** Identifica las 2 o 3 opciones de clasificación arancelaria más probables según las normas, mitigando el riesgo de un criterio único.

- **Impacto fiscal real:** Cruza los códigos con el grafo histórico, valida si aplican Reformas Parciales o Decretos de Exoneración vigentes y verifica si el uso del producto califica para el beneficio.

- **Alertas de restricciones:** Identifica las restricciones y permisos ministeriales obligatorios alertando si alguno está suspendido por decreto.

#### La propuesta de valor

Vesta transforma la incertidumbre en control entregando un dictamen de probabilidades comparativo. El cliente obtiene una hoja de ruta financiera y legal clara antes de que la mercancía salga del puerto de origen, blindando el negocio contra multas y optimizando costos automáticamente.

---

### Objetivos y métricas de exito

#### Objetivos del producto

- **Automatizar la ingesta y el análisis:** Eliminar el procesamiento manual de facturas proforma y el cruce tradicional de gacetas.

- **Garantizar trazabilidad normativa rigurosa:** Proveer un sistema donde cada recomendación u opción sugerida esté estrictamente respaldada por un nodo verídico, eliminando la generación de alucinaciones en la capa de análisis legal.

- **Optimizar la operación B2B/B2B2C:** Reducir drásticamente los tiempos de respuesta de los agentes de aduana y dar predictibilidad financiera al importador.


#### Métricas de Éxito | KPIs del MVP

- **Tiempo de procesamiento (Time-to-Value):** Reducir el tiempo de análisis y generación del dictamen de un promedio de 3 horas de forma manual a menos de 5 minutos en la plataforma.

- **Precisión de la extracción:** Lograr una precisión mayor al 90% en la extracción de datos estructurados de facturas proforma en formato PDF.

- **Tasa de alucinación en el motor de inferencia**: 0%. El sistema operará bajo reglas lógicas estructuradas sobre el motor de inferencia basado en Grafos Jurídicos. Si el sistema genera un resultado, este debe estar vinculado de forma obligatoria a una Gaceta Oficial y artículo real existente en la base de datos.

- **Retención del usuario experto:** Lograr que los agentes de aduana adopten el sistema como su herramienta de auditoría diaria para el **80%** de sus cotizaciones recurrentes.

---

### Fuera de alcance

Para garantizar el despliegue ágil del MVP de Vesta Compliance, las siguientes funcionalidades quedan explícitamente excluidas de esta primera versión:

- **Integración directa con plataformas gubernamentales:** En esta primera fase, el sistema no se conectará con el sistema SIDUNEA ni automatizará la precarga de datos en portales ministeriales. El entregable del MVP es el **Dictamen de Probabilidades Comparativo** para consumo del usuario.

- **Procesamiento de documentación no estructurada compleja:** Quedan excluidos del MVP los documentos escritos a mano, fotografías de baja calidad o escaneos con alto nivel de ruido visual que impidan un rendimiento óptimo del pipeline inicial de extracción (OCR/LLM). El MVP requerirá facturas proforma digitales o escaneos limpios o archivos estructurados (xlsm, csv)

- **Soporte Multi-país:** El alcance inicial del motor de inferencia y la base de conocimiento del grafo se limitarán exclusivamente al Arancel de Aduanas y el marco regulatorio de la República Bolivariana de Venezuela.

---

### Supuestos y dependencias

#### Supuestos

- **Acceso a la información normativa:** Asumimos que las Gacetas Oficiales y resoluciones ministeriales seguirán siendo accesibles, ya sea mediante canales oficiales, suscripciones o repositorios de terceros, para poder ser digitalizadas e inyectadas al motor de inferencia basado en Grafos Jurídicos.

- **Aceptación tecnológica:** Asumimos que los agentes de aduana y departamentos de importación están dispuestos a migrar de un proceso de búsqueda manual a un flujo de trabajo asistido por IA, motivados por la reducción de multas y tiempos.

- **Estandarización de inputs:** Asumimos que las facturas proforma del mercado (inputs) contienen descripciones de mercancía con el nivel mínimo de detalle técnico necesario para que el agente LLM pueda iniciar una búsqueda semántica efectiva en el grafo.

#### Dependencias

- **Capacidad de razonamiento del LLM:** El sistema depende críticamente de modelos de lenguaje avanzados con alta capacidad de comprensión contextual y seguimiento de instrucciones complejas para ejecutar la navegación agéntica sobre el grafo sin desviarse de las reglas lógicas.

- **Actualización del Grafo (Pipeline de Datos):** El valor de Vesta depende directamente de la velocidad de actualización de su base de datos. Se requiere un proceso ágil de curaduría y carga de datos para asegurar que los nuevos decretos o reformas se reflejen en los nodos del grafo en cuestión de horas tras su publicación.

- **Disponibilidad de infraestructura:** Dependencia de la disponibilidad y latencia de los servicios de infraestructura en la nube (proveedores de LLMs y base de datos de grafos) para garantizar que el dictamen se genere en los tiempos definidos en las métricas de éxito.

---

### Preguntas abiertas y riesgos

####  Riesgos críticos

- **Riesgo de extracción:** Las Gacetas Oficiales antiguas o los decretos digitalizados por entes públicos suelen ser PDFs escaneados de muy baja calidad, con manchas, texto torcido o firmas encima. Existe el riesgo de que el pipeline de OCR/LLM extraiga datos erróneos, lo que corrompería las relaciones de ese nodo en el motor de inferencia basado en Grafos Jurídicos.

- **Latencia en la navegación agéntica:** Al usar un agente LLM para explorar activamente el motor de inferencia basado en Grafos Jurídicos en lugar de hacer una consulta SQL/Cypher tradicional rígida, el tiempo de respuesta del sistema podría elevarse si el agente realiza demasiadas iteraciones (loops) antes de consolidar el dictamen.

- **Discrecionalidad de los funcionarios:** El software puede dar la ruta legal matemáticamente perfecta, pero la aduana venezolana sufre de una alta tasa de interpretación subjetiva por parte de los inspectores en puerto. Mitigar la fricción de "el sistema dice X pero el funcionario dice Y" es un reto de adopción del usuario.

#### Preguntas abiertas

- **¿Cuál es la estrategia óptima de Grounding/Validación?:** ¿Qué capas de código determinista se implementarán para validar el output del agente LLM y asegurar al 100% que no mencione leyes ficticias en su respuesta final?

- **¿Cómo se manejará el versionado de las leyes en el Grafo?:** Cuando una ley deroga a otra de forma parcial, ¿cómo estructuraremos las relaciones en la base de datos de grafos para que el agente sepa con precisión cronológica qué decreto aplicaba en la fecha exacta del zarpe?

- **¿Hasta qué punto delegar la clasificación en el MVP?:** Si la factura proforma es muy ambigua (ej. dice solo "Cables"), ¿el sistema debe exigir campos técnicos obligatorios al usuario antes de procesar, o el agente debe ser capaz de repreguntar mediante una interfaz de chat?


---

### Hitos de ejecución del MVP

**Fase 1:** Curaduría y modelado del Grafo semilla

- Estructurar el esquema de la base de datos de grafos (nodos de Capítulos, Partidas, Subpartidas, Decretos y Restricciones).

- Cargar el arancel de aduanas base de Venezuela y los decretos de exoneración vigentes más críticos del año actual para tener el entorno de pruebas inicial.


**Fase 2:** Desarrollo del pipeline de ingesta y extracción

- Diseñar el flujo de extracción (OCR + LLM) optimizado para procesar facturas proforma en PDF y convertirlas a JSON estructurado.

- Implementar las validaciones necesarias para manejar descripciones ambiguas de mercancía.

**Fase 3:** Implementación del agente de navegación (GraphRAG)

- Desarrollar la lógica del agente LLM para que reciba el JSON de la mercancía, explore las relaciones del grafo y razone las implicaciones legales.

- Programar la capa de validación determinista que asegure un 0% de alucinación en las referencias, obligando al sistema a contrastar cada output contra nodos reales del grafo antes de mostrarlo.

**Fase 4:** Diseño de interfaz y pruebas con usuarios Alfa

- Diseñar una interfaz web limpia y scannable centrada en el Dictamen de Probabilidades Comparativo.

- Desplegar una versión Alfa cerrada con un grupo selecto de agencias de aduana e importadores para validar la precisión del sistema frente a casos reales y calibrar el motor.