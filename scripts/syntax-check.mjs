import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const root = 'src/content'
let bad = 0
for (const d of fs.readdirSync(root)) {
  const dir = path.join(root, d)
  if (!fs.statSync(dir).isDirectory()) continue
  for (const f of fs.readdirSync(dir).filter(f => /^w\d+\.js$/.test(f))) {
    try { await import(pathToFileURL(path.resolve(dir, f)).href) } catch (e) { bad++; console.log('ERR', dir + '/' + f, e.message.split('\n')[0]) }
  }
}
console.log(bad ? bad + ' file(s) with errors' : 'all content files parse')
