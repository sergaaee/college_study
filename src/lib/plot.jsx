import React, { createContext, useContext, useRef, useCallback } from 'react'

const Ctx = createContext(null)
export const usePlot = () => useContext(Ctx)

export function niceStep(range, target = 6) {
  const raw = range / target
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  const f = raw / p
  const n = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10
  return n * p
}
export function ticks(a, b, target = 6) {
  if (!(b > a)) return []
  const s = niceStep(b - a, target)
  const out = []
  for (let v = Math.ceil(a / s - 1e-9) * s; v <= b + 1e-9; v += s) out.push(+v.toFixed(10))
  return out
}
export const fmtNum = (v, d = 4) => {
  if (!Number.isFinite(v)) return v > 0 ? '∞' : v < 0 ? '−∞' : '—'
  const s = Number(v.toPrecision(d)).toString()
  return s.replace('-', '−').replace('.', ',')
}

/**
 * Универсальный SVG-график. children — SVG-элементы (Curve, Pt, Arrow ...) или функция (ctx) => элементы.
 * equal — одинаковый масштаб по осям (для геометрии векторов).
 */
export function Plot({
  xr = [-5, 5], yr = [-5, 5], w = 640, h = 380, grid = true, axes = true, equal = false,
  xlabel, ylabel, xticks, yticks, pad = { l: 40, r: 14, t: 12, b: 28 }, children, className = '', integerX = false, onBackground,
}) {
  const svg = useRef(null)
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b
  let [x0, x1] = xr
  let [y0, y1] = yr
  if (equal) {
    const pxPerUnit = iw / (x1 - x0)
    const yc = (y0 + y1) / 2
    const half = ih / pxPerUnit / 2
    y0 = yc - half; y1 = yc + half
  }
  const X = x => pad.l + ((x - x0) / (x1 - x0)) * iw
  const Y = y => pad.t + (1 - (y - y0) / (y1 - y0)) * ih
  const inv = useCallback((clientX, clientY) => {
    const r = svg.current.getBoundingClientRect()
    const sx = ((clientX - r.left) / r.width) * w
    const sy = ((clientY - r.top) / r.height) * h
    return [x0 + ((sx - pad.l) / iw) * (x1 - x0), y0 + (1 - (sy - pad.t) / ih) * (y1 - y0)]
  }, [x0, x1, y0, y1, w, h, iw, ih, pad.l, pad.t])
  const ctx = { X, Y, xr: [x0, x1], yr: [y0, y1], w, h, inv, pad, iw, ih }
  const xt = xticks || (integerX ? ticksInt(x0, x1) : ticks(x0, x1, Math.max(3, Math.round(iw / 80))))
  const yt = yticks || ticks(y0, y1, Math.max(3, Math.round(ih / 55)))
  const clipId = useRef('c' + Math.random().toString(36).slice(2, 8)).current
  return (
    <Ctx.Provider value={ctx}>
      <svg ref={svg} viewBox={`0 0 ${w} ${h}`} className={'plot ' + className} role="img"
        onPointerDown={onBackground ? e => { const [x, y] = inv(e.clientX, e.clientY); onBackground(x, y, e) } : undefined}>
        <defs>
          <clipPath id={clipId}><rect x={pad.l} y={pad.t} width={iw} height={ih} /></clipPath>
        </defs>
        {grid && (
          <g className="grid">
            {xt.map(t => <line key={'gx' + t} x1={X(t)} x2={X(t)} y1={pad.t} y2={pad.t + ih} />)}
            {yt.map(t => <line key={'gy' + t} x1={pad.l} x2={pad.l + iw} y1={Y(t)} y2={Y(t)} />)}
          </g>
        )}
        {axes && (
          <g className="axes">
            {y0 <= 0 && y1 >= 0 && <line x1={pad.l} x2={pad.l + iw} y1={Y(0)} y2={Y(0)} />}
            {x0 <= 0 && x1 >= 0 && <line x1={X(0)} x2={X(0)} y1={pad.t} y2={pad.t + ih} />}
            {xt.map(t => Math.abs(t) > 1e-9 && <text key={'tx' + t} x={X(t)} y={pad.t + ih + 16} textAnchor="middle">{fmtNum(t, 3)}</text>)}
            {yt.map(t => Math.abs(t) > 1e-9 && <text key={'ty' + t} x={pad.l - 6} y={Y(t) + 4} textAnchor="end">{fmtNum(t, 3)}</text>)}
            {xlabel && <text x={pad.l + iw} y={h - 3} textAnchor="end" className="axlabel">{xlabel}</text>}
            {ylabel && <text x={pad.l + 4} y={pad.t + 10} className="axlabel">{ylabel}</text>}
          </g>
        )}
        <g clipPath={`url(#${clipId})`}>{typeof children === 'function' ? children(ctx) : children}</g>
      </svg>
    </Ctx.Provider>
  )
}

