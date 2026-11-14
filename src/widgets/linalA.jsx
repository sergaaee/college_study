import React, { useState } from 'react'
import { Plot, Curve, Pt, Seg, Arrow, Handle, Poly, Param, Label, HLine, VLine, Rect, Dots } from '../lib/plot.jsx'
import { Slider, Toggle, Segmented, Stat } from '../lib/ui.jsx'
import { useVals } from '../lib/usep.jsx'
import { evalNum } from '../lib/expr.js'
import { rref, rank, classify, nullspace, det2, det, inv, toFrac, toTex, texMat, mulv } from '../lib/linalg.js'
import { inline } from '../lib/rich.jsx'
import { Split, Verdict, Readout, Note, f4 } from './common.jsx'

const snap = (v, s = 0.25) => Math.round(v / s) * s
const deg = r => (r * 180) / Math.PI
const arg = ([a, b]) => deg(Math.atan2(b, a))
const cstr = ([a, b]) => `${f4(a, 3)} ${b < 0 ? '−' : '+'} ${f4(Math.abs(b), 3)}i`

/* ============ Комплексные числа на плоскости ============ */
export function Cplx({ z: z0 = [2, 1], q: w0 = [1, 2], op: op0 = 'mul', range = 5 }) {
  const [z, setZ] = useState(z0), [w, setW] = useState(w0)
  const [op, setOp] = useState(op0)
  const mulc = (p, q) => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]]
  const w2 = w[0] * w[0] + w[1] * w[1]
  const res = op === 'add' ? [z[0] + w[0], z[1] + w[1]] : op === 'mul' ? mulc(z, w) : op === 'div' ? (w2 < 1e-9 ? [NaN, NaN] : mulc(z, [w[0] / w2, -w[1] / w2])) : [z[0], -z[1]]
  const mod = p => Math.hypot(p[0], p[1])
  const R = Math.max(range, Math.ceil(Math.max(mod(res) || 0, mod(z), mod(w)) / 2) * 2 + 1)
  return (
    <Split plot={
      <Plot xr={[-R, R]} yr={[-R * 0.8, R * 0.8]} equal xlabel="Re" ylabel="Im" w={560} h={460}>
        <Param f={t => [mod(z) * Math.cos(t), mod(z) * Math.sin(t)]} from={0} to={2 * Math.PI} color="var(--c1)" dash="3 4" width={1} />
        {op === 'add' && <Poly pts={[[0, 0], z, res, w]} color="var(--c5)" opacity={0.12} stroke={false} />}
        {op === 'conj' && <Seg x1={z[0]} y1={z[1]} x2={z[0]} y2={-z[1]} color="var(--muted)" dash="4 3" width={1.4} />}
        <Arrow x2={z[0]} y2={z[1]} color="var(--c1)" label="z" />
        {op !== 'conj' && <Arrow x2={w[0]} y2={w[1]} color="var(--c2)" label="w" />}
        {Number.isFinite(res[0]) && <Arrow x2={res[0]} y2={res[1]} color="var(--c5)" width={3.4} label={{ add: 'z+w', mul: 'z·w', div: 'z/w', conj: 'z̄' }[op]} />}
        <Handle x={z[0]} y={z[1]} onMove={(x, y) => setZ([snap(x), snap(y)])} color="var(--c1)" r={7} />
        {op !== 'conj' && <Handle x={w[0]} y={w[1]} onMove={(x, y) => setW([snap(x), snap(y)])} color="var(--c2)" r={7} />}
      </Plot>}>
      <Segmented options={[{ v: 'add', l: 'z + w' }, { v: 'mul', l: 'z · w' }, { v: 'div', l: 'z / w' }, { v: 'conj', l: 'сопряжённое' }]} value={op} onChange={setOp} />
      <Note>Перетаскивайте синюю точку $z$ и оранжевую $w$ (шаг 0,25).</Note>
      <div className="stats">
        <Stat label="z" value={cstr(z)} /><Stat label="|z|" value={f4(mod(z), 4)} sub={`arg = ${f4(arg(z), 4)}°`} />
        {op !== 'conj' && <Stat label="w" value={cstr(w)} sub={`|w| = ${f4(mod(w), 4)}, arg = ${f4(arg(w), 4)}°`} />}
        <Stat label="результат" value={Number.isFinite(res[0]) ? cstr(res) : '—'} tone="good" sub={Number.isFinite(res[0]) ? `|·| = ${f4(mod(res), 4)}, arg = ${f4(arg(res), 4)}°` : 'деление на 0'} />
      </div>
      <Verdict tone="info">{op === 'add' ? 'Сложение — это сложение векторов (правило параллелограмма).' : op === 'mul' ? 'Умножение: модули перемножаются, аргументы складываются — «масштаб + поворот».' : op === 'div' ? 'Деление: модули делятся, аргументы вычитаются.' : 'Сопряжение — зеркальное отражение относительно вещественной оси; $z\\bar z=|z|^2$.'}</Verdict>
    </Split>
  )
}

