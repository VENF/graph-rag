# Arancel de Aduanas

Para entender el Arancel de Aduanas desde una perspectiva estrictamente jurídica, debemos abstraerlo de la Gaceta Oficial, de los números de decreto temporales y de la base de datos. Debes visualizarlo como una infraestructura legal viva que el Estado utiliza para regular, proteger y recaudar en su territorio.

A nivel de lógica jurídica, esta entidad se compone de tres dimensiones:

1. **Estructura Estática:** Cómo se organiza
2. **Identificación Identitaria:** Cómo se nombra conceptualmente
3. **Mecanismo de Extensión:** Cómo muta en el tiempo

---

### Estructura Estática

El Arancel de Aduanas no es un texto plano; es una pirámide jerárquica de obligaciones. Estructuralmente, se divide siempre en tres grandes capas independientes:

- **El Cuerpo Normativo:** Son las reglas de juego compuesto por Artículos. Establece las disposiciones generales, las definiciones de los regímenes aduaneros, las prohibiciones macro, las potestades del Ejecutivo y las reglas de interpretación. Es el marco constitucional del documento.

- **La Estructura Sistemática:** La Clasificación de la OMA, es la división científica de la materia y se organiza en Secciones, Capítulos (dos dígitos), Partidas (cuatro dígitos) y Subpartidas. Esta estructura está custodiada por las Notas Legales, que jurídicamente tienen fuerza de ley y delimitan de forma exacta qué entra y qué queda excluido de cada categoría.

- **El Apéndice Operacional (Las Tarifas):** Es la tabla que cruza la estructura de la OMA con las decisiones soberanas del Estado. Aquí es donde a cada código de 10 dígitos (en nuestro caso, la Nomenclatura Común del Mercosur) se le asigna su **AEC** (Arancel Externo Común) y sus **Regímenes Legales** (los permisos requeridos de los ministerios).

---

### Mecanismo de Extensión

El documento raíz es estático, pero la realidad comercial es dinámica. Para que la entidad jurídica se adapte sin tener que redactar un Arancel desde cero cada mes, el derecho aduanero utiliza tres mecanismos satélites de extensión:

- **La Enmienda Internacional:** Ocurre cada 5 años por mandato de la OMA. Es el único mecanismo que destruye y reemplaza el documento raíz. Cambia los códigos, crea nuevas tecnologías y elimina las obsoletas. Obliga a emitir un nuevo decreto matriz.

- **La Reforma Parcial:** El Estado modifica el Arancel por dentro mediante "parches". No cambia la estructura de los códigos, pero muta sus propiedades: sube una tarifa para proteger la industria nacional o añade un permiso de importación a un químico peligroso.

- **El Decreto de Exoneración:** No modifica el Arancel, sino que suspende su fuerza ejecutiva para ciertos sujetos o mercancías de forma temporal. El arancel base sigue siendo, por ejemplo, 10%, pero el Decreto de Exoneración crea una "burbuja legal" que permite declarar a una tasa efectiva del 0% por un plazo determinado.

---

### Diccionario de Nomenclatura

Esta es la regla de oro para garantizar que los elementos del mundo físico (mercancías) se mantengan globales, mientras que los elementos normativos (leyes) queden blindados dentro de su documento de origen.

| Entidad | Formato del ID | Ejemplo Práctico | Naturaleza Jurídica |
| :--- | :--- | :--- | :--- |
| **Documento** | `[PAÍS]-[TIPO]-[ENMIENDA].[AÑO]` | `VE-MATRIZ-HS7.2024` | Único por Gaceta Oficial. Identifica el origen de los datos. |
| **Artículo** | `ART-{num}-{docId}` | `ART-003-VE-MATRIZ-HS7.2024` | Local. Atado a su documento contenedor para evitar colisiones. |
| **Código** | `COD-{sin-puntos}` | `COD-8504409010` | Global. Representa la mercancía física; inmune a cambios de decretos. |
| **Subpartida** | `SUB-{sin-puntos}` | `SUB-01012100` | Global. Estructura de clasificación internacional dictada por la OMA. |
| **Capítulo SA** | `CAP-{num}-{slug}` | `CAP-01-ANIMALES-VIVOS` | Global. Identificador macro del Sistema Armonizado. |
| **Subcapítulo** | `SUBCAP-{chapter}-{roman}` | `SUBCAP-98-I` | Global. Subdivisiones dentro de la nomenclatura de la OMA. |
| **Régimen** | `REG-{cod}` | `REG-005` | Global. Restricción o permiso exigido por los ministerios nacionales. |
| **Nota Legal OMA** | `NOTE-{chapter}-OMA-{idx}` | `NOTE-01-OMA-0` | Global. Solo cambia con la Enmienda Internacional (cada 5 años). |
| **Nota Nacional** | `NOTE-{chapter}-NAC-{idx}-{docId}` | `NOTE-29-NAC-21-VE-MATRIZ-HS7.2024` | Local. Creada o modificada por Reforma Parcial del Ejecutivo. |

