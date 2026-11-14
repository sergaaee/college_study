import React, { useState } from 'react'
import { Plot, Pt, Seg, Label } from '../lib/plot.jsx'
import { Slider, Toggle, Segmented, Stat } from '../lib/ui.jsx'
import { inline } from '../lib/rich.jsx'
import { parseLogic, parseSet } from '../lib/logic.js'
import { binom, fact } from '../lib/expr.js'
import { Split, Verdict, Readout, Note, f4 } from './common.jsx'

const COLORS = ['var(--c1)', 'var(--c2)', 'var(--c5)', 'var(--c3)', 'var(--c4)', 'var(--c6)']

/* ============ Таблица истинности и проверка формул ============ */
export function Truth({ formulas: f0 = ['p -> q', '!p | q'] }) {
  const [fs, setFs] = useState(f0)
  const parsed = fs.map(s => { try { return { ...parseLogic(s), ok: true } } catch (e) { return { ok: false, err: e.message, vars: [] } } })
  const vars = [...new Set(parsed.flatMap(p => p.vars))].sort().slice(0, 4)
  const rows = []
  for (let m = (1 << vars.length) - 1; m >= 0; m--) {
    const env = {}
    vars.forEach((v, i) => { env[v] = !!((m >> (vars.length - 1 - i)) & 1) })
    rows.push({ env, vals: parsed.map(p => (p.ok ? p.f(env) : null)) })
  }
  const [cur, setCur] = useState(0)
  const c = Math.min(cur, rows.length - 1)
  const stat = parsed.map((p, k) => {
    if (!p.ok) return null
    const ones = rows.filter(r => r.vals[k]).length
    return { ones, kind: ones === rows.length ? 'tautology' : ones === 0 ? 'contradiction' : 'contingent' }
  })
  const equiv = parsed.length >= 2 && parsed.every(p => p.ok) && rows.every(r => r.vals.every(v => v === r.vals[0]))
  const set = (i, v) => setFs(a => a.map((x, k) => (k === i ? v : x)))
  const T = b => (b === null ? '?' : b ? '1' : '0')
  return (
    <div className="lab-split" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)' }}>
      <div>
        <div className="table-wrap">
          <table className="truth" style={{ borderCollapse: 'collapse', minWidth: '60%' }}>
            <thead><tr>
              {vars.map(v => <th key={v} style={{ padding: '4px 12px', borderBottom: '2px solid var(--line)' }}>{v}</th>)}
              {fs.map((f, k) => <th key={k} style={{ padding: '4px 10px', borderBottom: '2px solid var(--line)', color: COLORS[k % 6], fontSize: '.85rem' }}>{f}</th>)}
            </tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={i} onClick={() => setCur(i)} style={{ cursor: 'pointer', background: i === c ? 'var(--accent-soft)' : undefined }}>
                {vars.map(v => <td key={v} style={{ textAlign: 'center', padding: '3px 12px' }}>{r.env[v] ? 'И' : 'Л'}</td>)}
                {r.vals.map((x, k) => <td key={k} style={{ textAlign: 'center', fontWeight: 800, color: x ? 'var(--good)' : 'var(--bad)' }}>{x === null ? '?' : x ? 'И' : 'Л'}</td>)}
              </tr>))}</tbody>
          </table>
        </div>
        <Note>Нажмите на строку — подсветится набор значений. И = истина (1), Л = ложь (0).</Note>
      </div>
      <div className="controls">
        {fs.map((f, k) => (
          <div key={k}>
            <div className="row"><b style={{ color: COLORS[k % 6] }}>Формула {k + 1}</b>
              {fs.length > 1 && <button className="btn tiny ghost" onClick={() => setFs(a => a.filter((_, i) => i !== k))}>убрать</button>}</div>
            <input type="text" value={f} onChange={e => set(k, e.target.value)} style={{ width: '100%', fontFamily: 'ui-monospace, monospace' }} spellCheck={false} />
            {!parsed[k].ok && <div style={{ color: 'var(--bad)', fontSize: '.85rem' }}>Ошибка: {parsed[k].err}</div>}
            {stat[k] && <div className="small" style={{ marginTop: 2 }}>
              {stat[k].kind === 'tautology' ? <b style={{ color: 'var(--good)' }}>тавтология (всегда истинна)</b> : stat[k].kind === 'contradiction' ? <b style={{ color: 'var(--bad)' }}>противоречие (всегда ложна)</b> : <b style={{ color: 'var(--warn)' }}>выполнима, не тавтология</b>} · единиц: {stat[k].ones} из {rows.length}
            </div>}
          </div>
        ))}
        {fs.length < 3 && <button className="btn tiny" onClick={() => setFs(a => [...a, 'p & q'])}>＋ формула</button>}
        <Note>Операции: <code>!</code> не, <code>&amp;</code> и, <code>|</code> или, <code>^</code> xor, <code>-&gt;</code> влечёт, <code>&lt;-&gt;</code> равносильно. Можно ∧ ∨ ¬ → ↔.</Note>
        <div className="readout">
          <div className="muted small">Выбранная строка: {vars.map(v => `${v}=${rows[c].env[v] ? 'И' : 'Л'}`).join(', ')}</div>
          {rows[c].vals.map((x, k) => <div key={k}>Формула {k + 1} = <b style={{ color: x ? 'var(--good)' : 'var(--bad)' }}>{T(x) === '?' ? '?' : x ? 'истина' : 'ложь'}</b></div>)}
        </div>
        {fs.length >= 2 && <Verdict tone={equiv ? 'good' : 'warn'}>{equiv ? 'Все формулы равносильны (столбцы совпадают во всех строках).' : 'Формулы не равносильны: найдите строку, где значения различаются.'}</Verdict>}
      </div>
    </div>
  )
}

