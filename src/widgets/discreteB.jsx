import React, { useState, useMemo } from 'react'
import { Slider, Toggle, Segmented, Stat } from '../lib/ui.jsx'
import { inline } from '../lib/rich.jsx'
import { binom, fact, gcd } from '../lib/expr.js'
import { toTex } from '../lib/linalg.js'
import { Split, Verdict, Readout, Note, f4 } from './common.jsx'

const COLORS = ['var(--c1)', 'var(--c2)', 'var(--c5)', 'var(--c3)', 'var(--c4)', 'var(--c6)']
const LET = 'ABCDEFGH'

/* ============ Диаграмма Хассе ============ */
export function Hasse({ mode: m0 = 'div', N: N0 = 30, M: M0 = 10 }) {
  const [mode, setMode] = useState(m0), [N, setN] = useState(N0), [Mx, setMx] = useState(M0)
  const [sel, setSel] = useState([])
  const poset = useMemo(() => {
    let els, leq, lab
    if (mode === 'div') { els = []; for (let d = 1; d <= N; d++) if (N % d === 0) els.push(d); leq = (x, y) => y % x === 0; lab = x => String(x) }
    else if (mode === 'range') { els = [...Array(Mx).keys()].map(i => i + 1); leq = (x, y) => y % x === 0; lab = x => String(x) }
    else { els = [0, 1, 2, 3, 4, 5, 6, 7]; leq = (x, y) => (x & ~y) === 0; lab = x => (x === 0 ? '∅' : '{' + [0, 1, 2].filter(i => (x >> i) & 1).map(i => 'abc'[i]).join('') + '}') }
    const lt = (x, y) => x !== y && leq(x, y)
    const cov = []
    els.forEach(x => els.forEach(y => { if (lt(x, y) && !els.some(z => lt(x, z) && lt(z, y))) cov.push([x, y]) }))
    const rank = {}
    const rk = x => { if (rank[x] !== undefined) return rank[x]; const below = els.filter(y => lt(y, x)); return (rank[x] = below.length ? 1 + Math.max(...below.map(rk)) : 0) }
    els.forEach(rk)
    const levels = {}
    els.forEach(x => { (levels[rank[x]] ||= []).push(x) })
    const H = Math.max(...Object.keys(levels).map(Number))
    const pos = {}
    Object.entries(levels).forEach(([r, arr]) => arr.forEach((x, i) => { pos[x] = [30 + ((i + 0.5) * 340) / arr.length, 290 - (H ? (r * 250) / H : 125)] }))
    return { els, leq, lt, lab, cov, pos, rank }
  }, [mode, N, Mx])
  const { els, leq, lt, lab, cov, pos } = poset
  const toggleSel = x => setSel(s => (s.includes(x) ? s.filter(y => y !== x) : [...s, x].slice(-2)))
  const mins = els.filter(x => !els.some(y => lt(y, x))), maxs = els.filter(x => !els.some(y => lt(x, y)))
  const least = els.find(x => els.every(y => leq(x, y))), greatest = els.find(x => els.every(y => leq(y, x)))
  const ub = sel.length ? els.filter(x => sel.every(s => leq(s, x))) : [], lb = sel.length ? els.filter(x => sel.every(s => leq(x, s))) : []
  const sup = ub.find(x => ub.every(y => leq(x, y))), inf = lb.find(x => lb.every(y => leq(y, x)))
  const L = v => '{' + v.map(lab).join(', ') + '}'
  return (
    <Split plot={
      <svg viewBox="0 0 400 320" className="plot" role="img">
        {cov.map(([x, y], k) => <line key={k} x1={pos[x][0]} y1={pos[x][1]} x2={pos[y][0]} y2={pos[y][1]} style={{ stroke: 'var(--muted)', strokeWidth: 1.8 }} />)}
        {els.map(x => (
          <g key={x} onClick={() => toggleSel(x)} style={{ cursor: 'pointer' }}>
            <circle cx={pos[x][0]} cy={pos[x][1]} r={mode === 'subset' ? 19 : 16} style={{ fill: sel.includes(x) ? 'var(--accent)' : ub.includes(x) ? 'color-mix(in srgb, var(--c2) 35%, var(--card))' : lb.includes(x) ? 'color-mix(in srgb, var(--c3) 35%, var(--card))' : 'var(--card)', stroke: 'var(--ink)', strokeWidth: 2 }} />
            <text x={pos[x][0]} y={pos[x][1] + 4.5} textAnchor="middle" style={{ fontWeight: 800, fontSize: mode === 'subset' ? 11 : 13, fill: sel.includes(x) ? '#fff' : 'var(--ink)' }}>{lab(x)}</text>
          </g>))}
      </svg>}>
      <Segmented options={[{ v: 'div', l: 'делители $N$' }, { v: 'range', l: 'числа 1…M' }, { v: 'subset', l: 'подмножества {a,b,c}' }]} value={mode} onChange={v => { setMode(v); setSel([]) }} />
      {mode === 'div' && <Segmented options={[12, 30, 36, 60]} value={N} onChange={v => { setN(v); setSel([]) }} />}
      {mode === 'range' && <Slider label="Числа от 1 до $M$" value={Mx} min={4} max={16} step={1} onChange={v => { setMx(v); setSel([]) }} />}
      <Note>Выберите один или два элемента (нажмите на кружок): появятся верхние (жёлтые) и нижние (зелёные) границы.</Note>
      <div className="readout">
        <div>Минимальные: <b>{L(mins)}</b> · Максимальные: <b>{L(maxs)}</b></div>
        <div>Наименьший: <b>{least !== undefined ? lab(least) : 'нет'}</b> · Наибольший: <b>{greatest !== undefined ? lab(greatest) : 'нет'}</b></div>
        {sel.length > 0 && <>
          <div style={{ marginTop: 6 }}>Выбрано: <b>{L(sel)}</b></div>
          <div>Верхние границы: {L(ub)} → {sup !== undefined ? <b>sup = {lab(sup)}</b> : 'точной верхней границы нет'}</div>
          <div>Нижние границы: {L(lb)} → {inf !== undefined ? <b>inf = {lab(inf)}</b> : 'точной нижней границы нет'}</div>
        </>}
      </div>
      <div className="stats"><Stat label="элементов" value={String(els.length)} /><Stat label="рёбер диаграммы" value={String(cov.length)} /></div>
      <Verdict tone="info">{'В диаграмме Хассе рисуют только «непосредственное следование» (покрытия); остальное восстанавливается подъёмом по рёбрам. Для делимости $\\sup=\\operatorname{lcm}$, $\\inf=\\gcd$.'}</Verdict>
    </Split>
  )
}

