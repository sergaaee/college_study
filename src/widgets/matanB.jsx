import React, { useMemo, useState } from 'react'
import { derivative } from 'mathjs'
import { Plot, Curve, Dots, HLine, VLine, Band, Pt, Seg, Rect, Label, Param, Area, Poly } from '../lib/plot.jsx'
import { Slider, Toggle, Segmented, Stat } from '../lib/ui.jsx'
import { useVals } from '../lib/usep.jsx'
import { fn, evalNum, D, D2, roots, yRange, integral } from '../lib/expr.js'
import { Split, Verdict, Readout, f4, tn } from './common.jsx'

/* ============ Формула Тейлора ============ */
const TAYLOR = {
  'sin x': 'sin(x)', 'cos x': 'cos(x)', 'eˣ': 'exp(x)', 'ln(1+x)': 'log(1+x)', '1/(1−x)': '1/(1-x)', '√(1+x)': 'sqrt(1+x)', 'arctg x': 'atan(x)',
}
const derivCache = new Map()
function derivs(expr, nmax) {
  const key = expr + '|' + nmax
  if (derivCache.has(key)) return derivCache.get(key)
  const out = [fn(expr, 'x')]
  let node = expr
  for (let k = 1; k <= nmax; k++) {
    try { node = derivative(node, 'x').toString() } catch { break }
    out.push(fn(node, 'x'))
  }
  derivCache.set(key, out)
  return out
}
export function Taylor({ preset, presets, a: a0 = 0, n: n0 = 3, xr = [-5, 5], yr = [-4, 4], x0 = 1.5, fixedA = false }) {
  const PRE = presets || TAYLOR
  const [key, setKey] = useState(preset && PRE[preset] ? preset : Object.keys(PRE)[0])
  const [n, setN] = useState(n0)
  const [a, setA] = useState(a0)
  const [x, setX] = useState(x0)
  const ds = useMemo(() => derivs(PRE[key], 12), [key])
  const f = ds[0]
  const coefs = []
  let fact = 1
  for (let k = 0; k <= n; k++) { if (k > 0) fact *= k; coefs.push((ds[k] ? ds[k](a) : NaN) / fact) }
  const P = t => coefs.reduce((s, c, k) => s + c * Math.pow(t - a, k), 0)
  const err = Math.abs(f(x) - P(x))
  return (
    <Split plot={
      <Plot xr={xr} yr={yr} xlabel="x">
        <VLine x={a} color="var(--muted)" />
        <Curve f={f} />
        <Curve f={P} color="var(--c2)" dash="7 4" width={2.4} />
        <Pt x={x} y={f(x)} color="var(--c1)" />
        <Pt x={x} y={P(x)} color="var(--c2)" hollow />
        <Seg x1={x} y1={f(x)} x2={x} y2={P(x)} color="var(--c4)" width={3} />
      </Plot>}>
      <div><div className="muted small" style={{ marginBottom: 4 }}>Функция</div><Segmented options={Object.keys(PRE)} value={key} onChange={k => { setKey(k); if (/ln|1\/|√/.test(k)) setA(0) }} /></div>
      <Slider label="Степень многочлена $n$" value={n} min={0} max={12} step={1} onChange={setN} color="var(--c2)" />
      {!fixedA && <Slider label="Центр разложения $a$" value={a} min={-2} max={2} step={0.1} onChange={setA} color="var(--c5)" />}
      <Slider label="Точка $x$, где сравниваем" value={x} min={xr[0]} max={xr[1]} step={0.05} onChange={setX} color="var(--c1)" />
      <div className="stats">
        <Stat label="f(x)" value={f4(f(x), 6)} /><Stat label={`P_${n}(x)`} value={f4(P(x), 6)} tone="warn" />
        <Stat label="погрешность" value={f4(err, 3)} tone={err < 1e-3 ? 'good' : err < 0.1 ? 'warn' : 'bad'} />
      </div>
      <Readout>{'$P_{' + n + '}(x)=' + coefs.slice(0, 6).map((c, k) => (Math.abs(c) < 1e-12 ? '' : (c < 0 ? '-' : (k > 0 ? '+' : '')) + (Math.abs(Math.abs(c) - 1) < 1e-9 && k > 0 ? '' : tn(Math.abs(c), 4)) + (k === 0 ? '' : (a === 0 ? 'x' : '(x-' + a + ')') + (k > 1 ? '^{' + k + '}' : '')))).join(' ') + (n > 5 ? '+\\dots' : '') + '$'}</Readout>
    </Split>
  )
}

