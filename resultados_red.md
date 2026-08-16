# Resultados del benchmark — Corpus de inglés reducido (2.ª iteración)

Informe de la ejecución `20260813213251-2c6f7cd1` (realizada el 2026-08-13),
que evalúa modelos candidatos de OpenRouter para las tareas de contenido
lingüístico de la aplicación **Leyéndolo**: traducción natural, glosas
morfológicas y puntos gramaticales.

Esta segunda iteración usa un corpus reducido y una lista de modelos
reordenada tras los hallazgos de la primera ejecución (ver `resultados.md`).

## Configuración de la ejecución

- **Dataset:** `datasets/evaluation/english_red.jsonl` (8 casos, en-001 a
  en-008, un subconjunto del corpus original de 20).
- **Repeticiones:** 1.
- **Modelos candidatos:** 3. Se mantienen `inception/mercury-2` y
  `openai/gpt-5.6-luna:nitro`, se incorpora `google/gemini-3.7-flash:nitro` y
  se descartan los modelos con fiabilidad problemática de la iteración
  anterior (`thinkingmachines/inkling-small:nitro`,
  `arcee-ai/trinity-large-thinking:nitro` y
  `nvidia/nemotron-3.5-lightning:nitro`).
- **Jueces de calidad:** `deepseek/deepseek-v4-flash-0731:nitro` y
  `openai/gpt-5.6-luna` (escala de 1 a 5).
- **Total de llamadas:** 216 (144 de jueces y 72 de candidatos).

> Nota: 13 llamadas no reportaron coste resoluble desde OpenRouter; ese coste
> no se estimó ni se inventó, sino que se contabiliza aparte. Ningún valor del
> informe es una estimación.

> Advertencia: al cambiar el corpus (20 → 8 casos) y la lista de modelos, los
> números de esta ejecución **no son directamente comparables** con los de la
> primera iteración, aunque 6 de los 8 casos coinciden con casos de aquella.

## Resumen ejecutivo

| Modelo | Fiabilidad | Calidad media | Coste total | Latencia (trans. media) | Veredicto |
| --- | --- | ---: | ---: | ---: | --- |
| google/gemini-3.7-flash:nitro | Perfecta (100 %) | 4.15 | $0.114960 | 2.6 s | Mejor calidad, pero el doble de caro |
| openai/gpt-5.6-luna:nitro | Perfecta (100 %) | 4.04 | $0.041212 | 2.5 s | **Recomendado** (mejor calidad-precio) |
| inception/mercury-2 | Perfecta (100 %) | 3.74 | $0.065046 | 1.6 s | El más rápido, calidad inferior |

**Conclusión principal:** los tres candidatos completaron el 100 % de las
etapas sin fallos, timeouts ni errores, a diferencia de la iteración anterior.
`openai/gpt-5.6-luna:nitro` sigue siendo la mejor relación calidad-precio;
`google/gemini-3.7-flash:nitro` lo supera en calidad pero a un coste casi
triple; `inception/mercury-2` es el más veloz pero el más flojo en calidad,
con glosas claramente por debajo.

## Fiabilidad por modelo

| Modelo | Etapa | Salida válida | Transporte OK | Llamadas fallidas | Timeouts |
| --- | --- | ---: | ---: | ---: | ---: |
| inception/mercury-2 | translation | 100.0 % | 100.0 % | 0 | 0 |
| inception/mercury-2 | gloss | 100.0 % | 100.0 % | 0 | 0 |
| inception/mercury-2 | grammar | 100.0 % | 100.0 % | 0 | 0 |
| openai/gpt-5.6-luna:nitro | translation | 100.0 % | 100.0 % | 0 | 0 |
| openai/gpt-5.6-luna:nitro | gloss | 100.0 % | 100.0 % | 0 | 0 |
| openai/gpt-5.6-luna:nitro | grammar | 100.0 % | 100.0 % | 0 | 0 |
| google/gemini-3.7-flash:nitro | translation | 100.0 % | 100.0 % | 0 | 0 |
| google/gemini-3.7-flash:nitro | gloss | 100.0 % | 100.0 % | 0 | 0 |
| google/gemini-3.7-flash:nitro | grammar | 100.0 % | 100.0 % | 0 | 0 |

Observaciones:

- **Los tres modelos son 100 % fiables** en transporte y en validez de esquema,
  con cero llamadas fallidas y cero timeouts. La depuración de la lista de
  candidatos eliminó por completo los problemas de la iteración anterior.
- **`gpt-5.6-luna` corrigió su único punto débil**: en el corpus completo tenía
  salidas inválidas ocasionales (95/90/85 % de validez); en este corpus validó
  el 100 % de las respuestas.
- Con los tres candidatos fiables, la decisión pasa a depender de calidad,
  latencia y coste, no de la estabilidad.

## Calidad por etapa

Calificaciones promedio (escala 1–5) de los jueces por modelo y etapa:

