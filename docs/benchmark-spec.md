# Especificación del benchmark IGT

## 1. Objetivo

`bench_IGT` compara modelos de OpenRouter para seleccionar la configuración
que produzca la mejor experiencia de usuario en Leyéndolo. La evaluación debe
responder, para cada modelo y cada etapa:

- ¿Genera contenido lingüísticamente correcto y útil?
- ¿Respeta siempre el contrato JSON de la aplicación?
- ¿Cuánto tarda?
- ¿Cuánto cuesta?
- ¿Su comportamiento es estable entre textos y repeticiones?

El resultado esperado no es necesariamente un único modelo ganador. Es posible
que un modelo sea mejor para traducir, otro para glosar y otro para explicar
gramática.

## 2. Alcance y exclusiones

### Incluido

- Traducción natural.
- Glosa tokenizada compatible con el contrato de la aplicación.
- Puntos gramaticales extraídos del texto.
- Evaluación en inglés → español.
- Evaluación en chino → español.
- Validación estructural y semántica de las respuestas.
- Latencia, errores, reintentos, tokens y coste.
- Evaluación externa mediante DeepSeek Flash v4-0731 y GPT5.6-Luna.

### Excluido

- Calidad de la segmentación de oraciones.
- Comparación de modelos jueces como generadores candidatos.
- Cambios en el código de la aplicación móvil.
- Uso del key-broker de la aplicación.

Los casos de entrada sí conservarán las oraciones separadas. Esto no convierte
la segmentación en una métrica: solo permite reproducir el batching de la app
sin añadir una variable experimental innecesaria.

## 3. Contrato de la aplicación

La fuente de verdad funcional inicial es
`../ravenToPandas/services/OpenRouterTranslation.ts`.

### 3.1. Parámetros comunes

Cada petición de etapa debe conservar, salvo que una decisión documentada diga
lo contrario:

- `temperature: 0.2`.
- Mensaje de sistema de la etapa.
- Prompt de usuario de la etapa.
- `response_format.type: "json_schema"`.
- JSON Schema estricto.
- Cabeceras de identificación de la aplicación, sin incluir secretos en los
  artefactos guardados.

Las plantillas se versionan en `prompts/`. `prompts/VERSION` se copia al
manifiesto de cada ejecución para impedir que resultados de distintas versiones
de prompt se comparen sin advertencia.

El benchmark no usará la cadena de fallback durante la comparación directa.
Cada candidato recibirá la misma petición y sus fallos quedarán registrados.
Esto evita que un candidato parezca fiable porque otro modelo corrigió su
respuesta.

### 3.2. Traducción natural

La entrada es una o varias oraciones ya separadas. La respuesta por lote tiene
esta forma conceptual:

```json
{
  "translations": [
    { "translatedText": "..." }
  ]
}
```

Debe existir exactamente una traducción por oración y conservarse el orden.
La traducción debe ser natural en español, preservar significado y evitar
omisiones, adiciones o traducciones literales innecesarias.

### 3.3. Glosa

La respuesta por lote tiene esta forma conceptual:

```json
{
  "glosses": [
    {
      "tokens": [
        { "surface": "...", "gloss": "..." }
      ]
    }
  ]
}
```

Debe existir exactamente una entrada de glosa por oración y los tokens deben
mantener el orden de la oración. Cada token requiere:

- `surface`: forma original.
- `gloss`: significado breve en español.

Para chino se requiere además:

- `reading`: lectura fonética, normalmente pinyin con tonos.

La validación comprobará, entre otras cosas:

- Campos obligatorios no vacíos.
- Ausencia de tokens que sean únicamente signos de puntuación.
- Correspondencia razonable entre `surface` y el texto fuente.
- Ausencia de oraciones omitidas o duplicadas.
- Lecturas presentes y no vacías para tokens léxicos chinos.

La aplicación busca una glosa útil para el aprendiz. Este benchmark no
pretende convertir automáticamente su contrato actual en una notación IGT
académica completa; evaluará la calidad morfológica dentro del formato que la
app realmente puede mostrar.