/* ============ Кванторы: порядок важен ============ */
export function Quant({ n: n0 = 4, P: P0, xName = 'студент', yName = 'проект', story }) {
  const [n, setN] = useState(n0)
  const base = P0 || [[1, 0, 0, 0], [1, 1, 0, 0], [0, 0, 1, 0], [0, 1, 0, 1], [1, 0, 0, 0]]
  const [P, setP] = useState(() => Array.from({ length: 5 }, (_, i) => Array.from({ length: 5 }, (_, j) => !!(base[i] && base[i][j]))))
  const tog = (i, j) => setP(m => m.map((r, ii) => r.map((v, jj) => (ii === i && jj === j ? !v : v))))
  const R = [...Array(n).keys()]
  const row = i => R.map(j => P[i][j]), col = j => R.map(i => P[i][j])
  const q = {
    'AxEy': R.every(i => row(i).some(Boolean)), 'EyAx': R.some(j => col(j).every(Boolean)),
    'ExAy': R.some(i => row(i).every(Boolean)), 'AyEx': R.every(j => col(j).some(Boolean)),
    'AxAy': R.every(i => row(i).every(Boolean)), 'ExEy': R.some(i => row(i).some(Boolean)),
  }
  const badRow = R.find(i => !row(i).some(Boolean)), goodCol = R.find(j => col(j).every(Boolean))
  const goodRow = R.find(i => row(i).every(Boolean)), badCol = R.find(j => !col(j).some(Boolean))
  const items = [
    ['∀x ∃y P(x,y)', 'AxEy', `для каждого ${xName}а найдётся свой ${yName}`, badRow !== undefined ? `контрпример: x = ${badRow + 1} (строка пуста)` : 'в каждой строке есть единица'],
    ['∃y ∀x P(x,y)', 'EyAx', `один и тот же ${yName} подходит всем`, goodCol !== undefined ? `свидетель: y = ${goodCol + 1} (весь столбец из единиц)` : 'нет столбца целиком из единиц'],
    ['∃x ∀y P(x,y)', 'ExAy', `есть ${xName}, которому подходят все ${yName}ы`, goodRow !== undefined ? `свидетель: x = ${goodRow + 1}` : 'нет строки целиком из единиц'],
    ['∀y ∃x P(x,y)', 'AyEx', `у каждого ${yName}а есть свой ${xName}`, badCol !== undefined ? `контрпример: y = ${badCol + 1} (столбец пуст)` : 'в каждом столбце есть единица'],
    ['∀x ∀y P(x,y)', 'AxAy', 'все связаны со всеми', ''],
    ['∃x ∃y P(x,y)', 'ExEy', 'есть хотя бы одна связь', ''],
  ]
  return (
    <div className="lab-split">
      <div>
        {story && <Note>{story}</Note>}
        <div className="muted small" style={{ margin: '6px 0' }}>Нажимайте клетки: P(x,y) = 1 (зелёная) — «{xName} x связан с {yName}ом y».</div>
        <table style={{ borderCollapse: 'separate', borderSpacing: 4 }}>
          <thead><tr><th /><th colSpan={n} className="muted small" style={{ textAlign: 'center' }}>{yName} y →</th></tr>
            <tr><th className="muted small">x ↓</th>{R.map(j => <th key={j}>{j + 1}</th>)}</tr></thead>
          <tbody>{R.map(i => <tr key={i}><th>{i + 1}</th>{R.map(j => (
            <td key={j}><button onClick={() => tog(i, j)} style={{ width: 42, height: 38, borderRadius: 8, border: '1px solid var(--line)', background: P[i][j] ? 'color-mix(in srgb, var(--good) 30%, var(--card))' : 'var(--card2)', color: P[i][j] ? 'var(--good)' : 'var(--muted)', fontWeight: 800, cursor: 'pointer' }}>{P[i][j] ? '1' : '0'}</button></td>))}</tr>)}</tbody>
        </table>
        <div style={{ marginTop: 10 }}><div className="muted small" style={{ marginBottom: 4 }}>Размер модели</div><Segmented options={[3, 4, 5]} value={n} onChange={setN} /></div>
      </div>
      <div className="controls">
        {items.map(([f, k, desc, why]) => (
          <div key={k} className="readout" style={{ borderLeft: `4px solid ${q[k] ? 'var(--good)' : 'var(--bad)'}` }}>
            <div className="row"><b style={{ fontSize: '1.05rem' }}>{f}</b><span className="spacer" /><b style={{ color: q[k] ? 'var(--good)' : 'var(--bad)' }}>{q[k] ? 'истинно' : 'ложно'}</b></div>
            <div className="muted small">{desc}</div>
            {why && <div className="small">{why}</div>}
          </div>
        ))}
        <Verdict tone="info">{q.AxEy && !q.EyAx ? 'Здесь ∀x∃y истинно, а ∃y∀x ложно: порядок кванторов менять НЕЛЬЗЯ.' : 'Сравните ∀x∃y и ∃y∀x: из второго всегда следует первое, но не наоборот.'}</Verdict>
      </div>
    </div>
  )
}

