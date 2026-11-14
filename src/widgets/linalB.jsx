import React, { useState } from 'react'
import { Plot, Curve, Pt, Seg, Arrow, Handle, Poly, Param, Label, Dots } from '../lib/plot.jsx'
import { Slider, Toggle, Segmented, Stat } from '../lib/ui.jsx'
import { inline } from '../lib/rich.jsx'
import { rref, rank, nullspace, det2, inv2, mul, T, toFrac, toTex, texMat, colspaceBasis, rowspaceBasis, eig2, eigvec2, det } from '../lib/linalg.js'
import { Split, Verdict, Readout, Note, f4 } from './common.jsx'

const snap = (v, s = 0.5) => Math.round(v / s) * s
const vecTex = v => '\\begin{pmatrix}' + v.map(toTex).join('\\\\') + '\\end{pmatrix}'
const mm = (A, v) => [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]]

/* ============ Редактируемая матрица: РСВ, ранг, четыре подпространства ============ */
export function RrefLab({ A: A0, spaces = true, aug = null, caption }) {
  const [M, setM] = useState(A0)
  const m = M.length, n = M[0].length
  const { R, pivots } = rref(M, aug != null ? n - aug : null)
  const rk = pivots.length
  const cs = colspaceBasis(M), rs = rowspaceBasis(M), ns = nullspace(M), lns = nullspace(T(M))
  const setCell = (i, j, v) => setM(a => a.map((r, ii) => r.map((x, jj) => (ii === i && jj === j ? v : x))))
  const list = vs => (vs.length ? vs.map(v => vecTex(v)).join(',\\ ') : '\\{\\vec0\\}')
  return (
    <div className="lab-split">
      <div>
        {caption && <div className="muted small" style={{ marginBottom: 6 }}>{inline(caption, 'cap')}</div>}
        <div className="muted small">Меняйте числа в матрице — всё пересчитывается.</div>
        <table style={{ borderCollapse: 'separate', borderSpacing: 4, margin: '8px 0' }}>
          <tbody>{M.map((r, i) => <tr key={i}>{r.map((x, j) => (
            <td key={j} style={aug != null && j === n - aug ? { borderLeft: '2px solid var(--ink)', paddingLeft: 6 } : undefined}>
              <input type="number" step="0.5" value={x} onChange={e => setCell(i, j, parseFloat(e.target.value) || 0)} style={{ width: 62, textAlign: 'center' }} />
            </td>))}</tr>)}</tbody>
        </table>
        <Readout>{'Улучшенный ступенчатый вид: $' + texMat(R, aug != null ? { bar: n - aug } : {}) + '$'}</Readout>
      </div>
      <div className="controls">
        <div className="stats">
          <Stat label="ранг" value={String(rk)} tone="good" sub={`ведущие столбцы: ${pivots.map(p => p + 1).join(', ') || '—'}`} />
          <Stat label="размер" value={`${m}×${n}`} />
          <Stat label="dim Ker" value={String(n - rk)} sub="= n − ранг" />
        </div>
        {spaces && (
          <Readout>
            {`**Базис $C(A)$** (столбцы с ведущими): $${list(cs)}$\n\n**Базис $C(A^T)$** (ненулевые строки РСВ): $${list(rs)}$\n\n**Базис $N(A)$** (ядро): $${list(ns)}$\n\n**Базис $N(A^T)$**: $${list(lns)}$\n\n$\\dim C(A)=${rk}$, $\\dim C(A^T)=${rk}$, $\\dim N(A)=${n - rk}$, $\\dim N(A^T)=${m - rk}$`}
          </Readout>
        )}
        <Verdict tone="info">{`Теорема о ранге и дефекте: $${n}=${rk}+${n - rk}$ (число столбцов = ранг + размерность ядра).`}</Verdict>
      </div>
    </div>
  )
}

