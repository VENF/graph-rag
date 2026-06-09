# Schema del Grafo de Conocimiento Legal

## Tipos de Nodo

{{NODE_TYPES_TABLE}}

## Cómo Expandir el Grafo

### Para agregar nuevos documentos:

1. Colocar los archivos `.pdf.md` (o el formato configurado) en el directorio de entrada
2. Ejecutar el pipeline:
   ```bash
   npx tsx src/modules/builder/index.ts --input ./nuevos-docs/ --output ./knowledge-graph/
   ```
3. El pipeline detectará automáticamente artículos, códigos y regímenes nuevos
4. Los nodos existentes se actualizarán (campo `ultima_revision`)

### Para agregar nuevos tipos de nodo:

1. Definir el nuevo tipo en `pipeline_config.yaml` bajo `node_types`
2. Crear el extractor correspondiente en `src/extractor.ts`
3. Agregar el tipo a `types.ts`
4. Registrar las relaciones en `src/relations.ts`

### Ejemplo: Agregar tipo "exoneracion"

```yaml
# En pipeline_config.yaml
node_types:
  exoneracion:
    dir: "05-exoneraciones"
```

En `relations.ts`, agregar:
```typescript
// Exoneración modifica tasa de código
  relaciones.push({
    type: 'modifica',
    origin: exoneracion.id,
    target: codigo.id,
  })
```

## Tipos de Relación

| Tipo | Dirección | Significado |
|------|-----------|-------------|
| `es_parte_de` | hijo → padre | Pertenencia jerárquica |
| `pertenece_a` | código → capítulo | Pertenencia a capítulo SA |
| `regula` | artículo → código/régimen | Base legal |
| `requiere` | código → régimen | Exigencia legal |
| `refiere_a` | artículo → artículo | Referencia cruzada |
| `contiene` | documento → elemento | Contención documental |
