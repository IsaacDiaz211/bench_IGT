# Resultados del benchmark — Corpus de inglés

Informe de la ejecución `20260812121931-b220a6f0` (realizada el 2026-08-12), que
evalúa modelos candidatos de OpenRouter para las tareas de contenido lingüístico
de la aplicación **Leyéndolo**: traducción natural, glosas morfológicas y puntos
gramaticales.

## Configuración de la ejecución

- **Dataset:** `datasets/evaluation/english.jsonl` (20 casos, inglés → español).
- **Repeticiones:** 1.
- **Modelos candidatos:** 5.
- **Jueces de calidad:** `deepseek/deepseek-v4-flash-0731:nitro` y
  `openai/gpt-5.6-luna` (ambos califican cada salida en una escala de 1 a 5).
- **Total de llamadas:** 750 (450 de jueces y 300 de candidatos).

> Nota: 161 llamadas no reportaron coste resoluble desde OpenRouter; ese coste
> no se estimó ni se inventó, sino que se contabiliza aparte. Ningún valor del
> informe es una estimación.

## Resumen ejecutivo

| Modelo | Fiabilidad | Calidad media | Coste total | Latencia (trans. media) | Veredicto |
| --- | --- | ---: | ---: | ---: | --- |
| openai/gpt-5.6-luna:nitro | Alta (85–100 %) | 4.18 | $0.053049 | 3.0 s | **Recomendado** |
| inception/mercury-2 | Perfecta (100 %) | 3.78 | $0.097941 | 1.5 s | Bueno, caro y con glosas débiles |
| nvidia/nemotron-3.5-lightning:nitro | Buena (70–100 %) | 3.55 | $0.077493 | 5.6 s | Glosas inestables y verboso |
| arcee-ai/trinity-large-thinking:nitro | Glosas fallidas (20 %) | 3.71 | $0.090601 | 7.9 s | Descarta sin fallback |
| thinkingmachines/inkling-small:nitro | Inaceptable | 3.06 | $0.027235 | 22.7 s | No utilizable |

**Conclusión principal:** `openai/gpt-5.6-luna:nitro` es el mejor equilibrio
entre calidad, fiabilidad, latencia y coste. Los modelos "small" y "thinking"
tuvieron tasas de timeout y error muy altas en este corpus.

## Fiabilidad por modelo

Porcentaje de llamadas que devolvieron una salida válida y el transporte OK
hasta completar cada etapa:

| Modelo | Etapa | Salida válida | Transporte OK | Llamadas fallidas | Timeouts |
| --- | --- | ---: | ---: | ---: | ---: |
| thinkingmachines/inkling-small:nitro | translation | 50.0 % | 50.0 % | 10 | 7 |
| thinkingmachines/inkling-small:nitro | gloss | 0.0 % | 0.0 % | 20 | 17 |
| thinkingmachines/inkling-small:nitro | grammar | 25.0 % | 25.0 % | 15 | 12 |
| inception/mercury-2 | translation | 100.0 % | 100.0 % | 0 | 0 |
| inception/mercury-2 | gloss | 100.0 % | 100.0 % | 0 | 0 |
| inception/mercury-2 | grammar | 100.0 % | 100.0 % | 0 | 0 |
| arcee-ai/trinity-large-thinking:nitro | translation | 95.0 % | 95.0 % | 1 | 1 |
| arcee-ai/trinity-large-thinking:nitro | gloss | 20.0 % | 20.0 % | 16 | 16 |
| arcee-ai/trinity-large-thinking:nitro | grammar | 100.0 % | 100.0 % | 0 | 0 |
| openai/gpt-5.6-luna:nitro | translation | 95.0 % | 100.0 % | 0 | 0 |
| openai/gpt-5.6-luna:nitro | gloss | 90.0 % | 100.0 % | 0 | 0 |
| openai/gpt-5.6-luna:nitro | grammar | 85.0 % | 100.0 % | 0 | 0 |
| nvidia/nemotron-3.5-lightning:nitro | translation | 100.0 % | 100.0 % | 0 | 0 |
| nvidia/nemotron-3.5-lightning:nitro | gloss | 70.0 % | 70.0 % | 6 | 6 |
| nvidia/nemotron-3.5-lightning:nitro | grammar | 95.0 % | 100.0 % | 0 | 0 |

Observaciones:

- **Único modelo 100 % fiable** en las tres etapas: `inception/mercury-2`.
- **Los timeouts dominan los fallos.** La mayoría de las llamadas fallidas son
  timeouts con el límite configurado en 40 s exactos (`OPENROUTER_TIMEOUT_MS`,
  valor por defecto 40 000 ms): en
  `inkling-small` casi todas las respuestas de gloss y gramática se quedaron en
  timeout, y `trinity` hizo timeout en 16 de 20 casos de gloss.
- **`inkling-small` además sufrió errores HTTP 429** (límite de tasa) en las
  tres etapas, lo que agrava su falta de fiabilidad.