/* ============ Операции над множествами ============ */
const UNI = [...Array(12).keys()].map(i => i + 1)
export function SetsLab({ A: A0 = [1, 2, 3, 4, 5], B: B0 = [4, 5, 6, 7], C: C0 = [2, 4, 6, 8], exprs: e0 = ['A | B', 'A & B'], withC = true }) {
  const [S, setS] = useState({ A: UNI.map(x => A0.includes(x)), B: UNI.map(x => B0.includes(x)), C: UNI.map(x => C0.includes(x)) })
  const [exprs, setExprs] = useState(e0)
  const [sel, setSel] = useState(0)
  const flip = (k, i) => setS(s => ({ ...s, [k]: s[k].map((v, j) => (j === i ? !v : v)) }))
  const ev = e => { try { return { r: parseSet(e)(S) } } catch (err) { return { err: err.message } } }
  const res = exprs.map(ev)
  const cur = res[sel]?.r
  const names = withC ? ['A', 'B', 'C'] : ['A', 'B']
  const same = res.length >= 2 && res.every(r => r.r) && res.every(r => r.r.every((v, i) => v === res[0].r[i]))
  const show = (k, i) => (S[k][i] ? 1 : 0)
  return (
    <div className="lab-split" style={{ gridTemplateColumns: 'minmax(0,1.25fr) minmax(0,1fr)' }}>
      <div>
        <Note>{'Универсум $U=\\{1,\\dots,12\\}$. Нажимайте числа, чтобы включать и выключать их в множествах.'}</Note>
        {names.map((k, ki) => (
          <div key={k} style={{ marginBottom: 8 }}>
            <b style={{ color: COLORS[ki], display: 'inline-block', width: 22 }}>{k}</b>
            {UNI.map((x, i) => <button key={x} onClick={() => flip(k, i)} style={{ width: 34, height: 34, margin: 2, borderRadius: 8, border: `2px solid ${S[k][i] ? COLORS[ki] : 'var(--line)'}`, background: S[k][i] ? 'color-mix(in srgb, ' + COLORS[ki] + ' 22%, var(--card))' : 'var(--card2)', color: S[k][i] ? 'var(--ink)' : 'var(--muted)', fontWeight: 700, cursor: 'pointer' }}>{x}</button>)}
            <span className="muted small"> |{k}|={S[k].filter(Boolean).length}</span>
          </div>
        ))}
        {cur && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: 'var(--accent-soft)' }}>
            <div className="muted small">Результат выражения {sel + 1}: <code>{exprs[sel]}</code></div>
            <div style={{ marginTop: 4 }}>{UNI.map((x, i) => <span key={x} style={{ display: 'inline-block', width: 34, height: 34, lineHeight: '34px', textAlign: 'center', margin: 2, borderRadius: 8, fontWeight: 800, background: cur[i] ? 'var(--accent)' : 'var(--card2)', color: cur[i] ? '#fff' : 'var(--muted)', border: '1px solid var(--line)' }}>{x}</span>)}</div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>{'{' + UNI.filter((_, i) => cur[i]).join(', ') + '}'} · {cur.filter(Boolean).length} элементов</div>
          </div>
        )}
      </div>
      <div className="controls">
        {exprs.map((e, k) => (
          <div key={k}>
            <div className="row"><b style={{ color: k === sel ? 'var(--accent)' : 'var(--muted)', cursor: 'pointer' }} onClick={() => setSel(k)}>Выражение {k + 1}</b>
              {exprs.length > 1 && <button className="btn tiny ghost" onClick={() => { setExprs(a => a.filter((_, i) => i !== k)); setSel(0) }}>убрать</button>}</div>
            <input type="text" value={e} onChange={ev2 => setExprs(a => a.map((x, i) => (i === k ? ev2.target.value : x)))} onFocus={() => setSel(k)} style={{ width: '100%', fontFamily: 'ui-monospace, monospace' }} spellCheck={false} />
            {res[k].err && <div style={{ color: 'var(--bad)', fontSize: '.85rem' }}>Ошибка: {res[k].err}</div>}
            {res[k].r && <div className="small muted">= {'{' + UNI.filter((_, i) => res[k].r[i]).join(', ') + '}'} ({res[k].r.filter(Boolean).length})</div>}
          </div>
        ))}
        {exprs.length < 3 && <button className="btn tiny" onClick={() => setExprs(a => [...a, 'A - B'])}>＋ выражение</button>}
        <Note>Операции: <code>|</code> объединение, <code>&amp;</code> пересечение, <code>-</code> разность, <code>^</code> симметрическая разность, <code>!</code> дополнение, <code>U</code> универсум. Можно ∪ ∩ ∖ △.</Note>
        {exprs.length >= 2 && <Verdict tone={same ? 'good' : 'warn'}>{same ? 'Выражения дают ОДИНАКОВОЕ множество на этих данных (это ещё не доказательство тождества — попробуйте другие A, B, C).' : 'Выражения дают разные множества — тождество неверно (контрпример найден).'}</Verdict>}
      </div>
    </div>
  )
}

