import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const RUNS = [
  {
    id: 'A',
    dir: 'results/20260812121931-b220a6f0-addjudge-accounts-fireworks-models-kimi-k3',
    casos: 20,
  },
  {
    id: 'B',
    dir: 'results/20260813213251-2c6f7cd1-addjudge-dots-studio-dots-3-note-preview-free-addcandidate-google-gemini-3-5-flash-lite-nitro-addjudge-accounts-fireworks-models-kimi-k3',
    casos: 8,
  },
];

const STAGES = [
  { key: 'translation', label: 'Trad.' },
  { key: 'gloss', label: 'Glosa' },
  { key: 'grammar', label: 'Gram.' },
];

const DIM_LABELS = {
  translation: {
    overall: 'Global',
    meaning: 'Sentido',
    completeness: 'Integridad',
    naturalness: 'Naturalidad',
    spanish: 'Español',
    context: 'Contexto',
  },
  gloss: {
    overall: 'Global',
    surfaceAlignment: 'Alineación',
    morphemeGranularity: 'Granularidad morfémica',
    glossAccuracy: 'Exactitud de glosa',
    punctuationHandling: 'Puntuación',
    learnerUsefulness: 'Utilidad didáctica',
  },
  grammar: {
    overall: 'Global',
    presence: 'Presencia',
    accuracy: 'Exactitud',
    evidence: 'Evidencia',
    explanation: 'Explicación',
    pedagogy: 'Pedagogía',
  },
};

const SHORT_NAMES = {
  'deepseek/deepseek-v4-flash-0731:nitro': 'deepseek',
  'deepseek/deepseek-v4-flash-0731': 'deepseek',
  'dots-studio/dots-3-note-preview:free': 'dots-3-note',
  'accounts/fireworks/models/kimi-k3': 'kimi-k3',
};

const shortName = (m) =>
  SHORT_NAMES[m] ??
  m
    .replace(/^accounts\/fireworks\//, '')
    .replace(/^(openai|google|inception|nvidia|arcee-ai|thinkingmachines)\//, '')
    .replace(':nitro', '');

const dec = (n, d = 2) => Number(n).toFixed(d).replace('.', ',');
const usd = (n) => dec(n, 6);
const int = (n) => (n >= 10000 ? n.toLocaleString('es-AR').replace(/\./g, ' ') : String(n));
const pct = (n, d = 1) => `${dec(n * 100, d)} %`;

function loadRun(run) {
  const report = JSON.parse(readFileSync(join(run.dir, 'report.json'), 'utf8'));
  const usage = readFileSync(join(run.dir, 'usage.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l));
  const jPath = join(run.dir, 'judgements.jsonl');
  const judgements = existsSync(jPath)
    ? readFileSync(jPath, 'utf8')
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l))
    : [];
  const vPath = join(run.dir, 'validations.jsonl');
  const validations = existsSync(vPath)
    ? readFileSync(vPath, 'utf8')
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l))
    : [];
  return { ...run, report, usage, judgements, validations };
}

const stageLabel = (k) => STAGES.find((s) => s.key === k)?.label ?? k;

function mdTable(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.join(' | ')} |`).join('\n');
  return [head, sep, body].join('\n');
}

function costByStage(run) {
  const agg = new Map();
  for (const u of run.usage) {
    const key = `${u.evaluatedModel}|${u.stage}|${u.actor}`;
    if (!agg.has(key)) agg.set(key, { cost: 0, calls: 0, sinCoste: 0 });
    const e = agg.get(key);
    e.calls += 1;
    if (typeof u.usage?.costUsd === 'number') e.cost += u.usage.costUsd;
    else e.sinCoste += 1;
  }
  return agg;
}

function tableCostByStage(run) {
  const agg = costByStage(run);
  const models = [...new Set([...agg.keys()].map((k) => k.split('|')[0]))];
  const rows = models.map((m) => {
    const cells = [`\`${shortName(m)}\``];
    for (const st of STAGES) {
      const gen = agg.get(`${m}|${st.key}|candidate`);
      const jud = agg.get(`${m}|${st.key}|judge`);
      const g = gen?.cost ?? 0;
      const j = jud?.cost ?? 0;
      cells.push(usd(g), usd(j), usd(g + j));
    }
    return cells;
  });
  const headers = ['Modelo'];
  for (const st of STAGES)
    headers.push(`${st.label} gen.`, `${st.label} jueces`, `${st.label} total`);
  console.log(`\nCOSTO EXACTO POR ETAPA (fuente: usage.jsonl) — EVALUACIÓN ${run.id}\n`);
  console.log(mdTable(headers, rows));
}