| Modelo | Traducción | Glosas | Gramática |
| --- | ---: | ---: | ---: |
| inception/mercury-2 | 4.50 (16) | 2.59 (15) | 4.12 (16) |
| openai/gpt-5.6-luna:nitro | 4.75 (14) | 2.98 (12) | 4.40 (15) |
| google/gemini-3.7-flash:nitro | **4.86** (14) | **3.08** (13) | **4.50** (16) |

(El número entre paréntesis es la cantidad de evaluaciones realizadas.)

Observaciones:

- **Traducción:** los tres quedan por encima de 4.5, con `gemini` a la cabeza
  (4.86) y `mercury-2` al fondo (4.50).
- **Glosas:** siguen siendo la etapa más débil de todos los modelos: el mejor
  puntaje es 3.08 (`gemini`) y `mercury-2` cae a 2.59. Es la tarea que más
  margen de mejora tiene en todo el benchmark.
- **Gramática:** `gemini` lidera con 4.50, seguido de `gpt-5.6-luna` (4.40) y
  `mercury-2` (4.12).

## Acuerdo entre jueces

Desacuerdo medio (diferencia absoluta de puntajes entre los dos jueces) por
etapa:

| Modelo | Traducción | Glosas | Gramática |
| --- | ---: | ---: | ---: |
| inception/mercury-2 | 0.38 | 0.30 | 0.49 |
| openai/gpt-5.6-luna:nitro | 0.42 | 0.45 | 0.57 |
| google/gemini-3.7-flash:nitro | 0.33 | **0.80** | 0.50 |

Observaciones:

- **`gemini` es el de mayor desacuerdo en glosas** (0.80): los jueces no
  coinciden en casi un punto de promedio, lo que sugiere que sus glosas son
  polémicas o ambiguas para la evaluación. En traducción, en cambio, tiene el
  desacuerdo más bajo (0.33).
- El desacuerdo general de esta iteración es mayor que el de la anterior
  (p. ej., 0.57 en la gramática de `gpt-5.6-luna`), lo que resta algo de
  confianza a las diferencias finas entre modelos.

## Latencia por etapa

| Modelo | Etapa | Media | Mediana | P95 |
| --- | --- | ---: | ---: | ---: |
| inception/mercury-2 | translation | 1583 ms | 1530 ms | 2246 ms |
| inception/mercury-2 | gloss | 5803 ms | 5452 ms | 9927 ms |
| inception/mercury-2 | grammar | 2490 ms | 2860 ms | 3680 ms |
| openai/gpt-5.6-luna:nitro | translation | 2463 ms | 2260 ms | 3580 ms |
| openai/gpt-5.6-luna:nitro | gloss | 8594 ms | 8581 ms | 14951 ms |
| openai/gpt-5.6-luna:nitro | grammar | 3978 ms | 3782 ms | 5188 ms |
| google/gemini-3.7-flash:nitro | translation | 2599 ms | 2544 ms | 3374 ms |
| google/gemini-3.7-flash:nitro | gloss | 3857 ms | 3604 ms | 5321 ms |
| google/gemini-3.7-flash:nitro | grammar | 3566 ms | 3498 ms | 4397 ms |

Observaciones:

- **`mercury-2` sigue siendo el más rápido** en traducción (1.6 s) y gramática
  (2.5 s).
- **`gemini` es el más rápido en glosas** (3.9 s de media, frente a 5.8 s de
  `mercury-2` y 8.6 s de `gpt-5.6-luna`), con un perfil de latencia muy
  equilibrado en las tres etapas y el P95 más contenido.
- **`gpt-5.6-luna` es el más lento en glosas** (8.6 s de media, P95 de
  ~15 s), el punto que más penaliza su experiencia de usuario.
- Ningún modelo se acerca al límite de timeout (40 s,
  `OPENROUTER_TIMEOUT_MS`); las latencias son limpias, sin valores de agotados.

## Consumo de tokens

Tokens por etapa (totales acumulados de las 8 llamadas):

| Modelo | Etapa | Entrada | Salida | Total |
| --- | --- | ---: | ---: | ---: |
| inception/mercury-2 | translation | 4072 | 3612 | 7684 |
| inception/mercury-2 | gloss | 7902 | 21657 | 29559 |
| inception/mercury-2 | grammar | 5093 | 4991 | 10084 |
| openai/gpt-5.6-luna:nitro | translation | 1756 | 1204 | 2960 |
| openai/gpt-5.6-luna:nitro | gloss | 4532 | 8655 | 13187 |
| openai/gpt-5.6-luna:nitro | grammar | 1805 | 2048 | 3853 |
| google/gemini-3.7-flash:nitro | translation | 1353 | 4507 | 5860 |
| google/gemini-3.7-flash:nitro | gloss | 3801 | 8818 | 12619 |
| google/gemini-3.7-flash:nitro | grammar | 1149 | 6868 | 8017 |

Observaciones:

