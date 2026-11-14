import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// PDF-книги лежат в корне репозитория. В dev Vite отдаёт их сам (/Matan1_full.pdf),
// для `npm run build` копируем их в dist.
const BOOKS = ['Matan1_full.pdf', 'Linal2_full.pdf', 'Discrete3_full.pdf']
const copyBooks = () => ({
  name: 'copy-books',
  closeBundle() {
    const out = path.resolve('dist')
    if (!fs.existsSync(out)) return
    for (const f of BOOKS) if (fs.existsSync(f)) fs.copyFileSync(f, path.join(out, f))
  },
})

export default defineConfig({
  plugins: [react(), copyBooks()],
  server: { port: 5173, host: true },
  build: { chunkSizeWarningLimit: 4000 },
})
