# Benchmark report

- Run: `20260812121931-b220a6f0`
- Dataset: `datasets/evaluation/english.jsonl` (20 casos)
- Repeticiones: 1
- Jueces: deepseek/deepseek-v4-flash-0731:nitro, openai/gpt-5.6-luna, accounts/fireworks/models/kimi-k3

## Coste total

Coste total de la ejecución, incluyendo candidatos y jueces: **$0.346319**.

| Concepto | Coste | Exacto | Estimado | Llamadas sin coste |
| --- | ---: | ---: | ---: | ---: |
| Candidatos + jueces | $0.346319 | $0.346319 | $0.000000 | 386 |
| Solo jueces | $0.156974 | $0.156974 | $0.000000 | 312 |

## Coste por modelo candidato

| Modelo | Generación | Jueces | Total | Llamadas sin coste |
| --- | ---: | ---: | ---: | ---: |
| thinkingmachines/inkling-small:nitro | $0.015515 | $0.011720 | **$0.027235** | 62 |
| inception/mercury-2 | $0.054022 | $0.043919 | **$0.097941** | 87 |
| arcee-ai/trinity-large-thinking:nitro | $0.056387 | $0.034214 | **$0.090601** | 71 |
| openai/gpt-5.6-luna:nitro | $0.017571 | $0.035479 | **$0.053049** | 81 |
| nvidia/nemotron-3.5-lightning:nitro | $0.045851 | $0.031642 | **$0.077493** | 85 |

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
| thinkingmachines/inkling-small:nitro | translation | 4.66 | 29 | 0.45 | 10 |
| thinkingmachines/inkling-small:nitro | gloss | 0.00 | 0 | 0.00 | 0 |
| thinkingmachines/inkling-small:nitro | grammar | 4.57 | 14 | 0.40 | 5 |
| inception/mercury-2 | translation | 4.43 | 56 | 0.47 | 20 |
| inception/mercury-2 | gloss | 3.27 | 41 | 0.81 | 16 |
| inception/mercury-2 | grammar | 3.89 | 51 | 0.53 | 20 |
| arcee-ai/trinity-large-thinking:nitro | translation | 4.40 | 52 | 0.51 | 19 |
| arcee-ai/trinity-large-thinking:nitro | gloss | 3.25 | 8 | 0.50 | 4 |
| arcee-ai/trinity-large-thinking:nitro | grammar | 3.75 | 56 | 0.30 | 20 |
| openai/gpt-5.6-luna:nitro | translation | 4.88 | 54 | 0.21 | 19 |
| openai/gpt-5.6-luna:nitro | gloss | 3.40 | 30 | 0.50 | 10 |
| openai/gpt-5.6-luna:nitro | grammar | 4.40 | 48 | 0.41 | 17 |
| nvidia/nemotron-3.5-lightning:nitro | translation | 4.17 | 50 | 0.60 | 20 |
| nvidia/nemotron-3.5-lightning:nitro | gloss | 2.86 | 29 | 0.58 | 12 |
| nvidia/nemotron-3.5-lightning:nitro | grammar | 3.69 | 50 | 0.37 | 19 |

## Calidad por juez

