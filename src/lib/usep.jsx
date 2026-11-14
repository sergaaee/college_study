import React, { useState } from 'react'
import { Slider } from './ui.jsx'

/**
 * Состояние параметров-ползунков по описанию:
 *   { a: { min, max, step, val, label, unit, hint, fmt } }
 * Возвращает [значения, массив <Slider/>, setValues].
 */
export function useVals(spec = {}, color) {
  const [v, setV] = useState(() => Object.fromEntries(Object.entries(spec).map(([k, s]) => [k, s.val])))
  const sliders = Object.entries(spec).map(([k, s]) => (
    <Slider key={k} label={s.label ?? k} value={v[k]} min={s.min} max={s.max} step={s.step ?? 1} unit={s.unit} hint={s.hint}
      fmt={s.fmt} color={s.color || color} onChange={x => setV(o => ({ ...o, [k]: x }))} />
  ))
  return [v, sliders, setV]
}