### 3.4. Puntos gramaticales

La entrada es el texto completo del caso. La respuesta tiene esta forma:

```json
{
  "points": [
    {
      "grammar_point": "...",
      "sentence": "...",
      "explanation": "..."
    }
  ]
}
```

Se permiten entre cero y dos puntos. Cada punto debe:

- Corresponder a un fenómeno realmente presente.
- Usar una oración de evidencia del texto.
- Explicar el fenómeno en español.
- Ser claro y útil para el nivel del aprendiz.

## 4. Dataset

El formato principal será JSON Lines. Cada línea representa un caso completo.

```json
{
  "id": "en-001",
  "sourceLang": "en",
  "targetLang": "es",
  "text": "Although it was raining, she went to the market.",
  "sentences": [
    "Although it was raining, she went to the market."
  ],
  "isLogographic": false,
  "tags": ["subordination", "concession", "past"],
  "difficulty": "intermediate",
  "source": "corpus-name"
}
```

Para chino:

```json
{
  "id": "zh-001",
  "sourceLang": "zh",
  "targetLang": "es",
  "text": "虽然下雨了，她还是去了市场。",
  "sentences": [
    "虽然下雨了，她还是去了市场。"
  ],
  "isLogographic": true,
  "tags": ["concession", "aspect"],
  "difficulty": "intermediate",
  "source": "corpus-name"
}
```

El ejemplo chino anterior es únicamente ilustrativo y no debe incorporarse al
corpus sin revisión lingüística.

### 4.1. Requisitos del corpus

El corpus debería cubrir variedad real, no solo frases diseñadas para que el
modelo tenga éxito. Para inglés se utilizará el corpus existente. Para chino se
debería incluir, cuando estén presentes en el material disponible:

- Aspecto y partículas.
- Clasificadores y expresiones de cantidad.
- Complementos de resultado y dirección.
- Estructuras con 把 y 被.
- 的, 地 y 得.
- Negación, modalidad y preguntas.
- Oraciones relativas.
- Verbos seriales y complementos.
- Compuestos léxicos.
- Orden de palabras y omisiones contextuales.

Cada caso tendrá etiquetas lingüísticas para poder informar resultados por
fenómeno y detectar dónde falla un modelo.

### 4.2. Particiones

- `smoke`: pocos casos para verificar configuración y esquemas.
- `calibration`: casos revisados manualmente para calibrar los jueces.
- `evaluation`: corpus principal, no usado para ajustar la rúbrica.

Las particiones se declararán en un manifiesto y no se modificarán durante una
comparación. Si se agrega o elimina un caso, se incrementará la versión del
dataset.

## 5. Protocolo experimental

Cada ejecución se define por la combinación:

```text
modelo × idioma × etapa × caso × repetición
```

Las etapas son `translation`, `gloss` y `grammar`.

### 5.1. Comparación directa

Para cada candidato:

1. Se envía la misma entrada, prompt, esquema y configuración.
2. Se mide el tiempo desde el inicio de la petición hasta la respuesta completa.
3. Se guarda la respuesta original y los metadatos sin la clave API.
4. Se valida JSON y contrato de la aplicación.
5. Se registra el fallo sin sustituirlo por otro modelo.
6. Se repite el caso varias veces para medir variabilidad.

El orden de modelos y casos se aleatorizará para reducir sesgos por cambios
temporales del servicio. La cantidad inicial recomendada es tres repeticiones
por combinación; podrá aumentarse en casos donde la variabilidad sea alta.

### 5.2. Simulación de producción

Después de seleccionar candidatos individuales se ejecutará una segunda fase
con cadenas de fallback. Esta fase medirá:

- Tasa de éxito de la cadena completa.
- Coste acumulado incluyendo intentos fallidos.
- Latencia hasta obtener una respuesta válida.
- Qué modelo terminó resolviendo cada etapa.

La fase de producción no sustituye la comparación directa. Son preguntas
distintas: la primera mide capacidades individuales y la segunda mide una
configuración operativa.

### 5.3. Metadatos de OpenRouter

