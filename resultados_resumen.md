# Resumen de resultados del benchmark

Este documento resume los resultados de las ejecuciones del benchmark de calidad
para las tareas de traducción, glosa y gramática (IGT) sobre el corpus en
inglés. Las puntuaciones de calidad las asignan los modelos jueces en una
escala de 1 a 5.

## 1. Ejecuciones realizadas

| # | Ejecución | Dataset | Casos | Jueces | Candidatos | Coste total |
| --- | --- | --- | ---: | --- | --- | ---: |
| 1 | `20260812121931-b220a6f0` | `english.jsonl` | 20 | deepseek-v4-flash-0731, gpt-5.6-luna | 5 | USD 0,346319 |
| 2 | `20260813213251-2c6f7cd1` | `english_red.jsonl` | 8 | deepseek-v4-flash-0731, gpt-5.6-luna | 3 | USD 0,221217 |
| 3 | Ejecución 2 + juez `dots-3-note-preview:free` | `english_red.jsonl` | 8 | + dots-studio/dots-3-note-preview:free | 3 | USD 0,221217 |
| 4 | Ejecución 3 + candidato `gemini-3.5-flash-lite` | `english_red.jsonl` | 8 | 3 jueces | + google/gemini-3.5-flash-lite:nitro | USD 0,290042 |

Las ejecuciones 3 y 4 son ampliaciones de la segunda evaluación: primero se
incorporó un juez adicional y después un modelo candidato nuevo, sin volver a
llamar a los modelos ya evaluados. Cada ejecución se realizó con una
repetición por caso.

## 2. Primera evaluación (20 casos)

Dataset `english.jsonl` (20 casos), jueces deepseek-v4-flash-0731:nitro y
openai/gpt-5.6-luna. Candidatos: thinkingmachines/inkling-small:nitro,
inception/mercury-2, arcee-ai/trinity-large-thinking:nitro,
openai/gpt-5.6-luna:nitro y nvidia/nemotron-3.5-lightning:nitro.

### 2.1 Fiabilidad

| Modelo | Traducción | Glosa | Gramática | Observaciones |
| --- | ---: | ---: | ---: | --- |
| inception/mercury-2 | 100 % | 100 % | 100 % | Sin fallos. |
| openai/gpt-5.6-luna:nitro | 95 % | 90 % | 85 % | Transporte 100 %; fallos por validación de esquema. |
| nvidia/nemotron-3.5-lightning:nitro | 100 % | 70 % | 95 % | Glosa: 6 timeouts. |
| arcee-ai/trinity-large-thinking:nitro | 95 % | 20 % | 100 % | Glosa: 16 timeouts. |
| thinkingmachines/inkling-small:nitro | 50 % | 0 % | 25 % | Numerosos timeouts; glosa sin salidas válidas. |

### 2.2 Calidad media (jueces)

| Modelo | Traducción | Glosa | Gramática |
| --- | ---: | ---: | ---: |
| openai/gpt-5.6-luna:nitro | 4,93 | 3,25 | 4,35 |
| thinkingmachines/inkling-small:nitro | 4,63 | — | 4,56 |
| inception/mercury-2 | 4,43 | 3,04 | 3,88 |
| arcee-ai/trinity-large-thinking:nitro | 4,41 | 3,00 | 3,72 |
| nvidia/nemotron-3.5-lightning:nitro | 4,22 | 2,72 | 3,70 |

### 2.3 Latencia

- **inception/mercury-2** fue el más rápido en traducción (1,53 s de media) y
  el más ágil en general, con latencias estables.
- **openai/gpt-5.6-luna:nitro** mostró latencias moderadas en todas las etapas
  (2,98 s en traducción; 8,91 s en glosa).
- **thinkingmachines/inkling-small:nitro**, **arcee-ai/trinity-large-thinking:nitro**
  y **nvidia/nemotron-3.5-lightning:nitro** superaron con frecuencia el límite
  de 40 s en la etapa de glosa, lo que explica sus timeouts.

### 2.4 Coste

- Coste total: **USD 0,346319** (USD 0,156974 solo jueces).
- Candidato más caro: inception/mercury-2 (USD 0,097941).
- Candidato más económico: thinkingmachines/inkling-small:nitro (USD 0,027235),
  si bien su baja fiabilidad lo descarta en la práctica.

## 3. Segunda evaluación (8 casos)

Dataset `english_red.jsonl` (8 casos), jueces deepseek-v4-flash-0731:nitro y
openai/gpt-5.6-luna. Candidatos: inception/mercury-2, openai/gpt-5.6-luna:nitro
y google/gemini-3.7-flash:nitro. Esta evaluación descartó los modelos con
fiabilidad deficiente de la primera ronda.

### 3.1 Fiabilidad

Los tres candidatos obtuvieron **100 % de salidas válidas y transporte
correcto en las tres etapas**, sin llamadas fallidas ni timeouts.

### 3.2 Calidad media (jueces)

| Modelo | Traducción | Glosa | Gramática |
| --- | ---: | ---: | ---: |
| google/gemini-3.7-flash:nitro | 4,86 | 3,08 | 4,50 |
| openai/gpt-5.6-luna:nitro | 4,75 | 2,98 | 4,40 |
| inception/mercury-2 | 4,50 | 2,59 | 4,12 |

