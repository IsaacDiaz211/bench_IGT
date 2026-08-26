# Benchmark report

- Run: `20260812121931-b220a6f0`
- Dataset: `datasets/evaluation/english.jsonl` (20 casos)
- Repeticiones: 1
- Jueces: deepseek/deepseek-v4-flash-0731:nitro, openai/gpt-5.6-luna

## Coste total

Coste total de la ejecución, incluyendo candidatos y jueces: **$0.346319**.

| Concepto | Coste | Exacto | Estimado | Llamadas sin coste |
| --- | ---: | ---: | ---: | ---: |
| Candidatos + jueces | $0.346319 | $0.346319 | $0.000000 | 161 |
| Solo jueces | $0.156974 | $0.156974 | $0.000000 | 87 |

## Coste por modelo candidato

| Modelo | Generación | Jueces | Total | Llamadas sin coste |
| --- | ---: | ---: | ---: | ---: |
| thinkingmachines/inkling-small:nitro | $0.015515 | $0.011720 | **$0.027235** | 47 |
| inception/mercury-2 | $0.054022 | $0.043919 | **$0.097941** | 27 |
| arcee-ai/trinity-large-thinking:nitro | $0.056387 | $0.034214 | **$0.090601** | 28 |
| openai/gpt-5.6-luna:nitro | $0.017571 | $0.035479 | **$0.053049** | 27 |
| nvidia/nemotron-3.5-lightning:nitro | $0.045851 | $0.031642 | **$0.077493** | 32 |

## Fiabilidad por modelo

| Modelo | Etapa | Salida válida | Transporte OK | Llamadas fallidas | Timeouts |
| --- | --- | ---: | ---: | ---: | ---: |
| thinkingmachines/inkling-small:nitro | translation | 50.0% | 50.0% | 10 | 7 |
| thinkingmachines/inkling-small:nitro | gloss | 0.0% | 0.0% | 20 | 17 |
| thinkingmachines/inkling-small:nitro | grammar | 25.0% | 25.0% | 15 | 12 |
| inception/mercury-2 | translation | 100.0% | 100.0% | 0 | 0 |
| inception/mercury-2 | gloss | 100.0% | 100.0% | 0 | 0 |
| inception/mercury-2 | grammar | 100.0% | 100.0% | 0 | 0 |
| arcee-ai/trinity-large-thinking:nitro | translation | 95.0% | 95.0% | 1 | 1 |
| arcee-ai/trinity-large-thinking:nitro | gloss | 20.0% | 20.0% | 16 | 16 |
| arcee-ai/trinity-large-thinking:nitro | grammar | 100.0% | 100.0% | 0 | 0 |
| openai/gpt-5.6-luna:nitro | translation | 95.0% | 100.0% | 0 | 0 |
| openai/gpt-5.6-luna:nitro | gloss | 90.0% | 100.0% | 0 | 0 |
| openai/gpt-5.6-luna:nitro | grammar | 85.0% | 100.0% | 0 | 0 |
| nvidia/nemotron-3.5-lightning:nitro | translation | 100.0% | 100.0% | 0 | 0 |
| nvidia/nemotron-3.5-lightning:nitro | gloss | 70.0% | 70.0% | 6 | 6 |
| nvidia/nemotron-3.5-lightning:nitro | grammar | 95.0% | 100.0% | 0 | 0 |

## Calidad de jueces

| Modelo | Etapa | Media | Evaluaciones | Desacuerdo medio | Casos comparados |
| --- | --- | ---: | ---: | ---: | ---: |
| thinkingmachines/inkling-small:nitro | translation | 4.63 | 19 | 0.22 | 9 |
| thinkingmachines/inkling-small:nitro | gloss | 0.00 | 0 | 0.00 | 0 |
| thinkingmachines/inkling-small:nitro | grammar | 4.56 | 9 | 0.25 | 4 |
| inception/mercury-2 | translation | 4.43 | 37 | 0.47 | 17 |
| inception/mercury-2 | gloss | 3.04 | 24 | 0.83 | 6 |
| inception/mercury-2 | grammar | 3.88 | 31 | 0.12 | 11 |
| arcee-ai/trinity-large-thinking:nitro | translation | 4.41 | 34 | 0.48 | 15 |
| arcee-ai/trinity-large-thinking:nitro | gloss | 3.00 | 5 | 0.00 | 1 |
| arcee-ai/trinity-large-thinking:nitro | grammar | 3.72 | 36 | 0.25 | 16 |
| openai/gpt-5.6-luna:nitro | translation | 4.93 | 35 | 0.09 | 16 |
| openai/gpt-5.6-luna:nitro | gloss | 3.25 | 20 | 0.50 | 2 |
| openai/gpt-5.6-luna:nitro | grammar | 4.35 | 31 | 0.36 | 14 |
| nvidia/nemotron-3.5-lightning:nitro | translation | 4.22 | 30 | 0.70 | 10 |
| nvidia/nemotron-3.5-lightning:nitro | gloss | 2.72 | 18 | 0.63 | 4 |
| nvidia/nemotron-3.5-lightning:nitro | grammar | 3.70 | 32 | 0.27 | 13 |