/* ============ Полное исследование функции ============ */
export function Study({ f: src, params = {}, xr = [-4, 4], yr, tex, asym = [] }) {
  const [v, sliders] = useVals(params)
  const [d1, setD1] = useState(true), [d2, setD2] = useState(false), [marks, setMarks] = useState(true)
  const f = fn(src, 'x', v)
  const [lo, hi] = xr
  const Y = yr || yRange(f, lo, hi, 500, 0.2, 80)
  const crit = roots(x => D(f, x, 1e-5), lo, hi).filter(c => Number.isFinite(f(c)))
  const infl = roots(x => D2(f, x, 1e-3), lo, hi).filter(c => Number.isFinite(f(c)))
  const kinds = crit.map(c => { const s = D2(f, c, 1e-3); return Math.abs(s) < 1e-3 ? '?' : s > 0 ? 'min' : 'max' })
  const pts = [lo, ...crit, hi]
  const incr = []
  for (let i = 0; i < pts.length - 1; i++) { const m = (pts[i] + pts[i + 1]) / 2; const d = D(f, m); if (Number.isFinite(d)) incr.push({ a: pts[i], b: pts[i + 1], up: d > 0 }) }
  return (
    <Split plot={
      <Plot xr={xr} yr={Y} xlabel="x">
        {asym.map((a, i) => a.x != null ? <VLine key={i} x={a.x} /> : <HLine key={i} y={a.y} />)}
        {d1 && <Curve f={x => D(f, x, 1e-5)} color="var(--c2)" dash="6 4" width={1.9} />}
        {d2 && <Curve f={x => D2(f, x, 1e-3)} color="var(--c5)" dash="2 3" width={1.9} />}
        <Curve f={f} />
        {marks && crit.map((c, i) => <Pt key={'c' + i} x={c} y={f(c)} color={kinds[i] === 'max' ? 'var(--c4)' : 'var(--c3)'} label={kinds[i] === 'max' ? 'max' : kinds[i] === 'min' ? 'min' : '?'} />)}
        {marks && infl.map((c, i) => <Pt key={'i' + i} x={c} y={f(c)} color="var(--c5)" hollow label="перегиб" dy={16} />)}
      </Plot>}>
      {tex && <Readout>{'$' + tex + '$'}</Readout>}
      {sliders}
      <div className="row"><Toggle label="$f'$ (оранжевая)" value={d1} onChange={setD1} /><Toggle label="$f''$ (фиолетовая)" value={d2} onChange={setD2} /><Toggle label="отметки" value={marks} onChange={setMarks} /></div>
      <div className="stats">
        <Stat label="критических точек" value={String(crit.length)} /><Stat label="точек перегиба" value={String(infl.length)} />
      </div>
      <Readout>
        {incr.map((s, i) => <div key={i}>{s.up ? '↗ возрастает' : '↘ убывает'} на [{f4(s.a, 3)}; {f4(s.b, 3)}]</div>)}
        {crit.map((c, i) => <div key={'k' + i}>x = {f4(c, 4)}: <b>{kinds[i] === 'max' ? 'локальный максимум' : kinds[i] === 'min' ? 'локальный минимум' : 'нужен ещё признак'}</b>, f = {f4(f(c), 4)}</div>)}
      </Readout>
      <Verdict tone="info">Где $f'$ пересекает ось — там экстремум; где $f'$ сама имеет экстремум ($f''=0$) — перегиб.</Verdict>
    </Split>
  )
}