/* ============ Два базиса и матрица перехода ============ */
export function Basis2d({ B: B0 = [[1, 0], [1, 1]], C: C0 = [[1, 1], [0, 1]], v: v0 = [3, 2], showC = true }) {
  const [B, setB] = useState(B0), [C, setC] = useState(C0), [v, setV] = useState(v0)
  const PB = T(B), PC = T(C)          // столбцы — базисные векторы
  const iB = inv2(PB), iC = inv2(PC)
  const okB = !!iB, okC = !!iC
  const vB = okB ? mm(iB, v) : [NaN, NaN], vC = okC ? mm(iC, v) : [NaN, NaN]
  const P = okB && okC ? mul(iC, PB) : null         // P_{B→C}
  const lat = (Bm, col) => {
    const pts = []
    for (let i = -8; i <= 8; i++) for (let j = -8; j <= 8; j++) pts.push([i * Bm[0][0] + j * Bm[1][0], i * Bm[0][1] + j * Bm[1][1]])
    return <Dots pts={pts.filter(p => Math.abs(p[0]) < 8.5 && Math.abs(p[1]) < 7)} r={2} color={col} />
  }
  return (
    <Split plot={
      <Plot xr={[-8, 8]} yr={[-6.4, 6.4]} equal w={560} h={450}>
        {okB && lat(B, 'var(--c1)')}
        {showC && okC && lat(C, 'var(--c2)')}
        <Arrow x2={B[0][0]} y2={B[0][1]} color="var(--c1)" label="b₁" /><Arrow x2={B[1][0]} y2={B[1][1]} color="var(--c1)" label="b₂" />
        {showC && <><Arrow x2={C[0][0]} y2={C[0][1]} color="var(--c2)" label="c₁" /><Arrow x2={C[1][0]} y2={C[1][1]} color="var(--c2)" label="c₂" /></>}
        <Arrow x2={v[0]} y2={v[1]} color="var(--c3)" width={3.4} label="v" />
        <Handle x={B[0][0]} y={B[0][1]} onMove={(x, y) => setB(([, b2]) => [[snap(x), snap(y)], b2])} color="var(--c1)" r={7} />
        <Handle x={B[1][0]} y={B[1][1]} onMove={(x, y) => setB(([b1]) => [b1, [snap(x), snap(y)]])} color="var(--c1)" r={7} />
        {showC && <Handle x={C[0][0]} y={C[0][1]} onMove={(x, y) => setC(([, c2]) => [[snap(x), snap(y)], c2])} color="var(--c2)" r={7} />}
        {showC && <Handle x={C[1][0]} y={C[1][1]} onMove={(x, y) => setC(([c1]) => [c1, [snap(x), snap(y)]])} color="var(--c2)" r={7} />}
        <Handle x={v[0]} y={v[1]} onMove={(x, y) => setV([snap(x), snap(y)])} color="var(--c3)" r={8} />
      </Plot>}>
      <Note>Перетаскивайте базисные векторы $b_1,b_2$ (синие), $c_1,c_2$ (оранжевые) и вектор $v$ (зелёный). Точки — «решётки» координат в каждом базисе.</Note>
      <Readout>
        {`$v=${vecTex(v)}$ в стандартном базисе.\n\n` +
          (okB ? `$[v]_B=${vecTex(vB)}$: $v=${toFrac(vB[0])}\\,b_1${vB[1] < 0 ? '' : '+'}${toFrac(vB[1])}\\,b_2$.` : '**$B$ не базис** (векторы коллинеарны).') + '\n\n' +
          (showC ? (okC ? `$[v]_C=${vecTex(vC)}$.` : '**$C$ не базис.**') : '')}
      </Readout>
      {showC && P && <Readout>{`$P_{B\\to C}=C^{-1}B=${texMat(P)}$, $\\ P_{C\\to B}=P_{B\\to C}^{-1}=${texMat(inv2(P))}$\n\nПроверка: $P_{B\\to C}[v]_B=${vecTex(mm(P, vB))}=[v]_C$ ✓`}</Readout>}
      <Verdict tone="info">Вектор $v$ один и тот же, меняются только его «адреса» (координаты) — как GPS и почтовый адрес одного дома.</Verdict>
    </Split>
  )
}