function judgesOf(run) {
  return [...new Set(run.usage.filter((u) => u.actor === 'judge').map((u) => u.model))];
}

function tableJudgesFull(run) {
  console.log(`\nMATRIZ COMPLETA POR JUEZ — EVALUACIÓN ${run.id}\n`);
  const judges = judgesOf(run);
  const rows = [];
  for (const c of run.report.candidateSummaries) {
    for (const st of STAGES) {
      const js = c.judgeScores[st.key];
      const cells = [
        `\`${shortName(c.candidateModel)}\` – ${st.label}`,
        dec(js.mean),
        ...judges.map((j) => {
          const bj = js.byJudge[j];
          return bj ? `${dec(bj.mean)} (${bj.count})` : '—';
        }),
        dec(js.disagreementMean),
      ];
      rows.push(cells);
    }
  }
  const judgeCols = judges.map(shortName);
  console.log(mdTable(['Modelo – Etapa', 'Media', ...judgeCols, 'Desacuerdo'], rows));
}

function dimensionMeans(run) {
  const agg = new Map();
  for (const r of run.judgements) {
    if (r.valid === false || r.validation?.valid === false) continue;
    const scores = r.result?.scores;
    if (!scores || scores.overall == null) continue;
    const key = `${r.judgeCall.evaluatedModel}|${r.judgeCall.stage}`;
    if (!agg.has(key)) agg.set(key, { sums: {}, n: 0 });
    const e = agg.get(key);
    e.n += 1;
    for (const [dim, v] of Object.entries(scores)) {
      e.sums[dim] = (e.sums[dim] ?? 0) + v;
    }
  }
  const out = new Map();
  for (const [key, { sums, n }] of agg) out.set(key, { sums, n });
  return out;
}

function tableDimensions(run) {
  const means = dimensionMeans(run);
  console.log(`\nCALIDAD POR DIMENSIÓN DEL JUEZ — EVALUACIÓN ${run.id}\n`);
  for (const st of STAGES) {
    const dims = Object.keys(DIM_LABELS[st.key]);
    const rows = run.report.candidateSummaries.map((c) => {
      const e = means.get(`${c.candidateModel}|${st.key}`);
      if (!e)
        return [`\`${shortName(c.candidateModel)}\``, '—', ...dims.slice(1).map(() => '—'), 0];
      return [
        `\`${shortName(c.candidateModel)}\``,
        ...dims.map((d) => (e.sums[d] != null ? dec(e.sums[d] / e.n) : '—')),
        e.n,
      ];
    });
    console.log(`**${st.label}**\n`);
    console.log(mdTable(['Modelo', ...dims.map((d) => DIM_LABELS[st.key][d]), 'n'], rows));
    console.log('');
  }
}