/* ============ Задачи на оптимум из жизни ============ */
const OPT = {
  fence: {
    title: 'Загон для кур у реки', goal: 'min', obj: 'длина забора, м', xLab: 'Ширина $x$ (перпендикулярно реке), м',
    params: { S: { min: 200, max: 1600, step: 50, val: 800, label: 'Площадь участка $S$, м²' } },
    x: p => [2, Math.sqrt(p.S) * 1.2, 0.5], J: (x, p) => 2 * x + p.S / x, xo: p => Math.sqrt(p.S / 2), Jo: p => 2 * Math.sqrt(2 * p.S),
    info: (x, p) => `Параллельная реке сторона $y=S/x=${f4(p.S / x, 4)}$ м; забор $2x+y$.`,
    formula: 'L(x)=2x+\\dfrac{S}{x}',
  },
  box: {
    title: 'Коробка из листа картона', goal: 'max', obj: 'объём коробки, см³', xLab: 'Сторона вырезаемого квадрата $x$, см',
    params: { a: { min: 10, max: 60, step: 1, val: 30, label: 'Сторона листа $a$, см' } },
    x: p => [0.2, p.a / 2 - 0.2, 0.05], J: (x, p) => x * (p.a - 2 * x) ** 2, xo: p => p.a / 6, Jo: p => (2 * p.a ** 3) / 27,
    info: (x, p) => `Дно коробки: ${f4(p.a - 2 * x, 4)}×${f4(p.a - 2 * x, 4)} см, высота ${f4(x, 3)} см.`,
    formula: 'V(x)=x(a-2x)^2',
  },
  can: {
    title: 'Банка напитка: сколько жести', goal: 'min', obj: 'площадь поверхности, см²', xLab: 'Радиус банки $r$, см',
    params: { V: { min: 200, max: 1000, step: 10, val: 330, label: 'Объём $V$, мл (= см³)' } },
    x: p => [0.8, Math.cbrt(p.V / (2 * Math.PI)) * 2.8, 0.02], J: (r, p) => 2 * Math.PI * r * r + (2 * p.V) / r, xo: p => Math.cbrt(p.V / (2 * Math.PI)), Jo: p => 6 * Math.PI * Math.cbrt(p.V / (2 * Math.PI)) ** 2,
    info: (r, p) => `Высота $h=V/(\\pi r^2)=${f4(p.V / (Math.PI * r * r), 4)}$ см. Оптимум: $h=2r$ (банка «в куб»).`,
    formula: 'S(r)=2\\pi r^2+\\dfrac{2V}{r}',
  },
  semi: {
    title: 'Окно в арке', goal: 'max', obj: 'площадь прямоугольника, м²', xLab: 'Полуширина окна $x$, м',
    params: { R: { min: 1, max: 5, step: 0.1, val: 3, label: 'Радиус арки $R$, м' } },
    x: p => [0.05, p.R - 0.02, 0.01], J: (x, p) => 2 * x * Math.sqrt(p.R * p.R - x * x), xo: p => p.R / Math.SQRT2, Jo: p => p.R * p.R,
    info: (x, p) => `Высота окна $\\sqrt{R^2-x^2}=${f4(Math.sqrt(p.R * p.R - x * x), 4)}$ м.`,
    formula: 'A(x)=2x\\sqrt{R^2-x^2}',
  },
  profit: {
    title: 'Цена кофе в кафе', goal: 'max', obj: 'прибыль в день, ₪', xLab: 'Цена чашки $p$, ₪',
    params: {
      D: { min: 150, max: 500, step: 10, val: 300, label: 'Покупателей при цене 0, чашек/день' },
      k: { min: 5, max: 30, step: 1, val: 15, label: 'Теряем клиентов на каждый ₪, чашек' },
      c: { min: 2, max: 14, step: 0.5, val: 6, label: 'Себестоимость чашки $c$, ₪' },
    },
    x: p => [p.c, p.D / p.k, 0.05], J: (q, p) => (q - p.c) * (p.D - p.k * q), xo: p => (p.D / p.k + p.c) / 2, Jo: p => ((p.D / p.k - p.c) ** 2 * p.k) / 4,
    info: (q, p) => `Продаётся ${f4(Math.max(0, p.D - p.k * q), 4)} чашек в день, маржа ${f4(q - p.c, 3)} ₪ с чашки.`,
    formula: '\\Pi(p)=(p-c)(D-kp)',
  },
}
export function Optim({ kind = 'fence' }) {
  const P = OPT[kind]
  const [v, sliders] = useVals(P.params)
  const [lo, hi, st] = P.x(v)
  const xo = P.xo(v), Jo = P.Jo(v)
  const [t, setT] = useState(0.15)
  const x = lo + (hi - lo) * t
  const J = P.J(x, v)
  const Y = yRange(q => P.J(q, v), lo, hi, 300, 0.15, 1e6)
  const gap = P.goal === 'min' ? (J / Jo - 1) * 100 : (1 - J / Jo) * 100
  const ycap = P.goal === 'min' ? [Math.min(Y[0], Jo * 0.9), Math.min(Y[1], Jo * 3)] : [Math.min(Y[0], 0), Y[1]]
  return (
    <Split plot={
      <Plot xr={[lo, hi]} yr={ycap} xlabel="x" ylabel={P.obj}>
        <Curve f={q => P.J(q, v)} />
        <Pt x={xo} y={Jo} color="var(--c3)" r={6} label={'оптимум ' + f4(xo, 4)} dy={P.goal === 'min' ? 22 : -10} />
        <VLine x={x} color="var(--c2)" />
        <Pt x={x} y={J} color="var(--c2)" r={6} />
      </Plot>}>
      <Readout>{'**' + P.title + '.** $' + P.formula + '$'}</Readout>
      {sliders}
      <Slider label={P.xLab} value={x} min={lo} max={hi} step={st} onChange={q => setT((q - lo) / (hi - lo))} color="var(--c2)" fmt={q => f4(q, 4)} />
      <div className="stats">
        <Stat label={P.obj} value={f4(J, 5)} tone="warn" /><Stat label={P.goal === 'min' ? 'минимум' : 'максимум'} value={f4(Jo, 5)} tone="good" />
        <Stat label="от оптимума" value={(gap > 0 ? '+' : '') + f4(gap, 3) + '%'} sub={P.goal === 'min' ? 'перерасход' : 'недобор'} tone={gap < 1 ? 'good' : 'bad'} />
      </div>
      <Readout>{P.info(x, v)}</Readout>
      <Verdict tone="info">Вблизи оптимума кривая плоская: ошибка в 10% по $x$ почти не меняет результат. Оптимум там, где $f'=0$.</Verdict>
    </Split>
  )
}