- **`gpt-5.6-luna` es el único caso con transporte OK al 100 % pero salida
  inválida ocasional**: el modelo responde siempre, pero algunas respuestas no
  cumplieron el esquema JSON esperado (1 de 20 en traducción, 2 en gloss y 3 en
  gramática). Es un patrón distinto al de los timeouts y se puede mitigar con
  reintentos o validación posterior.

## Calidad por etapa

Calificaciones promedio (escala 1–5) de los jueces por modelo y etapa:

| Modelo | Traducción | Glosas | Gramática |
| --- | ---: | ---: | ---: |
| thinkingmachines/inkling-small:nitro | 4.63 (19) | — (0) | 4.56 (9) |
| inception/mercury-2 | 4.43 (37) | 3.04 (24) | 3.88 (31) |
| arcee-ai/trinity-large-thinking:nitro | 4.41 (34) | 3.00 (5) | 3.72 (36) |
| openai/gpt-5.6-luna:nitro | **4.93** (35) | **3.25** (20) | **4.35** (31) |
| nvidia/nemotron-3.5-lightning:nitro | 4.22 (30) | 2.72 (18) | 3.70 (32) |

(El número entre paréntesis es la cantidad de evaluaciones realizadas.)

Observaciones:

- **Traducción:** todos los modelos califican por encima de 4.2, con
  `gpt-5.6-luna` claramente a la cabeza (4.93, muy cerca del máximo). La
  traducción natural es la etapa donde menos se diferencia la calidad.
- **Glosas:** es la etapa más débil de todos los modelos. Ningún candidato
  supera 3.25/5. Los jueces también fueron los que más discreparon aquí (ver
  abajo), lo que indica que es la tarea más difícil y la menos resuelta.
- **Gramática:** `gpt-5.6-luna` vuelve a liderar (4.35); el resto se queda entre
  3.70 y 3.88.

## Acuerdo entre jueces

Desacuerdo medio (diferencia absoluta de puntajes entre los dos jueces) por
etapa:

| Modelo | Traducción | Glosas | Gramática |
| --- | ---: | ---: | ---: |
| thinkingmachines/inkling-small:nitro | 0.22 | — | 0.25 |
| inception/mercury-2 | 0.47 | 0.83 | 0.12 |
| arcee-ai/trinity-large-thinking:nitro | 0.48 | 0.00 | 0.25 |
| openai/gpt-5.6-luna:nitro | 0.09 | 0.50 | 0.36 |
| nvidia/nemotron-3.5-lightning:nitro | 0.70 | 0.63 | 0.27 |

Observaciones:

- **Mayor consenso en traducción:** los jueces coinciden mucho en la calidad de
  `gpt-5.6-luna` (0.09 de desacuerdo), lo que refuerza la confianza en su
  liderazgo.
- **Mayor desacuerdo en glosas:** p. ej., 0.83 en `mercury-2` y 0.63 en
  `nemotron`, y 0.70 en la traducción de `nemotron`. Las glosas vuelven a ser el
  punto más conflictivo, tanto para generarlas como para evaluarlas.

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

Observaciones:

- **`mercury-2` es el más rápido** en las tres etapas (1.5 s, 6.3 s y 2.2 s de
  media), con un P95 contenido. Es el único candidato con tiempos cómodos para
  una experiencia de usuario fluida.
- **`gpt-5.6-luna` ofrece el mejor equilibrio entre velocidad y calidad**:
  ~3 s en traducción, ~8.9 s en glosas y ~3.9 s en gramática.
- **`trinity` y `nemotron` son lentos en glosas** (38.2 s y 29.5 s de media)
  porque la mayoría de las llamadas se quedaron en el timeout de 40 s; las
  medias no representan una latencia útil sino intentos agotados.
- **`inkling-small` es inaceptable en latencia**: sus medianas se pegan al
  límite de 40 s en gloss y gramática.

## Consumo de tokens

Tokens por etapa (totales acumulados de las 20 llamadas):

| Modelo | Etapa | Entrada | Salida | Total |
| --- | --- | ---: | ---: | ---: |
| thinkingmachines/inkling-small:nitro | translation | 1546 | 6197 | 7743 |
| thinkingmachines/inkling-small:nitro | gloss | 0 | 0 | 0 |
| thinkingmachines/inkling-small:nitro | grammar | 668 | 5902 | 6570 |
| inception/mercury-2 | translation | 12223 | 7164 | 19387 |
| inception/mercury-2 | gloss | 21270 | 41995 | 63265 |
| inception/mercury-2 | grammar | 13378 | 11960 | 25338 |
| arcee-ai/trinity-large-thinking:nitro | translation | 2838 | 17324 | 20162 |
| arcee-ai/trinity-large-thinking:nitro | gloss | 1726 | 19398 | 21124 |
| arcee-ai/trinity-large-thinking:nitro | grammar | 2585 | 28545 | 31130 |
| openai/gpt-5.6-luna:nitro | translation | 3779 | 2199 | 5978 |
| openai/gpt-5.6-luna:nitro | gloss | 9840 | 16435 | 26275 |
| openai/gpt-5.6-luna:nitro | grammar | 3543 | 4364 | 7907 |
| nvidia/nemotron-3.5-lightning:nitro | translation | 3139 | 39032 | 42171 |
| nvidia/nemotron-3.5-lightning:nitro | gloss | 6663 | 146911 | 153574 |
| nvidia/nemotron-3.5-lightning:nitro | grammar | 2685 | 40192 | 42877 |