function tableByCase(run) {
  if (run.casos > 10) return;
  const agg = new Map();
  for (const r of run.judgements) {
    const o = r.result?.scores?.overall;
    if (o == null) continue;
    const key = `${r.judgeCall.stage}|${r.judgeCall.caseId}|${r.judgeCall.evaluatedModel}`;
    if (!agg.has(key)) agg.set(key, []);
    agg.get(key).push(o);
  }
  const models = run.report.candidateSummaries.map((c) => c.candidateModel);
  const caseIds = [...new Set([...agg.keys()].map((k) => k.split('|')[1]))].sort();
  console.log(`\nCALIDAD OVERALL CASO A CASO — EVALUACIÓN ${run.id}\n`);
  for (const st of STAGES) {
    const rows = [];
    const wins = new Map(models.map((m) => [m, 0]));
    for (const cs of caseIds) {
      const vals = models.map((m) => agg.get(`${st.key}|${cs}|${m}`) ?? []);
      const means = vals.map((v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN));
      const max = Math.max(...means.filter(Number.isFinite));
      means.forEach((v, i) => {
        if (v === max) {
          wins.set(models[i], wins.get(models[i]) + 1);
        }
      });
      rows.push([
        `\`${cs}\``,
        ...means.map((v) => (Number.isFinite(v) ? (v === max ? `**${dec(v)}**` : dec(v)) : '—')),
        dec(max),
      ]);
    }
    rows.push([
      '**Casos ganados** (empates compartidos)',
      ...models.map((m) => String(wins.get(m))),
      String(caseIds.length),
    ]);
    console.log(`**${stageLabel(st.key)}**\n`);
    console.log(mdTable(['Caso', ...models.map(shortName), 'Máx.'], rows));
    console.log('');
  }
}

const stripAccents = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const norm = (s) => stripAccents(s.toLowerCase());

const FAMILIES = [
  [
    'Manejo de puntuación',
    /puntuaci|punctuat|comillas|ellipsis|elipsis|guion(es)? largo|guiones largos/,
  ],
  [
    'Segmentación morfémica y contracciones',
    /morfem|morphem|segmentac|segmentat|tokeniz|tokenizat|desglose|descomposic|contracc|merged_tokens|fusionad/,
  ],
  [
    'Alineación superficie–glosa',
    /alineac|align|scrambled|misaligned|desplazad|glosas-en-orden|proper_name_misalignment/,
  ],
  [
    'Cobertura incompleta / omisiones',
    /cobertura|coverage|incomplete|omision|omission|missing_(third|sentence)|truncad|recorte/,
  ],
  ['Concordancia género/número', /concordan|agreement|genero|number_mismatch|pluralidad/],
  [
    'Etiqueta o explicación gramatical imprecisa',
    /explicac|explanation|etiqueta|_label|terminolog|clasifica|grammar_point|relativ|clausula|clause|subjuntiv|tiempo_verbal|tense|infinitivo|gerundio|modo_|modal/,
  ],
  [
    'Elección léxica, literalidad y calco',
    /lexical|lexica|eleccion|calco|calque|literal|mistransl|mistranslat|wrong_gloss|incorrect_lexical|matiz|nuance|register|idiom|anglicis|naturalid|awkward|unnatural/,
  ],
  [
    'Ortografía y tipografía',
    /typo|spelling|ortograf|acent(o)?\b|mayuscula|capitaliz|tipograf|formato-numerico|number_formatting/,
  ],
];

function tagFamily(tag) {
  const t = norm(tag);
  if (t.length > 55 && t.includes(' ')) return 'Comentario libre (sin normalizar)';
  for (const [name, re] of FAMILIES) if (re.test(t)) return name;
  return 'Otros';
}

