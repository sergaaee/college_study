import React, { useEffect } from 'react'
import { useRoute, href } from './lib/router.js'
import { useStore, update } from './lib/store.js'
import { BookDrawer } from './lib/pdfpanel.jsx'
import { BOOKS, BOOK_IDS } from './content/index.js'
import Home from './pages/Home.jsx'
import BookPage from './pages/BookPage.jsx'
import Lesson from './pages/Lesson.jsx'
import Review from './pages/Review.jsx'
import Terms from './pages/Terms.jsx'
import Exam from './pages/Exam.jsx'
import Labs from './pages/Labs.jsx'
import Settings from './pages/Settings.jsx'

function Nav({ book }) {
  const theme = useStore(s => s.settings.theme)
  const due = useStore(s => Object.values(s.srs).filter(i => (i.due ?? 0) <= Date.now()).length)
  const route = useRoute()
  const head = route.parts[0] || ''
  const cycle = () => update(s => { s.settings.theme = { auto: 'dark', dark: 'light', light: 'auto' }[s.settings.theme] })
  return (
    <header className="topbar">
      <a className="brand" href="#/"><i>∫</i><span>Учёба</span></a>
      <nav className="navlinks">
        {BOOK_IDS.map(b => <a key={b} href={href('b/' + b)} className={book === b ? 'on' : ''}>{BOOKS[b].short}</a>)}
        <a href={href('review')} className={head === 'review' ? 'on' : ''}>Повторение{due ? ` · ${due}` : ''}</a>
        <a href={href('labs')} className={head === 'labs' ? 'on' : ''}>Лаборатории</a>
        <a href={href('terms')} className={head === 'terms' ? 'on' : ''}>Термины</a>
        <a href={href('exam')} className={head === 'exam' ? 'on' : ''}>Экзамен</a>
      </nav>
      <button className="icon-btn" title={`Тема: ${theme}`} onClick={cycle}>{theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🌓'}</button>
      <a className="icon-btn" href={href('settings')} title="Настройки">⚙</a>
    </header>
  )
}

export default function App() {
  const route = useRoute()
  const theme = useStore(s => s.settings.theme)
  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  const [a, b, c, d] = route.parts
  let book = null
  let view
  if (!a) view = <Home />
  else if (a === 'b' && BOOKS[b]) {
    book = b
    view = c ? <Lesson key={b + c} book={b} n={+c} stage={d} /> : <BookPage book={b} />
  } else if (a === 'review') view = <Review query={route.query} />
  else if (a === 'terms') view = <Terms />
  else if (a === 'labs') view = <Labs />
  else if (a === 'exam') view = <Exam book={b} />
  else if (a === 'settings') view = <Settings />
  else view = <Home />
  useEffect(() => { window.scrollTo(0, 0) }, [a, b, c])
  return (
    <div data-book={book || undefined}>
      <Nav book={book} />
      {view}
      <BookDrawer />
    </div>
  )
}
