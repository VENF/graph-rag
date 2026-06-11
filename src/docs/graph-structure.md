# Estructura del Grafo de Conocimiento Legal

### Tipos de Nodo

#### `Documento`

Documento fuente (Gaceta Oficial).

```json
{
  "id": "doc-gaceta-6804",
  "title": "Gaceta Oficial de la República Bolivariana de Venezuela",
  "number": "6.804",
  "date": "2024-04-25",
  "decree": "4.944"
}
```

**Relaciones:** `contiene → articulo | capitulo | codigo | subpartida`

---

### `Articulo`

Cada artículo legal del decreto/ley.

```json
{
  "id": "art-003",
  "number": 3,
  "legal_chapter": "I",
  "references": [37, 8, 9]
}
```

**Relaciones salientes:** `es_parte_de → documento`, `refiere_a → articulo`, `regula → regimen-legal | codigo`

---

### `Subpartida`

Partida (4d), subpartida (6d) o subpartida regional (8d). Generada automáticamente desde cada código de 10 dígitos.

```json
{
  "id": "sub-01012100",
  "code": "01012100",
  "display": "0101.21.00",
  "level": 8
}
```

**Relaciones:** nivel inferior `es_parte_de` → nivel superior, nivel 4d `es_parte_de` → capitulo

---

### `CodigoArancelario`

Código SA de 10 dígitos (subpartida nacional).

```json
{
  "id": "cod-0101210010",
  "code": "0101.21.00.10",
  "description": "Para carreras",
  "sa_chapter": "01",
  "aec": { "rate": 0 },
  "physical_unit": "u",
  "import_regime": ["5", "6"],
  "export_regime": []
}
```

**Relaciones salientes:** `pertenece_a → capitulo`, `es_parte_de → subpartida`, `requiere → regimen-legal`, `sujeto_a → articulo`

---

### `Capitulo`

Capítulo del Sistema Armonizado.

```json
{
  "id": "cap-01-animales-vivos",
  "number": "01",
  "title": "Animales vivos",
  "section": "I"
}
```

**Relaciones entrantes:** `pertenece_a ← codigo`, `aclara ← nota-legal`, `es_parte_de ← subpartida(4d)`

---

### `RegimenLegal`

Régimen legal (permiso, licencia, restricción, prohibición). Definidos en el Art. 21 del Decreto.

```json
{
  "id": "reg-005",
  "code": "5",
  "description": "Certificado Sanitario del País de Origen",
  "entity": "MAT"
}
```

**Relaciones entrantes:** `requiere ← codigo`, `regula ← articulo`

---

### `NotaLegal`

Nota legal de sección, capítulo, subcapítulo, subpartida o complementaria.

```json
{
  "id": "nota-01-capitulo-0",
  "nota_type": "capitulo",
  "chapter": "01"
}
```

**Relaciones salientes:** `aclara → capitulo`, `modifica_criterio → subpartida | codigo`

---

### `Subcapitulo`

Subcapítulos del SA dentro de un capítulo. Actualmente Cap. 98 (I–IV, regímenes especiales de ensamblaje).

```json
{
  "id": "subcap-98-i",
  "chapter": "98",
  "roman": "I",
  "title": "SUBCAPÍTULO I PARTES, PIEZAS Y COMPONENTES..."
}
```

**Relación:** `subdivide → capitulo`

---

## Relaciones

```
DOCUMENTO ──contiene──▶ ARTÍCULO ──refiere_a──▶ ARTÍCULO
DOCUMENTO ──contiene──▶ CAPÍTULO ◀──es_parte_de── SUBPARTIDA(4d)
DOCUMENTO ──contiene──▶ CÓDIGO ──es_parte_de──▶ SUBPARTIDA(8d)
CÓDIGO ──pertenece_a──▶ CAPÍTULO
CÓDIGO ──requiere────▶ RÉGIMEN
CÓDIGO ──sujeto_a────▶ ARTÍCULO
ARTÍCULO ──regula────▶ RÉGIMEN / CÓDIGO
NOTA_LEGAL ──aclara──▶ CAPÍTULO
NOTA_LEGAL ──modifica_criterio──▶ SUBPARTIDA / CÓDIGO
SUBCAPÍTULO ──subdivide──▶ CAPÍTULO
```

| Tipo                | Desde                   | Hacia                      | Descripción                                  |
| ------------------- | ----------------------- | -------------------------- | -------------------------------------------- |
| `contiene`          | documento               | articulo, capitulo, codigo | El documento contiene estos elementos        |
| `es_parte_de`       | subpartida (nivel inf.) | subpartida (nivel sup.)    | Jerarquía de subpartidas (8d → 6d → 4d)      |
| `es_parte_de`       | subpartida 4d           | capitulo                   | Partida pertenece a capítulo SA              |
| `es_parte_de`       | codigo                  | subpartida 8d              | Código pertenece a subpartida padre          |
| `pertenece_a`       | codigo                  | capitulo                   | El código pertenece a un capítulo SA         |
| `regula`            | articulo                | regimen, codigo            | Base legal del régimen/código                |
| `requiere`          | codigo                  | regimen                    | Requisito legal aplicable al código          |
| `refiere_a`         | articulo                | articulo                   | Referencia cruzada entre artículos           |
| `aclara`            | nota-legal              | capitulo                   | Nota legal aclara el capítulo                |
| `modifica_criterio` | nota-legal              | subpartida, codigo         | Nota modifica criterio de clasificación      |
| `sujeto_a`          | codigo                  | articulo                   | Código sujeto a excepción legal del artículo |
| `subdivide`         | subcapitulo             | capitulo                   | Subcapítulo subdivide al capítulo SA         |

---

## Convención de IDs

| Nodo        | Formato                          | Ejemplo                 |
| ----------- | -------------------------------- | ----------------------- |
| documento   | `doc-{gaceta\|decreto}-{numero}` | `doc-gaceta-6804`       |
| capitulo    | `cap-{numero}-{slug-titulo}`     | `cap-01-animales-vivos` |
| articulo    | `art-{numero-3-digitos}`         | `art-003`               |
| codigo      | `cod-{codigo-sin-puntos}`        | `cod-0101210010`        |
| subpartida  | `sub-{codigo-sin-puntos}`        | `sub-01012100`          |
| regimen     | `reg-{codigo-3-digitos}`         | `reg-005`               |
| nota-legal  | `nota-{chapter}-{tipo}-{n}`      | `nota-01-capitulo-0`    |
| subcapitulo | `subcap-{chapter}-{roman}`       | `subcap-98-i`           |

---

## Métricas del último build

- 29.507 nodos
- 77.918 relaciones
- 11.811 códigos arancelarios (99,9% de cobertura)

---

## Cómo expandir el grafo

### Nuevos documentos fuente

Colocar archivos `.md` en `knowledge-base/` y ejecutar `pnpm build-graph`. Los nodos existentes no se duplican (identificados por `id`).

### Nuevo tipo de nodo

1. Registrar en `pipeline_config.yaml` bajo `node_types`
2. Crear extractor en `extractor/{tipo}.ts`
3. Registrar en `extractor/index.ts`
4. Definir relaciones en `relations/` si aplica