function ticksInt(a, b) {
  const span = b - a
  const step = Math.max(1, Math.ceil(span / 12))
  const out = []
  for (let v = Math.ceil(a); v <= b; v += step) out.push(v)
  return out
}

/** Кривая y=f(x) с обрывами на разрывах и асимптотах. */
export function Curve({ f, from, to, n = 600, color = 'var(--c1)', width = 2.6, dash, opacity = 1 }) {
  const { X, Y, xr, yr } = usePlot()
  const a = from ?? xr[0], b = to ?? xr[1]
  const span = yr[1] - yr[0]
  let d = '', pen = false, prev = null
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n
    let y
    try { y = f(x) } catch { y = NaN }
    if (typeof y !== 'number' || !Number.isFinite(y) || Math.abs(y) > 1e7) { pen = false; prev = null; continue }
    if (prev !== null && Math.abs(y - prev) > 4 * span) pen = false
    d += `${pen ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`
    pen = true; prev = y
  }
  return <path d={d} fill="none" style={{ stroke: color, strokeWidth: width, strokeDasharray: dash, opacity }} strokeLinejoin="round" strokeLinecap="round" />
}

/** Параметрическая кривая: pts(t) -> [x,y]. */
export function Param({ f, from = 0, to = 1, n = 400, color = 'var(--c1)', width = 2.4, dash, closed = false }) {
  const { X, Y } = usePlot()
  let d = ''
  for (let i = 0; i <= n; i++) {
    const [x, y] = f(from + ((to - from) * i) / n)
    d += `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`
  }
  return <path d={d + (closed ? 'Z' : '')} fill="none" style={{ stroke: color, strokeWidth: width, strokeDasharray: dash }} />
}

/** Площадь между кривой f и g (по умолчанию 0) на [a,b]. */
export function Area({ f, g = () => 0, from, to, n = 300, color = 'var(--c1)', opacity = 0.22 }) {
  const { X, Y } = usePlot()
  let top = '', bot = ''
  for (let i = 0; i <= n; i++) {
    const x = from + ((to - from) * i) / n
    const y = f(x), z = g(x)
    if (!Number.isFinite(y) || !Number.isFinite(z)) continue
    top += `${top ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`
    bot = `L${X(x).toFixed(1)} ${Y(z).toFixed(1)}` + bot
  }
  return <path d={top + bot + 'Z'} style={{ fill: color, opacity, stroke: 'none' }} />
}

export function Pt({ x, y, r = 5, color = 'var(--c1)', label, dx = 8, dy = -8, hollow = false, anchor = 'start', bold = false }) {
  const { X, Y } = usePlot()
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return (
    <g>
      <circle cx={X(x)} cy={Y(y)} r={r} style={{ fill: hollow ? 'var(--bg)' : color, stroke: color, strokeWidth: 2 }} />
      {label && <text x={X(x) + dx} y={Y(y) + dy} textAnchor={anchor} className={'ptlabel' + (bold ? ' b' : '')} style={{ fill: color }}>{label}</text>}
    </g>
  )
}