/* ============ Диагональный метод Кантора ============ */
export function Cantor({ size: n0 = 6 }) {
  const [n, setN] = useState(n0)
  const init = [[0, 1, 1, 0, 1, 0, 1, 0], [1, 1, 0, 1, 0, 0, 1, 1], [0, 0, 1, 1, 1, 0, 0, 1], [1, 0, 1, 0, 0, 1, 1, 0], [0, 1, 0, 0, 1, 1, 0, 1], [1, 1, 1, 0, 0, 0, 1, 0], [0, 0, 1, 1, 0, 1, 0, 1], [1, 0, 0, 1, 1, 0, 1, 1]]
  const [M, setM] = useState(init)
  const R = [...Array(n).keys()]
  const diag = R.map(i => M[i][i])
  const y = diag.map(d => 1 - d)
  const tog = (i, j) => setM(m => m.map((r, a) => r.map((v, b) => (a === i && b === j ? 1 - v : v))))
  return (
    <div className="lab-split">
      <div>
        <Note>Список «всех» бесконечных 0–1-последовательностей (показаны первые {n}×{n} цифр). Нажимайте цифры, меняйте любые элементы списка.</Note>
        <table style={{ borderCollapse: 'separate', borderSpacing: 3, margin: '8px 0' }}>
          <tbody>
            {R.map(i => <tr key={i}><th className="muted small" style={{ textAlign: 'right', paddingRight: 6 }}>x<sub>{i + 1}</sub></th>{R.map(j => <td key={j}><button onClick={() => tog(i, j)} style={{ width: 34, height: 32, borderRadius: 7, border: i === j ? '2px solid var(--c4)' : '1px solid var(--line)', background: i === j ? 'color-mix(in srgb, var(--c4) 16%, var(--card))' : 'var(--card2)', fontWeight: 800, cursor: 'pointer', color: 'var(--ink)' }}>{M[i][j]}</button></td>)}<td className="muted small">…</td></tr>)}
            <tr><th style={{ textAlign: 'right', paddingRight: 6, color: 'var(--c3)' }}>y</th>{R.map(j => <td key={j} style={{ textAlign: 'center', fontWeight: 800, color: 'var(--c3)', background: 'color-mix(in srgb, var(--c3) 16%, var(--card))', borderRadius: 7 }}>{y[j]}</td>)}<td className="muted small">…</td></tr>
          </tbody>
        </table>
      </div>
      <div className="controls">
        <Slider label="Показывать цифр" value={n} min={3} max={8} step={1} onChange={setN} />
        <Readout>{`Диагональ: $${diag.join('')}\\dots$; новая последовательность $y$ (все цифры диагонали заменены на противоположные): $${y.join('')}\\dots$`}</Readout>
        <Verdict tone="good">{`$y$ отличается от $x_i$ в $i$-м месте для каждого $i=1,\\dots,${n}$ (красные клетки диагонали и зелёные цифры $y$ противоположны). Значит, $y$ нет в списке — и так для ЛЮБОГО списка.`}</Verdict>
        <Verdict tone="info">{'Следовательно, множество бесконечных 0–1-последовательностей (а с ним $\\mathcal P(\\mathbb N)$ и $\\mathbb R$) **несчётно**: пересчитать его в список невозможно.'}</Verdict>
      </div>
    </div>
  )
}

/* ============ Счётность Q: обход сетки p/q ============ */
export function Zigzag() {
  const [N, setN] = useState(20)
  const K = 8
  const order = []
  for (let s = 2; s <= 2 * K; s++) { const cells = []; for (let p = 1; p < s; p++) cells.push([p, s - p]); if (s % 2 === 0) cells.reverse(); order.push(...cells.filter(([p, q]) => p <= K && q <= K)) }
  const seen = new Set(), steps = []
  order.forEach(([p, q]) => { const g = gcd(p, q); const key = `${p / g}/${q / g}`; const dup = seen.has(key); if (!dup) seen.add(key); steps.push({ p, q, dup, key }) })
  const shown = steps.slice(0, N)
  const nums = {}
  let c = 0
  const idx = {}
  steps.forEach((s, i) => { if (!s.dup) { c++; idx[`${s.p},${s.q}`] = c } })
  const list = shown.filter(s => !s.dup).map(s => s.key)
  return (
    <Split plot={
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 3 }}>
          <thead><tr><th className="muted small">p\q</th>{[...Array(K).keys()].map(q => <th key={q} className="muted small">{q + 1}</th>)}</tr></thead>
          <tbody>{[...Array(K).keys()].map(p => <tr key={p}><th className="muted small">{p + 1}</th>{[...Array(K).keys()].map(q => {
            const i = shown.findIndex(s => s.p === p + 1 && s.q === q + 1)
            const s = i >= 0 ? shown[i] : null
            return <td key={q} style={{ width: 44, height: 36, textAlign: 'center', borderRadius: 8, fontSize: '.82rem', fontWeight: 700, background: !s ? 'var(--card2)' : s.dup ? 'color-mix(in srgb, var(--bad) 14%, var(--card))' : 'color-mix(in srgb, var(--good) 26%, var(--card))', color: s && s.dup ? 'var(--muted)' : 'var(--ink)', textDecoration: s && s.dup ? 'line-through' : 'none' }}>{p + 1}/{q + 1}{s && !s.dup && <sub> №{idx[`${p + 1},${q + 1}`]}</sub>}</td>
          })}</tr>)}</tbody>
        </table>
      </div>}>
      <Slider label="Сколько клеток уже обошли" value={N} min={1} max={steps.length} step={1} onChange={setN} />
      <Readout>{`Обход по диагоналям (змейкой). Зелёные — новые числа, перечёркнутые — повторы (например $\\frac24=\\frac12$) пропускаем.\n\nНомера получили: ${list.length} различных дробей. Список: ${list.slice(0, 18).join(', ')}${list.length > 18 ? ', …' : ''}`}</Readout>
      <Verdict tone="good">{'Каждая положительная дробь рано или поздно получает свой номер ⇒ $\\mathbb Q_{>0}$ пересчитано, $|\\mathbb Q|=\\aleph_0$. Для всего $\\mathbb Q$ добавляем нуль и отрицательные (чередуя знаки).'}</Verdict>
    </Split>
  )
}

