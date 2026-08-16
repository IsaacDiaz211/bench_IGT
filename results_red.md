Benchmark 20260813213251-2c6f7cd1: 24 jobs pendientes de 24. Resultados: results/20260813213251-2c6f7cd1
[1/24] openai/gpt-5.6-luna:nitro en-007 r1
[2/24] openai/gpt-5.6-luna:nitro en-008 r1
[3/24] openai/gpt-5.6-luna:nitro en-004 r1
[4/24] openai/gpt-5.6-luna:nitro en-001 r1
[5/24] inception/mercury-2 en-007 r1
[6/24] openai/gpt-5.6-luna:nitro en-005 r1
[7/24] inception/mercury-2 en-008 r1
[8/24] google/gemini-3.7-flash:nitro en-006 r1
[9/24] google/gemini-3.7-flash:nitro en-004 r1
[10/24] openai/gpt-5.6-luna:nitro en-006 r1
[11/24] google/gemini-3.7-flash:nitro en-008 r1
[12/24] inception/mercury-2 en-002 r1
[13/24] inception/mercury-2 en-006 r1
[14/24] google/gemini-3.7-flash:nitro en-003 r1
[15/24] google/gemini-3.7-flash:nitro en-005 r1
[16/24] inception/mercury-2 en-004 r1
[17/24] openai/gpt-5.6-luna:nitro en-002 r1
[18/24] google/gemini-3.7-flash:nitro en-001 r1
[19/24] inception/mercury-2 en-001 r1
[20/24] google/gemini-3.7-flash:nitro en-002 r1
[21/24] google/gemini-3.7-flash:nitro en-007 r1
[22/24] inception/mercury-2 en-003 r1
[23/24] openai/gpt-5.6-luna:nitro en-003 r1
[24/24] inception/mercury-2 en-005 r1
Ejecución 20260813213251-2c6f7cd1 completada.
Informe: results/20260813213251-2c6f7cd1/report.json
# Benchmark report

- Run: `20260813213251-2c6f7cd1`
- Dataset: `datasets/evaluation/english_red.jsonl` (8 casos)
- Repeticiones: 1
- Jueces: deepseek/deepseek-v4-flash-0731:nitro, openai/gpt-5.6-luna

## Coste total

Coste total de la ejecución, incluyendo candidatos y jueces: **$0.221217**.

| Concepto | Coste | Exacto | Estimado | Llamadas sin coste |
| --- | ---: | ---: | ---: | ---: |
| Candidatos + jueces | $0.221217 | $0.221217 | $0.000000 | 13 |
| Solo jueces | $0.106913 | $0.106913 | $0.000000 | 13 |

## Coste por modelo candidato

| Modelo | Generación | Jueces | Total | Llamadas sin coste |
| --- | ---: | ---: | ---: | ---: |
| inception/mercury-2 | $0.025900 | $0.039146 | **$0.065046** | 1 |
| openai/gpt-5.6-luna:nitro | $0.007953 | $0.033258 | **$0.041212** | 7 |
| google/gemini-3.7-flash:nitro | $0.080451 | $0.034509 | **$0.114960** | 5 |

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

## Calidad de jueces

| Modelo | Etapa | Media | Evaluaciones | Desacuerdo medio | Casos comparados |
| --- | --- | ---: | ---: | ---: | ---: |
| inception/mercury-2 | translation | 4.50 | 16 | 0.38 | 8 |
| inception/mercury-2 | gloss | 2.59 | 15 | 0.30 | 7 |
| inception/mercury-2 | grammar | 4.12 | 16 | 0.49 | 8 |
| openai/gpt-5.6-luna:nitro | translation | 4.75 | 14 | 0.42 | 6 |
| openai/gpt-5.6-luna:nitro | gloss | 2.98 | 12 | 0.45 | 4 |
| openai/gpt-5.6-luna:nitro | grammar | 4.40 | 15 | 0.57 | 7 |
| google/gemini-3.7-flash:nitro | translation | 4.86 | 14 | 0.33 | 6 |
| google/gemini-3.7-flash:nitro | gloss | 3.08 | 13 | 0.80 | 5 |
| google/gemini-3.7-flash:nitro | grammar | 4.50 | 16 | 0.50 | 8 |

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

> El coste total incluye una llamada a cada juez por cada salida válida de cada etapa. Las llamadas cuyo coste no pudo resolverse aparecen como desconocidas y no se inventa un valor.