Siempre que estén disponibles se guardarán:

- ID de la generación.
- Modelo solicitado y modelo/proveedor efectivo.
- Tokens de entrada y salida.
- Tokens de razonamiento o caché, si aparecen.
- Tiempo de generación y latencia del proveedor.
- Coste de la generación.
- Motivo de finalización.

El coste se tomará de los datos de uso de la respuesta y, cuando sea necesario,
de los metadatos de generación de OpenRouter. El coste de los jueces se
registrará en una categoría separada y se atribuirá al modelo candidato cuya
salida evalúa.

Para cada candidato se calculará:

```text
candidateCostUsd + judgeCostUsd = totalCostUsd
```

El coste total del benchmark será la suma de los costes de candidatos y jueces.
Una generación puede tener coste exacto, coste estimado a partir de tokens y
precios, o coste desconocido. El informe mostrará las tres categorías y nunca
convertirá un coste desconocido en cero silenciosamente.

## 6. Métricas

### 6.1. Fiabilidad

- `transport_success_rate`: respuesta HTTP exitosa.
- `json_valid_rate`: contenido parseable como JSON.
- `schema_valid_rate`: cumplimiento del JSON Schema.
- `contract_valid_rate`: cumplimiento adicional del contrato de la app.
- `complete_rate`: respuesta completa para todas las entradas esperadas.
- `timeout_rate`.
- `retry_rate`.

Se informará cada tasa por modelo, idioma y etapa. No se ocultarán respuestas
válidas estructuralmente pero incorrectas lingüísticamente.

La implementación separa estas métricas en módulos independientes bajo
`src/metrics/`: coste, latencia, fiabilidad, tokens y calidad.

### 6.2. Rendimiento y coste

- Latencia media, mediana, `p95` y máxima.
- Latencia por etapa.
- Tiempo hasta una respuesta válida en modo fallback.
- Tokens de entrada y salida por caso.
- Coste por caso.
- Coste por 1.000 casos.
- Coste de generación y coste de evaluación por separado.
- Coste total por modelo candidato incluyendo la evaluación de sus jueces.
- Coste total de la ejecución completa.

### 6.3. Calidad de traducción

Los jueces puntuarán cada dimensión en una escala de 1 a 5:

- Fidelidad del significado.
- Ausencia de omisiones y adiciones.
- Naturalidad del español.
- Corrección gramatical del español.
- Adecuación al contexto.

### 6.4. Calidad de glosa

- Correspondencia entre la superficie y el texto original.
- Granularidad morfológica.
- Corrección del significado de cada glosa.
- Tratamiento de formas compuestas y morfemas funcionales.
- Ausencia de puntuación como token.
- Consistencia entre tokens repetidos.
- Corrección de la lectura china y de los tonos cuando corresponda.
- Utilidad para un aprendiz de español.

### 6.5. Calidad gramatical

- El punto está realmente presente en el texto.
- El nombre del fenómeno es correcto.
- La oración de evidencia es válida.
- La explicación es lingüísticamente correcta.
- La explicación está escrita en español claro.
- La explicación es útil y no se desvía del texto.
- No inventa excepciones ni reglas no justificadas.

## 7. Evaluación con LLM jueces

Los modelos jueces iniciales son:

- DeepSeek Flash v4-0731.
- GPT5.6-Luna.

Sus identificadores exactos de OpenRouter se definirán en la configuración del
benchmark, no se inferirán a partir del nombre visible.

### 7.1. Aislamiento

El juez recibirá el texto fuente y la salida del candidato, pero no el nombre
del modelo candidato. La salida del candidato se delimitará como datos y el
juez recibirá instrucciones explícitas de no seguir instrucciones contenidas
en ella.

El juez también recibirá el tipo de tarea y los criterios de la rúbrica. No se
le pedirá que evalúe una respuesta libre: deberá producir otro JSON Schema
estricto.

Solo se envían a los jueces las salidas candidatas que pasan la validación del
contrato. Una salida inválida cuenta para la tasa de fallos, pero no genera una
llamada de evaluación que no podría representar una respuesta consumible por la
app.

