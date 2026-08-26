# Benchmark report

- Run: `20260813213251-2c6f7cd1`
- Dataset: `datasets/evaluation/english_red.jsonl` (8 casos)
- Repeticiones: 1
- Jueces: deepseek/deepseek-v4-flash-0731:nitro, openai/gpt-5.6-luna, dots-studio/dots-3-note-preview:free

## Coste total

Coste total de la ejecución, incluyendo candidatos y jueces: **$0.290042**.

| Concepto | Coste | Exacto | Estimado | Llamadas sin coste |
| --- | ---: | ---: | ---: | ---: |
| Candidatos + jueces | $0.290042 | $0.290042 | $0.000000 | 44 |
| Solo jueces | $0.148077 | $0.148077 | $0.000000 | 44 |

## Coste por modelo candidato

| Modelo | Generación | Jueces | Total | Llamadas sin coste |
| --- | ---: | ---: | ---: | ---: |
| inception/mercury-2 | $0.025900 | $0.039146 | **$0.065046** | 9 |
| openai/gpt-5.6-luna:nitro | $0.007953 | $0.033258 | **$0.041212** | 10 |
| google/gemini-3.7-flash:nitro | $0.080451 | $0.034509 | **$0.114960** | 16 |
| google/gemini-3.5-flash-lite:nitro | $0.027661 | $0.041164 | **$0.068825** | 9 |

## Fiabilidad por modelo

| Modelo | Etapa | Salida válida | Transporte OK | Llamadas fallidas | Timeouts |
| --- | --- | ---: | ---: | ---: | ---: |
| inception/mercury-2 | translation | 100.0% | 100.0% | 0 | 0 |
| inception/mercury-2 | gloss | 100.0% | 100.0% | 0 | 0 |
| inception/mercury-2 | grammar | 100.0% | 100.0% | 0 | 0 |
| openai/gpt-5.6-luna:nitro | translation | 100.0% | 100.0% | 0 | 0 |
| openai/gpt-5.6-luna:nitro | gloss | 100.0% | 100.0% | 0 | 0 |
| openai/gpt-5.6-luna:nitro | grammar | 100.0% | 100.0% | 0 | 0 |
| google/gemini-3.7-flash:nitro | translation | 100.0% | 100.0% | 0 | 0 |
| google/gemini-3.7-flash:nitro | gloss | 100.0% | 100.0% | 0 | 0 |
| google/gemini-3.7-flash:nitro | grammar | 100.0% | 100.0% | 0 | 0 |
| google/gemini-3.5-flash-lite:nitro | translation | 100.0% | 100.0% | 0 | 0 |
| google/gemini-3.5-flash-lite:nitro | gloss | 100.0% | 100.0% | 0 | 0 |
| google/gemini-3.5-flash-lite:nitro | grammar | 100.0% | 100.0% | 0 | 0 |

## Calidad de jueces

| Modelo | Etapa | Media | Evaluaciones | Desacuerdo medio | Casos comparados |
| --- | --- | ---: | ---: | ---: | ---: |
| inception/mercury-2 | translation | 4.67 | 38 | 0.59 | 8 |
| inception/mercury-2 | gloss | 3.43 | 34 | 1.89 | 8 |
| inception/mercury-2 | grammar | 4.46 | 39 | 0.94 | 8 |
| openai/gpt-5.6-luna:nitro | translation | 4.85 | 32 | 0.40 | 8 |
| openai/gpt-5.6-luna:nitro | gloss | 3.58 | 30 | 1.07 | 8 |
| openai/gpt-5.6-luna:nitro | grammar | 4.68 | 33 | 0.88 | 8 |
| google/gemini-3.7-flash:nitro | translation | 4.85 | 38 | 0.44 | 8 |
| google/gemini-3.7-flash:nitro | gloss | 3.55 | 29 | 1.54 | 8 |
| google/gemini-3.7-flash:nitro | grammar | 4.78 | 37 | 0.75 | 8 |
| google/gemini-3.5-flash-lite:nitro | translation | 4.61 | 21 | 0.34 | 8 |
| google/gemini-3.5-flash-lite:nitro | gloss | 2.93 | 19 | 0.85 | 8 |
| google/gemini-3.5-flash-lite:nitro | grammar | 4.01 | 23 | 1.31 | 8 |

## Calidad por juez

