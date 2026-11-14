import { useSyncExternalStore } from 'react'

const parse = () => {
  const h = window.location.hash.replace(/^#\/?/, '')
  const [path, query = ''] = h.split('?')
  return { parts: path.split('/').filter(Boolean), query: Object.fromEntries(new URLSearchParams(query)) }
}
let cur = parse()
let raw = window.location.hash
const subs = new Set()
window.addEventListener('hashchange', () => { cur = parse(); raw = window.location.hash; subs.forEach(f => f()) })

export function useRoute() {
  useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => raw)
  return cur
}
export function go(path) { window.location.hash = '#/' + path.replace(/^\/+/, '') }
export const href = path => '#/' + path.replace(/^\/+/, '')