- **`gpt-5.6-luna` es el más conciso** en las tres etapas (2.9 K, 13.2 K y
  3.9 K tokens), coherente con su bajo coste de generación.
- **`gemini` es verboso en salida** (4.5 K en traducción y 6.9 K en gramática,
  muy por encima de `gpt-5.6-luna`), lo que explica buena parte de su coste
  más alto.
- **`mercury-2`** sigue consumiendo los prompts más grandes (7.9 K en glosas)
  pero con acierto de caché (~1.2–1.9 K tokens por etapa), y produce la salida
  de glosas más extensa (21.7 K tokens).

## Costes

### Coste total de la ejecución

Coste total (candidatos + jueces): **$0.221217**.

| Concepto | Coste | Llamadas sin coste |
| --- | ---: | ---: |
| Candidatos + jueces | $0.221217 | 13 |
| Solo jueces | $0.106913 | 13 |

### Coste por modelo candidato

| Modelo | Generación | Jueces | Total |
| --- | ---: | ---: | ---: |
| inception/mercury-2 | $0.025900 | $0.039146 | **$0.065046** |
| openai/gpt-5.6-luna:nitro | $0.007953 | $0.033258 | **$0.041212** |
| google/gemini-3.7-flash:nitro | $0.080451 | $0.034509 | **$0.114960** |

Observaciones:

- **`gemini` es el más caro con diferencia** ($0.114960): casi el triple de
  `gpt-5.6-luna` y el doble de `mercury-2`, y su sobrecoste es casi todo de
  **generación** ($0.080451), no de jueces.
- **`gpt-5.6-luna` vuelve a ser el más barato** ($0.041212) gracias a su
  generación concisa.
- La evaluación completa del corpus reducido costó $0.22, frente a los $0.35
  del corpus de 20 casos.

## Análisis por modelo

### google/gemini-3.7-flash:nitro — mejor calidad, coste alto

- Mejor puntaje en las tres etapas (4.86 / 3.08 / 4.50) y 100 % de fiabilidad.
- Latencia equilibrada y la mejor en glosas (3.9 s).
- Contras: es el más caro ($0.114960, casi todo en generación) y sus glosas
  generan el mayor desacuerdo entre jueces (0.80), lo que invita a verificar
  su ventaja en esa etapa con más casos.

### openai/gpt-5.6-luna:nitro — recomendado

- Segundo en calidad (4.75 / 2.98 / 4.40) y el más barato de los tres.
- 100 % de fiabilidad (mejoró sus salidas inválidas de la iteración anterior).
- El más conciso en tokens y con buen perfil de latencia salvo en glosas
  (8.6 s de media), su única debilidad notable.

### inception/mercury-2 — rápido pero flojo en calidad

- 100 % de fiabilidad y la mejor latencia en traducción y gramática (1.6 s y
  2.5 s).
- El peor puntaje en las tres etapas, con glosas en 2.59/5 — notablemente por
  debajo del resto. Su coste ($0.065046) es intermedio.
- Queda como candidato de respaldo por velocidad y estabilidad, no por calidad.

## Comparación con la primera iteración

- **La poda de modelos funcionó**: se eliminaron los tres candidatos con
  timeouts y errores (inkling-small, trinity y nemotron) y la ejecución quedó
  limpia: 100 % de validez y transporte en los tres modelos restantes.
- **`gpt-5.6-luna` y `mercury-2` repiten posiciones relativas** en los casos
  compartidos: `gpt-5.6-luna` mejor calidad, `mercury-2` mejor latencia.
- **`gemini` entra al podio** superando a `gpt-5.6-luna` en calidad, pero su
  coste de generación lo aleja de ser la opción obvia.

## Recomendaciones

1. **Mantener `openai/gpt-5.6-luna:nitro` como modelo principal**, ahora con
   fiabilidad perfecta en el corpus reducido y el mejor coste.
2. **Evaluar `gemini-3.7-flash` con el corpus completo** (o con más
   repeticiones) antes de decidir si su ventaja de calidad (≈0.1–0.3 puntos)
   justifica triplicar el coste de generación.
3. **Seguir usando `mercury-2` como fallback**: velocidad y fiabilidad totales
   para cubrir huecos, asumiendo glosas más débiles.
4. **Atacar la tarea de glosas**: es la etapa más floja de los tres candidatos
   (2.59–3.08) y la de mayor desacuerdo entre jueces. Revisar prompt y esquema
   antes de la siguiente ejecución.
5. Para el siguiente ciclo, considerar el corpus completo y una simulación de
   cadena de fallback (`gpt-5.6-luna` → `mercury-2` → `gemini`) para medir el
   comportamiento en producción.

## Datos fuente

- Salida de terminal: `results_red.md`.
- Informe en la carpeta de resultados:
  `results/20260813213251-2c6f7cd1/report.json` y `report.md`.
- Iteración anterior: `resultados.md` (ejecución `20260812121931-b220a6f0`).