/* ============ Отель Гильберта ============ */
export function Hotel() {
  const [mode, setMode] = useState('k')
  const [k, setK] = useState(2)
  const rooms = 14
  const dest = x => (mode === 'k' ? x + k : 2 * x)
  const W = 400 / rooms
  return (
    <Split plot={
      <svg viewBox="0 0 400 190" className="plot" role="img">
        <text x="8" y="16" style={{ fill: 'var(--muted)', fontSize: 12 }}>до: гость n живёт в комнате n</text>
        {[...Array(rooms).keys()].map(i => <g key={i}><rect x={i * W + 2} y="22" width={W - 4} height="32" rx="6" style={{ fill: 'color-mix(in srgb, var(--c1) 22%, var(--card))', stroke: 'var(--c1)', strokeWidth: 1.5 }} /><text x={i * W + W / 2} y="43" textAnchor="middle" style={{ fontWeight: 800, fontSize: 12, fill: 'var(--ink)' }}>{i + 1}</text>
          {dest(i + 1) <= rooms && <line x1={i * W + W / 2} y1="56" x2={(dest(i + 1) - 1) * W + W / 2} y2="120" style={{ stroke: 'var(--c2)', strokeWidth: 1.4, opacity: 0.8 }} />}</g>)}
        <text x="8" y="116" style={{ fill: 'var(--muted)', fontSize: 12 }}>после: {mode === 'k' ? `гость n → комната n+${k}` : 'гость n → комната 2n'}</text>
        {[...Array(rooms).keys()].map(j => { const room = j + 1; const g = mode === 'k' ? (room > k ? room - k : null) : (room % 2 === 0 ? room / 2 : null); return <g key={j}><rect x={j * W + 2} y="124" width={W - 4} height="32" rx="6" style={{ fill: g ? 'color-mix(in srgb, var(--c1) 22%, var(--card))' : 'color-mix(in srgb, var(--c3) 32%, var(--card))', stroke: g ? 'var(--c1)' : 'var(--c3)', strokeWidth: 1.5 }} /><text x={j * W + W / 2} y="145" textAnchor="middle" style={{ fontWeight: 800, fontSize: 12, fill: 'var(--ink)' }}>{g || 'new'}</text><text x={j * W + W / 2} y="172" textAnchor="middle" style={{ fontSize: 10, fill: 'var(--muted)' }}>{room}</text></g> })}
      </svg>}>
      <Segmented options={[{ v: 'k', l: 'приехали $k$ гостей' }, { v: 'bus', l: 'бесконечный автобус' }]} value={mode} onChange={setMode} />
      {mode === 'k' && <Slider label="Новых гостей $k$" value={k} min={1} max={6} step={1} onChange={setK} />}
      <Readout>{mode === 'k' ? `Все старые гости сдвигаются: $n\\mapsto n+${k}$. Освободились комнаты $1,\\dots,${k}$ — их получают новые гости. Это биекция $\\mathbb N\\to\\{${k + 1},${k + 2},\\dots\\}$.` : 'Все старые гости переезжают в чётные комнаты: $n\\mapsto2n$. Нечётные комнаты освободились — бесконечно много мест для пассажиров автобуса. Это биекция $\\mathbb N\\to$ чётные числа.'}</Readout>
      <Verdict tone="info">$\aleph_0+k=\aleph_0$ и $\aleph_0+\aleph_0=\aleph_0$: бесконечное множество можно «уместить» в собственную часть — это отличает бесконечные множества от конечных.</Verdict>
    </Split>
  )
}