function tableErrorTags(run) {
  const agg = new Map();
  let total = 0;
  for (const r of run.judgements) {
    if (r.judgeCall.stage !== 'gloss') continue;
    for (const t of r.result?.errorTags ?? []) {
      const fam = tagFamily(t);
      const key = `${r.judgeCall.evaluatedModel}|${fam}`;
      agg.set(key, (agg.get(key) ?? 0) + 1);
      total += 1;
    }
  }
  const models = run.report.candidateSummaries.map((c) => c.candidateModel);
  const families = [...new Set(FAMILIES.map(([n]) => n).concat('Otros'))];
  const counts = families.map((f) => ({
    f,
    total: models.reduce((a, m) => a + (agg.get(`${m}|${f}`) ?? 0), 0),
    byModel: models.map((m) => agg.get(`${m}|${f}`) ?? 0),
  }));
  counts.sort((a, b) => b.total - a.total);
  console.log(`\nFAMILIAS DE ERRORTAGS EN GLOSA — EVALUACIÓN ${run.id}\n`);
  console.log(
    mdTable(
      ['Familia', ...models.map(shortName), 'Total'],
      counts.map((c) => [c.f, ...c.byModel.map(int), int(c.total)]),
    ),
  );
  console.log(`\nTotal de etiquetas clasificadas: ${int(total)}.`);
}

function tableConfidence(runs) {
  console.log('\nCONFIANZA MEDIA POR JUEZ\n');
  const judges = [...new Set(runs.flatMap((r) => judgesOf(r)))];
  const rows = judges.map((j) => {
    const cells = [`\`${shortName(j)}\``];
    for (const run of runs) {
      const rel = run.judgements.filter(
        (r) => r.judgeCall.model === j && typeof r.result?.confidence === 'number',
      );
      const mean = rel.length ? rel.reduce((a, r) => a + r.result.confidence, 0) / rel.length : NaN;
      cells.push(rel.length ? `${dec(mean, 2)} (${int(rel.length)})` : '—');
    }
    return cells;
  });
  console.log(mdTable(['Juez', ...runs.map((r) => `Conf. media ${r.id} (n)`)], rows));
}

function tableEfficiency(run) {
  console.log(`\n==== RATIOS DE EFICIENCIA — EVALUACIÓN ${run.id} ====\n`);
  const rows = run.report.candidateSummaries.map((c) => {
    const activos = STAGES.filter((st) => c.judgeScores[st.key].count > 0);
    const q = activos.reduce((a, st) => a + c.judgeScores[st.key].mean, 0) / activos.length;
    const latSeg = STAGES.reduce((a, st) => a + c.latencyMs[st.key].mean, 0) / 1000;
    const costo = c.totalCost.amountUsd;
    return [
      `\`${shortName(c.candidateModel)}\`${activos.length < 3 ? ' *' : ''}`,
      dec(q),
      usd(costo / c.runCount),
      usd(costo / q),
      dec(latSeg, 1),
      dec(latSeg / q, 2),
    ];
  });
  console.log(
    mdTable(['Modelo', 'Calidad prom.', 'USD/caso', 'USD/punto', 's/caso', 's/punto'], rows),
  );
}

function tableRankings(run) {
  const agg = costByStage(run);
  console.log(`\n==== RANKING CONSOLIDADO POR ETAPA — EVALUACIÓN ${run.id} ====\n`);
  const rankOf = (values, dir) => {
    const sorted = [...values]
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => v != null)
      .sort((a, b) => (dir === 'asc' ? a.v - b.v : b.v - a.v));
    const ranks = new Array(values.length).fill(null);
    sorted.forEach(({ i }, pos) => {
      ranks[i] = pos + 1;
    });
    return ranks;
  };
  const models = run.report.candidateSummaries.map((c) => c.candidateModel);
  const rows = models.map((m) => {
    const cells = [`\`${shortName(m)}\``];
    for (const st of STAGES) {
      const conDatos = run.report.candidateSummaries.map((c) => c.judgeScores[st.key].count > 0);
      if (!conDatos[models.indexOf(m)]) {
        cells.push('s/d');
        continue;
      }
      const qs = run.report.candidateSummaries.map((c) =>
        c.judgeScores[st.key].count > 0 ? c.judgeScores[st.key].mean : null,
      );
      const ls = run.report.candidateSummaries.map((c) =>
        conDatos[models.indexOf(c.candidateModel)] ? c.latencyMs[st.key].mean : null,
      );
      const cs = models.map((mm) => {
        if (!conDatos[models.indexOf(mm)]) return null;
        const g = agg.get(`${mm}|${st.key}|candidate`)?.cost ?? 0;
        const j = agg.get(`${mm}|${st.key}|judge`)?.cost ?? 0;
        return g + j;
      });
      const rq = rankOf(qs, 'desc');
      const rl = rankOf(ls, 'asc');
      const rc = rankOf(cs, 'asc');
      const idx = models.indexOf(m);
      cells.push(`${rq[idx]} · ${rl[idx]} · ${rc[idx]}`);
    }
    return cells;
  });
  console.log(mdTable(['Modelo', ...STAGES.map((s) => s.label)], rows));
  console.log(
    '\nCada celda: puesto en calidad · puesto en latencia · puesto en costo de la etapa.',
  );
}

