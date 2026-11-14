import React, { useState } from 'react'
import { Plot, Curve, Dots, HLine, VLine, Band, Pt, Seg, Rect, Label, Param } from '../lib/plot.jsx'
import { Slider, Toggle, Segmented, Stat } from '../lib/ui.jsx'
import { M } from '../lib/rich.jsx'
import { useVals } from '../lib/usep.jsx'
import { fn, evalNum, D, D2, roots, yRange } from '../lib/expr.js'
import { Split, Verdict, Readout, f4, tn } from './common.jsx'

/* ============ Последовательность с полосой ε вокруг предела ============ */
export function Seq({ expr, params = {}, L = null, nmax = 40, eps = { val: 0.25, min: 0.02, max: 1, step: 0.01 }, start = 1, wins = [20, 40, 100, 300], tex }) {
  const [v, sliders] = useVals(params)
  const [e, setE] = useState(eps.val)
  const [win, setWin] = useState(nmax)
  const f = fn(expr, 'n', v)
  const pts = []
  for (let n = start; n <= win; n++) pts.push([n, f(n)])
  const Lv = L == null ? NaN : evalNum(L, v)
  const has = Number.isFinite(Lv)
  let N = null, outside = 0
  if (has) {
    let last = start - 1
    pts.forEach(([n, y]) => { if (!(Math.abs(y - Lv) < e)) { last = n; outside++ } })
    N = last
  }
  const unstable = has && N > win * 0.85
  const ys = pts.map(p => p[1]).filter(Number.isFinite)
  let lo = Math.min(...ys, has ? Lv - e : Infinity), hi = Math.max(...ys, has ? Lv + e : -Infinity)
  if (!Number.isFinite(lo)) { lo = -1; hi = 1 }
  const pad = (hi - lo) * 0.1 || 1
  const inside = (n, y) => has && Math.abs(y - Lv) < e
  const lastY = pts[pts.length - 1][1]
  return (
    <Split plot={
      <Plot xr={[0, win + 1]} yr={[lo - pad, hi + pad]} xlabel="n" ylabel="aₙ" integerX>
        {has && <Band y0={Lv - e} y1={Lv + e} color="var(--c3)" opacity={0.17} />}
        {has && <HLine y={Lv} label={'L = ' + f4(Lv)} color="var(--c3)" />}
        {has && N > 0 && N < win && <VLine x={N + 0.5} color="var(--c2)" label={'N = ' + N} />}
        <Dots pts={pts} r={win > 100 ? 2.5 : 4} colorOf={(x, y) => (!has ? 'var(--c1)' : inside(x, y) ? 'var(--c3)' : 'var(--c2)')} />
      </Plot>}>
      {tex && <Readout>{'$' + tex + '$'}</Readout>}
      {sliders}
      {has && <Slider label="Точность $\varepsilon$ (ширина полосы)" value={e} min={eps.min} max={eps.max} step={eps.step} onChange={setE} color="var(--c3)" />}
      <div><div className="muted small" style={{ marginBottom: 4 }}>Сколько членов показывать</div><Segmented options={wins} value={win} onChange={setWin} /></div>
      <div className="stats">
        <Stat label="предел L" value={has ? f4(Lv) : '—'} />
        {has && <Stat label="N(ε): с него все внутри" value={unstable ? 'не найден' : String(N)} tone={unstable ? 'bad' : 'good'} />}
        {has && <Stat label="вне полосы" value={String(outside)} sub="точек в окне" tone={outside ? 'warn' : 'good'} />}
        <Stat label={`a_${win}`} value={f4(lastY)} />
      </div>
      {has && <Verdict tone={unstable ? 'warn' : 'good'}>{unstable ? 'Точки снаружи полосы встречаются до самого конца окна: либо надо увеличить окно / ε, либо предела $L$ нет' : `Для ε = ${f4(e, 3)} достаточно N = ${N}: все члены после номера ${N} лежат в полосе.`}</Verdict>}
    </Split>
  )
}