/* ============ Диаграмма Эйлера–Венна: включения–исключения ============ */
export function VennLab({ vals: v0 = { N: 60, a: 30, b: 25, c: 20, ab: 10, ac: 8, bc: 6, abc: 3 }, names = ['Чай', 'Кофе', 'Сок'], two = false }) {
  const [v, setV] = useState(v0)
  const set = k => x => setV(o => ({ ...o, [k]: x }))
  const { N, a, b, c, ab, ac, bc, abc } = v
  const MX = Math.max(60, Math.ceil(Math.max(v0.a, v0.b, v0.c || 0) * 1.4))
  const MP = Math.max(30, Math.ceil(Math.max(v0.ab, v0.ac || 0, v0.bc || 0) * 1.5))
  const MT = Math.max(20, Math.ceil((v0.abc || 0) * 1.5))
  const MN = Math.max(120, Math.ceil(v0.N * 1.3))
  const reg = two
    ? { A: a - ab, B: b - ab, AB: ab, none: N - (a + b - ab) }
    : { A: a - ab - ac + abc, B: b - ab - bc + abc, C: c - ac - bc + abc, AB: ab - abc, AC: ac - abc, BC: bc - abc, ABC: abc }
  const union = two ? a + b - ab : a + b + c - ab - ac - bc + abc
  const none = N - union
  const bad = Object.entries(reg).some(([k, x]) => k !== 'none' && x < 0) || none < 0
  const exactly1 = two ? reg.A + reg.B : reg.A + reg.B + reg.C
  const exactly2 = two ? reg.AB : reg.AB + reg.AC + reg.BC
  const num = (x, y, val, col) => <text x={x} y={y} textAnchor="middle" style={{ fill: val < 0 ? 'var(--bad)' : col || 'var(--ink)', fontWeight: 800, fontSize: 17 }}>{val}</text>
  return (
    <Split plot={
      <svg viewBox="0 0 400 320" className="plot" role="img">
        <rect x="6" y="6" width="388" height="308" rx="10" style={{ fill: 'none', stroke: 'var(--muted)', strokeWidth: 1.4 }} />
        <text x="14" y="24" style={{ fill: 'var(--muted)', fontSize: 12 }}>универсум N = {N}, вне всех: {none}</text>
        {two ? (
          <>
            <circle cx="160" cy="165" r="95" style={{ fill: 'var(--c1)', fillOpacity: 0.2, stroke: 'var(--c1)', strokeWidth: 2.4 }} />
            <circle cx="240" cy="165" r="95" style={{ fill: 'var(--c2)', fillOpacity: 0.2, stroke: 'var(--c2)', strokeWidth: 2.4 }} />
            {num(115, 170, reg.A)}{num(285, 170, reg.B)}{num(200, 170, reg.AB)}
            <text x="105" y="70" style={{ fill: 'var(--c1)', fontWeight: 800 }}>{names[0]}</text><text x="270" y="70" style={{ fill: 'var(--c2)', fontWeight: 800 }}>{names[1]}</text>
          </>
        ) : (
          <>
            <circle cx="160" cy="130" r="85" style={{ fill: 'var(--c1)', fillOpacity: 0.2, stroke: 'var(--c1)', strokeWidth: 2.4 }} />
            <circle cx="240" cy="130" r="85" style={{ fill: 'var(--c2)', fillOpacity: 0.2, stroke: 'var(--c2)', strokeWidth: 2.4 }} />
            <circle cx="200" cy="200" r="85" style={{ fill: 'var(--c5)', fillOpacity: 0.2, stroke: 'var(--c5)', strokeWidth: 2.4 }} />
            {num(120, 105, reg.A)}{num(280, 105, reg.B)}{num(200, 262, reg.C)}{num(200, 100, reg.AB)}{num(147, 190, reg.AC)}{num(253, 190, reg.BC)}{num(200, 158, reg.ABC, 'var(--accent)')}
            <text x="90" y="50" style={{ fill: 'var(--c1)', fontWeight: 800 }}>{names[0]}</text><text x="285" y="50" style={{ fill: 'var(--c2)', fontWeight: 800 }}>{names[1]}</text><text x="170" y="304" style={{ fill: 'var(--c5)', fontWeight: 800 }}>{names[2]}</text>
          </>
        )}
      </svg>}>
      <Slider label="Всего человек $N$" value={N} min={20} max={MN} step={1} onChange={set('N')} />
      <Slider label={`$|\\text{${names[0]}}|$`} value={a} min={0} max={MX} step={1} onChange={set('a')} color="var(--c1)" />
      <Slider label={`$|\\text{${names[1]}}|$`} value={b} min={0} max={MX} step={1} onChange={set('b')} color="var(--c2)" />
      {!two && <Slider label={`$|\\text{${names[2]}}|$`} value={c} min={0} max={MX} step={1} onChange={set('c')} color="var(--c5)" />}
      <Slider label="$|A\cap B|$" value={ab} min={0} max={MP} step={1} onChange={set('ab')} />
      {!two && <Slider label="$|A\cap C|$" value={ac} min={0} max={MP} step={1} onChange={set('ac')} />}
      {!two && <Slider label="$|B\cap C|$" value={bc} min={0} max={MP} step={1} onChange={set('bc')} />}
      {!two && <Slider label="$|A\cap B\cap C|$" value={abc} min={0} max={MT} step={1} onChange={set('abc')} color="var(--accent)" />}
      <div className="stats">
        <Stat label="|A∪B∪C|" value={String(union)} tone="good" sub={two ? '= |A|+|B|−|A∩B|' : '= Σ|·| − Σ|∩₂| + |∩₃|'} />
        <Stat label="ни в одном" value={String(none)} tone={none < 0 ? 'bad' : ''} /><Stat label="ровно в одном" value={String(exactly1)} /><Stat label="ровно в двух" value={String(exactly2)} />
      </div>
      {bad ? <Verdict tone="bad">Числа несовместны: одна из областей получила отрицательное значение (красная). Уменьшите пересечения.</Verdict> : <Verdict tone="info">{two ? 'Общая часть при сложении посчитана дважды — вычитаем её один раз.' : 'Включение–исключение: сложили всё, вычли попарные (тройное пересечение вычли трижды), вернули тройное.'}</Verdict>}
    </Split>
  )
}

