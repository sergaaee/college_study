import React from 'react'
import matan from './matan.jsx'
import linal from './linal.jsx'
import discrete from './discrete.jsx'

export const WIDGETS = { ...matan, ...linal, ...discrete }

/** Универсальный запуск виджета по описанию { w: 'seq', ...props }. */
export function Lab({ w, ...props }) {
  const C = WIDGETS[w]
  if (!C) return <div className="verdict bad">Нет виджета «{w}»</div>
  return <C {...props} />
}