/* ============ Паутина: a_{n+1} = f(a_n) ============ */
export function Cobweb({ f: src, params = {}, x0 = 0.5, xr = [0, 2], yr, steps = 8, tex }) {
  const [v, sliders] = useVals(params)
  const [x, setX] = useState(x0)
  const [k, setK] = useState(steps)
  const f = fn(src, 'x', v)
  const seq = [x]
  for (let i = 0; i < 80; i++) seq.push(f(seq[i]))
  const path = [[x, 0]]
  for (let i = 0; i < k; i++) { path.push([seq[i], seq[i + 1]]); path.push([seq[i + 1], seq[i + 1]]) }
  const fixed = roots(t => f(t) - t, xr[0], xr[1])
  const Y = yr || xr
  const slopeAt = p => (f(p + 1e-6) - f(p - 1e-6)) / 2e-6
  return (
    <Split plot={
      <Plot xr={xr} yr={Y} equal={!yr} xlabel="aₙ" ylabel="aₙ₊₁">
        <Curve f={t => t} color="var(--muted)" dash="6 4" width={1.6} />
        <Curve f={f} />
        <Param f={t => path[Math.min(path.length - 1, Math.floor(t))]} from={0} to={path.length - 1} n={path.length - 1} color="var(--c2)" width={1.8} />
        {fixed.map((p, i) => <Pt key={i} x={p} y={p} color="var(--c3)" hollow label={'L≈' + f4(p, 3)} />)}
        <Pt x={x} y={0} color="var(--c2)" r={4} label="a₁" dy={-8} />
        {seq.slice(0, Math.min(k + 1, 12)).map((s, i) => i > 0 && <Pt key={i} x={s} y={s} r={3} color="var(--c2)" />)}
      </Plot>}>
      {tex && <Readout>{'$' + tex + '$'}</Readout>}
      {sliders}
      <Slider label="Старт $a_1$" value={x} min={xr[0]} max={xr[1]} step={0.01} onChange={setX} color="var(--c2)" />
      <Slider label="Число шагов" value={k} min={1} max={30} step={1} onChange={setK} />
      <div className="stats">
        <Stat label={`a_${k + 1}`} value={f4(seq[k])} />
        <Stat label="неподв. точки" value={fixed.length ? fixed.map(p => f4(p, 3)).join('; ') : 'нет'} />
        {fixed.slice(0, 2).map((p, i) => <Stat key={i} label={`|f′| в ${f4(p, 3)}`} value={f4(Math.abs(slopeAt(p)))} tone={Math.abs(slopeAt(p)) < 1 ? 'good' : 'bad'} sub={Math.abs(slopeAt(p)) < 1 ? 'притягивает' : 'отталкивает'} />)}
      </div>
    </Split>
  )
}

/* ============ Преобразования графика y = A·f(B(x−h)) + k ============ */
const BASES = {
  'x²': 'x^2', '|x|': 'abs(x)', 'sin x': 'sin(x)', 'eˣ': 'exp(x)', '1/x': '1/x', '√x': 'sqrt(x)', 'x³−x': 'x^3-x',
}
export function Transform({ base = 'x²' }) {
  const [b, setB] = useState(base)
  const [A, setA] = useState(1), [B, setB2] = useState(1), [h, setH] = useState(0), [k, setK] = useState(0)
  const [abs, setAbs] = useState(false), [absx, setAbsx] = useState(false), [inv, setInv] = useState(false)
  const f0 = fn(BASES[b], 'x')
  const g = x => { let t = absx ? Math.abs(x) : x; let y = A * f0(B * (t - h)) + k; return abs ? Math.abs(y) : y }
  const Lg = x => { const y = f0(x); return y }
  const parity = (() => {
    let ev = true, od = true, n = 0
    for (let t = 0.3; t < 4; t += 0.37) { const p = g(t), q = g(-t); if (!Number.isFinite(p) || !Number.isFinite(q)) continue; n++; if (Math.abs(p - q) > 1e-6) ev = false; if (Math.abs(p + q) > 1e-6) od = false }
    return n < 3 ? 'область определения несимметрична' : ev ? 'чётная' : od ? 'нечётная' : 'ни чётная, ни нечётная'
  })()
  return (
    <Split plot={
      <Plot xr={[-6, 6]} yr={[-6, 6]} equal>
        <Curve f={f0} color="var(--muted)" dash="5 4" width={1.6} />
        {inv ? <Param f={t => [g(t), t]} from={-6} to={6} n={800} color="var(--c4)" /> : <Curve f={g} color="var(--c1)" />}
        {inv && <Curve f={t => t} color="var(--muted)" dash="2 4" width={1} />}
        {inv && <Curve f={g} color="var(--c1)" opacity={0.5} dash="4 3" />}
      </Plot>}>
      <div><div className="muted small" style={{ marginBottom: 4 }}>Базовая функция f</div><Segmented options={Object.keys(BASES)} value={b} onChange={setB} /></div>
      <Slider label="$A$ — растяжение по $y$ (минус = отражение)" value={A} min={-3} max={3} step={0.1} onChange={setA} />
      <Slider label="$B$ — сжатие по $x$" value={B} min={-3} max={3} step={0.1} onChange={setB2} color="var(--c2)" />
      <Slider label="$h$ — сдвиг вправо" value={h} min={-4} max={4} step={0.1} onChange={setH} color="var(--c3)" />
      <Slider label="$k$ — сдвиг вверх" value={k} min={-4} max={4} step={0.1} onChange={setK} color="var(--c5)" />
      <div className="row"><Toggle label="$|f|$ (отразить вниз → вверх)" value={abs} onChange={setAbs} /><Toggle label="$f(|x|)$" value={absx} onChange={setAbsx} /><Toggle label="обратная (зеркало по $y=x$)" value={inv} onChange={setInv} /></div>
      <Readout>{'$y = ' + tn(A, 3) + '\\cdot f\\big(' + tn(B, 3) + '(x' + (h < 0 ? '+' + tn(-h, 3) : '-' + tn(h, 3)) + ')\\big)' + (k < 0 ? tn(k, 3) : '+' + tn(k, 3)) + '$'}</Readout>
      <Verdict tone="info">Получившаяся функция: {parity}</Verdict>
    </Split>
  )
}