/* ============ Бинарные отношения: свойства, замыкания, орграф ============ */
const REL_PRESETS = {
  'пусто': () => [], 'тождество': n => [...Array(n).keys()].map(i => [i, i]),
  'делит': n => { const p = []; for (let a = 1; a <= n; a++) for (let b = 1; b <= n; b++) if (b % a === 0) p.push([a - 1, b - 1]); return p },
  '≤': n => { const p = []; for (let a = 0; a < n; a++) for (let b = a; b < n; b++) p.push([a, b]); return p },
  'цикл 1→2→3→1': () => [[0, 1], [1, 2], [2, 0]],
  'mod 2': n => { const p = []; for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if ((a - b) % 2 === 0) p.push([a, b]); return p },
}
export function Relation({ n: n0 = 4, pairs: p0, presets = ['пусто', 'тождество', 'делит', '≤', 'цикл 1→2→3→1', 'mod 2'] }) {
  const [n, setN] = useState(n0)
  const mk = (pairs, nn) => Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_, j) => pairs.some(([a, b]) => a === i && b === j)))
  const [M, setM] = useState(() => mk(p0 || [[0, 1], [1, 2], [2, 0]], n0))
  const R = [...Array(n).keys()]
  const tog = (i, j) => setM(m => m.map((r, a) => r.map((v, b) => (a === i && b === j ? !v : v))))
  const refl = R.every(i => M[i][i]), irr = R.every(i => !M[i][i])
  const sym = R.every(i => R.every(j => M[i][j] === M[j][i]))
  const anti = R.every(i => R.every(j => i === j || !(M[i][j] && M[j][i])))
  let tViol = null
  for (const i of R) for (const j of R) if (M[i][j]) for (const k of R) if (M[j][k] && !M[i][k] && !tViol) tViol = [i, j, k]
  const trans = !tViol
  let sViol = null
  for (const i of R) for (const j of R) if (M[i][j] && !M[j][i] && !sViol) sViol = [i, j]
  const closure = kind => setM(m => {
    const c = m.map(r => [...r])
    if (kind === 'refl') R.forEach(i => { c[i][i] = true })
    if (kind === 'sym') R.forEach(i => R.forEach(j => { if (c[i][j]) c[j][i] = true }))
    if (kind === 'trans') for (const k of R) for (const i of R) for (const j of R) if (c[i][k] && c[k][j]) c[i][j] = true
    return c
  })
  const pos = i => { const a = (2 * Math.PI * i) / n - Math.PI / 2; return [200 + 120 * Math.cos(a), 160 + 120 * Math.sin(a)] }
  const edges = []
  R.forEach(i => R.forEach(j => { if (M[i][j]) edges.push([i, j]) }))
  const P = (ok, txt) => <div style={{ color: ok ? 'var(--good)' : 'var(--bad)', fontWeight: 700 }}>{ok ? '✓' : '✗'} {inline(txt, 'rp')}</div>
  return (
    <Split plot={
      <svg viewBox="0 0 400 320" className="plot" role="img">
        <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" style={{ fill: 'var(--c1)' }} /></marker></defs>
        {edges.map(([i, j], k) => {
          const [x1, y1] = pos(i), [x2, y2] = pos(j)
          if (i === j) return <circle key={k} cx={x1 + (x1 - 200) * 0.28} cy={y1 + (y1 - 160) * 0.28} r="13" style={{ fill: 'none', stroke: 'var(--c1)', strokeWidth: 2 }} />
          const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L
          const off = M[j][i] ? 7 : 0
          const sx = x1 + ux * 16 - uy * off, sy = y1 + uy * 16 + ux * off, ex = x2 - ux * 18 - uy * off, ey = y2 - uy * 18 + ux * off
          return <line key={k} x1={sx} y1={sy} x2={ex} y2={ey} markerEnd="url(#arr)" style={{ stroke: 'var(--c1)', strokeWidth: 2 }} />
        })}
        {R.map(i => { const [x, y] = pos(i); return <g key={i}><circle cx={x} cy={y} r="16" style={{ fill: 'var(--card)', stroke: 'var(--ink)', strokeWidth: 2 }} /><text x={x} y={y + 5} textAnchor="middle" style={{ fontWeight: 800, fill: 'var(--ink)', fontSize: 15 }}>{i + 1}</text></g> })}
      </svg>}>
      <div className="row"><span className="muted small">Элементов:</span><Segmented options={[3, 4, 5, 6]} value={n} onChange={setN} /></div>
      <div className="muted small">Матрица отношения: клетка (i, j) = 1, если $i\,R\,j$ (стрелка $i\to j$).</div>
      <table style={{ borderCollapse: 'separate', borderSpacing: 3 }}>
        <thead><tr><th />{R.map(j => <th key={j} className="muted small">{j + 1}</th>)}</tr></thead>
        <tbody>{R.map(i => <tr key={i}><th className="muted small">{i + 1}</th>{R.map(j => <td key={j}><button onClick={() => tog(i, j)} style={{ width: 36, height: 32, borderRadius: 7, border: '1px solid var(--line)', background: M[i][j] ? 'color-mix(in srgb, var(--c1) 30%, var(--card))' : 'var(--card2)', color: M[i][j] ? 'var(--c1)' : 'var(--muted)', fontWeight: 800, cursor: 'pointer' }}>{M[i][j] ? 1 : 0}</button></td>)}</tr>)}</tbody>
      </table>
      <div className="row">{presets.map(k => <button key={k} className="btn tiny" onClick={() => setM(mk(REL_PRESETS[k](n), n))}>{k}</button>)}</div>
      <div className="readout">
        {P(refl, 'рефлексивно (все $i\\,R\\,i$)')}{P(sym, 'симметрично')}{P(anti, 'антисимметрично')}{P(trans, 'транзитивно')}
        <div className="muted small" style={{ marginTop: 4 }}>{irr ? 'антирефлексивно: нет петель' : ''}{tViol ? ` Нарушение транзитивности: ${tViol[0] + 1}→${tViol[1] + 1}, ${tViol[1] + 1}→${tViol[2] + 1}, но нет ${tViol[0] + 1}→${tViol[2] + 1}.` : ''}{!sym && sViol ? ` Нарушение симметричности: ${sViol[0] + 1}→${sViol[1] + 1} есть, а ${sViol[1] + 1}→${sViol[0] + 1} нет.` : ''}</div>
      </div>
      <div className="row"><span className="muted small">Замыкание:</span><button className="btn tiny" onClick={() => closure('refl')}>рефлексивное</button><button className="btn tiny" onClick={() => closure('sym')}>симметричное</button><button className="btn tiny" onClick={() => closure('trans')}>транзитивное</button></div>
      {refl && sym && trans ? <Verdict tone="good">Отношение эквивалентности: разбивает множество на классы.</Verdict> : refl && anti && trans ? <Verdict tone="good">Частичный порядок (рефлексивность + антисимметричность + транзитивность).</Verdict> : <Verdict tone="warn">Ни эквивалентность, ни частичный порядок.</Verdict>}
    </Split>
  )
}