| Juez | Modelo candidato | Etapa | Media | Evaluaciones |
| --- | --- | --- | ---: | ---: |
| accounts/fireworks/models/kimi-k3 | thinkingmachines/inkling-small:nitro | translation | 4.70 | 10 |
| deepseek/deepseek-v4-flash-0731:nitro | thinkingmachines/inkling-small:nitro | translation | 4.65 | 10 |
| openai/gpt-5.6-luna | thinkingmachines/inkling-small:nitro | translation | 4.61 | 9 |
| accounts/fireworks/models/kimi-k3 | thinkingmachines/inkling-small:nitro | grammar | 4.60 | 5 |
| deepseek/deepseek-v4-flash-0731:nitro | thinkingmachines/inkling-small:nitro | grammar | 4.75 | 4 |
| openai/gpt-5.6-luna | thinkingmachines/inkling-small:nitro | grammar | 4.40 | 5 |
| accounts/fireworks/models/kimi-k3 | inception/mercury-2 | translation | 4.42 | 19 |
| deepseek/deepseek-v4-flash-0731:nitro | inception/mercury-2 | translation | 4.64 | 18 |
| openai/gpt-5.6-luna | inception/mercury-2 | translation | 4.24 | 19 |
| accounts/fireworks/models/kimi-k3 | inception/mercury-2 | gloss | 3.59 | 17 |
| deepseek/deepseek-v4-flash-0731:nitro | inception/mercury-2 | gloss | 3.67 | 6 |
| openai/gpt-5.6-luna | inception/mercury-2 | gloss | 2.83 | 18 |
| accounts/fireworks/models/kimi-k3 | inception/mercury-2 | grammar | 3.90 | 20 |
| deepseek/deepseek-v4-flash-0731:nitro | inception/mercury-2 | grammar | 3.83 | 15 |
| openai/gpt-5.6-luna | inception/mercury-2 | grammar | 3.92 | 16 |
| accounts/fireworks/models/kimi-k3 | arcee-ai/trinity-large-thinking:nitro | translation | 4.39 | 18 |
| deepseek/deepseek-v4-flash-0731:nitro | arcee-ai/trinity-large-thinking:nitro | translation | 4.56 | 16 |
| openai/gpt-5.6-luna | arcee-ai/trinity-large-thinking:nitro | translation | 4.27 | 18 |
| accounts/fireworks/models/kimi-k3 | arcee-ai/trinity-large-thinking:nitro | gloss | 3.67 | 3 |
| deepseek/deepseek-v4-flash-0731:nitro | arcee-ai/trinity-large-thinking:nitro | gloss | 3.00 | 1 |
| openai/gpt-5.6-luna | arcee-ai/trinity-large-thinking:nitro | gloss | 3.00 | 4 |
| accounts/fireworks/models/kimi-k3 | arcee-ai/trinity-large-thinking:nitro | grammar | 3.80 | 20 |
| deepseek/deepseek-v4-flash-0731:nitro | arcee-ai/trinity-large-thinking:nitro | grammar | 3.72 | 16 |
| openai/gpt-5.6-luna | arcee-ai/trinity-large-thinking:nitro | grammar | 3.73 | 20 |
| accounts/fireworks/models/kimi-k3 | openai/gpt-5.6-luna:nitro | translation | 4.79 | 19 |
| deepseek/deepseek-v4-flash-0731:nitro | openai/gpt-5.6-luna:nitro | translation | 5.00 | 16 |
| openai/gpt-5.6-luna | openai/gpt-5.6-luna:nitro | translation | 4.87 | 19 |
| accounts/fireworks/models/kimi-k3 | openai/gpt-5.6-luna:nitro | gloss | 3.70 | 10 |
| deepseek/deepseek-v4-flash-0731:nitro | openai/gpt-5.6-luna:nitro | gloss | 3.50 | 4 |
| openai/gpt-5.6-luna | openai/gpt-5.6-luna:nitro | gloss | 3.19 | 16 |
| accounts/fireworks/models/kimi-k3 | openai/gpt-5.6-luna:nitro | grammar | 4.47 | 17 |
| deepseek/deepseek-v4-flash-0731:nitro | openai/gpt-5.6-luna:nitro | grammar | 4.29 | 14 |
| openai/gpt-5.6-luna | openai/gpt-5.6-luna:nitro | grammar | 4.41 | 17 |
| accounts/fireworks/models/kimi-k3 | nvidia/nemotron-3.5-lightning:nitro | translation | 4.10 | 20 |
| deepseek/deepseek-v4-flash-0731:nitro | nvidia/nemotron-3.5-lightning:nitro | translation | 4.54 | 12 |
| openai/gpt-5.6-luna | nvidia/nemotron-3.5-lightning:nitro | translation | 4.00 | 18 |
| accounts/fireworks/models/kimi-k3 | nvidia/nemotron-3.5-lightning:nitro | gloss | 3.09 | 11 |
| deepseek/deepseek-v4-flash-0731:nitro | nvidia/nemotron-3.5-lightning:nitro | gloss | 3.25 | 4 |
| openai/gpt-5.6-luna | nvidia/nemotron-3.5-lightning:nitro | gloss | 2.57 | 14 |
| accounts/fireworks/models/kimi-k3 | nvidia/nemotron-3.5-lightning:nitro | grammar | 3.67 | 18 |
| deepseek/deepseek-v4-flash-0731:nitro | nvidia/nemotron-3.5-lightning:nitro | grammar | 3.79 | 14 |
| openai/gpt-5.6-luna | nvidia/nemotron-3.5-lightning:nitro | grammar | 3.64 | 18 |

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