function tableAvsB(runs) {
  const [A, B] = runs;
  const shared = A.report.candidateSummaries.filter((ca) =>
    B.report.candidateSummaries.some((cb) => cb.candidateModel === ca.candidateModel),
  );
  console.log('\nMODELOS COMPARTIDOS A VS. B\n');
  const rows = [];
  for (const ca of shared) {
    const cb = B.report.candidateSummaries.find((c) => c.candidateModel === ca.candidateModel);
    for (const st of STAGES) {
      const qa = ca.judgeScores[st.key].mean;
      const qb = cb.judgeScores[st.key].mean;
      const d = qb - qa;
      rows.push([
        `\`${shortName(ca.candidateModel)}\` – ${st.label}`,
        dec(qa),
        dec(qb),
        `${d >= 0 ? '+' : '−'}${dec(Math.abs(d))}`,
        `${dec(ca.latencyMs[st.key].mean / 1000, 2)} s`,
        `${dec(cb.latencyMs[st.key].mean / 1000, 2)} s`,
      ]);
    }
  }
  console.log(
    mdTable(['Modelo – Etapa', 'Calidad A', 'Calidad B', 'Δ calidad', 'Lat. A', 'Lat. B'], rows),
  );
}

function tableDeltas(run) {
  console.log(`\n==== Δ FRENTE AL LÍDER POR ETAPA — EVALUACIÓN ${run.id} ====\n`);
  const rows = run.report.candidateSummaries.map((c) => {
    const cells = [`\`${shortName(c.candidateModel)}\``];
    for (const st of STAGES) {
      if (c.judgeScores[st.key].count === 0) {
        cells.push('s/d');
        continue;
      }
      const qs = run.report.candidateSummaries
        .filter((x) => x.judgeScores[st.key].count > 0)
        .map((x) => x.judgeScores[st.key].mean);
      const leader = Math.max(...qs);
      const mine = c.judgeScores[st.key].mean;
      cells.push(mine === leader ? 'líder' : `−${dec(leader - mine)}`);
    }
    const total = c.totalCost.amountUsd;
    const min = Math.min(...run.report.candidateSummaries.map((x) => x.totalCost.amountUsd));
    cells.push(total === min ? 'líder' : `×${dec(total / min, 2)}`);
    return cells;
  });
  console.log(mdTable(['Modelo', ...STAGES.map((s) => `Δ ${s.label}`), 'Δ costo total'], rows));
}