/* ============ Линейное преобразование плоскости ============ */
const PRESETS = {
  'единичное': [[1, 0], [0, 1]],
  'поворот 90°': [[0, -1], [1, 0]],
  'поворот 45°': [[0.7071, -0.7071], [0.7071, 0.7071]],
  'отражение': [[0, 1], [1, 0]],
  'сдвиг': [[1, 1], [0, 1]],
  'растяжение': [[2, 0], [0, 0.5]],
  'проекция': [[1, 0], [0, 0]],
  'вырожденное': [[1, 2], [2, 4]],
}
const FLET = [[0, 0], [0.3, 0], [0.3, 0.55], [0.7, 0.55], [0.7, 0.8], [0.3, 0.8], [0.3, 1.0], [0.9, 1.0], [0.9, 1.2], [0, 1.2]]
export function LinTrans({ M: M0 = [[1, 1], [0, 1]], presets = Object.keys(PRESETS), grid = true }) {
  const [M, setM] = useState(M0)
  const set = (i, j) => x => setM(m => m.map((r, ii) => r.map((v, jj) => (ii === i && jj === j ? x : v))))
  const D = det2(M), rk = rank(M)
  const ns = nullspace(M)
  const img = p => mm(M, p)
  const tr = M[0][0] + M[1][1]
  const lattice = []
  if (grid) for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) lattice.push(img([i, j]))
  return (
    <Split plot={
      <Plot xr={[-6, 6]} yr={[-4.8, 4.8]} equal w={560} h={450}>
        {grid && <Dots pts={lattice.filter(p => Math.abs(p[0]) < 7 && Math.abs(p[1]) < 6)} r={1.8} color="var(--muted)" />}
        <Poly pts={[[0, 0], [1, 0], [1, 1], [0, 1]]} color="var(--muted)" opacity={0.12} dash="4 3" />
        <Poly pts={FLET} color="var(--muted)" opacity={0.15} dash="3 3" width={1} />
        <Poly pts={[[0, 0], img([1, 0]), img([1, 1]), img([0, 1])]} color={D >= 0 ? 'var(--c3)' : 'var(--c4)'} opacity={0.2} />
        <Poly pts={FLET.map(img)} color="var(--c1)" opacity={0.35} width={1.6} />
        <Arrow x2={1} y2={0} color="var(--muted)" width={1.8} dash="3 3" /><Arrow x2={0} y2={1} color="var(--muted)" width={1.8} dash="3 3" />
        <Arrow x2={M[0][0]} y2={M[1][0]} color="var(--c1)" label="T(e₁)" /><Arrow x2={M[0][1]} y2={M[1][1]} color="var(--c2)" label="T(e₂)" />
        {rk === 1 && ns[0] && <Curve f={t => (Math.abs(ns[0][0]) > 1e-9 ? (ns[0][1] / ns[0][0]) * t : 0)} from={-6} to={6} color="var(--c4)" dash="6 4" width={2} />}
      </Plot>}>
      <div><div className="muted small" style={{ marginBottom: 4 }}>Готовые преобразования</div><Segmented options={presets.map(k => ({ v: k, l: k }))} value={Object.keys(PRESETS).find(k => PRESETS[k].flat().join() === M.flat().join()) || ''} onChange={k => setM(PRESETS[k])} /></div>
      <Readout>{`Столбцы матрицы — образы базисных векторов: $T(e_1)=${vecTex([M[0][0], M[1][0]])}$, $T(e_2)=${vecTex([M[0][1], M[1][1]])}$`}</Readout>
      <div className="stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Slider label="a" value={M[0][0]} min={-5} max={5} step={0.1} onChange={set(0, 0)} color="var(--c1)" /><Slider label="b" value={M[0][1]} min={-5} max={5} step={0.1} onChange={set(0, 1)} color="var(--c2)" />
        <Slider label="c" value={M[1][0]} min={-5} max={5} step={0.1} onChange={set(1, 0)} color="var(--c1)" /><Slider label="d" value={M[1][1]} min={-5} max={5} step={0.1} onChange={set(1, 1)} color="var(--c2)" />
      </div>
      <div className="stats">
        <Stat label="det" value={f4(D, 4)} tone={Math.abs(D) < 1e-6 ? 'bad' : 'good'} sub={D < 0 ? 'отражение' : ''} /><Stat label="ранг" value={String(rk)} /><Stat label="dim Ker" value={String(2 - rk)} sub={'dim Im = ' + rk} /><Stat label="след" value={f4(tr, 4)} />
      </div>
      <Verdict tone={rk === 2 ? 'good' : 'warn'}>{rk === 2 ? 'Обратимо: плоскость переходит в плоскость, ядро нулевое, преобразование — изоморфизм.' : rk === 1 ? 'Плоскость «схлопнулась» в прямую (синяя область тоньше): ядро — красная прямая, всё на ней уходит в $\\vec0$.' : 'Нулевое преобразование: образ — одна точка.'}</Verdict>
    </Split>
  )
}