/* ============ Корни n-й степени из комплексного числа ============ */
export function CRoots({ n: n0 = 3, r: r0 = 8, th: th0 = 90 }) {
  const [n, setN] = useState(n0), [r, setR] = useState(r0), [th, setTh] = useState(th0)
  const rho = Math.pow(r, 1 / n)
  const pts = [...Array(n)].map((_, k) => { const a = ((th + 360 * k) / n) * (Math.PI / 180); return [rho * Math.cos(a), rho * Math.sin(a)] })
  const R = Math.max(2.5, Math.ceil(rho) + 1)
  return (
    <Split plot={
      <Plot xr={[-R, R]} yr={[-R, R]} equal w={520} h={440} xlabel="Re" ylabel="Im">
        <Param f={t => [rho * Math.cos(t), rho * Math.sin(t)]} from={0} to={2 * Math.PI} color="var(--muted)" dash="3 4" width={1.2} />
        {n > 2 && <Poly pts={pts} color="var(--c1)" opacity={0.1} width={1.4} />}
        {pts.map(([x, y], k) => <g key={k}><Seg x1={0} y1={0} x2={x} y2={y} color="var(--c1)" width={1} opacity={0.5} /><Pt x={x} y={y} color={k === 0 ? 'var(--c2)' : 'var(--c1)'} r={6} label={`z${k}`} /></g>)}
      </Plot>}>
      <Readout>{`Решаем $z^{${n}}=${f4(r, 3)}\\,(\\cos${f4(th, 3)}^\\circ+i\\sin${f4(th, 3)}^\\circ)$`}</Readout>
      <Slider label="Степень $n$" value={n} min={2} max={12} step={1} onChange={setN} />
      <Slider label="Модуль правой части $r$" value={r} min={1} max={64} step={1} onChange={setR} color="var(--c2)" />
      <Slider label="Аргумент правой части $\varphi$" value={th} min={0} max={360} step={5} onChange={setTh} color="var(--c5)" unit="°" />
      <div className="stats">
        <Stat label="модуль корней" value={f4(rho, 5)} sub={`$\\sqrt[${n}]{r}$`} /><Stat label="шаг по углу" value={f4(360 / n, 4) + '°'} /><Stat label="первый корень, угол" value={f4(th / n, 4) + '°'} />
      </div>
      <Verdict tone="info">{'Все $n$ корней лежат на окружности радиуса $\\sqrt[n]{r}$ и образуют правильный $n$-угольник; их сумма равна нулю.'}</Verdict>
    </Split>
  )
}