/* ============ Первообразные и семейство «+C» ============ */
export function Antider({ f: src = '2*x', params = {}, xr = [-3, 3], x0 = 1 }) {
  const [v, sliders] = useVals(params)
  const [C, setC] = useState(0), [x, setX] = useState(x0)
  const f = fn(src, 'x', v)
  const F = x => integral(f, 0, x, 400)
  const Y = yRange(t => F(t), xr[0], xr[1], 120, 0.3, 50)
  const lo = Math.min(Y[0], -4), hi = Math.max(Y[1], 4)
  return (
    <Split plot={
      <Plot xr={xr} yr={[lo, hi]} xlabel="x">
        {[-3, -2, -1, 0, 1, 2, 3].map(c => <Curve key={c} f={t => F(t) + c} color="var(--c1)" opacity={0.22} width={1.6} />)}
        <Curve f={f} color="var(--c2)" dash="6 4" />
        <Curve f={t => F(t) + C} color="var(--c1)" width={3} />
        <Pt x={x} y={F(x) + C} color="var(--c1)" />
        <Curve f={t => F(x) + C + f(x) * (t - x)} from={x - 0.8} to={x + 0.8} color="var(--c3)" width={2.4} />
      </Plot>}>
      {sliders}
      <Slider label="Константа $C$" value={C} min={-3} max={3} step={0.1} onChange={setC} />
      <Slider label="Точка $x$" value={x} min={xr[0]} max={xr[1]} step={0.05} onChange={setX} color="var(--c3)" />
      <div className="stats"><Stat label="f(x) — подынтегральная" value={f4(f(x))} tone="warn" /><Stat label="наклон F в точке x" value={f4(D(t => F(t) + C, x))} tone="good" /></div>
      <Verdict tone="info">Оранжевая — $f$, синие — все её первообразные. Наклон любой синей кривой в точке $x$ равен $f(x)$, и от $C$ он не зависит: поэтому «$+C$».</Verdict>
    </Split>
  )
}