/* ============ Универсальный график с зондом, чётностью и областью определения ============ */
function domainText(f, a, b) {
  const seg = []
  let start = null
  const n = 1200
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n
    const ok = Number.isFinite(f(x))
    if (ok && start === null) start = x
    if ((!ok || i === n) && start !== null) { seg.push([start, ok ? x : a + ((b - a) * (i - 1)) / n]); start = null }
  }
  if (!seg.length) return 'нигде в окне'
  const r = x => f4(x, 3)
  return seg.map(([p, q]) => `[${r(p)}; ${r(q)}]`).join(' ∪ ').replace('[' + r(a) + ';', 'от ' + r(a) + ' ;').replace(r(b) + ']', r(b) + ' ')
}
export function FPlot({ f: src, params = {}, xr = [-5, 5], yr, x0 = 1, x0r, tex, parity = true, asym = [] }) {
  const [v, sliders] = useVals(params)
  const [x, setX] = useState(x0)
  const f = fn(src, 'x', v)
  const Y = yr || yRange(f, xr[0], xr[1], 500, 0.15, 60)
  const fx = f(x), fm = f(-x)
  let verdict = null
  if (parity) {
    let ev = true, od = true, n = 0
    const m = Math.min(Math.abs(xr[0]), Math.abs(xr[1]))
    for (let t = 0.13; t < m; t += m / 23) { const p = f(t), q = f(-t); if (!Number.isFinite(p) || !Number.isFinite(q)) continue; n++; if (Math.abs(p - q) > 1e-7 * (1 + Math.abs(p))) ev = false; if (Math.abs(p + q) > 1e-7 * (1 + Math.abs(p))) od = false }
    verdict = n < 4 ? 'область определения несимметрична — чётность не определена' : ev ? 'функция чётная: $f(-x)=f(x)$, график симметричен относительно оси $y$' : od ? 'функция нечётная: $f(-x)=-f(x)$, график симметричен относительно начала' : 'ни чётная, ни нечётная'
  }
  return (
    <Split plot={
      <Plot xr={xr} yr={Y} xlabel="x" ylabel="y">
        {asym.map((a, i) => a.x != null ? <VLine key={i} x={a.x} /> : <HLine key={i} y={a.y} />)}
        <Curve f={f} />
        {Number.isFinite(fx) && <Pt x={x} y={fx} color="var(--c2)" label={`f(${f4(x, 3)}) = ${f4(fx, 3)}`} />}
        {parity && Number.isFinite(fm) && <Pt x={-x} y={fm} color="var(--c4)" hollow label={`f(${f4(-x, 3)}) = ${f4(fm, 3)}`} />}
      </Plot>}>
      {tex && <Readout>{'$' + tex + '$'}</Readout>}
      {sliders}
      <Slider label="Точка $x$" value={x} min={x0r ? x0r[0] : xr[0]} max={x0r ? x0r[1] : xr[1]} step={0.01} onChange={setX} color="var(--c2)" />
      <div className="stats"><Stat label="f(x)" value={f4(fx)} /><Stat label="f(−x)" value={f4(fm)} /></div>
      <Readout>Определена на: <b>{domainText(f, xr[0], xr[1])}</b></Readout>
      {verdict && <Verdict tone="info">{verdict}</Verdict>}
    </Split>
  )
}