/* ============ Система линейных уравнений с параметром ============ */
const KC = { unique: 'var(--c3)', infinite: 'var(--c2)', none: 'var(--c4)' }
export function Sys({ A, b, params = {}, vars = ['x', 'y', 'z'], scan = null, title }) {
  const [v, sliders] = useVals(params)
  const num = s => evalNum(s, v)
  const An = A.map(r => r.map(num)), bn = b.map(num)
  const n = An[0].length
  const cl = classify(An, bn)
  const aug = An.map((r, i) => [...r, bn[i]])
  const { R, pivots } = rref(aug, n)
  const eqTex = (row, rhs) => {
    let s = ''
    row.forEach((c, j) => {
      if (Math.abs(c) < 1e-12) return
      const a = Math.abs(c) === 1 ? '' : toTex(Math.abs(c))
      s += (c < 0 ? '-' : s ? '+' : '') + a + vars[j]
    })
    return (s || '0') + '=' + toTex(rhs)
  }
  const sysTex = '\\begin{cases}' + An.map((r, i) => eqTex(r, bn[i])).join(' \\\\ ') + '\\end{cases}'
  let sol = null
  if (cl.kind === 'unique') sol = '(' + vars.slice(0, n).join(',') + ')=\\left(' + pivots.map((_, i) => toTex(R[i][n])).join(',\\ ') + '\\right)'
  if (cl.kind === 'infinite') {
    const part = Array(n).fill(0)
    pivots.forEach((pc, i) => { part[pc] = R[i][n] })
    const ns = nullspace(An)
    const vec = u => '\\begin{pmatrix}' + u.map(toTex).join('\\\\') + '\\end{pmatrix}'
    sol = vec(part) + ns.map((u, k) => `+s_{${k + 1}}${vec(u)}`).join('')
  }
  // полоса «типы решений при изменении параметра»
  let strip = null
  if (scan) {
    const segs = []
    const N = 240
    for (let i = 0; i <= N; i++) {
      const tv = scan.from + ((scan.to - scan.from) * i) / N
      const vv = { ...v, [scan.param]: tv }
      const k = classify(A.map(r => r.map(s => evalNum(s, vv))), b.map(s => evalNum(s, vv))).kind
      if (!segs.length || segs[segs.length - 1].k !== k) segs.push({ k, from: i }); else segs[segs.length - 1].to = i
      segs[segs.length - 1].to = i
    }
    const cur = v[scan.param]
    const specials = []
    if (A.length === A[0].length) {
      const dAt = tv => det(A.map(r => r.map(s => evalNum(s, { ...v, [scan.param]: tv }))))
      let prevT = scan.from, prevD = dAt(prevT)
      for (let i = 1; i <= N * 4; i++) {
        const tv = scan.from + ((scan.to - scan.from) * i) / (N * 4), d = dAt(tv)
        if (Math.abs(d) < 1e-9) specials.push(tv)
        else if (prevD * d < 0) { let lo = prevT, hi = tv, dl = prevD; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2, dm = dAt(m); if (dl * dm <= 0) hi = m; else { lo = m; dl = dm } } specials.push((lo + hi) / 2) }
        prevT = tv; prevD = d
      }
    }
    const uniq = specials.filter((x, i) => !i || Math.abs(x - specials[i - 1]) > 1e-3)
    strip = (
      <div>
        <div className="muted small" style={{ marginBottom: 4 }}>Тип решений при разных значениях параметра <b>{scan.param}</b> (маркер — текущее):</div>
        <div style={{ position: 'relative', height: 26, borderRadius: 8, overflow: 'hidden', display: 'flex', border: '1px solid var(--line)' }}>
          {segs.map((s, i) => <div key={i} style={{ flex: (s.to - s.from + 1), background: KC[s.k], opacity: 0.8 }} />)}
          {uniq.map((sp, i) => <div key={i} title={'det = 0 при ' + sp.toFixed(3)} style={{ position: 'absolute', left: `${((sp - scan.from) / (scan.to - scan.from)) * 100}%`, top: 0, bottom: 0, width: 2, background: 'var(--bg)', opacity: 0.9 }} />)}
          <div style={{ position: 'absolute', left: `${((cur - scan.from) / (scan.to - scan.from)) * 100}%`, top: 0, bottom: 0, width: 3, background: 'var(--ink)' }} />
        </div>
        {uniq.length > 0 && <div className="muted small" style={{ marginTop: 4 }}>{inline('$\\det A=0$ при ' + scan.param + ' ≈ ' + uniq.map(x => (Math.abs(x) < 1e-6 ? '0' : (+x.toFixed(4)).toString())).join(', ') + ' (светлые засечки на полосе) — только там возможны «много решений» или «нет решений».', 'sp')}</div>}
        <div className="row muted small" style={{ justifyContent: 'space-between' }}><span>{scan.from}</span><span><b style={{ color: KC.unique }}>■</b> одно &nbsp;<b style={{ color: KC.infinite }}>■</b> много &nbsp;<b style={{ color: KC.none }}>■</b> нет</span><span>{scan.to}</span></div>
      </div>
    )
  }
  const msg = { unique: 'Единственное решение', infinite: `Бесконечно много решений (свободных переменных: ${n - cl.rA})`, none: 'Решений нет (несовместна)' }[cl.kind]
  const plot2 = n === 2 && (
    <Plot xr={[-6, 6]} yr={[-6, 6]} equal w={520} h={420} xlabel="x" ylabel="y">
      {An.map((r, i) => Math.abs(r[1]) > 1e-9
        ? <Curve key={i} f={x => (bn[i] - r[0] * x) / r[1]} color={['var(--c1)', 'var(--c2)', 'var(--c5)'][i % 3]} />
        : Math.abs(r[0]) > 1e-9 ? <VLine key={i} x={bn[i] / r[0]} color={['var(--c1)', 'var(--c2)', 'var(--c5)'][i % 3]} dash="" width={2.4} /> : null)}
      {cl.kind === 'unique' && <Pt x={R[0][n]} y={R[1][n]} color="var(--c3)" r={7} label={`(${toFrac(R[0][n])}; ${toFrac(R[1][n])})`} />}
    </Plot>
  )
  return (
    <Split plot={plot2 || <div className="readout" style={{ minHeight: 120 }}><Readout>{'**Система.** $' + sysTex + '$'}</Readout>{strip}</div>}>
      {title && <b>{title}</b>}
      {plot2 && <Readout>{'$' + sysTex + '$'}</Readout>}
      {sliders}
      <Verdict tone={cl.kind === 'unique' ? 'good' : cl.kind === 'infinite' ? 'warn' : 'bad'}>{msg}</Verdict>
      <div className="stats"><Stat label="rk A" value={String(cl.rA)} /><Stat label="rk [A|b]" value={String(cl.rAb)} /><Stat label="неизвестных" value={String(n)} /></div>
      <Readout>{'Ступенчатый вид: $' + texMat(R, { bar: n }) + '$' + (sol ? '\n\nОтвет: $' + sol + '$' : '')}</Readout>
      {plot2 && strip}
      {!plot2 && null}
      <Note>{'Теорема Кронекера–Капелли: решения есть $\\iff\\operatorname{rk}A=\\operatorname{rk}[A|b]$; единственное — если ранг равен числу неизвестных.'}</Note>
    </Split>
  )
}