/* ============ Матрица оператора в другом базисе (подобие) ============ */
export function Simil({ A: A0 = [[3, 1], [0, 2]], B: B0 = [[1, 0], [1, -1]] }) {
  const [A, setA] = useState(A0), [B, setB] = useState(B0)
  const set = (i, j) => x => setA(m => m.map((r, ii) => r.map((v, jj) => (ii === i && jj === j ? x : v))))
  const P = T(B), iP = inv2(P)
  const AB = iP ? mul(iP, mul(A, P)) : null
  const Ab1 = mm(A, B[0]), Ab2 = mm(A, B[1])
  const diag = AB && Math.abs(AB[0][1]) < 1e-9 && Math.abs(AB[1][0]) < 1e-9
  return (
    <Split plot={
      <Plot xr={[-6, 6]} yr={[-4.8, 4.8]} equal w={560} h={450}>
        <Arrow x2={B[0][0]} y2={B[0][1]} color="var(--c1)" label="b₁" /><Arrow x2={B[1][0]} y2={B[1][1]} color="var(--c2)" label="b₂" />
        <Arrow x2={Ab1[0]} y2={Ab1[1]} color="var(--c1)" dash="5 3" width={2.4} label="Ab₁" />
        <Arrow x2={Ab2[0]} y2={Ab2[1]} color="var(--c2)" dash="5 3" width={2.4} label="Ab₂" />
        <Handle x={B[0][0]} y={B[0][1]} onMove={(x, y) => setB(([, b2]) => [[snap(x), snap(y)], b2])} color="var(--c1)" r={7} />
        <Handle x={B[1][0]} y={B[1][1]} onMove={(x, y) => setB(([b1]) => [b1, [snap(x), snap(y)]])} color="var(--c2)" r={7} />
      </Plot>}>
      <Readout>{`Оператор в стандартном базисе: $A=${texMat(A)}$`}</Readout>
      <div className="stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Slider label="a₁₁" value={A[0][0]} min={-4} max={4} step={0.5} onChange={set(0, 0)} /><Slider label="a₁₂" value={A[0][1]} min={-4} max={4} step={0.5} onChange={set(0, 1)} />
        <Slider label="a₂₁" value={A[1][0]} min={-4} max={4} step={0.5} onChange={set(1, 0)} /><Slider label="a₂₂" value={A[1][1]} min={-4} max={4} step={0.5} onChange={set(1, 1)} />
      </div>
      <Note>Перетаскивайте базис $b_1,b_2$. Пунктир — образы $Ab_1,Ab_2$; их координаты в базисе $B$ — столбцы $[A]_B$.</Note>
      {AB ? <Readout>{`$[A]_B=P^{-1}AP=${texMat(AB)}$, где $P=${texMat(P)}$\n\n$\\operatorname{tr}A=${f4(A[0][0] + A[1][1], 4)}$, $\\operatorname{tr}[A]_B=${f4(AB[0][0] + AB[1][1], 4)}$; $\\det A=${f4(det2(A), 4)}$, $\\det[A]_B=${f4(det2(AB), 4)}$`}</Readout> : <Verdict tone="bad">$b_1,b_2$ не образуют базис.</Verdict>}
      {diag && <Verdict tone="good">Матрица диагональная: $B$ — базис из собственных векторов, $Ab_i=\lambda_ib_i$ (пунктир лежит на самих векторах).</Verdict>}
    </Split>
  )
}