/* ============ ε–δ: насколько близко надо подойти к точке ============ */
export function EpsDelta({ f: src, params = {}, a = 2, L, win = 2, eps = { val: 0.5, min: 0.02, max: 2, step: 0.01 }, tex, hole = false }) {
  const [v, sliders] = useVals(params)
  const [e, setE] = useState(eps.val)
  const f = fn(src, 'x', v)
  const Lv = evalNum(L, v)
  let delta = win
  const steps = 3000
  for (let t = 1; t <= steps; t++) {
    const d = (t * win) / steps
    const bad = [a - d, a + d].some(xx => { const y = f(xx); return Number.isFinite(y) ? !(Math.abs(y - Lv) < e) : false })
    if (bad) { delta = ((t - 1) * win) / steps; break }
  }
  const Y = yRange(f, a - win, a + win, 400, 0.2, 30)
  const lo = Math.min(Y[0], Lv - e * 1.3), hi = Math.max(Y[1], Lv + e * 1.3)
  const rows = [1, 0.1, 0.01, 0.001].map(h => [h, f(a - h), f(a + h)])
  return (
    <Split plot={
      <Plot xr={[a - win, a + win]} yr={[lo, hi]} xlabel="x" ylabel="f(x)">
        <Band y0={Lv - e} y1={Lv + e} color="var(--c3)" opacity={0.17} />
        <HLine y={Lv} color="var(--c3)" label={'L = ' + f4(Lv)} />
        <VLine x={a} color="var(--muted)" />
        <Rect x0={a - delta} x1={a + delta} y0={lo} y1={hi} color="var(--c2)" opacity={0.1} />
        <Curve f={f} />
        <Pt x={a} y={Lv} hollow color="var(--c1)" r={5} />
      </Plot>}>
      {tex && <Readout>{'$' + tex + '$'}</Readout>}
      {sliders}
      <Slider label="Допуск $\varepsilon$ (насколько близко к $L$ надо быть)" value={e} min={eps.min} max={eps.max} step={eps.step} onChange={setE} color="var(--c3)" />
      <div className="stats">
        <Stat label="ε" value={f4(e, 3)} /><Stat label="нужный δ" value={delta >= win ? '≥ ' + f4(win) : f4(delta, 3)} tone="good" sub="|x−a|<δ ⇒ |f−L|<ε" />
        <Stat label="отношение δ/ε" value={f4(delta / e, 3)} sub="чем меньше, тем «круче»" />
      </div>
      <div className="table-wrap"><table style={{ fontSize: '.9rem' }}><thead><tr><th>h</th><th>f(a−h)</th><th>f(a+h)</th></tr></thead>
        <tbody>{rows.map(([h, p, q]) => <tr key={h}><td>{h}</td><td>{f4(p, 5)}</td><td>{f4(q, 5)}</td></tr>)}</tbody></table></div>
    </Split>
  )
}