## Latencia por etapa

| Modelo | Etapa | Media | Mediana | P95 |
| --- | --- | ---: | ---: | ---: |
| thinkingmachines/inkling-small:nitro | translation | 22712 ms | 21515 ms | 40010 ms |
| thinkingmachines/inkling-small:nitro | gloss | 34173 ms | 40003 ms | 40010 ms |
| thinkingmachines/inkling-small:nitro | grammar | 28946 ms | 40003 ms | 40009 ms |
| inception/mercury-2 | translation | 1531 ms | 1202 ms | 2248 ms |
| inception/mercury-2 | gloss | 6349 ms | 5184 ms | 10542 ms |
| inception/mercury-2 | grammar | 2247 ms | 2141 ms | 3317 ms |
| arcee-ai/trinity-large-thinking:nitro | translation | 7941 ms | 5362 ms | 13173 ms |
| arcee-ai/trinity-large-thinking:nitro | gloss | 38163 ms | 40002 ms | 40005 ms |
| arcee-ai/trinity-large-thinking:nitro | grammar | 9794 ms | 8701 ms | 16129 ms |
| openai/gpt-5.6-luna:nitro | translation | 2981 ms | 2447 ms | 4807 ms |
| openai/gpt-5.6-luna:nitro | gloss | 8912 ms | 8464 ms | 14287 ms |
| openai/gpt-5.6-luna:nitro | grammar | 3944 ms | 3875 ms | 5624 ms |
| nvidia/nemotron-3.5-lightning:nitro | translation | 5551 ms | 4260 ms | 11000 ms |
| nvidia/nemotron-3.5-lightning:nitro | gloss | 29547 ms | 31937 ms | 40005 ms |
| nvidia/nemotron-3.5-lightning:nitro | grammar | 5898 ms | 5226 ms | 9190 ms |

## Tokens por etapa

| Modelo | Etapa | Entrada | Salida | Total | Cache leído | Cache escrito |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| thinkingmachines/inkling-small:nitro | translation | 1546 | 6197 | 7743 | 0 | 0 |
| thinkingmachines/inkling-small:nitro | gloss | 0 | 0 | 0 | 0 | 0 |
| thinkingmachines/inkling-small:nitro | grammar | 668 | 5902 | 6570 | 0 | 0 |
| inception/mercury-2 | translation | 12223 | 7164 | 19387 | 4779 | 0 |
| inception/mercury-2 | gloss | 21270 | 41995 | 63265 | 5913 | 0 |
| inception/mercury-2 | grammar | 13378 | 11960 | 25338 | 5021 | 0 |
| arcee-ai/trinity-large-thinking:nitro | translation | 2838 | 17324 | 20162 | 1440 | 0 |
| arcee-ai/trinity-large-thinking:nitro | gloss | 1726 | 19398 | 21124 | 1472 | 0 |
| arcee-ai/trinity-large-thinking:nitro | grammar | 2585 | 28545 | 31130 | 1232 | 0 |
| openai/gpt-5.6-luna:nitro | translation | 3779 | 2199 | 5978 | 0 | 0 |
| openai/gpt-5.6-luna:nitro | gloss | 9840 | 16435 | 26275 | 0 | 0 |
| openai/gpt-5.6-luna:nitro | grammar | 3543 | 4364 | 7907 | 0 | 0 |
| nvidia/nemotron-3.5-lightning:nitro | translation | 3139 | 39032 | 42171 | 0 | 0 |
| nvidia/nemotron-3.5-lightning:nitro | gloss | 6663 | 146911 | 153574 | 0 | 0 |
| nvidia/nemotron-3.5-lightning:nitro | grammar | 2685 | 40192 | 42877 | 0 | 0 |

> El coste total incluye una llamada a cada juez por cada salida válida de cada etapa. Las llamadas cuyo coste no pudo resolverse aparecen como desconocidas y no se inventa un valor.