/* ============ Определитель как площадь ============ */
export function Det2({ a: a0 = 2, b: b0 = 1, c: c0 = 0.5, d: d0 = 1.5 }) {
  const [M, setM] = useState([[a0, b0], [c0, d0]])
  const [k, setK] = useState(1)
  const set = (i, j) => x => setM(m => m.map((r, ii) => r.map((v, jj) => (ii === i && jj === j ? x : v))))
  const D = det2(M)
  const u = [M[0][0] * k, M[1][0] * k], w = [M[0][1] * k, M[1][1] * k]
  const Dk = det2([[u[0], w[0]], [u[1], w[1]]])
  return (
    <Split plot={
      <Plot xr={[-5, 8]} yr={[-4, 7]} equal w={560} h={420}>
        <Poly pts={[[0, 0], [1, 0], [1, 1], [0, 1]]} color="var(--muted)" opacity={0.15} dash="4 3" />
        <Poly pts={[[0, 0], u, [u[0] + w[0], u[1] + w[1]], w]} color={D >= 0 ? 'var(--c3)' : 'var(--c4)'} opacity={0.22} />
        <Arrow x2={u[0]} y2={u[1]} color="var(--c1)" label="столбец 1" />
        <Arrow x2={w[0]} y2={w[1]} color="var(--c2)" label="столбец 2" />
      </Plot>}>
      <Readout>{`$A=${texMat(M)}$, $\\det A=${f4(D, 4)}$`}</Readout>
      <div className="stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <Slider label="a (1-я строка, 1-й столбец)" value={M[0][0]} min={-3} max={4} step={0.25} onChange={set(0, 0)} color="var(--c1)" />
        <Slider label="c (2-я строка, 1-й столбец)" value={M[1][0]} min={-3} max={4} step={0.25} onChange={set(1, 0)} color="var(--c1)" />
        <Slider label="b (1-я строка, 2-й столбец)" value={M[0][1]} min={-3} max={4} step={0.25} onChange={set(0, 1)} color="var(--c2)" />
        <Slider label="d (2-я строка, 2-й столбец)" value={M[1][1]} min={-3} max={4} step={0.25} onChange={set(1, 1)} color="var(--c2)" />
      </div>
      <Slider label="Растяжение всей матрицы $k$ (рассматриваем $kA$)" value={k} min={0.2} max={3} step={0.1} onChange={setK} color="var(--c5)" />
      <div className="stats">
        <Stat label="det A" value={f4(D, 4)} tone={Math.abs(D) < 1e-9 ? 'bad' : 'good'} sub={D > 0 ? 'ориентация сохранена' : D < 0 ? 'ориентация изменилась' : 'схлопнулось'} />
        <Stat label="площадь = |det|" value={f4(Math.abs(Dk), 4)} sub={`det(kA)=k²·det A`} />
        <Stat label="det A⁻¹" value={Math.abs(D) < 1e-9 ? 'нет' : f4(1 / D, 4)} />
      </div>
      <Verdict tone={Math.abs(D) < 1e-9 ? 'bad' : 'info'}>{Math.abs(D) < 1e-9 ? 'Параллелограмм вырождается в отрезок: столбцы коллинеарны, матрица необратима.' : '|det| — во сколько раз растянулась площадь единичного квадрата (серый); знак — сохранилась ли ориентация.'}</Verdict>
    </Split>
  )
}