/* ============ Остатки: классы эквивалентности по модулю n ============ */
const DAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
export function ModClass({ n: n0 = 5, a: a0 = 3 }) {
  const [n, setN] = useState(n0), [a, setA] = useState(a0), [d, setD] = useState(100)
  const nums = [...Array(41).keys()].map(i => i - 10)
  const cls = x => ((x % n) + n) % n
  const ac = cls(a)
  return (
    <Split plot={
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4 }}>
          {nums.map(x => <button key={x} onClick={() => setA(x)} style={{ padding: '6px 0', borderRadius: 8, border: x === a ? '2px solid var(--ink)' : '1px solid var(--line)', background: cls(x) === ac ? 'var(--accent)' : 'color-mix(in srgb, ' + COLORS[cls(x) % 6] + ' 16%, var(--card))', color: cls(x) === ac ? '#fff' : 'var(--ink)', fontWeight: 700, cursor: 'pointer' }}>{x}</button>)}
        </div>
        <Note>Нажмите число — подсветится его класс $[a]_n$: все числа с тем же остатком.</Note>
      </div>}>
      <Slider label="Модуль $n$" value={n} min={2} max={12} step={1} onChange={setN} />
      <Readout>{`$[${a}]_{${n}}=\\{\\dots,${ac - n},${ac},${ac + n},${ac + 2 * n},\\dots\\}$, остаток $${a}\\bmod ${n}=${ac}$.\n\nВсего различных классов: **${n}** (остатки $0,1,\\dots,${n - 1}$).`}</Readout>
      <div className="readout">
        <div className="muted small">Квадраты по модулю n (разбор случаев):</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          {[...Array(n).keys()].map(x => <span key={x} style={{ padding: '2px 8px', borderRadius: 7, background: 'var(--card2)', border: '1px solid var(--line)' }}>{x}² ≡ {(x * x) % n}</span>)}
        </div>
        <div className="small" style={{ marginTop: 4 }}>Возможные остатки квадрата: <b>{[...new Set([...Array(n).keys()].map(x => (x * x) % n))].sort((a, b) => a - b).join(', ')}</b></div>
      </div>
      <Slider label="Дней вперёд (задача о днях недели)" value={d} min={1} max={400} step={1} onChange={setD} color="var(--c2)" />
      <Verdict tone="info">{`Если сегодня вторник, то через ${d} дней будет ${DAYS[(1 + d) % 7]} (так как $${d}\\bmod 7=${d % 7}$). Сложение и умножение классов не зависит от выбора представителя.`}</Verdict>
    </Split>
  )
}