**google/gemini-3.7-flash:nitro** lidera la calidad en las tres etapas.

### 3.3 Latencia

| Modelo | Traducción | Glosa | Gramática |
| --- | ---: | ---: | ---: |
| inception/mercury-2 | 1 583 ms | 5 803 ms | 2 490 ms |
| google/gemini-3.7-flash:nitro | 2 599 ms | 3 857 ms | 3 566 ms |
| openai/gpt-5.6-luna:nitro | 2 463 ms | 8 594 ms | 3 978 ms |

**gemini-3.7-flash** ofrece la glosa más rápida y una latencia equilibrada;
**mercury-2** es el más rápido en traducción y gramática, pero lento en glosa.

### 3.4 Coste

- Coste total: **USD 0,221217** (USD 0,106913 solo jueces).
- google/gemini-3.7-flash:nitro: USD 0,114960 (el más costoso).
- openai/gpt-5.6-luna:nitro: USD 0,041212.
- inception/mercury-2: USD 0,065046.

## 4. Ampliación 1: incorporación del juez dots-3-note-preview:free

Se agregó el juez `dots-studio/dots-3-note-preview:free` a la segunda
evaluación para contar con un tercer criterio de calidad, sin volver a ejecutar
a los candidatos. Por tratarse de un modelo sin coste, el gasto total se
mantuvo en **USD 0,221217**.

Efectos sobre las puntuaciones (al incorporar las evaluaciones del nuevo juez):

| Modelo | Traducción (antes → después) | Glosa (antes → después) | Gramática (antes → después) |
| --- | --- | --- | --- |
| inception/mercury-2 | 4,50 → 4,67 | 2,59 → 3,43 | 4,12 → 4,46 |
| openai/gpt-5.6-luna:nitro | 4,75 → 4,85 | 2,98 → 3,58 | 4,40 → 4,68 |
| google/gemini-3.7-flash:nitro | 4,86 → 4,85 | 3,08 → 3,55 | 4,50 → 4,78 |

Observaciones:

- El nuevo juez tiende a puntuar más alto que los jueces originales
  (p. ej., 4,79–4,93 en traducción y 3,93–4,09 en glosa, frente a valores de
  2,49–3,20 de los otros jueces en glosa).
- El desacuerdo medio entre jueces aumentó, sobre todo en la etapa de glosa
  (p. ej., mercury-2 pasó de 0,30 a 1,89), lo que evidencia que la glosa es la
  etapa con criterios menos convergentes.

## 5. Ampliación 2: incorporación del candidato gemini-3.5-flash-lite:nitro

Se agregó el candidato `google/gemini-3.5-flash-lite:nitro` a la ejecución
anterior (8 casos nuevos, 72 evaluaciones nuevas de jueces). Las puntuaciones
siguen siendo comparables con las de los demás candidatos porque los jueces
evaluaron sus salidas con los mismos criterios.

### 5.1 Resultados

| Métrica | Traducción | Glosa | Gramática |
| --- | ---: | ---: | ---: |
| Fiabilidad | 100 % | 100 % | 100 % |
| Calidad media | 4,61 | 2,93 | 4,01 |
| Latencia media | 1 300 ms | 3 827 ms | 1 809 ms |

- Coste total de la ejecución: **USD 0,290042**.
- Coste atribuible al nuevo candidato: USD 0,068825 (USD 0,027661 de
  generación + USD 0,041164 de jueces).

### 5.2 Comparación con los candidatos de la segunda evaluación

| Modelo | Traducción | Glosa | Gramática | Latencia glosa |
| --- | ---: | ---: | ---: | ---: |
| google/gemini-3.7-flash:nitro | 4,85 | 3,55 | 4,78 | 3 857 ms |
| openai/gpt-5.6-luna:nitro | 4,85 | 3,58 | 4,68 | 8 594 ms |
| google/gemini-3.5-flash-lite:nitro | 4,61 | 2,93 | 4,01 | 3 827 ms |
| inception/mercury-2 | 4,67 | 3,43 | 4,46 | 5 803 ms |

El candidato agregado destaca por su **velocidad** (la traducción y la
gramática más rápidas del grupo) y su bajo coste, pero su **calidad es
inferior**, especialmente en glosa (2,93) y gramática (4,01).

## 6. Conclusiones

1. **gemini-3.7-flash:nitro** es el candidato con mejor calidad global en la
   segunda evaluación, con la glosa más rápida y fiabilidad perfecta, aunque
   es el más costoso de los tres.
2. **gemini-3.5-flash-lite:nitro** es la opción más rápida y económica para
   traducción y gramática, aceptable en traducción (4,61) pero débil en glosa.
3. **La etapa de glosa es la más problemática**: es la más lenta en general,
   concentra los timeouts de la primera evaluación y presenta el mayor
   desacuerdo entre jueces.
4. Los modelos de razonamiento pequeño de la primera evaluación
   (inkling-small, trinity-large-thinking, nemotron-3.5-lightning) quedaron
   descartados por su baja fiabilidad en la etapa de glosa.
5. La incorporación del juez `dots-3-note-preview:free` aportó un tercer
   criterio sin coste adicional; su sesgo hacia puntuaciones más altas debe
   tenerse en cuenta al interpretar los promedios.