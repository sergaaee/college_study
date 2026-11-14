import React, { useState } from 'react'
import { inline, Rich } from './rich.jsx'
import { fmtNum } from './plot.jsx'

export function Slider({ label, value, onChange, min = 0, max = 10, step = 1, fmt, unit = '', color, hint }) {
  const shown = fmt ? fmt(value) : fmtNum(value, 5)
  const pct = ((value - min) / (max - min)) * 100
  return (
    <label className="slider" style={color ? { '--sl': color } : undefined}>
      <span className="sl-top">
        <span className="sl-label">{inline(label, 'sl')}</span>
        <output>{shown}{unit}</output>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} style={{ '--p': pct + '%' }}
        onChange={e => onChange(parseFloat(e.target.value))} />
      {hint && <span className="sl-hint">{inline(hint, 'h')}</span>}
    </label>
  )
}

export function Toggle({ label, value, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
      <span className="tg-box" /><span>{inline(label, 'tg')}</span>
    </label>
  )
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(o => {
        const v = typeof o === 'object' ? o.v : o
        const l = typeof o === 'object' ? o.l : o
        return <button key={String(v)} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{inline(String(l), 'sg')}</button>
      })}
    </div>
  )
}

export function Stat({ label, value, tone, sub }) {
  return (
    <div className={'stat ' + (tone || '')}>
      <div className="stat-l">{inline(label, 'st')}</div>
      <div className="stat-v">{typeof value === 'string' ? inline(value, 'sv') : value}</div>
      {sub && <div className="stat-s">{inline(sub, 'ss')}</div>}
    </div>
  )
}

const KIND = {
  def: ['Определение', '📘'], thm: ['Теорема', '🧩'], idea: ['Идея / приём', '💡'], trap: ['Ловушка', '⚠️'],
  exam: ['На экзамене', '🎯'], ex: ['Пример', '✏️'], life: ['Из жизни', '🌍'], note: ['Заметка', '📝'], proof: ['Доказательство', '∎'],
}
export function Callout({ kind = 'note', title, children }) {
  const [name, icon] = KIND[kind] || KIND.note
  return (
    <section className={'callout k-' + kind}>
      <header><span className="co-ico">{icon}</span><span className="co-kind">{name}</span>{title && <span className="co-title">· {inline(title, 'ct')}</span>}</header>
      <div className="co-body">{typeof children === 'string' ? <Rich>{children}</Rich> : children}</div>
    </section>
  )
}

export function Reveal({ label = 'Показать', openLabel = 'Скрыть', children, tone, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={'reveal ' + (tone || '') + (open ? ' open' : '')}>
      <button className="reveal-btn" onClick={() => setOpen(o => !o)}>{open ? '▾ ' + openLabel : '▸ ' + label}</button>
      {open && <div className="reveal-body">{typeof children === 'string' ? <Rich>{children}</Rich> : children}</div>}
    </div>
  )
}

export function Bar({ value, max = 1, tone }) {
  const p = max ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return <div className={'bar ' + (tone || '')}><i style={{ width: p + '%' }} /></div>
}

export function Chip({ children, tone }) { return <span className={'chip ' + (tone || '')}>{children}</span> }

export function Observe({ items }) {
  if (!items?.length) return null
  return (
    <div className="observe">
      <div className="observe-h">🔭 Что попробовать</div>
      <ol>{items.map((t, i) => <li key={i}>{inline(t, 'ob' + i)}</li>)}</ol>
    </div>
  )
}

/** Блок «предскажи → проверь»: вопрос с вариантами, после выбора показывается пояснение. */
export function Predict({ q, opts, ok, why }) {
  const [pick, setPick] = useState(null)
  return (
    <div className="predict">
      <div className="predict-q">🤔 <b>Сначала предскажите:</b> {inline(q, 'pq')}</div>
      <div className="predict-opts">
        {opts.map((o, i) => (
          <button key={i} disabled={pick !== null}
            className={pick === null ? '' : i === ok ? 'right' : i === pick ? 'wrong' : 'dim'}
            onClick={() => setPick(i)}>{inline(o, 'po' + i)}</button>
        ))}
      </div>
      {pick !== null && (
        <div className={'predict-why ' + (pick === ok ? 'good' : 'bad')}>
          {pick === ok ? '✅ Верно. ' : '❌ Не совсем. '}{inline(why || '', 'pw')}
          <div className="muted small">Теперь проверьте это ползунками ниже.</div>
        </div>
      )}
    </div>
  )
}