/* ============ Функции между конечными множествами ============ */
const surj = (m, n) => { let s = 0; for (let i = 0; i <= n; i++) s += (i % 2 ? -1 : 1) * binom(n, i) * Math.pow(n - i, m); return s }
export function FunMap({ m: m0 = 3, n: n0 = 3 }) {
  const [m, setM] = useState(m0), [n, setN] = useState(n0)
  const [f, setF] = useState([0, 1, 2, 0, 1])
  const img = f.slice(0, m).map(x => x % n)
  const inj = new Set(img).size === m
  const sur = new Set(img).size === n
  const cycle = i => setF(a => a.map((x, k) => (k === i ? (x + 1) % n : x)))
  const total = Math.pow(n, m), injs = m <= n ? fact(n) / fact(n - m) : 0, surs = surj(m, n), bij = m === n ? fact(m) : 0
  const yd = (k, cnt) => 40 + ((k + 0.5) * 240) / cnt
  return (
    <Split plot={
      <svg viewBox="0 0 400 320" className="plot" role="img">
        <text x="70" y="22" textAnchor="middle" style={{ fill: 'var(--muted)', fontSize: 13 }}>область A (|A|={m})</text>
        <text x="330" y="22" textAnchor="middle" style={{ fill: 'var(--muted)', fontSize: 13 }}>B (|B|={n})</text>
        {img.map((j, i) => <line key={i} x1="95" y1={yd(i, m)} x2="305" y2={yd(j, n)} style={{ stroke: COLORS[i % 6], strokeWidth: 2.6 }} />)}
        {[...Array(m).keys()].map(i => <g key={i} onClick={() => cycle(i)} style={{ cursor: 'pointer' }}><circle cx="75" cy={yd(i, m)} r="19" style={{ fill: 'var(--card)', stroke: COLORS[i % 6], strokeWidth: 3 }} /><text x="75" y={yd(i, m) + 5} textAnchor="middle" style={{ fontWeight: 800, fill: 'var(--ink)' }}>a{i + 1}</text></g>)}
        {[...Array(n).keys()].map(j => <g key={j}><circle cx="325" cy={yd(j, n)} r="19" style={{ fill: img.includes(j) ? 'color-mix(in srgb, var(--good) 22%, var(--card))' : 'var(--card2)', stroke: 'var(--ink)', strokeWidth: 2 }} /><text x="325" y={yd(j, n) + 5} textAnchor="middle" style={{ fontWeight: 800, fill: 'var(--ink)' }}>b{j + 1}</text></g>)}
      </svg>}>
      <Slider label="Размер области $|A|$" value={m} min={1} max={5} step={1} onChange={setM} />
      <Slider label="Размер множества $B$" value={n} min={1} max={5} step={1} onChange={setN} color="var(--c2)" />
      <Note>Нажимайте на элементы $a_i$ — стрелка перескакивает на следующий элемент $B$.</Note>
      <div className="stats">
        <Stat label="инъекция" value={inj ? 'да' : 'нет'} tone={inj ? 'good' : 'bad'} sub="разные → разные" />
        <Stat label="сюръекция" value={sur ? 'да' : 'нет'} tone={sur ? 'good' : 'bad'} sub="каждый b задет" />
        <Stat label="биекция" value={inj && sur ? 'да' : 'нет'} tone={inj && sur ? 'good' : 'bad'} />
      </div>
      <Readout>{`Всего функций $A\\to B$: $n^m=${n}^{${m}}=${total}$\n\nИнъекций: $\\frac{n!}{(n-m)!}=${injs}$ · Сюръекций: $${surs}$ · Биекций: $${bij}$`}</Readout>
      <Verdict tone="info">{m > n ? 'При $|A|>|B|$ инъекции невозможны (принцип Дирихле).' : m < n ? 'При $|A|<|B|$ сюръекции невозможны.' : 'При $|A|=|B|$ инъективность ⟺ сюръективность ⟺ биективность.'}</Verdict>
    </Split>
  )
}