/* ============ Комбинаторика: четыре схемы выбора ============ */
function enumSel(n, k, ordered, rep) {
  const out = []
  const rec = (cur, start) => {
    if (cur.length === k) { out.push([...cur]); return }
    for (let i = ordered ? 0 : start; i < n; i++) {
      if (!rep && ordered && cur.includes(i)) continue
      cur.push(i); rec(cur, rep ? i : i + 1); cur.pop()
      if (out.length > 5000) return
    }
  }
  rec([], 0)
  return out
}
export function Comb({ n: n0 = 5, k: k0 = 3, ordered: o0 = true, rep: r0 = false }) {
  const [n, setN] = useState(n0), [k, setK] = useState(k0)
  const [ordered, setO] = useState(o0), [rep, setR] = useState(r0)
  let A = 0
  if (k <= n) { A = 1; for (let i = 0; i < k; i++) A *= n - i }
  const vals = { 'oo': Math.pow(n, k), 'on': A, 'uo': binom(n + k - 1, k), 'un': binom(n, k) }
  const key = (ordered ? 'o' : 'u') + (rep ? 'o' : 'n')
  const tex = { oo: `n^k=${n}^{${k}}`, on: `\\frac{n!}{(n-k)!}=${A}`, uo: `\\binom{n+k-1}{k}=\\binom{${n + k - 1}}{${k}}`, un: `\\binom{n}{k}=\\binom{${n}}{${k}}` }
  const show = n <= 6 && k <= 4 ? enumSel(n, k, ordered, rep) : null
  const nm = { oo: 'размещения с повторениями', on: 'размещения без повторений', uo: 'сочетания с повторениями', un: 'сочетания без повторений' }
  return (
    <Split plot={
      <div>
        <table className="rich" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr><th /><th>повторы запрещены</th><th>повторы разрешены</th></tr></thead>
          <tbody>
            {[[true, 'порядок важен'], [false, 'порядок не важен']].map(([o, lab]) => <tr key={lab}><th style={{ textAlign: 'left', padding: 6 }}>{lab}</th>{[false, true].map(r => {
              const kk = (o ? 'o' : 'u') + (r ? 'o' : 'n')
              return <td key={kk} onClick={() => { setO(o); setR(r) }} style={{ cursor: 'pointer', padding: 10, textAlign: 'center', border: '2px solid ' + (kk === key ? 'var(--accent)' : 'var(--line)'), background: kk === key ? 'var(--accent-soft)' : 'transparent' }}><div className="muted small">{nm[kk]}</div><div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{vals[kk].toLocaleString('ru-RU')}</div></td>
            })}</tr>)}
          </tbody>
        </table>
        {show && <div style={{ marginTop: 10 }}>
          <div className="muted small">Все варианты ({show.length}), буквы A, B, C… — виды объектов:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4, maxHeight: 150, overflow: 'auto' }}>
            {show.slice(0, 80).map((s, i) => <code key={i} style={{ padding: '1px 6px' }}>{s.map(x => LET[x]).join('')}</code>)}{show.length > 80 && <span className="muted">… ещё {show.length - 80}</span>}
          </div>
        </div>}
      </div>}>
      <Slider label="Всего видов объектов $n$" value={n} min={1} max={52} step={1} onChange={setN} />
      <Slider label="Сколько выбираем $k$" value={k} min={0} max={16} step={1} onChange={setK} color="var(--c2)" />
      <div className="row"><Toggle label="порядок важен" value={ordered} onChange={setO} /><Toggle label="повторы разрешены" value={rep} onChange={setR} /></div>
      <Readout>{`**${nm[key]}:** $${tex[key]}=${vals[key].toLocaleString('ru-RU')}$`}</Readout>
      <Verdict tone="info">{`Алгоритм: 1) порядок важен? 2) повторы разрешены? — и выбираете одну из четырёх формул. Звёздочки и перегородки: $${k}$ одинаковых предметов в $${n}$ ящиков — $\\binom{${n + k - 1}}{${n - 1}}=${binom(n + k - 1, n - 1)}$.`}</Verdict>
    </Split>
  )
}

/* ============ Треугольник Паскаля и бином ============ */
export function Pascal({ n: n0 = 6, k: k0 = 2, a: a0 = 2, b: b0 = -1 }) {
  const [n, setN] = useState(n0), [k, setK] = useState(k0), [a, setA] = useState(a0), [b, setB] = useState(b0)
  const kk = Math.min(k, n)
  const rows = [...Array(Math.min(n, 11) + 1).keys()]
  const row = [...Array(n + 1).keys()].map(i => binom(n, i))
  const mx = Math.max(...row)
  const coefs = row.map((c, i) => c * Math.pow(a, n - i) * Math.pow(b, i))
  return (
    <Split plot={
      <div>
        <div style={{ textAlign: 'center', fontFamily: 'ui-monospace, monospace' }}>
          {rows.map(r => <div key={r} style={{ opacity: r === n ? 1 : 0.5, fontWeight: r === n ? 800 : 500, color: r === n ? 'var(--accent)' : 'var(--ink)', fontSize: '.86rem', lineHeight: 1.5 }}>{[...Array(r + 1).keys()].map(i => <span key={i} style={{ margin: '0 5px', padding: '0 2px', borderRadius: 4, background: r === n && i === kk ? 'var(--accent)' : 'transparent', color: r === n && i === kk ? '#fff' : undefined }}>{binom(r, i)}</span>)}</div>)}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80, marginTop: 10 }}>
          {row.map((c, i) => <div key={i} title={`C(${n},${i})=${c}`} style={{ flex: 1, height: Math.max(4, (c / mx) * 76), background: i === kk ? 'var(--accent)' : 'var(--accent-soft)', borderRadius: '4px 4px 0 0' }} />)}
        </div>
        <Note>{'Столбики — значения $\\binom{n}{i}$: при подбрасывании монеты $n$ раз столько способов выпасть орлу $i$ раз (колокол распределения).'}</Note>
      </div>}>
      <Slider label="Номер строки $n$" value={n} min={0} max={14} step={1} onChange={setN} />
      <Slider label="Позиция $k$" value={kk} min={0} max={n} step={1} onChange={setK} color="var(--c2)" />
      <div className="stats">
        <Stat label={`C(${n},${kk})`} value={String(binom(n, kk))} tone="good" /><Stat label="сумма строки" value={String(2 ** n)} sub={`2^${n}`} />
        <Stat label="вероятность k орлов" value={f4(binom(n, kk) / 2 ** n, 4)} sub="монета, n бросков" />
      </div>
      <Readout>{`Свойства: $\\binom{n}{k}=\\binom{n-1}{k-1}+\\binom{n-1}{k}$, $\\sum_k\\binom nk=2^n$, $\\sum_k(-1)^k\\binom nk=0$ (при $n\\ge1$).\n\n$(ax+by)^{${n}}$: коэффициент при $x^{${n - kk}}y^{${kk}}$ равен $\\binom{${n}}{${kk}}a^{${n - kk}}b^{${kk}}=${coefs[kk]}$ при $a=${a}$, $b=${b}$.`}</Readout>
      <Slider label="$a$ в $(ax+by)^n$" value={a} min={-3} max={4} step={1} onChange={setA} color="var(--c5)" />
      <Slider label="$b$ в $(ax+by)^n$" value={b} min={-3} max={4} step={1} onChange={setB} color="var(--c5)" />
    </Split>
  )
}