/* ============ Интегрирование по частям ============ */
const PARTS = {
  'x·eˣ': { u: 'x', du: '1', v: 'exp(x)', dv: 'exp(x)', tex: 'u=x,\\ dv=e^{x}dx \\Rightarrow du=dx,\\ v=e^{x}' },
  'x·cos x': { u: 'x', du: '1', v: 'sin(x)', dv: 'cos(x)', tex: 'u=x,\\ dv=\\cos x\\,dx \\Rightarrow du=dx,\\ v=\\sin x' },
  'ln x': { u: 'log(x)', du: '1/x', v: 'x', dv: '1', tex: 'u=\\ln x,\\ dv=dx \\Rightarrow du=\\tfrac{dx}{x},\\ v=x' },
  'x²·e⁻ˣ': { u: 'x^2', du: '2*x', v: '-exp(-x)', dv: 'exp(-x)', tex: 'u=x^2,\\ dv=e^{-x}dx \\Rightarrow du=2x\\,dx,\\ v=-e^{-x}' },
  'x·sin 2x': { u: 'x', du: '1', v: '-cos(2*x)/2', dv: 'sin(2*x)', tex: 'u=x,\\ dv=\\sin 2x\\,dx \\Rightarrow du=dx,\\ v=-\\tfrac{\\cos 2x}{2}' },
}
export function Parts({ preset = 'x·eˣ' }) {
  const [k, setK] = useState(preset)
  const [a, setA] = useState(1), [b, setB] = useState(3)
  const P = PARTS[k]
  const u = fn(P.u), v = fn(P.v), du = fn(P.du), dv = fn(P.dv)
  const lo = Math.min(a, b - 0.2), hi = Math.max(b, a + 0.2)
  const I1 = integral(x => u(x) * dv(x), lo, hi, 800), I2 = integral(x => v(x) * du(x), lo, hi, 800)
  const uv = u(hi) * v(hi) - u(lo) * v(lo)
  const vals = [I1, uv, I2, 0]
  const vmin = Math.min(...vals), vmax = Math.max(...vals), span = Math.max(vmax - vmin, 0.01)
  const bar = (val, col, lab, y) => <g key={lab}><Rect x0={0} x1={val} y0={y - 0.3} y1={y + 0.3} color={col} opacity={0.35} /><Label x={val >= 0 ? val : 0} y={y} dx={6} dy={4} color={col}>{lab}: {f4(val, 4)}</Label></g>
  return (
    <Split plot={
      <Plot xr={[vmin - 0.15 * span, vmax + 0.9 * span]} yr={[0, 4]} grid={false} xticks={[]} yticks={[]}>
        {bar(I1, 'var(--c1)', '∫u dv', 3)}{bar(uv, 'var(--c3)', '[uv]', 2)}{bar(I2, 'var(--c2)', '∫v du', 1)}
        <Label x={(vmin + vmax) / 2} y={3.7} anchor="middle" color="var(--muted)">∫u dv = [uv] − ∫v du</Label>
      </Plot>}>
      <div><div className="muted small" style={{ marginBottom: 4 }}>Подынтегральная</div><Segmented options={Object.keys(PARTS)} value={k} onChange={setK} /></div>
      <Readout>{'Берём $' + P.tex + '$'}</Readout>
      <Slider label="Нижний предел $a$" value={a} min={0.2} max={4} step={0.1} onChange={setA} />
      <Slider label="Верхний предел $b$" value={b} min={0.5} max={5} step={0.1} onChange={setB} />
      <div className="stats"><Stat label="∫u dv" value={f4(I1, 5)} /><Stat label="[uv]" value={f4(uv, 5)} /><Stat label="∫v du" value={f4(I2, 5)} /></div>
      <Verdict tone={Math.abs(I1 - (uv - I2)) < 1e-6 ? 'good' : 'bad'}>{`Проверка: ${f4(I1, 5)} = ${f4(uv, 5)} − (${f4(I2, 5)}) ✓. Выбирайте $u$ так, чтобы $\\int v\\,du$ получился проще исходного.`}</Verdict>
    </Split>
  )
}