/* ============ Интерполяция и определитель Вандермонда ============ */
export function Interp({ xs: xs0 = [0, 1, 2], ys: ys0 = [1, 3, 7] }) {
  const [xs, setXs] = useState(xs0), [ys, setYs] = useState(ys0)
  const V = xs.map(x => [1, x, x * x])
  const dV = (xs[1] - xs[0]) * (xs[2] - xs[0]) * (xs[2] - xs[1])
  const Vi = inv(V)
  const co = Vi ? mulv(Vi, ys) : null
  const p = x => (co ? co[0] + co[1] * x + co[2] * x * x : NaN)
  return (
    <Split plot={
      <Plot xr={[-1, 6]} yr={[-4, 12]} w={560} h={420} xlabel="x" ylabel="y">
        {co && <Curve f={p} color="var(--c1)" />}
        {xs.map((x, i) => <Handle key={i} x={x} y={ys[i]} color="var(--c2)" r={8} label={`(${f4(x, 3)}; ${f4(ys[i], 3)})`} onMove={(_, y) => setYs(a => a.map((v, k) => (k === i ? snap(y, 0.25) : v)))} />)}
      </Plot>}>
      <Readout>{co ? `$p(x)=${f4(co[0], 4)}${co[1] < 0 ? '-' : '+'}${f4(Math.abs(co[1]), 4)}x${co[2] < 0 ? '-' : '+'}${f4(Math.abs(co[2]), 4)}x^2$` : '**Единственного многочлена нет:** два узла совпали.'}</Readout>
      <Note>Перетаскивайте точки по вертикали (значения $y_i$), а узлы $x_i$ меняйте ползунками.</Note>
      {xs.map((x, i) => <Slider key={i} label={`Узел $x_${i + 1}$`} value={x} min={-0.5} max={5.5} step={0.25} onChange={t => setXs(a => a.map((v, k) => (k === i ? t : v)))} color="var(--c2)" />)}
      <Readout>{`$V=${texMat(V, { frac: true })}$, $\\det V=(x_2-x_1)(x_3-x_1)(x_3-x_2)=${f4(dV, 4)}$`}</Readout>
      <Verdict tone={Math.abs(dV) < 1e-9 ? 'bad' : 'good'}>{Math.abs(dV) < 1e-9 ? '$\\det V=0$: два узла совпали — через такие данные нужного многочлена не провести (или их бесконечно много).' : 'Узлы различны ⇒ $\\det V\\ne0$ ⇒ многочлен степени $\\le2$ через три точки существует и единствен.'}</Verdict>
    </Split>
  )
}