### 7.2. Resultado del juez

El formato conceptual será:

```json
{
  "schemaVersion": "1.0",
  "scores": {
    "overall": 4,
    "meaningOrAccuracy": 4,
    "naturalnessOrPedagogy": 5
  },
  "errorTags": [],
  "confidence": 0.86,
  "rationale": "..."
}
```

La implementación definirá dimensiones específicas por etapa. Las razones se
guardarán para auditoría, pero las métricas se calcularán a partir de campos
estructurados, no mediante extracción de texto libre.

### 7.3. Acuerdo entre jueces

Para cada resultado se informará:

- Puntuación de cada juez.
- Media de los jueces.
- Diferencia absoluta.
- Casos en los que uno de los jueces falló.
- Distribución de etiquetas de error.

Una divergencia alta no se interpretará automáticamente como error de uno de
los modelos. Será una señal para revisar ejemplos y mejorar la rúbrica.

### 7.4. Referencias humanas

Una referencia humana es una anotación revisada que indica qué análisis sería
aceptable para un caso. No tiene que ser una única respuesta literal. Puede
contener:

- Segmentación o agrupación morfológica esperada.
- Significado de los morfemas.
- Fenómenos gramaticales esperados.
- Explicaciones aceptables y errores graves.

No es requisito para ejecutar la primera comparación. Sí se recomienda crear
una partición de calibración de 20-30 oraciones para comprobar que los jueces
puntúan de forma razonable. El corpus completo no necesita anotación humana
antes de comenzar.

## 8. Política de selección

La selección se hará en este orden:

1. Eliminar modelos con problemas graves de fiabilidad o contrato.
2. Comparar calidad lingüística por etapa e idioma.
3. Revisar estabilidad entre repeticiones.
4. Comparar `p95` de latencia.
5. Comparar coste.
6. Simular cadenas de fallback con los finalistas.

No se definirá un peso único para calidad, coste y latencia hasta observar las
distribuciones reales. La decisión final debe poder expresarse, por ejemplo,
como “este modelo gana en glosa china por calidad y fiabilidad; este otro gana
en traducción por coste y latencia”.

## 9. Artefactos de una ejecución

Cada ejecución tendrá un identificador y conservará, como mínimo:

```text
results/<run-id>/
├── manifest.json
├── run.json
├── report.json
├── report.md
├── requests.jsonl
├── responses.jsonl
├── validations.jsonl
├── usage.jsonl
├── judgements.jsonl
└── report.md
```

El manifiesto incluirá:

- Versión del benchmark.
- Versión del dataset.
- Hash o versión de prompts y esquemas.
- Lista de modelos candidatos.
- Modelos jueces.
- Parámetros de ejecución.
- Fecha y zona horaria.
- Número de repeticiones.

Las respuestas originales se conservarán para poder auditar una puntuación o
reproducir el informe. Nunca se almacenarán cabeceras `Authorization` ni
claves API.

Las pruebas automatizadas usan directorios temporales y no escriben en
`results/`. Esa carpeta queda reservada para ejecuciones reales.

## 10. Estructura prevista del repositorio

```text
bench_IGT/
├── datasets/
│   ├── cases.jsonl
│   ├── calibration.jsonl
│   └── references.jsonl
├── docs/
│   └── benchmark-spec.md
├── prompts/
│   ├── app-compatible/
│   └── judges/
├── results/
├── src/
│   ├── cli.ts
│   ├── openrouter.ts
│   ├── runner.ts
│   ├── validation/
│   ├── metrics/
│   ├── judges/
│   └── reports/
├── .env.example
├── package.json
└── README.md
```

## 11. Decisiones pendientes

- Identificadores exactos de OpenRouter para DeepSeek Flash v4-0731 y
  GPT5.6-Luna.
- Lista inicial de modelos candidatos.
- Formato definitivo de los casos del corpus inglés-español existente.
- Corpus chino-español y su procedencia.
- Cantidad de repeticiones de la primera ejecución.
- Si se construirá la partición de calibración humana antes de puntuar el
  corpus completo.