/* ============ Суммы Римана ============ */
export function Riemann({ f: src = 'x^2', params = {}, a = 0, b = 3, n: n0 = 6, rule: rule0 = 'left', yr, xr, units, tex }) {
  const [v, sliders] = useVals(params)
  const [n, setN] = useState(n0)
  const [rule, setRule] = useState(rule0)
  const f = fn(src, 'x', v)
  const exact = integral(f, a, b, 2000)
  const dx = (b - a) / n
  const heights = []
  for (let i = 0; i < n; i++) {
    const x0 = a + i * dx, x1 = x0 + dx
    heights.push(rule === 'left' ? f(x0) : rule === 'right' ? f(x1) : rule === 'mid' ? f((x0 + x1) / 2) : (f(x0) + f(x1)) / 2)
  }
  const S = heights.reduce((s, h) => s + h * dx, 0)
  const err = S - exact
  const Y = yr || yRange(f, a - (b - a) * 0.1, b + (b - a) * 0.1, 300, 0.2, 100)
  const u = units || {}
  return (
    <Split plot={
      <Plot xr={xr || [a - (b - a) * 0.1, b + (b - a) * 0.1]} yr={[Math.min(0, Y[0]), Y[1]]} xlabel={u.x || 'x'} ylabel={u.y || 'f'}>
        {rule === 'trap'
          ? heights.map((_, i) => { const x0 = a + i * dx, x1 = x0 + dx; return <Poly key={i} pts={[[x0, 0], [x0, f(x0)], [x1, f(x1)], [x1, 0]]} color="var(--c2)" opacity={0.22} width={n > 60 ? 0.5 : 1.5} /> })
          : heights.map((h, i) => <Rect key={i} x0={a + i * dx} x1={a + (i + 1) * dx} y0={0} y1={h} color="var(--c2)" opacity={0.25} width={n > 60 ? 0.4 : 1.5} />)}
        <Curve f={f} />
      </Plot>}>
      {tex && <Readout>{'$' + tex + '$'}</Readout>}
      {sliders}
      <Slider label="Число прямоугольников $n$" value={n} min={1} max={200} step={1} onChange={setN} color="var(--c2)" />
      <div><div className="muted small" style={{ marginBottom: 4 }}>Высота прямоугольника по…</div><Segmented options={[{ v: 'left', l: 'левому краю' }, { v: 'right', l: 'правому' }, { v: 'mid', l: 'середине' }, { v: 'trap', l: 'трапеции' }]} value={rule} onChange={setRule} /></div>
      <div className="stats">
        <Stat label="сумма Римана" value={f4(S, 6)} tone="warn" sub={u.int} /><Stat label="точный интеграл" value={f4(exact, 6)} tone="good" />
        <Stat label="ошибка" value={f4(err, 3)} tone={Math.abs(err / exact) < 0.01 ? 'good' : 'bad'} sub={f4((100 * err) / exact, 3) + '%'} />
        <Stat label="ошибка × n" value={f4(err * n, 3)} sub="почти const ⇒ ошибка ~ 1/n" />
      </div>
    </Split>
  )
}

/* ============ Основная теорема анализа: F′ = f ============ */
export function Ftc({ f: src = 'cos(x)', params = {}, xr = [0, 6], x0 = 2, tex }) {
  const [v, sliders] = useVals(params)
  const [x, setX] = useState(x0)
  const f = fn(src, 'x', v)
  const N = 400
  const grid = useMemo(() => {
    const out = [[xr[0], 0]]
    const h = (xr[1] - xr[0]) / N
    for (let i = 1; i <= N; i++) { const x1 = xr[0] + i * h, x0_ = x1 - h; out.push([x1, out[i - 1][1] + ((f(x0_) + f(x1)) / 2) * h]) }
    return out
  }, [src, JSON.stringify(v), xr[0], xr[1]])
  const F = t => { const i = Math.round(((t - xr[0]) / (xr[1] - xr[0])) * N); return grid[Math.max(0, Math.min(N, i))][1] }
  const Yf = yRange(f, xr[0], xr[1], 300, 0.25, 100)
  const Yf2 = yRange(F, xr[0], xr[1], 300, 0.25, 100)
  const slope = D(F, x, (xr[1] - xr[0]) / N * 2)
  return (
    <Split plot={
      <div style={{ display: 'grid', gap: 8 }}>
        <Plot xr={xr} yr={Yf} h={230} xlabel="t" ylabel="f(t)">
          <Area f={f} from={xr[0]} to={x} color="var(--c2)" opacity={0.3} />
          <Curve f={f} />
          <VLine x={x} color="var(--c2)" />
          <Pt x={x} y={f(x)} color="var(--c2)" />
        </Plot>
        <Plot xr={xr} yr={Yf2} h={230} xlabel="x" ylabel="F(x)=∫f">
          <Curve f={F} color="var(--c3)" />
          <Pt x={x} y={F(x)} color="var(--c3)" />
          <Curve f={t => F(x) + f(x) * (t - x)} from={x - 0.9} to={x + 0.9} color="var(--c2)" width={2.4} dash="5 3" />
        </Plot>
      </div>}>
      {tex && <Readout>{'$' + tex + '$'}</Readout>}
      {sliders}
      <Slider label="Верхний предел $x$" value={x} min={xr[0]} max={xr[1]} step={0.02} onChange={setX} color="var(--c2)" />
      <div className="stats"><Stat label="F(x) = площадь слева" value={f4(F(x), 5)} tone="good" /><Stat label="f(x)" value={f4(f(x), 5)} tone="warn" /><Stat label="наклон F" value={f4(slope, 5)} sub="≈ f(x)" /></div>
      <Verdict tone="info">{'Закрашенная площадь растёт со скоростью, равной высоте $f$ на правом краю: когда $f>0$ — $F$ растёт, когда $f<0$ — убывает, когда $f=0$ — у $F$ экстремум.'}</Verdict>
    </Split>
  )
}

