# Estrategia de Embeddings (Futuro)

## Cuándo implementar

Cuando la búsqueda por grep sea insuficiente: sinónimos no cubiertos, stems de palabras (correr/carrera/corredor), o consultas en inglés.

## Arquitectura propuesta

```
knowledge-graph/_embeddings.json
```

Archivo JSON único (no base de datos), versionable con git, portable.

```json
{
  "version": 1,
  "model": "all-MiniLM-L6-v2",
  "dimension": 384,
  "nodes": [
    {
      "id": "cod-0101210010",
      "text": "Caballos reproductores de raza pura para carreras",
      "tags": ["codigo-arancelario", "capitulo-01", "tasa-cero"],
      "embedding": [0.012, -0.034, ...]
    }
  ]
}
```

## Integración con search_graph

La herramienta `search_graph` se extiende con un modo híbrido:

1. **Grep** para matching exacto (existente)
2. **Embeddings** para matching semántico (nuevo)
3. **Merge + rank** por score combinado

La interfaz del tool no cambia — solo el backend de búsqueda.

## Evaluación

Construir un set de 10-20 queries de prueba con resultados esperados:

| Query | Código esperado | Tipo de match |
|-------|----------------|---------------|
| "caballos" | cod-0101210010 | Semántico |
| "vacas" | cod-0102210010 | Semántico |
| "bovinos reproductores" | cod-0102210010 | Exacto |

Medir recall@k con grep vs embeddings vs híbrido.

## Modelo recomendado

- **all-MiniLM-L6-v2**: 384 dimensiones, rápido, corre en CPU
- Alternativa: **multilingual-e5-small** (mejor para español)
- Embeddings generados offline con un script `src/modules/search/build-embeddings.ts`