/* ============ Проверка подпространства в ℝ² ============ */
const SETS = {
  line: { name: 'прямая $y=2x$', has: (x, y) => Math.abs(y - 2 * x) < 0.13, sub: true },
  shifted: { name: 'сдвинутая прямая $y=2x+1$', has: (x, y) => Math.abs(y - 2 * x - 1) < 0.13, sub: false },
  quadrant: { name: 'первая четверть', has: (x, y) => x >= -1e-9 && y >= -1e-9, sub: false },
  axes: { name: 'объединение осей $xy=0$', has: (x, y) => Math.abs(x * y) < 0.01, sub: false },
  disk: { name: 'круг $x^2+y^2\\le4$', has: (x, y) => x * x + y * y <= 4 + 1e-9, sub: false },
  plane: { name: 'вся плоскость', has: () => true, sub: true },
}
export function Subspace2d({ sets = ['line', 'shifted', 'quadrant', 'axes', 'disk'], set: s0, u: u0 = [0.5, 1], v: v0 = [1, 2] }) {
  const [key, setKey] = useState(s0 || sets[0])
  const S = SETS[key]
  const [u, setU] = useState(u0), [v, setV] = useState(v0)
  const [lam, setLam] = useState(-1)
  const sum = [u[0] + v[0], u[1] + v[1]], sc = [lam * u[0], lam * u[1]]
  const okU = S.has(...u), okV = S.has(...v), okSum = S.has(...sum), okSc = S.has(...sc), okO = S.has(0, 0)
  const T = (ok, txt) => <div style={{ color: ok ? 'var(--good)' : 'var(--bad)', fontWeight: 700 }}>{ok ? '✓' : '✗'} {inline(txt, 'tt')}</div>
  return (
    <Split plot={
      <Plot xr={[-5, 5]} yr={[-4.2, 4.2]} equal w={540} h={440}>
        {key === 'line' && <Curve f={x => 2 * x} color="var(--c3)" width={3} />}
        {key === 'shifted' && <Curve f={x => 2 * x + 1} color="var(--c3)" width={3} />}
        {key === 'quadrant' && <Poly pts={[[0, 0], [6, 0], [6, 6], [0, 6]]} color="var(--c3)" opacity={0.2} stroke={false} />}
        {key === 'axes' && <><HLine y={0} color="var(--c3)" dash="" width={3} /><VLine x={0} color="var(--c3)" dash="" width={3} /></>}
        {key === 'disk' && <Param f={t => [2 * Math.cos(t), 2 * Math.sin(t)]} from={0} to={2 * Math.PI} closed color="var(--c3)" width={2.6} />}
        {key === 'plane' && <Rect x0={-6} x1={6} y0={-6} y1={6} color="var(--c3)" opacity={0.1} stroke={false} />}
        <Pt x={0} y={0} color="var(--ink)" r={4} />
        <Arrow x2={u[0]} y2={u[1]} color="var(--c1)" label="u" />
        <Arrow x2={v[0]} y2={v[1]} color="var(--c2)" label="v" />
        <Arrow x2={sum[0]} y2={sum[1]} color="var(--c5)" label="u+v" dash="5 3" />
        <Arrow x2={sc[0]} y2={sc[1]} color="var(--c4)" label="λu" dash="5 3" />
        <Handle x={u[0]} y={u[1]} onMove={(x, y) => setU([snap(x, 0.5), snap(y, 0.5)])} color="var(--c1)" r={7} />
        <Handle x={v[0]} y={v[1]} onMove={(x, y) => setV([snap(x, 0.5), snap(y, 0.5)])} color="var(--c2)" r={7} />
      </Plot>}>
      <div><div className="muted small" style={{ marginBottom: 4 }}>Множество S (зелёное)</div>
        <Segmented options={sets.map(k => ({ v: k, l: SETS[k].name }))} value={key} onChange={setKey} /></div>
      <Slider label="Число $\lambda$" value={lam} min={-3} max={3} step={0.5} onChange={setLam} color="var(--c4)" />
      <div className="readout">
        <div className="muted small" style={{ marginBottom: 4 }}>Три теста подпространства (для выбранных u, v из S):</div>
        {T(okO, '$\\vec0\\in S$')}{T(okU && okV, '$u,v\\in S$ (перетащите их внутрь $S$)')}{T(okSum, '$u+v\\in S$')}{T(okSc, '$\\lambda u\\in S$')}
      </div>
      <Verdict tone={S.sub ? 'good' : 'bad'}>{S.sub ? 'Это подпространство: все три теста проходят для любых $u,v$ и $\\lambda$.' : 'Не подпространство: найдите $u,v,\\lambda$, при которых хотя бы один из тестов проваливается.'}</Verdict>
    </Split>
  )
}