/* ============ Принцип Дирихле ============ */
export function Pigeon({ m: m0 = 7, n: n0 = 3 }) {
  const [m, setM] = useState(m0), [n, setN] = useState(n0), [seed, setSeed] = useState(1)
  const rnd = i => { const x = Math.sin(seed * 9301 + i * 49297) * 233280; return x - Math.floor(x) }
  const [mode, setMode] = useState('even')
  const hole = i => (mode === 'even' ? i % n : Math.floor(rnd(i) * n))
  const cnt = Array(n).fill(0)
  for (let i = 0; i < m; i++) cnt[hole(i)]++
  const guar = Math.ceil(m / n)
  return (
    <Split plot={
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(n, 5)}, 1fr)`, gap: 8 }}>
        {cnt.map((c, j) => <div key={j} style={{ border: '2px solid ' + (c >= guar ? 'var(--c4)' : 'var(--line)'), borderRadius: 12, padding: 8, minHeight: 90, background: c >= guar ? 'color-mix(in srgb, var(--c4) 8%, var(--card))' : 'var(--card2)' }}>
          <div className="muted small">ящик {j + 1}: <b>{c}</b></div><div style={{ fontSize: '1.15rem', lineHeight: 1.1 }}>{'🕊'.repeat(c)}</div></div>)}
      </div>}>
      <Slider label="Голубей (предметов) $m$" value={m} min={1} max={30} step={1} onChange={setM} />
      <Slider label="Клеток (ящиков) $n$" value={n} min={1} max={10} step={1} onChange={setN} color="var(--c2)" />
      <div className="row"><Segmented options={[{ v: 'even', l: 'равномерно (худший случай)' }, { v: 'rand', l: 'случайно' }]} value={mode} onChange={setMode} />{mode === 'rand' && <button className="btn tiny" onClick={() => setSeed(s => s + 1)}>🎲 перемешать</button>}</div>
      <div className="stats"><Stat label="гарантия ⌈m/n⌉" value={String(guar)} tone="good" sub="в какой-то клетке не меньше" /><Stat label="максимум сейчас" value={String(Math.max(...cnt))} /></div>
      <Verdict tone="good">{`При $m=${m}$, $n=${n}$ в какой-то клетке окажется не менее $\\lceil ${m}/${n}\\rceil=${guar}$ предметов — как бы вы их ни раскладывали. Чтобы гарантировать $k$ одинаковых при $n$ видах, нужно $n(k-1)+1=${n * (guar - 1) + 1}$ (для $k=${guar}$).`}</Verdict>
    </Split>
  )
}

/* ============ Беспорядки ============ */
const D = n => { let a = 1, b = 0; if (n === 0) return 1; for (let i = 2; i <= n; i++) [a, b] = [b, (i - 1) * (a + b)]; return n === 1 ? 0 : b }
export function Derange({ n: n0 = 5 }) {
  const [n, setN] = useState(n0)
  const Dn = D(n)
  const terms = [...Array(n + 1).keys()].map(i => ((i % 2 ? -1 : 1) * fact(n)) / fact(i))
  const perms = []
  if (n <= 4) { const gen = (cur, rest) => { if (!rest.length) { if (cur.every((x, i) => x !== i + 1)) perms.push([...cur]); return } rest.forEach((x, i) => gen([...cur, x], rest.filter((_, j) => j !== i))) }; gen([], [...Array(n).keys()].map(i => i + 1)) }
  return (
    <Split plot={
      <div>
        <table className="rich" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr><th>n</th><th>n!</th><th>Dₙ</th><th>Dₙ / n!</th></tr></thead>
          <tbody>{[...Array(10).keys()].map(i => i + 1).map(i => <tr key={i} style={{ background: i === n ? 'var(--accent-soft)' : undefined, fontWeight: i === n ? 800 : 400 }}><td>{i}</td><td>{fact(i).toLocaleString('ru-RU')}</td><td>{D(i).toLocaleString('ru-RU')}</td><td>{f4(D(i) / fact(i), 5)}</td></tr>)}</tbody>
        </table>
        <Note>{'Предел отношения — $\\frac1e\\approx0{,}36788$: доля «тайных Сант», где никто не вытянул себя, почти не зависит от размера группы.'}</Note>
      </div>}>
      <Slider label="Участников обмена подарками $n$" value={n} min={1} max={10} step={1} onChange={setN} />
      <div className="stats"><Stat label={`D_${n}`} value={Dn.toLocaleString('ru-RU')} tone="good" sub="перестановок без неподвижных точек" /><Stat label="n!" value={fact(n).toLocaleString('ru-RU')} /><Stat label="доля" value={f4(Dn / fact(n), 5)} sub="→ 1/e ≈ 0,36788" /></div>
      <Readout>{`$D_n=n!\\sum_{i=0}^n\\frac{(-1)^i}{i!}$: слагаемые для $n=${n}$: ${terms.map(t => (t >= 0 ? '+' : '') + t).join(' ')} $=${Dn}$.\n\nРекуррентно: $D_n=(n-1)(D_{n-1}+D_{n-2})$.`}</Readout>
      {n <= 4 && <Readout>{`Все беспорядки для $n=${n}$ (${perms.length}): ${perms.map(p => p.join('')).join(', ') || '—'}`}</Readout>}
    </Split>
  )
}

/* ============ Функция Эйлера ============ */
function primeFactors(n) { const f = []; let x = n; for (let p = 2; p * p <= x; p++) if (x % p === 0) { f.push(p); while (x % p === 0) x /= p } if (x > 1) f.push(x); return f }
export function Phi({ n: n0 = 30 }) {
  const [n, setN] = useState(n0)
  const ps = primeFactors(n)
  const phi = ps.reduce((v, p) => (v / p) * (p - 1), n)
  const cop = [...Array(n).keys()].map(i => i + 1).filter(x => gcd(x, n) === 1)
  return (
    <Split plot={
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {[...Array(n).keys()].map(i => i + 1).map(x => { const ok = gcd(x, n) === 1; return <span key={x} title={`НОД(${x},${n})=${gcd(x, n)}`} style={{ width: 30, textAlign: 'center', borderRadius: 6, padding: '3px 0', fontSize: '.82rem', fontWeight: 700, background: ok ? 'color-mix(in srgb, var(--good) 26%, var(--card))' : 'var(--card2)', color: ok ? 'var(--ink)' : 'var(--muted)', textDecoration: ok ? 'none' : 'line-through' }}>{x}</span> })}
      </div>}>
      <Slider label="Число $n$" value={n} min={2} max={90} step={1} onChange={setN} />
      <div className="stats"><Stat label={`φ(${n})`} value={String(phi)} tone="good" sub="чисел, взаимно простых с n" /><Stat label="простые делители" value={ps.join(', ')} /></div>
      <Readout>{`Включение–исключение: из $n=${n}$ вычитаем кратные каждому простому делителю: $\\varphi(n)=n${ps.map(p => `-\\frac{n}{${p}}`).join('')}${ps.length >= 2 ? '+\\dots' : ''}=n\\prod_{p\\mid n}\\left(1-\\frac1p\\right)=${n}${ps.map(p => `\\cdot\\frac{${p - 1}}{${p}}`).join('')}=${phi}$.\n\nВзаимно простые с $${n}$: ${cop.join(', ')}.`}</Readout>
    </Split>
  )
}

/* ============ Линейные рекуррентности второго порядка ============ */
const REC_PRE = { 'Фибоначчи': [1, 1, 0, 1], 'aₙ=5aₙ₋₁−6aₙ₋₂': [5, -6, 1, 4], 'aₙ=aₙ₋₁+2aₙ₋₂': [1, 2, 0, 3], 'aₙ=4aₙ₋₁−4aₙ₋₂': [4, -4, 1, 0], 'колебания': [1, -1, 1, 2] }
export function Recur({ c1: a1_ = 1, c2: a2_ = 1, c3: a3_ = 0, a0: s0 = 0, a1: s1 = 1, a2: s2 = 1, order = 2 }) {
  const [c1, setC1] = useState(a1_), [c2, setC2] = useState(a2_), [c3, setC3] = useState(a3_), [x0, setX0] = useState(s0), [x1, setX1] = useState(s1), [x2, setX2] = useState(s2)
  const N = 14
  const seq = order === 3 ? [x0, x1, x2] : [x0, x1]
  for (let i = seq.length; i <= N; i++) seq.push(c1 * seq[i - 1] + c2 * seq[i - 2] + (order === 3 ? c3 * seq[i - 3] : 0))
  const disc = c1 * c1 + 4 * c2
  let closed = ''
  if (order === 3) closed = `Порядок 3: $a_n=${f4(c1, 3)}a_{n-1}+${f4(c2, 3)}a_{n-2}+${f4(c3, 3)}a_{n-3}$, характеристическое уравнение $r^3=${f4(c1, 3)}r^2+${f4(c2, 3)}r+${f4(c3, 3)}$.`
  else if (disc > 1e-9) {
    const r1 = (c1 + Math.sqrt(disc)) / 2, r2 = (c1 - Math.sqrt(disc)) / 2
    const B = (x1 - r1 * x0) / (r2 - r1), A = x0 - B
    closed = `$a_n=A\\,r_1^n+B\\,r_2^n$, $r_{1,2}=${f4(r1, 4)};\\ ${f4(r2, 4)}$, $A=${f4(A, 4)}$, $B=${f4(B, 4)}$`
  } else if (Math.abs(disc) <= 1e-9) {
    const r = c1 / 2, A = x0, B = (x1 - r * x0) / r
    closed = Math.abs(r) > 1e-9 ? `кратный корень $r=${f4(r, 4)}$: $a_n=(A+Bn)r^n$, $A=${f4(A, 4)}$, $B=${f4(B, 4)}$` : ''
  } else closed = `комплексные корни: $|r|=\\sqrt{-c_2}=${f4(Math.sqrt(-c2), 4)}$ — колебания; $a_n=|r|^n(C\\cos n\\theta+D\\sin n\\theta)$`
  const mx = Math.max(...seq.map(Math.abs), 1)
  const bw = 400 / (N + 1)
  return (
    <Split plot={
      <svg viewBox="0 0 400 240" className="plot" role="img">
        <line x1="0" y1="120" x2="400" y2="120" style={{ stroke: 'var(--muted)', strokeWidth: 1.2 }} />
        {seq.map((v, i) => { const h = Math.max(2, (Math.abs(v) / mx) * 105); return <g key={i}><rect x={i * bw + 3} y={v >= 0 ? 120 - h : 120} width={bw - 6} height={h} style={{ fill: v >= 0 ? 'var(--c1)' : 'var(--c4)', opacity: 0.85 }} /><text x={i * bw + bw / 2} y="236" textAnchor="middle" style={{ fontSize: 9, fill: 'var(--muted)' }}>{i}</text></g> })}
      </svg>}>
      <div><div className="muted small" style={{ marginBottom: 4 }}>Примеры из задачника</div><Segmented options={Object.keys(REC_PRE).map(k => ({ v: k, l: k }))} value={''} onChange={k => { const [a, b, c, d] = REC_PRE[k]; setC1(a); setC2(b); setX0(c); setX1(d) }} /></div>
      {order !== 3 && <Readout>{`$a_n=${f4(c1, 3)}\\,a_{n-1}${c2 < 0 ? '-' : '+'}${f4(Math.abs(c2), 3)}\\,a_{n-2}$, $a_0=${x0}$, $a_1=${x1}$\n\nХарактеристическое уравнение: $r^2=${f4(c1, 3)}r${c2 < 0 ? '-' : '+'}${f4(Math.abs(c2), 3)}$, $D=${f4(disc, 4)}$`}</Readout>}
      <Slider label="$c_1$ (коэффициент при $a_{n-1}$)" value={c1} min={-5} max={6} step={1} onChange={setC1} />
      <Slider label="$c_2$ (коэффициент при $a_{n-2}$)" value={c2} min={-6} max={6} step={1} onChange={setC2} color="var(--c2)" />
      {order === 3 && <Slider label="$c_3$ (коэффициент при $a_{n-3}$)" value={c3} min={-3} max={3} step={1} onChange={setC3} color="var(--c4)" />}
      <Slider label="$a_0$" value={x0} min={-3} max={5} step={1} onChange={setX0} color="var(--c5)" />
      <Slider label="$a_1$" value={x1} min={-3} max={5} step={1} onChange={setX1} color="var(--c5)" />
      {order === 3 && <Slider label="$a_2$" value={x2} min={-3} max={5} step={1} onChange={setX2} color="var(--c5)" />}
      <Readout>{closed}</Readout>
      <div className="small muted">Члены: {seq.slice(0, 12).map(v => f4(v, 5)).join(', ')}, …</div>
    </Split>
  )
}

/* ============ Кредит: рекуррентность 1-го порядка ============ */
export function Loan() {
  const [P, setP] = useState(500000), [r, setR] = useState(4), [pay, setPay] = useState(3000)
  const i = r / 1200
  const bal = [P]
  for (let k = 1; k <= 360 && bal[bal.length - 1] > 0; k++) bal.push(Math.max(0, bal[k - 1] * (1 + i) - pay))
  const months = bal.length - 1
  const grows = pay <= P * i
  const total = pay * (months - 1) + Math.min(pay, bal[months - 1] * (1 + i))
  const Nn = Math.min(bal.length, 120)
  const mx = Math.max(...bal.slice(0, Nn), P)
  return (
    <Split plot={
      <svg viewBox="0 0 400 220" className="plot" role="img">
        <polyline points={bal.slice(0, Nn).map((b, k) => `${(k / Math.max(Nn - 1, 1)) * 380 + 10},${200 - (b / mx) * 180}`).join(' ')} style={{ fill: 'none', stroke: 'var(--c1)', strokeWidth: 3 }} />
        <line x1="10" y1="200" x2="390" y2="200" style={{ stroke: 'var(--muted)' }} />
        <text x="390" y="215" textAnchor="end" style={{ fill: 'var(--muted)', fontSize: 11 }}>месяцы (до {Nn - 1})</text><text x="14" y="16" style={{ fill: 'var(--muted)', fontSize: 11 }}>остаток долга, ₪</text>
      </svg>}>
      <Slider label="Сумма кредита $a_0$, ₪" value={P} min={50000} max={1000000} step={10000} onChange={setP} fmt={v => v.toLocaleString('ru-RU')} />
      <Slider label="Годовая ставка, %" value={r} min={0.5} max={12} step={0.5} onChange={setR} color="var(--c2)" />
      <Slider label="Ежемесячный платёж $p$, ₪" value={pay} min={500} max={10000} step={100} onChange={setPay} color="var(--c3)" fmt={v => v.toLocaleString('ru-RU')} />
      <Readout>{`Модель: $a_n=(1+i)\\,a_{n-1}-p$, $i=\\frac{${r}}{1200}=${f4(i, 5)}$ в месяц. Замкнутая форма: $a_n=a_0(1+i)^n-p\\,\\frac{(1+i)^n-1}{i}$.`}</Readout>
      {grows ? <Verdict tone="bad">Платёж меньше ежемесячных процентов ({Math.round(P * i)} ₪): долг растёт, кредит никогда не будет погашен.</Verdict> : (
        <div className="stats"><Stat label="срок" value={`${Math.floor(months / 12)} г ${months % 12} мес`} tone="good" /><Stat label="выплачено всего" value={Math.round(total).toLocaleString('ru-RU') + ' ₪'} /><Stat label="переплата" value={Math.round(total - P).toLocaleString('ru-RU') + ' ₪'} tone="warn" /></div>
      )}
    </Split>
  )
}

/* ============ Ханойская башня ============ */
export function Hanoi() {
  const [n, setN] = useState(5)
  const moves = Math.pow(2, n) - 1
  const t = moves
  const human = s => s < 60 ? `${s} с` : s < 3600 ? `${(s / 60).toFixed(1)} мин` : s < 86400 ? `${(s / 3600).toFixed(1)} ч` : s < 31557600 ? `${(s / 86400).toFixed(1)} суток` : s < 31557600 * 1e6 ? `${(s / 31557600).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} лет` : `${(s / 31557600 / 1e9).toFixed(1)} млрд лет`
  const nd = Math.min(n, 8)
  return (
    <Split plot={
      <svg viewBox="0 0 400 190" className="plot" role="img">
        {[0, 1, 2].map(p => <g key={p}><rect x={66 + p * 134} y="40" width="6" height="130" style={{ fill: 'var(--muted)' }} /></g>)}
        <rect x="20" y="168" width="360" height="6" rx="3" style={{ fill: 'var(--muted)' }} />
        {[...Array(nd).keys()].map(i => { const w = 24 + (nd - 1 - i) * (80 / nd) * 1.0 + 20; const y = 168 - (nd - i) * (120 / Math.max(nd, 4)); return <rect key={i} x={69 - w / 2} y={y} width={w} height={120 / Math.max(nd, 4) - 2} rx="4" style={{ fill: COLORS[i % 6], opacity: 0.9 }} /> })}
        <text x="69" y="30" textAnchor="middle" style={{ fill: 'var(--muted)', fontSize: 12 }}>A</text><text x="203" y="30" textAnchor="middle" style={{ fill: 'var(--muted)', fontSize: 12 }}>B</text><text x="337" y="30" textAnchor="middle" style={{ fill: 'var(--muted)', fontSize: 12 }}>C</text>
      </svg>}>
      <Slider label="Число дисков $n$" value={n} min={1} max={64} step={1} onChange={setN} />
      <div className="stats"><Stat label="ходов" value={moves.toLocaleString('ru-RU')} tone="good" sub="2ⁿ − 1" /><Stat label="по ходу в секунду" value={human(t)} tone={t > 3.15e7 ? 'bad' : ''} /></div>
      <Readout>{`$h_n=2h_{n-1}+1$, $h_1=1$ ⇒ $h_n=2^n-1$. Идея: перенести $n-1$ дисков на запасной стержень ($h_{n-1}$), самый большой — на место (1), снова $n-1$ дисков сверху ($h_{n-1}$).\n\nПри $n=64$: $2^{64}-1\\approx1{,}8\\cdot10^{19}$ ходов — около 585 млрд лет.`}</Readout>
      <Verdict tone="info">Каждый новый диск удваивает работу: экспоненциальный рост — главный враг «переборных» алгоритмов.</Verdict>
    </Split>
  )
}

/* ============ Графы: степени, связность, Эйлер, деревья ============ */
const GR_PRE = {
  'K4': [4, [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]]], 'цикл C5': [5, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]]], 'K3,3': [6, [[0, 3], [0, 4], [0, 5], [1, 3], [1, 4], [1, 5], [2, 3], [2, 4], [2, 5]]],
  'путь P5': [5, [[0, 1], [1, 2], [2, 3], [3, 4]]], 'звезда': [6, [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5]]], 'два треугольника': [6, [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3]]], 'K2,3': [5, [[0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [1, 4]]], 'колесо W5': [6, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [5, 0], [5, 1], [5, 2], [5, 3], [5, 4]]],
}
export function GraphLab({ preset: p0 = 'K4' }) {
  const [n, setN] = useState(GR_PRE[p0][0])
  const mk = (pairs) => { const M = Array.from({ length: 8 }, () => Array(8).fill(false)); pairs.forEach(([a, b]) => { M[a][b] = true; M[b][a] = true }); return M }
  const [M, setM] = useState(() => mk(GR_PRE[p0][1]))
  const [first, setFirst] = useState(null)
  const R = [...Array(n).keys()]
  const deg = R.map(i => R.filter(j => j !== i && M[i][j]).length)
  const m = deg.reduce((a, b) => a + b, 0) / 2
  const comp = Array(n).fill(-1); let cc = 0
  R.forEach(s => { if (comp[s] < 0) { const st = [s]; comp[s] = cc; while (st.length) { const v = st.pop(); R.forEach(u => { if (M[v][u] && comp[u] < 0) { comp[u] = cc; st.push(u) } }) } cc++ } })
  const col = Array(n).fill(-1); let bip = true
  R.forEach(s => { if (col[s] < 0) { col[s] = 0; const q = [s]; while (q.length) { const v = q.shift(); R.forEach(u => { if (M[v][u]) { if (col[u] < 0) { col[u] = 1 - col[v]; q.push(u) } else if (col[u] === col[v]) bip = false } }) } } })
  const odd = deg.filter(d => d % 2).length
  const nonIso = R.filter(i => deg[i] > 0)
  const compsNI = new Set(nonIso.map(i => comp[i])).size
  const eulerOK = compsNI <= 1
  const tree = cc === 1 && m === n - 1
  const hasCycle = m > n - cc
  const pos = i => { const a = (2 * Math.PI * i) / n - Math.PI / 2; return [200 + 105 * Math.cos(a), 155 + 105 * Math.sin(a)] }
  const click = i => { if (first === null) setFirst(i); else { if (first !== i) setM(mm => mm.map((r, a) => r.map((v, b) => ((a === first && b === i) || (a === i && b === first) ? !v : v)))); setFirst(null) } }
  const edges = []; R.forEach(i => R.forEach(j => { if (j > i && M[i][j]) edges.push([i, j]) }))
  const P = (ok, txt, neutral) => <div style={{ color: neutral ? 'var(--muted)' : ok ? 'var(--good)' : 'var(--bad)', fontWeight: 700 }}>{ok ? '✓' : '✗'} {inline(txt, 'gp')}</div>
  return (
    <Split plot={
      <svg viewBox="0 0 400 300" className="plot" role="img">
        {edges.map(([i, j], k) => <line key={k} x1={pos(i)[0]} y1={pos(i)[1]} x2={pos(j)[0]} y2={pos(j)[1]} style={{ stroke: 'var(--c1)', strokeWidth: 2.4 }} />)}
        {R.map(i => <g key={i} onClick={() => click(i)} style={{ cursor: 'pointer' }}>
          <circle cx={pos(i)[0]} cy={pos(i)[1]} r="19" style={{ fill: first === i ? 'var(--accent)' : bip && m > 0 ? (col[i] ? 'color-mix(in srgb, var(--c2) 35%, var(--card))' : 'color-mix(in srgb, var(--c1) 30%, var(--card))') : 'var(--card)', stroke: 'var(--ink)', strokeWidth: 2 }} />
          <text x={pos(i)[0]} y={pos(i)[1] + 5} textAnchor="middle" style={{ fontWeight: 800, fill: first === i ? '#fff' : 'var(--ink)' }}>{i + 1}</text>
          <text x={pos(i)[0] + (pos(i)[0] - 200) * 0.34} y={pos(i)[1] + (pos(i)[1] - 155) * 0.34 + 4} textAnchor="middle" style={{ fill: 'var(--c4)', fontWeight: 800, fontSize: 12 }}>d={deg[i]}</text>
        </g>)}
      </svg>}>
      <div className="row"><span className="muted small">Вершин:</span><Segmented options={[3, 4, 5, 6, 7, 8]} value={n} onChange={setN} /></div>
      <div className="row">{Object.keys(GR_PRE).map(k => <button key={k} className="btn tiny" onClick={() => { setN(GR_PRE[k][0]); setM(mk(GR_PRE[k][1])); setFirst(null) }}>{k}</button>)}</div>
      <Note>Нажмите вершину, затем другую — ребро добавится или удалится. d — степень вершины.</Note>
      <div className="stats"><Stat label="вершин n" value={String(n)} /><Stat label="рёбер m" value={String(m)} /><Stat label="Σ степеней" value={String(2 * m)} sub="= 2m (лемма о рукопожатиях)" tone="good" /><Stat label="компонент связности" value={String(cc)} /></div>
      <div className="readout">
        {P(cc === 1, `связный (компонент: ${cc})`)}{P(bip, 'двудольный (вершины красятся в 2 цвета; нет нечётных циклов)')}
        {P(eulerOK && odd === 0 && m > 0, `эйлеров цикл (все степени чётные: нечётных вершин ${odd})`)}{P(eulerOK && odd === 2, 'эйлерова цепь (ровно две нечётные вершины)')}
        {P(tree, 'дерево (связный и $m=n-1$)')}{P(!hasCycle, 'нет циклов (лес)')}
      </div>
    </Split>
  )
}

export default { hasse: Hasse, cantor: Cantor, zigzag: Zigzag, hotel: Hotel, comb: Comb, pascal: Pascal, pigeon: Pigeon, derange: Derange, phi: Phi, recur: Recur, loan: Loan, hanoi: Hanoi, graph: GraphLab }