export function Seg({ x1, y1, x2, y2, color = 'var(--c2)', width = 2, dash, opacity = 1 }) {
  const { X, Y } = usePlot()
  return <line x1={X(x1)} y1={Y(y1)} x2={X(x2)} y2={Y(y2)} style={{ stroke: color, strokeWidth: width, strokeDasharray: dash, opacity }} strokeLinecap="round" />
}
export function HLine({ y, color = 'var(--c3)', dash = '5 4', width = 1.6, label }) {
  const { X, Y, xr, pad, iw } = usePlot()
  return <g><line x1={X(xr[0])} x2={X(xr[1])} y1={Y(y)} y2={Y(y)} style={{ stroke: color, strokeWidth: width, strokeDasharray: dash }} />
    {label && <text x={pad.l + iw - 4} y={Y(y) - 5} textAnchor="end" className="ptlabel" style={{ fill: color }}>{label}</text>}</g>
}
export function VLine({ x, color = 'var(--c3)', dash = '5 4', width = 1.6, label }) {
  const { X, Y, yr, pad } = usePlot()
  return <g><line x1={X(x)} x2={X(x)} y1={Y(yr[0])} y2={Y(yr[1])} style={{ stroke: color, strokeWidth: width, strokeDasharray: dash }} />
    {label && <text x={X(x) + 4} y={pad.t + 12} className="ptlabel" style={{ fill: color }}>{label}</text>}</g>
}
export function Band({ y0, y1, color = 'var(--c3)', opacity = 0.16, label }) {
  const { X, Y, xr, pad } = usePlot()
  return <g><rect x={X(xr[0])} width={X(xr[1]) - X(xr[0])} y={Y(y1)} height={Math.abs(Y(y0) - Y(y1))} style={{ fill: color, opacity }} />
    {label && <text x={pad.l + 6} y={Y(y1) + 13} className="ptlabel" style={{ fill: color }}>{label}</text>}</g>
}
export function Rect({ x0, y0, x1, y1, color = 'var(--c1)', opacity = 0.2, stroke = true, dash, width = 1.5 }) {
  const { X, Y } = usePlot()
  const x = Math.min(X(x0), X(x1)), y = Math.min(Y(y0), Y(y1))
  return <rect x={x} y={y} width={Math.abs(X(x1) - X(x0))} height={Math.abs(Y(y1) - Y(y0))}
    style={{ fill: color, fillOpacity: opacity, stroke: stroke ? color : 'none', strokeWidth: width, strokeDasharray: dash }} />
}
export function Poly({ pts, color = 'var(--c1)', opacity = 0.2, stroke = true, width = 2, dash }) {
  const { X, Y } = usePlot()
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join('') + 'Z'
  return <path d={d} style={{ fill: color, fillOpacity: opacity, stroke: stroke ? color : 'none', strokeWidth: width, strokeDasharray: dash }} strokeLinejoin="round" />
}
export function Label({ x, y, children, color = 'var(--muted)', anchor = 'start', dx = 0, dy = 0, size }) {
  const { X, Y } = usePlot()
  return <text x={X(x) + dx} y={Y(y) + dy} textAnchor={anchor} className="ptlabel" style={{ fill: color, fontSize: size }}>{children}</text>
}

/** Стрелка-вектор от (x1,y1) к (x2,y2). */
export function Arrow({ x1 = 0, y1 = 0, x2, y2, color = 'var(--c1)', width = 3, label, dx = 8, dy = -8, dash, head = 9 }) {
  const { X, Y } = usePlot()
  const ax = X(x1), ay = Y(y1), bx = X(x2), by = Y(y2)
  const L = Math.hypot(bx - ax, by - ay)
  if (!(L > 1)) return <circle cx={bx} cy={by} r={3} style={{ fill: color }} />
  const ux = (bx - ax) / L, uy = (by - ay) / L
  const hx = bx - ux * head, hy = by - uy * head
  return (
    <g>
      <line x1={ax} y1={ay} x2={hx} y2={hy} style={{ stroke: color, strokeWidth: width, strokeDasharray: dash }} strokeLinecap="round" />
      <path d={`M${bx} ${by}L${hx - uy * head * 0.45} ${hy + ux * head * 0.45}L${hx + uy * head * 0.45} ${hy - ux * head * 0.45}Z`} style={{ fill: color }} />
      {label && <text x={bx + dx} y={by + dy} className="ptlabel b" style={{ fill: color }}>{label}</text>}
    </g>
  )
}

/** Перетаскиваемая точка. onMove(x,y). */
export function Handle({ x, y, onMove, color = 'var(--c1)', r = 9, label, dx = 12, dy = -10, snap }) {
  const { X, Y, inv } = usePlot()
  const down = e => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    e.currentTarget.dataset.drag = '1'
  }
  const move = e => {
    if (e.currentTarget.dataset.drag !== '1') return
    let [px, py] = inv(e.clientX, e.clientY)
    if (snap) { px = Math.round(px / snap) * snap; py = Math.round(py / snap) * snap }
    onMove(px, py)
  }
  const up = e => { e.currentTarget.dataset.drag = '0' }
  return (
    <g>
      <circle cx={X(x)} cy={Y(y)} r={r + 8} style={{ fill: 'transparent', cursor: 'grab', touchAction: 'none' }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      <circle cx={X(x)} cy={Y(y)} r={r} style={{ fill: color, stroke: 'var(--bg)', strokeWidth: 2.5, pointerEvents: 'none' }} />
      {label && <text x={X(x) + dx} y={Y(y) + dy} className="ptlabel b" style={{ fill: color, pointerEvents: 'none' }}>{label}</text>}
    </g>
  )
}

/** Дискретная последовательность точек. */
export function Dots({ pts, color = 'var(--c1)', r = 4, colorOf, line = false }) {
  const { X, Y } = usePlot()
  return (
    <g>
      {line && <path d={pts.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join('')} fill="none" style={{ stroke: color, opacity: 0.35, strokeWidth: 1.5 }} />}
      {pts.map(([x, y], i) => Number.isFinite(y) && (
        <circle key={i} cx={X(x)} cy={Y(y)} r={r} style={{ fill: colorOf ? colorOf(x, y, i) : color }} />
      ))}
    </g>
  )
}