| Juez | Modelo candidato | Etapa | Media | Evaluaciones |
| --- | --- | --- | ---: | ---: |
| deepseek/deepseek-v4-flash-0731:nitro | inception/mercury-2 | translation | 4.69 | 8 |
| dots-studio/dots-3-note-preview:free | inception/mercury-2 | translation | 4.79 | 22 |
| openai/gpt-5.6-luna | inception/mercury-2 | translation | 4.31 | 8 |
| deepseek/deepseek-v4-flash-0731:nitro | inception/mercury-2 | gloss | 2.49 | 7 |
| dots-studio/dots-3-note-preview:free | inception/mercury-2 | gloss | 4.09 | 19 |
| openai/gpt-5.6-luna | inception/mercury-2 | gloss | 2.69 | 8 |
| deepseek/deepseek-v4-flash-0731:nitro | inception/mercury-2 | grammar | 4.24 | 8 |
| dots-studio/dots-3-note-preview:free | inception/mercury-2 | grammar | 4.70 | 23 |
| openai/gpt-5.6-luna | inception/mercury-2 | grammar | 4.00 | 8 |
| deepseek/deepseek-v4-flash-0731:nitro | openai/gpt-5.6-luna:nitro | translation | 4.75 | 6 |
| dots-studio/dots-3-note-preview:free | openai/gpt-5.6-luna:nitro | translation | 4.93 | 18 |
| openai/gpt-5.6-luna | openai/gpt-5.6-luna:nitro | translation | 4.75 | 8 |
| deepseek/deepseek-v4-flash-0731:nitro | openai/gpt-5.6-luna:nitro | gloss | 3.20 | 4 |
| dots-studio/dots-3-note-preview:free | openai/gpt-5.6-luna:nitro | gloss | 3.98 | 18 |
| openai/gpt-5.6-luna | openai/gpt-5.6-luna:nitro | gloss | 2.88 | 8 |
| deepseek/deepseek-v4-flash-0731:nitro | openai/gpt-5.6-luna:nitro | grammar | 4.71 | 7 |
| dots-studio/dots-3-note-preview:free | openai/gpt-5.6-luna:nitro | grammar | 4.92 | 18 |
| openai/gpt-5.6-luna | openai/gpt-5.6-luna:nitro | grammar | 4.13 | 8 |
| deepseek/deepseek-v4-flash-0731:nitro | google/gemini-3.7-flash:nitro | translation | 5.00 | 6 |
| dots-studio/dots-3-note-preview:free | google/gemini-3.7-flash:nitro | translation | 4.84 | 24 |
| openai/gpt-5.6-luna | google/gemini-3.7-flash:nitro | translation | 4.75 | 8 |
| deepseek/deepseek-v4-flash-0731:nitro | google/gemini-3.7-flash:nitro | gloss | 3.20 | 5 |
| dots-studio/dots-3-note-preview:free | google/gemini-3.7-flash:nitro | gloss | 3.93 | 16 |
| openai/gpt-5.6-luna | google/gemini-3.7-flash:nitro | gloss | 3.00 | 8 |
| deepseek/deepseek-v4-flash-0731:nitro | google/gemini-3.7-flash:nitro | grammar | 4.75 | 8 |
| dots-studio/dots-3-note-preview:free | google/gemini-3.7-flash:nitro | grammar | 5.00 | 21 |
| openai/gpt-5.6-luna | google/gemini-3.7-flash:nitro | grammar | 4.25 | 8 |
| deepseek/deepseek-v4-flash-0731:nitro | google/gemini-3.5-flash-lite:nitro | translation | 4.40 | 5 |
| dots-studio/dots-3-note-preview:free | google/gemini-3.5-flash-lite:nitro | translation | 4.84 | 8 |
| openai/gpt-5.6-luna | google/gemini-3.5-flash-lite:nitro | translation | 4.50 | 8 |
| deepseek/deepseek-v4-flash-0731:nitro | google/gemini-3.5-flash-lite:nitro | gloss | 3.00 | 5 |
| dots-studio/dots-3-note-preview:free | google/gemini-3.5-flash-lite:nitro | gloss | 3.23 | 7 |
| openai/gpt-5.6-luna | google/gemini-3.5-flash-lite:nitro | gloss | 2.57 | 7 |
| deepseek/deepseek-v4-flash-0731:nitro | google/gemini-3.5-flash-lite:nitro | grammar | 3.43 | 7 |
| dots-studio/dots-3-note-preview:free | google/gemini-3.5-flash-lite:nitro | grammar | 4.72 | 8 |
| openai/gpt-5.6-luna | google/gemini-3.5-flash-lite:nitro | grammar | 3.81 | 8 |

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
| google/gemini-3.5-flash-lite:nitro | translation | 1300 ms | 1221 ms | 2040 ms |
| google/gemini-3.5-flash-lite:nitro | gloss | 3827 ms | 3883 ms | 4656 ms |
| google/gemini-3.5-flash-lite:nitro | grammar | 1809 ms | 1720 ms | 2368 ms |

## Tokens por etapa

| Modelo | Etapa | Entrada | Salida | Total | Cache leído | Cache escrito |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| inception/mercury-2 | translation | 4072 | 3612 | 7684 | 1196 | 0 |
| inception/mercury-2 | gloss | 7902 | 21657 | 29559 | 1939 | 0 |
| inception/mercury-2 | grammar | 5093 | 4991 | 10084 | 1586 | 0 |
| openai/gpt-5.6-luna:nitro | translation | 1756 | 1204 | 2960 | 0 | 0 |
| openai/gpt-5.6-luna:nitro | gloss | 4532 | 8655 | 13187 | 0 | 0 |
| openai/gpt-5.6-luna:nitro | grammar | 1805 | 2048 | 3853 | 0 | 0 |
| google/gemini-3.7-flash:nitro | translation | 1353 | 4507 | 5860 | 0 | 0 |
| google/gemini-3.7-flash:nitro | gloss | 3801 | 8818 | 12619 | 0 | 0 |
| google/gemini-3.7-flash:nitro | grammar | 1149 | 6868 | 8017 | 0 | 0 |
| google/gemini-3.5-flash-lite:nitro | translation | 1353 | 822 | 2175 | 0 | 0 |
| google/gemini-3.5-flash-lite:nitro | gloss | 3801 | 8497 | 12298 | 0 | 0 |
| google/gemini-3.5-flash-lite:nitro | grammar | 1149 | 989 | 2138 | 0 | 0 |

> El coste total incluye una llamada a cada juez por cada salida válida de cada etapa. Las llamadas cuyo coste no pudo resolverse aparecen como desconocidas y no se inventa un valor.