Observaciones:

- **`nemotron` es extremadamente verboso**: genera 39 032 tokens de salida en
  traducción, 146 911 en glosas y 40 192 en gramática, órdenes de magnitud por
  encima del resto, sin que su calidad lo justifique.
- **`gpt-5.6-luna` es el más conciso** en traducción y gramática (2.2 K y 4.4 K
  tokens de salida), y el que mejor relación calidad/coste presenta.
- **`mercury-2` consume muchas entradas** (21 270 tokens de prompt en glosas)
  pero con acierto de caché (~5–6 K tokens leídos de caché), lo que explica en
  parte su bajo coste de generación.

## Costes

### Coste total de la ejecución

Coste total (candidatos + jueces): **$0.346319**.

| Concepto | Coste | Llamadas sin coste |
| --- | ---: | ---: |
| Candidatos + jueces | $0.346319 | 161 |
| Solo jueces | $0.156974 | 87 |

### Coste por modelo candidato

| Modelo | Generación | Jueces | Total |
| --- | ---: | ---: | ---: |
| thinkingmachines/inkling-small:nitro | $0.015515 | $0.011720 | **$0.027235** |
| inception/mercury-2 | $0.054022 | $0.043919 | **$0.097941** |
| arcee-ai/trinity-large-thinking:nitro | $0.056387 | $0.034214 | **$0.090601** |
| openai/gpt-5.6-luna:nitro | $0.017571 | $0.035479 | **$0.053049** |
| nvidia/nemotron-3.5-lightning:nitro | $0.045851 | $0.031642 | **$0.077493** |

Observaciones:

- **`inkling-small` es el más barato, pero por la razón equivocada**: casi no
  se le facturó generación porque casi no generó salidas válidas.
- **`mercury-2` es el más caro** ($0.097941), pese a ser el más rápido.
- **`gpt-5.6-luna` cuesta menos de un tercio de `mercury-2`** y es el candidato
  serio más barato, solo superado por el inservible `inkling-small`.

## Análisis por modelo

### openai/gpt-5.6-luna:nitro — recomendado

- Mejor calidad en las tres etapas (4.93 / 3.25 / 4.35).
- 100 % de transporte OK; las salidas inválidas son por formato, no por fallos
  de red ni timeouts (reintentable).
- Latencia excelente (3.0 s / 8.9 s / 3.9 s) y consumo de tokens conciso.
- Coste total bajo: $0.053049.
- Punto de atención: glosas en 3.25/5, la etapa pendiente de todo el campo.

### inception/mercury-2 — buena alternativa, cara

- Fiabilidad perfecta (100 % en todo) y latencia récord.
- Calidad media aceptable (4.43 / 3.04 / 3.88), pero por debajo de
  `gpt-5.6-luna` en las tres etapas.
- El más caro de todos: $0.097941.

### nvidia/nemotron-3.5-lightning:nitro — descartable sin revisar

- Traducción perfecta en fiabilidad (100 %) y gramática casi perfecta (95 %),
  pero solo 70 % de glosas por timeouts.
- Calidad en el fondo de la tabla (4.22 / 2.72 / 3.70).
- Verborrea extrema: hasta 146 911 tokens de salida en glosas, con coste alto
  ($0.077493) y sin beneficio de calidad.

### arcee-ai/trinity-large-thinking:nitro — descartable en glosas

- 16 de 20 glosas en timeout (20 % de éxito). Con fallback podría aprovecharse
  su buena calidad de traducción (4.41) y gramática (3.72), pero su coste
  ($0.090601) es alto.

### thinkingmachines/inkling-small:nitro — no utilizable

- Fallos masivos: 0 % de éxito en glosas, 50 % en traducción y 25 % en
  gramática, con 429 y timeouts en cadena.
- Latencia a tope del límite de 40 s y calidad solo evaluable en los pocos
  casos que completó.

## Recomendaciones

1. **Usar `openai/gpt-5.6-luna:nitro` como modelo principal** para las tres
   etapas.
2. **Simular una cadena de fallback** para `gpt-5.6-luna` → `mercury-2` y medir
   su coste y calidad combinados: `mercury-2` cubre los huecos de formato con
   fiabilidad perfecta, aunque a mayor coste.
3. **Revisar la tarea de glosas**: es la etapa con peor calidad de todos los
   candidatos y la de mayor desacuerdo entre jueces. Vale la pena revisar el
   prompt y el esquema de glosas antes de próximas ejecuciones.
4. **Descartar `inkling-small`** y no considerar `trinity` ni `nemotron` sin
   fallback que absorba sus timeouts.
5. Para una segunda ejecución, considerar más repeticiones por caso y
   evaluar también el corpus chino antes de decidir en producción.

## Datos fuente

- Salida de terminal: `rusult.md`.
- Informe en la carpeta de resultados:
  `results/20260812121931-b220a6f0/report.json` y `report.md`.