---

### Modelado de Relaciones Semánticas

El grafo se organiza en dos capas que coexisten sobre los mismos nodos. La **Capa Interna** modela la anatomía de un documento individual. La **Capa Macro** conecta documentos entre sí a través del tiempo.

---

#### Capa Interna (implementada)

Relaciones intra-documento que describen la estructura, regulación e interpretación de un solo documento.

#### 1. Jerarquía documental

El documento contiene a todos sus elementos, y cada elemento sabe que pertenece a su documento.

```
[DOCUMENTO]
    │
    ├──(:CONTIENE)──────► [ART-003-VE-MATRIZ-HS7.2024]
    │                          │
    │                          └──(:ES_PARTE_DE)──► [DOCUMENTO]
    │
    ├──(:CONTIENE)──────► [CAP-01-ANIMALES-VIVOS]
    │                          │
    │                          └──(:ES_PARTE_DE)──► [DOCUMENTO]
    │
    └──(:CONTIENE)──────► [COD-8504409010]
                               │
                               └──(:ES_PARTE_DE)──► [DOCUMENTO]
```

Las subpartidas también se organizan jerárquicamente entre sí:

```
[SUB-8504] ◄──(:ES_PARTE_DE)── [SUB-850440]
                                       │
                  (:ES_PARTE_DE)───────┘
                                       │
                                  [COD-8504409010]
                                       │
                  (:ES_PARTE_DE)───────┘
                  (:PERTENECE_A)──► [CAP-85-MAQUINARIAS]
```

#### 2. Clasificación arancelaria

Los códigos pertenecen a un capítulo SA. Los subcapítulos subdividen capítulos.

```
[COD-8504409010] ──(:PERTENECE_A)──► [CAP-85-MAQUINARIAS]

[SUBCAP-98-I] ──(:SUBDIVIDE)──► [CAP-98-DISPOSICIONES]
```

#### 3. Regulación y restricciones

Los artículos dictan las reglas (tarifas, regímenes). Los códigos las cumplen.

```
[ART-021-VE-MATRIZ-HS7.2024]
    │
    ├──(:REGULA)──► [REG-005]         (Art.21 define el régimen)
    │
    └──(:REGULA)──► [COD-8504409010]  (Art.21 regula códigos con regímenes)

[COD-8504409010]
    │
    ├──(:REQUIERE)──► [REG-005]       (El código necesita ese permiso)
    │
    └──(:SUJETO_A)──► [ART-003-VE-MATRIZ-HS7.2024] (Excepción AEC)
```

#### 4. Hermenéutica legal

Interpretación: referencias entre artículos, notas legales que aclaran capítulos o modifican criterios de clasificación.

```
[ART-037-VE-MATRIZ-HS7.2024] ──(:REFIERE_A)──► [ART-003-VE-MATRIZ-HS7.2024]
[ART-037-VE-MATRIZ-HS7.2024] ──(:REFIERE_A)──► [ART-021-VE-MATRIZ-HS7.2024]

[NOTE-01-OMA-0] ──(:ACLARA)──► [CAP-01-ANIMALES-VIVOS]

[NOTE-04-OMA-2] ──(:MODIFICA_CRITERIO)──► [SUB-0402]
[NOTE-04-OMA-2] ──(:MODIFICA_CRITERIO)──► [COD-0402100000]
```

Las notas OMA son globales (`NOTE-{chapter}-OMA-{idx}`). Las notas nacionales (`complementaria`) llevan sufijo del documento y pueden ser modificadas por reformas:

```
[NOTE-29-NAC-21-VE-MATRIZ-HS7.2024] ──(:ACLARA)──► [CAP-29-PRODUCTOS-QUIMICOS]
```

---

#### Capa Macro (arquitectura planificada)

Relaciones inter-documento que conectarán MATRIZ, REFORMA y EXONERACION cuando estos documentos existan. Los tipos de relación y los stubs ya están implementados; la lógica de fondo se completará al procesar cada tipo documental.

#### 5. Documento a documento

