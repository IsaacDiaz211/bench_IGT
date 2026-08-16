# bench_IGT

Benchmark independiente para comparar modelos de OpenRouter en las tareas que
generan el contenido lingüístico de la aplicación móvil Leyéndolo:

- Traducción natural.
- Glosas morfológicas compatibles con el formato de la aplicación.
- Puntos gramaticales y sus explicaciones.

El benchmark se ejecuta en PC y no forma parte de la aplicación Expo/React
Native. Su finalidad es seleccionar los modelos que proporcionen la mejor
experiencia de usuario en la aplicación real.

## Alcance

- Pares de idiomas iniciales: inglés → español y chino → español.
- La segmentación no se evalúa. Los casos del dataset contienen las oraciones
  ya separadas para poder reproducir los lotes que usa la aplicación.
- La salida debe cumplir los esquemas JSON que consume la aplicación.
- La comparación principal se hace modelo por modelo, sin fallback, para medir
  la calidad y el coste propios de cada candidato.
- Después de la comparación individual se podrá simular una cadena de fallback
  para estimar el comportamiento de una configuración de producción.
- DeepSeek Flash v4-0731 y GPT5.6-Luna se usarán como jueces de calidad, no como
  modelos candidatos.

La especificación completa está en
[`docs/benchmark-spec.md`](docs/benchmark-spec.md).

## Qué se mide

- Calidad de la traducción natural.
- Calidad y corrección de las glosas.
- Calidad de los puntos gramaticales.
- Tasa de respuestas válidas y completas.
- Tasa de errores, timeouts y reintentos.
- Latencia total y por etapa.
- Tokens utilizados y coste real de las generaciones.
- Coste total por modelo candidato, incluyendo las llamadas de los jueces.
- Acuerdo y divergencia entre los dos modelos jueces.

La calidad no se reducirá inicialmente a una única cifra arbitraria. Los
informes mostrarán primero las métricas por idioma y por etapa; después se
aplicarán umbrales de calidad y fiabilidad antes de comparar latencia y coste.

## Relación con la aplicación

La referencia funcional está en el proyecto hermano
[`ravenToPandas`](../ravenToPandas). En particular:

- `services/OpenRouterTranslation.ts` define los prompts, esquemas y validación
  de traducción, glosa y gramática.
- La glosa usa `surface` y `gloss`; para lenguas logográficas también usa
  `reading`.
- Las respuestas de glosa se agrupan en lotes de hasta cuatro oraciones.
- Los puntos gramaticales se devuelven en `points`, con un máximo de dos
  elementos.

El benchmark conservará una versión de los prompts y esquemas utilizados en
cada ejecución. Si la aplicación cambia ese contrato, se creará una nueva
versión del benchmark en lugar de comparar silenciosamente resultados
incompatibles.

## Stack y ejecución

- Bun `1.3.12` como runtime.
- pnpm `11.1.3` como gestor de paquetes.
- TypeScript estricto.
- `fetch` nativo para OpenRouter.
- Ajv para validar JSON Schema.
- `bun test` para pruebas.

Instala las dependencias y configura la clave:

```bash
pnpm install
cp .env.example .env
```

Ejecuta una comparación completa con candidatos y jueces:

```bash
pnpm benchmark -- \
  --dataset datasets/evaluation/cases.jsonl \
  --models modelo/candidato-a,modelo/candidato-b \
  --judges modelo/juez-deepseek,modelo/juez-gpt
```

Los resultados se escriben de forma incremental desde el primer caso en
`results/<run-id>/`. Para continuar una ejecución interrumpida:

```bash
pnpm benchmark -- --resume results/<run-id>
```

El progreso queda en `progress.json` y los jobs terminados en
`completed.jsonl`. No es necesario esperar al final para conservar las
respuestas ya completadas.

Sin argumentos, `pnpm benchmark` ejecuta `run` con la configuración de
`.env`. Para evaluar una ejecución ya completada con modelos juez
adicionales, sin volver a llamar a los candidatos:

```bash
pnpm benchmark -- add-judge --run results/<run-id> --judges modelo/juez-extra
```

El resultado se escribe en un directorio derivado
(`results/<run-id>-addjudge-<modelos>`, o el indicado con `--output`) y el
run original queda intacto. Los jueces ya presentes en la ejecución se
omiten.

El comando ejecuta traducción, glosa y gramática. Cada salida válida se envía a
los jueces configurados. El informe muestra por candidato:

```text
candidateCostUsd + judgeCostUsd = totalCostUsd
```

El coste total de la ejecución suma todos los candidatos y todos los jueces. Si
OpenRouter no devuelve todavía las estadísticas de una generación, se usa el
uso de tokens o el precio del catálogo como estimación y se marca como tal. Las
llamadas sin coste resoluble se contabilizan aparte.

Valida un dataset sin consumir API:

```bash
pnpm validate-dataset -- --dataset tests/fixtures/cases.jsonl
```

## Estado

El primer flujo ejecutable está implementado. Los corpus inglés y chino están
disponibles como JSONL de evaluación; falta definir la lista final de modelos.

## Estructura prevista

```text
bench_IGT/
├── datasets/
│   ├── evaluation/
│   │   ├── english.jsonl
│   │   └── chinese.jsonl
│   └── smoke/
│       └── cases.jsonl
├── docs/
│   └── benchmark-spec.md
├── prompts/
│   ├── app-compatible/
│   └── judges/
├── results/
├── src/
│   ├── cli.ts
│   ├── dataset/
│   ├── execution/
│   ├── judges/
│   ├── metrics/
│   ├── openrouter/
│   ├── reports/
│   ├── stages/
│   └── validation/
├── tests/
├── .env.example
├── package.json
├── pnpm-lock.yaml
└── README.md
```

Las pruebas no escriben resultados en `results/`; usan directorios temporales.
Esa carpeta queda reservada para ejecuciones reales del benchmark.

## Seguridad

La herramienta usará una clave directa de OpenRouter en el ordenador. Nunca se
debe guardar una clave en el dataset, en respuestas versionadas ni en los
informes. La variable prevista será `OPENROUTER_API_KEY`.