/* ============ Собственные значения и векторы 2×2 ============ */
export function Eigen2({ M: M0 = [[2, 1], [1, 2]], iterate = false, v0 = [1, 0.3] }) {
  const [M, setM] = useState(M0)
  const [phi, setPhi] = useState(30)
  const [it, setIt] = useState(iterate)
  const [k, setK] = useState(6)
  const [a0, setA0] = useState(Math.round((Math.atan2(v0[1], v0[0]) * 180) / Math.PI))
  const set = (i, j) => x => setM(m => m.map((r, ii) => r.map((v, jj) => (ii === i && jj === j ? x : v))))
  const [l1, l2] = eig2(M)
  const real = Math.abs(l1.im) < 1e-9
  const tr = M[0][0] + M[1][1], dt = det2(M)
  const x = [Math.cos((phi * Math.PI) / 180), Math.sin((phi * Math.PI) / 180)]
  const Ax = mm(M, x)
  const e1 = real ? eigvec2(M, l1.re) : null, e2 = real && Math.abs(l1.re - l2.re) > 1e-9 ? eigvec2(M, l2.re) : null
  const scalar = Math.abs(M[0][1]) < 1e-9 && Math.abs(M[1][0]) < 1e-9 && Math.abs(M[0][0] - M[1][1]) < 1e-9
  const path = [[Math.cos((a0 * Math.PI) / 180), Math.sin((a0 * Math.PI) / 180)]]
  for (let j = 0; j < k; j++) path.push(mm(M, path[j]))
  const R = it ? Math.max(4, ...path.map(p => Math.hypot(...p)) ) * 1.1 : Math.max(4, Math.hypot(...Ax) * 1.4, Math.max(Math.abs(l1.re), Math.abs(l2.re)) * 1.3)
  const cap = Math.min(R, 40)
  const fmt = l => (Math.abs(l.im) < 1e-9 ? f4(l.re, 4) : `${f4(l.re, 3)} ${l.im < 0 ? '−' : '+'} ${f4(Math.abs(l.im), 3)}i`)
  const diag = real && (Math.abs(l1.re - l2.re) > 1e-9 || scalar)
  return (
    <Split plot={
      <Plot xr={[-cap, cap]} yr={[-cap * 0.8, cap * 0.8]} equal w={560} h={450}>
        <Param f={t => [Math.cos(t), Math.sin(t)]} from={0} to={2 * Math.PI} color="var(--muted)" dash="4 3" width={1.2} />
        <Param f={t => mm(M, [Math.cos(t), Math.sin(t)])} from={0} to={2 * Math.PI} color="var(--c1)" width={2} />
        {e1 && <Curve f={t => (Math.abs(e1[0]) > 1e-9 ? (e1[1] / e1[0]) * t : 0)} from={-cap} to={cap} color="var(--c3)" dash="6 4" width={2} />}
        {e2 && <Curve f={t => (Math.abs(e2[0]) > 1e-9 ? (e2[1] / e2[0]) * t : 0)} from={-cap} to={cap} color="var(--c5)" dash="6 4" width={2} />}
        {e1 && Math.abs(e1[0]) < 1e-9 && <Seg x1={0} y1={-cap} x2={0} y2={cap} color="var(--c3)" dash="6 4" />}
        {e2 && Math.abs(e2[0]) < 1e-9 && <Seg x1={0} y1={-cap} x2={0} y2={cap} color="var(--c5)" dash="6 4" />}
        {!it && <><Arrow x2={x[0]} y2={x[1]} color="var(--c2)" label="x" /><Arrow x2={Ax[0]} y2={Ax[1]} color="var(--c4)" label="Ax" /></>}
        {it && <Dots pts={path} r={4} color="var(--c4)" line />}
      </Plot>}>
      <div className="stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Slider label="a" value={M[0][0]} min={-3} max={3} step={0.25} onChange={set(0, 0)} /><Slider label="b" value={M[0][1]} min={-3} max={3} step={0.25} onChange={set(0, 1)} />
        <Slider label="c" value={M[1][0]} min={-3} max={3} step={0.25} onChange={set(1, 0)} /><Slider label="d" value={M[1][1]} min={-3} max={3} step={0.25} onChange={set(1, 1)} />
      </div>
      <Toggle label="показать степени $A^k v$ (итерации)" value={it} onChange={setIt} />
      {!it && <Slider label="Направление вектора $x$ (единичного)" value={phi} min={0} max={360} step={1} onChange={setPhi} unit="°" color="var(--c2)" />}
      {it && <><Slider label="Стартовое направление" value={a0} min={0} max={360} step={1} onChange={setA0} unit="°" color="var(--c2)" /><Slider label="Число шагов $k$" value={k} min={1} max={15} step={1} onChange={setK} /></>}
      <Readout>{`$p(\\lambda)=\\lambda^2-${f4(tr, 4)}\\lambda+${f4(dt, 4)}$, $\\ \\lambda_1=${fmt(l1)}$, $\\lambda_2=${fmt(l2)}$`}</Readout>
      <div className="stats">
        <Stat label="след = λ₁+λ₂" value={f4(tr, 4)} /><Stat label="det = λ₁λ₂" value={f4(dt, 4)} /><Stat label="дискриминант" value={f4(tr * tr - 4 * dt, 4)} />
      </div>
      <Verdict tone={!real ? 'warn' : diag ? 'good' : 'bad'}>{!real ? 'Вещественных собственных векторов нет (комплексные $\\lambda$): матрица «вращает», ни одно направление не сохраняется.' : diag ? 'Два независимых собственных направления (пунктир) ⇒ матрица диагонализируема: на каждом направлении $A$ просто умножает на $\\lambda$.' : 'Одно собственное направление при кратном $\\lambda$ ⇒ жорданова клетка, не диагонализируема.'}</Verdict>
      {!it && real && <Note>Крутите $x$: когда $x$ и $Ax$ лежат на одной прямой (в пунктире), это собственный вектор.</Note>}
    </Split>
  )
}