Cada REFORMA o EXONERACION declara en su frontmatter a qué MATRIZ apunta (`target: VE-MATRIZ-HS7.2024`).

```
[VE-REFORMA-HS7.2025] ──(:MODIFICA)────────────► [VE-MATRIZ-HS7.2024]

[VE-EXONERACION-HS7.2026] ──(:SUSPENDE_APLICACION_DE)──► [VE-MATRIZ-HS7.2024]
```

#### 6. Artículo a artículo (entre documentos)

Un artículo de reforma sustituye al artículo correspondiente de la matriz.

```
[ART-001-VE-REFORMA-HS7.2025] ──(:SUSTITUYE_A)──► [ART-001-VE-MATRIZ-HS7.2024]
```

#### 7. Regulación inter-documento

La exoneración crea una burbuja legal con condición de uso. La reforma actualiza tarifas. La exoneración puede suspender regímenes.

```
[COD-8504409010] ──(:EXONERADO_POR {condicion_uso: "proyectos energía solar"})──► [ART-003-VE-EXONERACION-HS7.2026]

[ART-001-VE-REFORMA-HS7.2025] ──(:ACTUALIZA_TARIFA)──► [COD-8504409010]

[VE-EXONERACION-HS7.2026] ──(:SUSPENDE_REGIMEN)──► [REG-005]
```

#### 8. Visión unificada

Ambas capas coexisten. Las relaciones internas nunca se eliminan; las externas se superponen.

```
[VE-EXONERACION-HS7.2026]
    │
    ├──(:SUSPENDE_APLICACION_DE)──► [VE-MATRIZ-HS7.2024]
    │
    └──(:CONTIENE)──► [ART-003-VE-EXONERACION-HS7.2026]
                              ▲
                              │ (:EXONERADO_POR {condicion_uso})
                              │
[COD-8504409010] ──(:SUJETO_A)──► [ART-003-VE-MATRIZ-HS7.2024] (Sigue vigente)
    │
    └──(:REQUIERE)──► [REG-005] (Sigue vigente, a menos que EXONERACION diga lo contrario)
```

El código mantiene su `aec_actual` y acumula entradas en `historial`:

```json
{
  "aec_actual": 0,
  "historial": [
    "{\"desde\":\"2024-04-25\",\"hasta\":null,\"aec\":15,\"documento\":\"VE-MATRIZ-HS7.2024\"}",
    "{\"desde\":\"2025-06-01\",\"hasta\":null,\"aec\":0,\"documento\":\"VE-REFORMA-HS7.2025\"}"
  ]
}
```

---

## Resumen de relaciones

| Capa | Relación | Origen → Destino | Estado |
|---|---|---|---|
| Interna | `CONTIENE` | DOCUMENTO → ARTICULO, CAPITULO, CODIGO | ✅ |
| Interna | `ES_PARTE_DE` | ARTICULO, CAPITULO, CODIGO → DOCUMENTO | ✅ |
| Interna | `ES_PARTE_DE` | SUBPARTIDA → SUBPARTIDA padre, CAPITULO | ✅ |
| Interna | `ES_PARTE_DE` | CODIGO → SUBPARTIDA | ✅ |
| Interna | `PERTENECE_A` | CODIGO → CAPITULO | ✅ |
| Interna | `SUBDIVIDE` | SUBCAPITULO → CAPITULO | ✅ |
| Interna | `REGULA` | ARTICULO → CODIGO, REGIMEN | ✅ |
| Interna | `REQUIERE` | CODIGO → REGIMEN | ✅ |
| Interna | `SUJETO_A` | CODIGO → ARTICULO (excepción AEC) | ✅ |
| Interna | `REFIERE_A` | ARTICULO → ARTICULO | ✅ |
| Interna | `ACLARA` | NOTA → CAPITULO | ✅ |
| Interna | `MODIFICA_CRITERIO` | NOTA → SUBPARTIDA, CODIGO | ✅ |
| Macro | `MODIFICA` | REFORMA → MATRIZ | 🚧 stub |
| Macro | `SUSPENDE_APLICACION_DE` | EXONERACION → MATRIZ | 🚧 stub |
| Macro | `SUSTITUYE_A` | ART-REFORMA → ART-MATRIZ | 🚧 stub |
| Macro | `EXONERADO_POR` | CODIGO → ART-EXONERACION | 🚧 stub |
| Macro | `ACTUALIZA_TARIFA` | ART-REFORMA → CODIGO | 🚧 stub |
| Macro | `SUSPENDE_REGIMEN` | EXONERACION → REGIMEN | 🚧 stub |