/* ============ Необычное пространство: положительные числа ============ */
export function PosSpace() {
  const [lx, setLx] = useState(0.7), [ly, setLy] = useState(1.1), [lam, setLam] = useState(2), [mu, setMu] = useState(-1)
  const x = Math.exp(lx), y = Math.exp(ly)
  const sum = x * y, sc = Math.pow(x, lam)
  const lhs = Math.pow(x, lam + mu), rhs = Math.pow(x, lam) * Math.pow(x, mu)
  const lhs2 = Math.pow(x * y, lam), rhs2 = Math.pow(x, lam) * Math.pow(y, lam)
  return (
    <Split plot={
      <Plot xr={[-4, 4]} yr={[0, 4]} w={540} h={260} grid yticks={[]} xlabel="ln(число)">
        {[0.25, 0.5, 1, 2, 4, 8].map(t => <g key={t}><Seg x1={Math.log(t)} y1={0.2} x2={Math.log(t)} y2={0.5} color="var(--muted)" width={1.4} /><Label x={Math.log(t)} y={0.05} anchor="middle" dy={-2} color="var(--muted)">{t}</Label></g>)}
        <Seg x1={-4} y1={0.35} x2={4} y2={0.35} color="var(--muted)" width={1.4} />
        <Pt x={Math.log(x)} y={1.2} color="var(--c1)" label={`x=${f4(x, 3)}`} r={7} />
        <Pt x={Math.log(y)} y={2.0} color="var(--c2)" label={`y=${f4(y, 3)}`} r={7} />
        {Math.abs(Math.log(sum)) < 4 && <Pt x={Math.log(sum)} y={2.8} color="var(--c5)" label={`x⊕y = ${f4(sum, 4)}`} r={7} />}
        {Math.abs(Math.log(sc)) < 4 && <Pt x={Math.log(sc)} y={3.5} color="var(--c4)" label={`λ⊙x = ${f4(sc, 4)}`} r={7} />}
        <Pt x={0} y={0.35} color="var(--c3)" r={5} hollow label="0-вектор = 1" dy={-12} />
      </Plot>}>
      <Readout>{'Операции: $x\\oplus y=xy$, $\\ \\lambda\\odot x=x^{\\lambda}$ на множестве $\\mathbb R_{>0}$'}</Readout>
      <Slider label="$\ln x$ (положение $x$)" value={lx} min={-2} max={2} step={0.05} onChange={setLx} color="var(--c1)" fmt={v => `x = ${f4(Math.exp(v), 3)}`} />
      <Slider label="$\ln y$" value={ly} min={-2} max={2} step={0.05} onChange={setLy} color="var(--c2)" fmt={v => `y = ${f4(Math.exp(v), 3)}`} />
      <Slider label="Число $\lambda$" value={lam} min={-3} max={3} step={0.5} onChange={setLam} color="var(--c4)" />
      <Slider label="Число $\mu$" value={mu} min={-3} max={3} step={0.5} onChange={setMu} color="var(--c5)" />
      <Readout>{`$(\\lambda+\\mu)\\odot x=x^{${f4(lam + mu, 3)}}=${f4(lhs, 5)}$ и $\\lambda\\odot x\\oplus\\mu\\odot x=${f4(rhs, 5)}$ ${Math.abs(lhs - rhs) < 1e-9 ? '✓' : '✗'}

$\\lambda\\odot(x\\oplus y)=${f4(lhs2, 5)}$ и $\\lambda\\odot x\\oplus\\lambda\\odot y=${f4(rhs2, 5)}$ ${Math.abs(lhs2 - rhs2) < 1e-9 ? '✓' : '✗'}

Нулевой вектор: $1$ (так как $x\\cdot1=x$). Противоположный к $x$: $\\tfrac1x=${f4(1 / x, 5)}$.`}</Readout>
      <Verdict tone="info">В логарифмической шкале «сложение» = $\cdot$ превращается в обычное сложение, а «умножение на число» — в обычное: это то же самое пространство $\mathbb R$.</Verdict>
    </Split>
  )
}