/* ============ Площадь между кривыми и объём тела вращения ============ */
export function Solid({ f: fs = 'x', g: gs = 'x^2', a: a0 = 0, b: b0 = 1, params = {}, xr = [-0.5, 3], yr = [-2.5, 3], axis: axis0 = 'Ox' }) {
  const [v, sliders] = useVals(params)
  const [a, setA] = useState(a0), [b, setB] = useState(b0), [t, setT] = useState((a0 + b0) / 2)
  const [axis, setAxis] = useState(axis0)
  const f = fn(fs, 'x', v), g = fn(gs, 'x', v)
  const lo = Math.min(a, b - 0.05), hi = Math.max(b, a + 0.05)
  const area = integral(x => Math.abs(f(x) - g(x)), lo, hi, 800)
  const Vx = Math.PI * integral(x => Math.abs(f(x) ** 2 - g(x) ** 2), lo, hi, 800)
  const Vy = 2 * Math.PI * integral(x => Math.abs(x) * Math.abs(f(x) - g(x)), lo, hi, 800)
  const tt = Math.min(hi, Math.max(lo, t))
  return (
    <Split plot={
      <Plot xr={xr} yr={yr} equal xlabel="x" ylabel="y">
        {axis === 'Ox' && <><Curve f={x => -f(x)} color="var(--c1)" opacity={0.25} dash="4 3" width={1.6} /><Curve f={x => -g(x)} color="var(--c2)" opacity={0.25} dash="4 3" width={1.6} /></>}
        {axis === 'Oy' && <><Param f={s => [-s, f(s)]} from={xr[0] < 0 ? 0 : xr[0]} to={xr[1]} color="var(--c1)" dash="4 3" width={1.4} /><Param f={s => [-s, g(s)]} from={0} to={xr[1]} color="var(--c2)" dash="4 3" width={1.4} /></>}
        <Area f={f} g={g} from={lo} to={hi} color="var(--c3)" opacity={0.3} />
        <Curve f={f} /><Curve f={g} color="var(--c2)" />
        {axis === 'Ox' && <><Seg x1={tt} y1={-f(tt)} x2={tt} y2={f(tt)} color="var(--c1)" width={3} /><Seg x1={tt} y1={-g(tt)} x2={tt} y2={g(tt)} color="var(--c2)" width={3} /></>}
        {axis === 'Oy' && <Rect x0={-tt} x1={tt} y0={Math.min(f(tt), g(tt))} y1={Math.max(f(tt), g(tt))} color="var(--c5)" opacity={0.25} />}
        <VLine x={lo} color="var(--muted)" /><VLine x={hi} color="var(--muted)" />
      </Plot>}>
      {sliders}
      <Slider label="Левая граница $a$" value={a} min={xr[0] + 0.5} max={xr[1]} step={0.05} onChange={setA} />
      <Slider label="Правая граница $b$" value={b} min={xr[0] + 0.5} max={xr[1]} step={0.05} onChange={setB} />
      <Slider label="Положение среза" value={tt} min={lo} max={hi} step={0.01} onChange={setT} color="var(--c5)" />
      <Segmented options={[{ v: 'Ox', l: 'вращаем вокруг Ox' }, { v: 'Oy', l: 'вокруг Oy' }]} value={axis} onChange={setAxis} />
      <div className="stats">
        <Stat label="площадь" value={f4(area, 5)} tone="good" />
        <Stat label={axis === 'Ox' ? 'V вокруг Ox' : 'V вокруг Oy'} value={f4(axis === 'Ox' ? Vx : Vy, 5)} tone="warn" />
      </div>
      <Verdict tone="info">{axis === 'Ox' ? 'Срез при вращении — шайба: $dV=\\pi(f^2-g^2)\\,dx$.' : 'Срез при вращении — цилиндрическая оболочка: $dV=2\\pi x\\,(f-g)\\,dx$.'}</Verdict>
    </Split>
  )
}