function tableReliability(run) {
  console.log(`\n==== DESGLOSE DE FIABILIDAD POR MODELO Y ETAPA — EVALUACIÓN ${run.id} ====\n`);
  const candNames = new Set(run.report.candidateSummaries.map((c) => c.candidateModel));
  const valAgg = new Map();
  for (const x of run.validations) {
    if (!candNames.has(x.candidateModel)) continue;
    if (!STAGES.some((s) => s.key === x.stage)) continue;
    const k = `${x.candidateModel}|${x.stage}`;
    if (!valAgg.has(k)) valAgg.set(k, { t: 0, v: 0 });
    const e = valAgg.get(k);
    e.t += 1;
    if (x.valid) e.v += 1;
  }
  const rows = [];
  for (const c of run.report.candidateSummaries) {
    const cells = [`\`${shortName(c.candidateModel)}\``];
    let fT = 0;
    let toT = 0;
    let esqT = 0;
    for (const st of STAGES) {
      const rel = c.reliability[st.key];
      const agg = valAgg.get(`${c.candidateModel}|${st.key}`) ?? { t: 0, v: 0 };
      const esperadas = Math.round(rel.validRate * agg.t);
      if (esperadas !== agg.v) {
        console.log(
          `AVISO: ${shortName(c.candidateModel)} ${st.label}: válidas reportadas ${agg.v} != esperadas ${esperadas}`,
        );
      }
      const esquema = Math.max(0, agg.t - agg.v - (rel.failedCalls ?? 0));
      cells.push(`${agg.v} / ${agg.t}`);
      fT += rel.failedCalls ?? 0;
      toT += rel.timeoutCalls ?? 0;
      esqT += esquema;
    }
    cells.push(`${fT} (${toT})`, String(esqT));
    rows.push(cells);
  }
  console.log(
    mdTable(
      [
        'Modelo',
        'Trad. válidas',
        'Glosa válidas',
        'Gram. válidas',
        'Fallos transporte (timeouts)',
        'Inválidas por esquema',
      ],
      rows,
    ),
  );
  console.log('\nInválidas por esquema = intentos − válidas − fallos de transporte.');
}

function verifyRun(run) {
  console.log(`\nVERIFICACIÓN ARITMÉTICA — EVALUACIÓN ${run.id}\n`);
  const byStage = {};
  let failed = 0;
  let timeouts = 0;
  let failedGloss = 0;
  let timeoutsGloss = 0;
  for (const c of run.report.candidateSummaries) {
    for (const [st, v] of Object.entries(c.reliability)) {
      failed += v.failedCalls ?? 0;
      timeouts += v.timeoutCalls ?? 0;
      byStage[st] ??= { f: 0, t: 0 };
      byStage[st].f += v.failedCalls ?? 0;
      byStage[st].t += v.timeoutCalls ?? 0;
      if (st === 'gloss') {
        failedGloss += v.failedCalls ?? 0;
        timeoutsGloss += v.timeoutCalls ?? 0;
      }
    }
  }
  const sumCost = run.usage.reduce((a, u) => a + (u.usage?.costUsd ?? 0), 0);
  const unknown = run.usage.filter((u) => typeof u.usage?.costUsd !== 'number').length;
  console.log(`Fallos de transporte (failedCalls): ${failed}; en glosa: ${failedGloss}.`);
  console.log(`Timeouts totales: ${timeouts}; en glosa: ${timeoutsGloss}.`);
  console.log(`Por etapa: ${JSON.stringify(byStage)}`);
  console.log(
    `Costo sumado usage.jsonl: USD ${usd(sumCost)}; grandTotalCost (report): USD ${usd(
      run.report.grandTotalCost.amountUsd,
    )}.`,
  );
  const gtc = run.report.grandTotalCost.amountUsd;
  const jtc = run.report.judgeTotalCost.amountUsd;
  console.log(
    `Llamadas: ${run.usage.length}; sin costo informado: ${unknown}; solo jueces: USD ${usd(
      jtc,
    )} (${pct(jtc / gtc)}).`,
  );
}

for (const run of RUNS.map(loadRun)) {
  tableCostByStage(run);
  tableReliability(run);
  tableJudgesFull(run);
  tableDimensions(run);
  tableByCase(run);
  tableErrorTags(run);
  tableEfficiency(run);
  tableRankings(run);
  tableDeltas(run);
}
tableConfidence(RUNS.map(loadRun));
tableAvsB(RUNS.map(loadRun));
for (const run of RUNS.map(loadRun)) verifyRun(run);