/* ============ Независимость, оболочка, координаты в ℝ² ============ */
export function Span2d({ u: u0 = [2, 1], v: v0 = [1, 2], t: w0 = [3, 3] }) {
  const [u, setU] = useState(u0), [v, setV] = useState(v0), [w, setW] = useState(w0)
  const D = u[0] * v[1] - u[1] * v[0]
  const indep = Math.abs(D) > 1e-9
  let a = NaN, b = NaN, inSpan = false
  if (indep) { a = (w[0] * v[1] - w[1] * v[0]) / D; b = (u[0] * w[1] - u[1] * w[0]) / D; inSpan = true }
  else {
    // зависимы: span — прямая (или точка)
    const base = Math.hypot(...u) > 1e-9 ? u : v
    if (Math.hypot(...base) > 1e-9) inSpan = Math.abs(base[0] * w[1] - base[1] * w[0]) < 1e-9
  }
  const lat = []
  if (indep) for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) lat.push([i * u[0] + j * v[0], i * u[1] + j * v[1]])
  return (
    <Split plot={
      <Plot xr={[-6, 6]} yr={[-4.8, 4.8]} equal w={560} h={450}>
        {indep ? <Dots pts={lat.filter(p => Math.abs(p[0]) < 7 && Math.abs(p[1]) < 6)} r={2} color="var(--muted)" /> : (
          <Curve f={t => (Math.abs(u[0]) > 1e-9 ? (u[1] / u[0]) * t : 0)} from={-7} to={7} color="var(--c4)" width={3} opacity={0.6} />
        )}
        {indep && <Poly pts={[[0, 0], [a * u[0], a * u[1]], [a * u[0] + b * v[0], a * u[1] + b * v[1]], [b * v[0], b * v[1]]]} color="var(--c3)" opacity={0.12} dash="4 3" />}
        <Arrow x2={u[0]} y2={u[1]} color="var(--c1)" label="u" /><Arrow x2={v[0]} y2={v[1]} color="var(--c2)" label="v" />
        <Arrow x2={w[0]} y2={w[1]} color="var(--c3)" label="w" />
        <Handle x={u[0]} y={u[1]} onMove={(x, y) => setU([snap(x, 0.5), snap(y, 0.5)])} color="var(--c1)" r={7} />
        <Handle x={v[0]} y={v[1]} onMove={(x, y) => setV([snap(x, 0.5), snap(y, 0.5)])} color="var(--c2)" r={7} />
        <Handle x={w[0]} y={w[1]} onMove={(x, y) => setW([snap(x, 0.5), snap(y, 0.5)])} color="var(--c3)" r={7} />
      </Plot>}>
      <Note>Перетаскивайте $u$ (синий), $v$ (оранжевый) и $w$ (зелёный). Точки решётки — все целочисленные комбинации $iu+jv$.</Note>
      <div className="stats">
        <Stat label="det(u, v)" value={f4(D, 4)} tone={indep ? 'good' : 'bad'} />
        <Stat label="rk{u, v}" value={indep ? '2' : Math.hypot(...u) + Math.hypot(...v) < 1e-9 ? '0' : '1'} />
        <Stat label="dim span" value={indep ? '2' : '≤ 1'} />
      </div>
      <Verdict tone={indep ? 'good' : 'bad'}>{indep ? '$u,v$ линейно независимы: они образуют базис $\\mathbb R^2$.' : '$u,v$ линейно зависимы: один выражается через другой, оболочка — прямая (или точка).'}</Verdict>
      <Readout>{indep ? `Координаты $w$ в базисе $(u,v)$: $[w]=\\begin{pmatrix}${toTex(a)}\\\\${toTex(b)}\\end{pmatrix}$, то есть $w=${toFrac(a)}\\,u${b < 0 ? '' : '+'}${toFrac(b)}\\,v$.` : inSpan ? '$w$ лежит на этой прямой: $w\\in\\operatorname{span}(u,v)$, но координаты определены неоднозначно.' : '$w\\notin\\operatorname{span}(u,v)$ — выразить нельзя.'}</Readout>
    </Split>
  )
}

export default { cplx: Cplx, croots: CRoots, sys: Sys, det2: Det2, interp: Interp, subspace2d: Subspace2d, posspace: PosSpace, span2d: Span2d }