/* ============ Непрерывность и теорема о промежуточном значении ============ */
export function Ivt({ f: src, params = {}, xr = [0, 3], yr, c = { val: 0, min: -3, max: 3, step: 0.05 }, tex }) {
  const [v, sliders] = useVals(params)
  const [lvl, setC] = useState(c.val)
  const f = fn(src, 'x', v)
  const Y = yr || yRange(f, xr[0], xr[1], 400, 0.2, 40)
  const rs = roots(x => f(x) - lvl, xr[0], xr[1]).map(r => ({ x: r, real: Math.abs(f(r) - lvl) < 2e-3 }))
  const fa = f(xr[0]), fb = f(xr[1])
  const between = (lvl - fa) * (lvl - fb) <= 0
  const real = rs.filter(r => r.real)
  return (
    <Split plot={
      <Plot xr={xr} yr={Y} xlabel="x" ylabel="y">
        <HLine y={lvl} color="var(--c2)" label={'y = ' + f4(lvl, 3)} />
        <Curve f={f} />
        <Pt x={xr[0]} y={fa} color="var(--c1)" hollow label={'f(a)=' + f4(fa, 3)} />
        <Pt x={xr[1]} y={fb} color="var(--c1)" hollow label={'f(b)=' + f4(fb, 3)} dx={-8} anchor="end" />
        {rs.map((r, i) => <Pt key={i} x={r.x} y={lvl} color={r.real ? 'var(--c3)' : 'var(--c4)'} r={6} hollow={!r.real} />)}
      </Plot>}>
      {tex && <Readout>{'$' + tex + '$'}</Readout>}
      {sliders}
      <Slider label="Уровень $c$ (значение, которое хотим получить)" value={lvl} min={c.min} max={c.max} step={c.step} onChange={setC} color="var(--c2)" />
      <div className="stats"><Stat label="f(a)" value={f4(fa)} /><Stat label="f(b)" value={f4(fb)} /><Stat label="решений f(x)=c" value={String(real.length)} tone={real.length ? 'good' : 'bad'} /></div>
      {between ? <Verdict tone="good">c лежит между f(a) и f(b): если f непрерывна на [a,b], корень <b>гарантирован</b></Verdict> : <Verdict tone="warn">c вне отрезка [f(a), f(b)] — теорема ничего не гарантирует (корни всё равно могут быть)</Verdict>}
      {rs.some(r => !r.real) && <Verdict tone="bad">Красная точка — это <b>скачок</b>: график «перепрыгнул» уровень, корня нет. Разрыв ломает теорему.</Verdict>}
    </Split>
  )
}

/* ============ Секущая → касательная: производная как скорость ============ */
export function Tangent({ f: src, params = {}, xr = [-1, 5], yr, x0 = { val: 2, min: 0, max: 4 }, hMax = 2, units, tex }) {
  const [v, sliders] = useVals(params)
  const [x, setX] = useState(x0.val)
  const [s, setS] = useState(0)
  const [side, setSide] = useState(1)
  const f = fn(src, 'x', v)
  const h = side * hMax * Math.pow(10, -s)
  const Y = yr || yRange(f, xr[0], xr[1], 400, 0.2, 100)
  const m = (f(x + h) - f(x)) / h
  const dl = (f(x) - f(x - 1e-6)) / 1e-6, dr = (f(x + 1e-6) - f(x)) / 1e-6
  const kink = Math.abs(dl - dr) > 1e-3 * (1 + Math.abs(dl))
  const d = kink ? (side > 0 ? dr : dl) : D(f, x)
  const line = (k, px, py) => t => py + k * (t - px)
  const u = units || {}
  return (
    <Split plot={
      <Plot xr={xr} yr={Y} xlabel={u.x || 'x'} ylabel={u.y || 'y'}>
        <Curve f={f} />
        <Curve f={line(m, x, f(x))} color="var(--c2)" width={2.2} />
        <Curve f={line(d, x, f(x))} color="var(--c3)" width={1.8} dash="6 4" />
        <Pt x={x} y={f(x)} color="var(--c3)" />
        <Pt x={x + h} y={f(x + h)} color="var(--c2)" />
      </Plot>}>
      {tex && <Readout>{'$' + tex + '$'}</Readout>}
      {sliders}
      <Slider label={u.xl || 'Точка $x_0$'} value={x} min={x0.min} max={x0.max} step={0.01} onChange={setX} color="var(--c3)" />
      <Slider label="Насколько близко вторая точка (прокрутите вправо → $h\to0$)" value={s} min={0} max={4} step={0.05} onChange={setS} color="var(--c2)" fmt={() => 'h = ' + f4(h, 3)} />
      <Segmented options={[{ v: 1, l: 'справа (h>0)' }, { v: -1, l: 'слева (h<0)' }]} value={side} onChange={setSide} />
      <div className="stats">
        <Stat label="наклон секущей" value={f4(m, 5)} tone="warn" sub={u.k} />
        <Stat label="f′(x₀)" value={kink ? 'не существует' : f4(d, 5)} tone={kink ? 'bad' : 'good'} sub={kink ? `слева ${f4(dl, 3)}, справа ${f4(dr, 3)}` : u.k} />
        <Stat label="разница" value={f4(Math.abs(m - d), 3)} />
      </div>
      {kink && <Verdict tone="bad">Излом: наклоны слева и справа различны — у графика нет единой касательной, производной нет.</Verdict>}
    </Split>
  )
}