/* ============ Математическая индукция ============ */
const STMT = {
  sumsq: { name: '$1^2+\\dots+n^2=\\frac{n(n+1)(2n+1)}{6}$', ok: n => { let s = 0; for (let k = 1; k <= n; k++) s += k * k; return s === (n * (n + 1) * (2 * n + 1)) / 6 } },
  div5: { name: '$5\\mid 6^n-1$', ok: n => (Math.pow(6, n) - 1) % 5 === 0 || (n > 15 ? true : false) },
  pow: { name: '$2^n>n^2$', ok: n => Math.pow(2, n) > n * n },
  prime: { name: '$n^2+n+41$ — простое', ok: n => { const v = n * n + n + 41; for (let d = 2; d * d <= v; d++) if (v % d === 0) return false; return true } },
  ineq: { name: '$n<2^n$', ok: n => n < Math.pow(2, n) },
}
export function Induct({ stmt: s0 = 'sumsq' }) {
  const [base, setBase] = useState(true), [step, setStep] = useState(true)
  const [s, setS] = useState(s0), [N, setN] = useState(30)
  const fallen = base && step ? 12 : base ? 1 : 0
  const S = STMT[s]
  const first = (() => { for (let n = 1; n <= 60; n++) if (!S.ok(n)) return n; return null })()
  const start = s === 'pow' ? 5 : 1
  return (
    <Split plot={
      <div>
        <svg viewBox="0 0 400 130" className="plot" role="img">
          <line x1="10" y1="108" x2="390" y2="108" style={{ stroke: 'var(--muted)', strokeWidth: 2 }} />
          {[...Array(12).keys()].map(i => (
            <g key={i} transform={i < fallen ? `rotate(70 ${32 * i + 28} 108)` : ''}>
              <rect x={32 * i + 22} y="52" width="12" height="56" rx="2" style={{ fill: i < fallen ? 'var(--good)' : 'var(--c1)', stroke: 'var(--ink)', strokeWidth: 1.2 }} />
              <text x={32 * i + 28} y="126" textAnchor="middle" style={{ fill: 'var(--muted)', fontSize: 10 }}>{i + 1}</text>
            </g>))}
        </svg>
        <div className="row" style={{ marginTop: 8 }}><Toggle label="База: $P(1)$ верно (толкнули первое)" value={base} onChange={setBase} /><Toggle label="Шаг: $P(k)\Rightarrow P(k+1)$" value={step} onChange={setStep} /></div>
        <Verdict tone={base && step ? 'good' : 'bad'}>{base && step ? 'Падают все: $P(n)$ верно для всех $n$.' : base ? 'Толкнули первое, но цепочка не передаёт падение (нет шага) — упадёт только одно.' : step ? 'Шаг есть, но никто не толкнул (нет базы) — ничего не падает.' : 'Нет ни базы, ни шага.'}</Verdict>
      </div>}>
      <div><div className="muted small" style={{ marginBottom: 4 }}>Утверждение $P(n)$</div><Segmented options={Object.keys(STMT).map(k => ({ v: k, l: k === 'sumsq' ? 'Σk²' : k === 'div5' ? '6ⁿ−1' : k === 'pow' ? '2ⁿ>n²' : k === 'prime' ? 'n²+n+41' : 'n<2ⁿ' }))} value={s} onChange={setS} /></div>
      <Readout>{S.name}</Readout>
      <Slider label="Проверяем $n=1,\dots,N$" value={N} min={5} max={60} step={1} onChange={setN} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {[...Array(N).keys()].map(i => { const n = i + 1; const ok = S.ok(n); return <span key={n} style={{ width: 28, textAlign: 'center', borderRadius: 6, fontSize: '.78rem', fontWeight: 700, padding: '2px 0', background: ok ? 'color-mix(in srgb, var(--good) 20%, var(--card))' : 'color-mix(in srgb, var(--bad) 24%, var(--card))', color: ok ? 'var(--good)' : 'var(--bad)' }}>{n}</span> })}
      </div>
      <Verdict tone={first ? 'bad' : 'good'}>{first ? `Первый провал: $n=${first}$. Индукцией доказать нельзя: утверждение неверно (или верно лишь с некоторого $n_0$ — базу нужно брать там).` : `Для $n\\le${Math.min(N, 60)}$ утверждение верно — разумно доказывать индукцией.`}{s === 'pow' ? ' Для $2^n>n^2$ база: $n=5$ (при $n=3,4$ неверно).' : ''}</Verdict>
    </Split>
  )
}

export default { truth: Truth, quant: Quant, sets: SetsLab, venn: VennLab, relation: Relation, modclass: ModClass, funmap: FunMap, induct: Induct }