/* ============ Скалярное произведение ⟨x,y⟩ = xᵀGy ============ */
export function Inner2({ G: G0 = [[1, 0], [0, 1]], u: u0 = [2, 0], v: v0 = [1, 2] }) {
  const [g11, setG11] = useState(G0[0][0]), [g22, setG22] = useState(G0[1][1]), [g12, setG12] = useState(G0[0][1])
  const [u, setU] = useState(u0), [v, setV] = useState(v0)
  const ip = (a, b) => g11 * a[0] * b[0] + g12 * (a[0] * b[1] + a[1] * b[0]) + g22 * a[1] * b[1]
  const posdef = g11 > 1e-9 && g11 * g22 - g12 * g12 > 1e-9
  const nu = Math.sqrt(Math.max(ip(u, u), 0)), nv = Math.sqrt(Math.max(ip(v, v), 0))
  const ipuv = ip(u, v)
  const cs = nu * nv > 1e-9 ? ipuv / (nu * nv) : NaN
  const ang = Number.isFinite(cs) ? (Math.acos(Math.max(-1, Math.min(1, cs))) * 180) / Math.PI : NaN
  let l11, l21, l22
  if (posdef) { l11 = Math.sqrt(g11); l21 = g12 / l11; l22 = Math.sqrt(g22 - l21 * l21) }
  const unit = t => [Math.cos(t) / l11 - (l21 * Math.sin(t)) / (l11 * l22), Math.sin(t) / l22]
  const ortho = Number.isFinite(cs) && Math.abs(cs) < 0.02
  return (
    <Split plot={
      <Plot xr={[-4, 4]} yr={[-3.2, 3.2]} equal w={540} h={440}>
        {posdef && <Param f={unit} from={0} to={2 * Math.PI} closed color="var(--c3)" width={2.2} dash="6 4" />}
        <Arrow x2={u[0]} y2={u[1]} color="var(--c1)" label="u" /><Arrow x2={v[0]} y2={v[1]} color="var(--c2)" label="v" />
        <Handle x={u[0]} y={u[1]} onMove={(x, y) => setU([snap(x, 0.25), snap(y, 0.25)])} color="var(--c1)" r={7} />
        <Handle x={v[0]} y={v[1]} onMove={(x, y) => setV([snap(x, 0.25), snap(y, 0.25)])} color="var(--c2)" r={7} />
      </Plot>}>
      <Readout>{`$\\langle x,y\\rangle=${f4(g11, 3)}x_1y_1${g12 < 0 ? '-' : '+'}${f4(Math.abs(g12), 3)}(x_1y_2+x_2y_1)+${f4(g22, 3)}x_2y_2$, матрица Грама $G=${texMat([[g11, g12], [g12, g22]])}$`}</Readout>
      <Slider label="$g_{11}$ (вес первой координаты)" value={g11} min={-1} max={4} step={0.25} onChange={setG11} />
      <Slider label="$g_{22}$ (вес второй)" value={g22} min={-1} max={4} step={0.25} onChange={setG22} color="var(--c2)" />
      <Slider label="$g_{12}$ (перекрёстный член)" value={g12} min={-2.5} max={2.5} step={0.25} onChange={setG12} color="var(--c5)" />
      <div className="stats">
        <Stat label="⟨u,v⟩" value={f4(ipuv, 4)} /><Stat label="‖u‖ · ‖v‖" value={`${f4(nu, 3)} · ${f4(nv, 3)}`} />
        <Stat label="cos θ" value={Number.isFinite(cs) ? f4(cs, 4) : '—'} sub={Number.isFinite(ang) ? `θ = ${f4(ang, 4)}°` : ''} tone={ortho ? 'good' : ''} />
      </div>
      {posdef ? <Verdict tone="good">{`Это скалярное произведение ($g_{11}>0$, $\\det G=${f4(g11 * g22 - g12 * g12, 3)}>0$). Пунктир — «единичная окружность» $\\|x\\|=1$: в этой геометрии она вытянута в эллипс. Неравенство Коши–Шварца: $|\\langle u,v\\rangle|=${f4(Math.abs(ipuv), 3)}\\le${f4(nu * nv, 3)}$.`}</Verdict> : <Verdict tone="bad">{'$G$ не положительно определена (нарушено $g_{11}>0$ или $\\det G>0$) — это не скалярное произведение: длины могут быть нулевыми или мнимыми.'}</Verdict>}
      {ortho && <Verdict tone="info">$u\perp v$ в смысле этого произведения (хотя на картинке угол может быть не прямым!).</Verdict>}
    </Split>
  )
}