/* ============ Несобственные интегралы: ∫ x^{-p} ============ */
export function Improper({ kind: k0 = 'inf', p: p0 = 2 }) {
  const [kind, setKind] = useState(k0)
  const [p, setP] = useState(p0)
  const [s, setS] = useState(2)
  const I = (limit) => {
    // kind inf: ∫_1^T x^-p dx, limit = T ; kind zero: ∫_ε^1 x^-p dx, limit = ε
    if (kind === 'inf') return Math.abs(p - 1) < 1e-9 ? Math.log(limit) : (Math.pow(limit, 1 - p) - 1) / (1 - p)
    return Math.abs(p - 1) < 1e-9 ? -Math.log(limit) : (1 - Math.pow(limit, 1 - p)) / (1 - p)
  }
  const conv = kind === 'inf' ? p > 1 : p < 1
  const lim = conv ? (kind === 'inf' ? 1 / (p - 1) : 1 / (1 - p)) : Infinity
  const cur = kind === 'inf' ? Math.pow(10, s) : Math.pow(10, -s)
  const val = I(cur)
  const smax = 6
  const curveX = x => Math.pow(x, -p)
  const xr1 = kind === 'inf' ? [0.5, 10] : [0, 1.5]
  const cap = Math.min(6, kind === 'inf' ? 3 : 8)
  const yTop = Math.max(Math.min(cap, curveX(kind === 'inf' ? 0.5 : 0.1)), 2)
  const Iline = u => I(kind === 'inf' ? Math.pow(10, u) : Math.pow(10, -u))
  const topY = conv ? lim * 1.4 : Math.min(40, Iline(smax) * 1.1)
  return (
    <Split plot={
      <div style={{ display: 'grid', gap: 8 }}>
        <Plot xr={xr1} yr={[0, yTop]} h={210} xlabel="x" ylabel={`x^(−${f4(p, 2)})`}>
          <Area f={curveX} from={kind === 'inf' ? 1 : Math.max(cur, 0.02)} to={kind === 'inf' ? Math.min(cur, 10) : 1} color="var(--c2)" opacity={0.3} />
          <Curve f={curveX} />
          <VLine x={1} color="var(--muted)" />
        </Plot>
        <Plot xr={[0, smax]} yr={[0, topY]} h={210} xlabel={kind === 'inf' ? 'lg T' : 'lg(1/ε)'} ylabel="площадь">
          {conv && <HLine y={lim} color="var(--c3)" label={'предел = ' + f4(lim, 4)} />}
          <Curve f={Iline} color="var(--c3)" />
          <Pt x={s} y={val} color="var(--c2)" />
        </Plot>
      </div>}>
      <Segmented options={[{ v: 'inf', l: '∫₁^∞ x⁻ᵖ dx (хвост)' }, { v: 'zero', l: '∫₀¹ x⁻ᵖ dx (у нуля)' }]} value={kind} onChange={setKind} />
      <Slider label="Степень $p$" value={p} min={0.2} max={3} step={0.05} onChange={setP} color="var(--c4)" />
      <Slider label={kind === 'inf' ? 'Обрезаем на $T = 10^{k}$' : 'Отступаем от нуля на $\\varepsilon = 10^{-k}$'} value={s} min={0} max={6} step={0.05} onChange={setS} color="var(--c2)" fmt={x => 'k = ' + f4(x, 3)} />
      <div className="stats">
        <Stat label="площадь сейчас" value={f4(val, 5)} tone="warn" />
        <Stat label="предел" value={conv ? f4(lim, 5) : '∞'} tone={conv ? 'good' : 'bad'} />
      </div>
      <Verdict tone={conv ? 'good' : 'bad'}>{conv ? `Сходится: при $p=${f4(p, 3)}$ площадь упирается в ${f4(lim, 4)}` : `Расходится: при $p=${f4(p, 3)}$ площадь растёт без предела`} (граница — ровно $p=1$).</Verdict>
    </Split>
  )
}

export default { taylor: Taylor, study: Study, optim: Optim, antider: Antider, parts: Parts, riemann: Riemann, ftc: Ftc, solid: Solid, improper: Improper }
