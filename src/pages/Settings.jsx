import React, { useRef, useState } from 'react'
import { useStore, update, exportJson, importJson, resetAll } from '../lib/store.js'

export default function Settings() {
  const theme = useStore(s => s.settings.theme)
  const file = useRef(null)
  const [msg, setMsg] = useState('')
  const download = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([exportJson()], { type: 'application/json' }))
    a.download = `progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }
  const onFile = async e => {
    const f = e.target.files[0]
    if (!f) return
    try { importJson(await f.text()); setMsg('Прогресс загружен ✓') } catch (err) { setMsg('Ошибка: ' + err.message) }
  }
  return (
    <main className="page">
      <div className="lesson-head"><h1>⚙ Настройки</h1></div>
      <div className="card">
        <h3>Тема</h3>
        <div className="segmented">{[['auto', 'Авто'], ['light', 'Светлая'], ['dark', 'Тёмная']].map(([v, l]) => <button key={v} className={theme === v ? 'on' : ''} onClick={() => update(s => { s.settings.theme = v })}>{l}</button>)}</div>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <h3>Прогресс</h3>
        <p className="muted">Всё хранится в браузере (localStorage). Если очистите данные сайта — прогресс пропадёт, поэтому иногда делайте копию.</p>
        <div className="row">
          <button className="btn primary" onClick={download}>⬇ Скачать копию</button>
          <button className="btn" onClick={() => file.current.click()}>⬆ Загрузить копию</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={onFile} />
          <button className="btn bad" onClick={() => { if (confirm('Стереть весь прогресс?')) resetAll() }}>Сбросить всё</button>
        </div>
        {msg && <p>{msg}</p>}
      </div>
    </main>
  )
}
