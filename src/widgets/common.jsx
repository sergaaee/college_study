import React from 'react'
import { Rich, inline } from '../lib/rich.jsx'

/** Макет лаборатории: график слева, управление справа (на узком экране — друг под другом). */
export function Split({ plot, children, wide = false }) {
  return (
    <div className="lab-split" style={wide ? { gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' } : undefined}>
      <div>{plot}</div>
      <div className="controls">{children}</div>
    </div>
  )
}
export function Verdict({ tone = 'info', children }) {
  return <div className={'verdict ' + tone}>{typeof children === 'string' ? inline(children, 'v') : children}</div>
}
export function Readout({ children }) {
  return <div className="readout">{typeof children === 'string' ? <Rich>{children}</Rich> : children}</div>
}
export const f4 = (v, d = 4) => {
  if (!Number.isFinite(v)) return v > 0 ? '∞' : v < 0 ? '−∞' : '—'
  if (v === 0) return '0'
  const a = Math.abs(v)
  if (a >= 1e6 || a < 1e-4) return v.toExponential(2).replace('e', '·10^').replace('+', '')
  return Number(v.toPrecision(d)).toString().replace('-', '−').replace('.', ',')
}
/** LaTeX-версия числа для вставки внутри $...$ */
export const tn = (v, d = 4) => f4(v, d).replace(',', '{,}')
export const useLog = () => null

export const Note = ({ children }) => <div className="muted small">{typeof children === 'string' ? inline(children, 'nt') : children}</div>