/* ============ Теорема Лагранжа ============ */
export function Mvt({ f: src, params = {}, xr = [-1, 5], yr, a = { val: 0.5, min: -1, max: 4 }, b = { val: 4, min: 0, max: 5 }, units, tex }) {
  const [v, sliders] = useVals(params)
  const [A, setA] = useState(a.val), [B, setB] = useState(b.val)
  const f = fn(src, 'x', v)
  const lo = Math.min(A, B - 0.05), hi = Math.max(B, A + 0.05)
  const Y = yr || yRange(f, xr[0], xr[1], 400, 0.2, 100)
  const m = (f(hi) - f(lo)) / (hi - lo)
  const cs = roots(x => D(f, x) - m, lo, hi)
  const u = units || {}
  return (
    <Split plot={
      <Plot xr={xr} yr={Y} xlabel={u.x || 'x'} ylabel={u.y || 'y'}>
        <Curve f={f} />
        <Seg x1={lo} y1={f(lo)} x2={hi} y2={f(hi)} color="var(--c2)" width={2.4} />
        {cs.map((c, i) => <g key={i}><Curve f={t => f(c) + m * (t - c)} from={c - 0.7} to={c + 0.7} color="var(--c3)" width={2.4} dash="5 3" /><Pt x={c} y={f(c)} color="var(--c3)" label={'c=' + f4(c, 3)} /></g>)}
        <Pt x={lo} y={f(lo)} color="var(--c2)" label="a" /><Pt x={hi} y={f(hi)} color="var(--c2)" label="b" />
      </Plot>}>
      {tex && <Readout>{'$' + tex + '$'}</Readout>}
      {sliders}
      <Slider label="Левый конец $a$" value={A} min={a.min} max={a.max} step={0.05} onChange={x => setA(Math.min(x, B - 0.1))} color="var(--c2)" />
      <Slider label="Правый конец $b$" value={B} min={b.min} max={b.max} step={0.05} onChange={x => setB(Math.max(x, A + 0.1))} color="var(--c2)" />
      <div className="stats"><Stat label="средний наклон" value={f4(m, 4)} sub={u.k} tone="warn" /><Stat label="точек c" value={String(cs.length)} tone="good" sub="где f′(c) = средний" /></div>
      <Verdict tone="info">Зелёные касательные параллельны хорде: в этих точках мгновенная скорость равна средней.</Verdict>
    </Split>
  )
}

/* ============ Правило Лопиталя: f/g и f′/g′ ============ */
export function Lhop({ f: fs, g: gs, a = 0, win = 2, params = {}, tex }) {
  const [v, sliders] = useVals(params)
  const [s, setS] = useState(0)
  const f = fn(fs, 'x', v), g = fn(gs, 'x', v)
  const ratio = x => f(x) / g(x)
  const dratio = x => D(f, x, 1e-5) / D(g, x, 1e-5)
  const W = win * Math.pow(10, -s)
  const Y = yRange(ratio, a - W, a + W, 300, 0.25, 20)
  const h = W / 2
  const rows = [-h, h, -h / 10, h / 10].map(d => [a + d, ratio(a + d), dratio(a + d)])
  return (
    <Split plot={
      <Plot xr={[a - W, a + W]} yr={Y} xlabel="x">
        <VLine x={a} color="var(--muted)" />
        <Curve f={ratio} />
        <Curve f={dratio} color="var(--c2)" dash="6 4" />
      </Plot>}>
      {tex && <Readout>{'$' + tex + '$'}</Readout>}
      {sliders}
      <Slider label="Увеличение (приближаемся к $a$)" value={s} min={0} max={3} step={0.05} onChange={setS} fmt={() => '×' + f4(Math.pow(10, s), 3)} />
      <div className="muted small"><b style={{ color: 'var(--c1)' }}>━</b> f/g &nbsp; <b style={{ color: 'var(--c2)' }}>┅</b> f′/g′</div>
      <div className="table-wrap"><table style={{ fontSize: '.88rem' }}><thead><tr><th>x</th><th>f/g</th><th>f′/g′</th></tr></thead>
        <tbody>{rows.map(([x, p, q], i) => <tr key={i}><td>{f4(x, 5)}</td><td>{f4(p, 5)}</td><td>{f4(q, 5)}</td></tr>)}</tbody></table></div>
      <Verdict tone="info">Обе кривые стремятся к одному и тому же числу при $x\to a$ — в этом и суть правила.</Verdict>
    </Split>
  )
}

export default { seq: Seq, cobweb: Cobweb, transform: Transform, fplot: FPlot, epsdelta: EpsDelta, ivt: Ivt, tangent: Tangent, mvt: Mvt, lhop: Lhop }