/* ============ Проекция и процесс Грама–Шмидта в ℝ² ============ */
export function GS2({ v1: a0 = [2, 1], v2: b0 = [1, 2], t: w0 = [3, 2], mode: m0 = 'gs' }) {
  const [v1, setV1] = useState(a0), [v2, setV2] = useState(b0), [w, setW] = useState(w0)
  const [mode, setMode] = useState(m0)
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1]
  const n1 = Math.hypot(...v1)
  const e1 = n1 > 1e-9 ? [v1[0] / n1, v1[1] / n1] : [1, 0]
  const c = dot(v2, e1)
  const u2 = [v2[0] - c * e1[0], v2[1] - c * e1[1]]
  const n2 = Math.hypot(...u2)
  const e2 = n2 > 1e-9 ? [u2[0] / n2, u2[1] / n2] : [NaN, NaN]
  const pw = dot(w, e1)
  const proj = [pw * e1[0], pw * e1[1]]
  const resid = [w[0] - proj[0], w[1] - proj[1]]
  return (
    <Split plot={
      <Plot xr={[-5, 6]} yr={[-3.6, 4.8]} equal w={560} h={450}>
        {n1 > 1e-9 && <Curve f={t => (Math.abs(e1[0]) > 1e-9 ? (e1[1] / e1[0]) * t : 0)} from={-6} to={7} color="var(--c1)" dash="3 4" width={1.2} opacity={0.6} />}
        <Arrow x2={v1[0]} y2={v1[1]} color="var(--c1)" label="v₁" />
        {mode === 'gs' ? (
          <>
            <Arrow x2={v2[0]} y2={v2[1]} color="var(--c2)" label="v₂" />
            <Seg x1={v2[0]} y1={v2[1]} x2={c * e1[0]} y2={c * e1[1]} color="var(--c4)" dash="4 3" width={1.6} />
            <Arrow x2={c * e1[0]} y2={c * e1[1]} color="var(--c2)" dash="4 3" width={2} label="proj" />
            <Arrow x2={e1[0]} y2={e1[1]} color="var(--c3)" width={3.4} label="e₁" />
            {Number.isFinite(e2[0]) && <Arrow x2={e2[0]} y2={e2[1]} color="var(--c3)" width={3.4} label="e₂" />}
            {Number.isFinite(e2[0]) && <Arrow x1={0} y1={0} x2={u2[0]} y2={u2[1]} color="var(--c4)" width={2} dash="2 2" label="u₂" />}
          </>
        ) : (
          <>
            <Arrow x2={w[0]} y2={w[1]} color="var(--c2)" label="w" />
            <Arrow x2={proj[0]} y2={proj[1]} color="var(--c3)" width={3.4} label="proj" />
            <Seg x1={w[0]} y1={w[1]} x2={proj[0]} y2={proj[1]} color="var(--c4)" width={2.4} dash="5 3" />
          </>
        )}
        <Handle x={v1[0]} y={v1[1]} onMove={(x, y) => setV1([snap(x), snap(y)])} color="var(--c1)" r={7} />
        {mode === 'gs' && <Handle x={v2[0]} y={v2[1]} onMove={(x, y) => setV2([snap(x), snap(y)])} color="var(--c2)" r={7} />}
        {mode === 'proj' && <Handle x={w[0]} y={w[1]} onMove={(x, y) => setW([snap(x), snap(y)])} color="var(--c2)" r={7} />}
      </Plot>}>
      <Segmented options={[{ v: 'gs', l: 'Грам–Шмидт' }, { v: 'proj', l: 'Проекция на прямую' }]} value={mode} onChange={setMode} />
      {mode === 'gs' ? (
        <>
          <Note>{'Перетаскивайте $v_1$ и $v_2$. $e_1=\\frac{v_1}{\\|v_1\\|}$; от $v_2$ отнимаем проекцию на $e_1$ — остаётся перпендикуляр $u_2$; нормируем: $e_2=\\frac{u_2}{\\|u_2\\|}$.'}</Note>
          <div className="stats"><Stat label="⟨v₂,e₁⟩" value={f4(c, 4)} /><Stat label="‖u₂‖" value={f4(n2, 4)} tone={n2 < 1e-9 ? 'bad' : 'good'} /><Stat label="⟨e₁,e₂⟩" value={Number.isFinite(e2[0]) ? f4(dot(e1, e2), 3) : '—'} tone="good" /></div>
          {n2 < 1e-9 ? <Verdict tone="bad">$v_1,v_2$ линейно зависимы: $u_2=0$, процесс останавливается.</Verdict> : <Readout>{`$e_1=${vecTex(e1.map(x => +x.toFixed(4)))}$, $e_2=${vecTex(e2.map(x => +x.toFixed(4)))}$; $e_1\\perp e_2$, длины равны 1.`}</Readout>}
        </>
      ) : (
        <>
          <Note>{'Проекция $w$ на прямую $\\operatorname{span}(v_1)$ — ближайшая к $w$ точка прямой; остаток перпендикулярен прямой.'}</Note>
          <div className="stats"><Stat label="proj" value={`(${f4(proj[0], 3)}; ${f4(proj[1], 3)})`} tone="good" /><Stat label="расстояние до прямой" value={f4(Math.hypot(...resid), 4)} tone="warn" /><Stat label="⟨остаток, v₁⟩" value={f4(dot(resid, v1), 3)} /></div>
          <Verdict tone="info">{'$\\operatorname{proj}=\\frac{\\langle w,v_1\\rangle}{\\langle v_1,v_1\\rangle}v_1$; остаток $w-\\operatorname{proj}$ ортогонален $v_1$ — кратчайший путь до прямой.'}</Verdict>
        </>
      )}
    </Split>
  )
}

export default { rref: RrefLab, basis2d: Basis2d, lintrans: LinTrans, simil: Simil, eigen2: Eigen2, inner2: Inner2, gs2: GS2 }
