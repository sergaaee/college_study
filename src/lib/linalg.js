// Небольшая линейная алгебра на числах с плавающей точкой (для интерактивных виджетов).
export const EPS = 1e-9

/** Число → дробь (знаменатель ≤ maxD) или короткая десятичная запись. */
export function toFrac(x, maxD = 60) {
  if (!Number.isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : '—'
  const sg = x < 0 ? '-' : ''
  const a = Math.abs(x)
  if (Math.abs(a - Math.round(a)) < 1e-9) return (Math.round(a) === 0 ? '' : sg) + Math.round(a)
  for (let d = 2; d <= maxD; d++) {
    const n = Math.round(a * d)
    if (Math.abs(a - n / d) < 1e-9) return `${sg}${n}/${d}`
  }
  return String(+x.toFixed(3))
}
/** Число → LaTeX (дроби \frac). */
export function toTex(x, maxD = 60) {
  const s = toFrac(x, maxD)
  const m = s.match(/^(-?)(\d+)\/(\d+)$/)
  if (m) return `${m[1]}\\frac{${m[2]}}{${m[3]}}`
  return s.replace('∞', '\\infty')
}
export function texMat(M, opts = {}) {
  const { bar = null, frac = true, kind = 'pmatrix' } = opts
  const f = x => (frac ? toTex(x) : String(+x.toFixed(3)))
  if (bar != null) {
    const cols = M[0].length
    const spec = 'c'.repeat(bar) + '|' + 'c'.repeat(cols - bar)
    return `\\left(\\begin{array}{${spec}}${M.map(r => r.map(f).join(' & ')).join(' \\\\ ')}\\end{array}\\right)`
  }
  return `\\begin{${kind}}${M.map(r => r.map(f).join(' & ')).join(' \\\\ ')}\\end{${kind}}`
}

export const clone = M => M.map(r => [...r])
export const T = M => M[0].map((_, j) => M.map(r => r[j]))
export const mul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)))
export const mulv = (A, v) => A.map(r => r.reduce((s, x, k) => s + x * v[k], 0))
export const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0)
export const norm = a => Math.sqrt(dot(a, a))
export const identity = n => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))

export function rref(M, ncolsPivot = null) {
  const R = clone(M)
  const m = R.length, n = R[0].length
  const lim = ncolsPivot ?? n
  const pivots = []
  let r = 0
  for (let c = 0; c < lim && r < m; c++) {
    let p = r
    for (let i = r + 1; i < m; i++) if (Math.abs(R[i][c]) > Math.abs(R[p][c])) p = i
    if (Math.abs(R[p][c]) < EPS) continue
    ;[R[r], R[p]] = [R[p], R[r]]
    const pv = R[r][c]
    R[r] = R[r].map(v => v / pv)
    for (let i = 0; i < m; i++) if (i !== r) { const f = R[i][c]; if (Math.abs(f) > 0) R[i] = R[i].map((v, j) => v - f * R[r][j]) }
    pivots.push(c); r++
  }
  for (const row of R) for (let j = 0; j < n; j++) if (Math.abs(row[j]) < 1e-10) row[j] = 0
  return { R, pivots }
}
export const rank = M => rref(M).pivots.length

export function nullspace(M) {
  const n = M[0].length
  const { R, pivots } = rref(M)
  const free = [...Array(n).keys()].filter(j => !pivots.includes(j))
  return free.map(f => {
    const v = Array(n).fill(0)
    v[f] = 1
    pivots.forEach((pc, i) => { v[pc] = -R[i][f] })
    return v
  })
}
export const colspaceBasis = M => rref(M).pivots.map(j => M.map(r => r[j]))
export function rowspaceBasis(M) { const { R, pivots } = rref(M); return pivots.map((_, i) => R[i]) }

export function det(M) {
  const A = clone(M), n = A.length
  let d = 1
  for (let c = 0; c < n; c++) {
    let p = c
    for (let i = c + 1; i < n; i++) if (Math.abs(A[i][c]) > Math.abs(A[p][c])) p = i
    if (Math.abs(A[p][c]) < 1e-12) return 0
    if (p !== c) { ;[A[c], A[p]] = [A[p], A[c]]; d = -d }
    d *= A[c][c]
    for (let i = c + 1; i < n; i++) { const f = A[i][c] / A[c][c]; for (let j = c; j < n; j++) A[i][j] -= f * A[c][j] }
  }
  return d
}
export function inv(M) {
  const n = M.length
  const aug = M.map((r, i) => [...r, ...identity(n)[i]])
  const { R, pivots } = rref(aug, n)
  if (pivots.length < n) return null
  return R.map(r => r.slice(n))
}
export const det2 = ([[a, b], [c, d]]) => a * d - b * c
export const inv2 = M => { const d = det2(M); return Math.abs(d) < 1e-12 ? null : [[M[1][1] / d, -M[0][1] / d], [-M[1][0] / d, M[0][0] / d]] }

/** Собственные значения 2×2: возвращает [{re, im}, {re, im}]. */
export function eig2([[a, b], [c, d]]) {
  const tr = a + d, dt = a * d - b * c
  const disc = tr * tr / 4 - dt
  if (disc >= 0) { const s = Math.sqrt(disc); return [{ re: tr / 2 + s, im: 0 }, { re: tr / 2 - s, im: 0 }] }
  const s = Math.sqrt(-disc)
  return [{ re: tr / 2, im: s }, { re: tr / 2, im: -s }]
}
/** Собственный вектор 2×2 для вещественного λ (нормированный). */
export function eigvec2([[a, b], [c, d]], lam) {
  let v
  if (Math.abs(b) > 1e-9) v = [b, lam - a]
  else if (Math.abs(c) > 1e-9) v = [lam - d, c]
  else v = Math.abs(a - lam) < 1e-9 ? [1, 0] : [0, 1]
  const n = Math.hypot(v[0], v[1]) || 1
  return [v[0] / n, v[1] / n]
}

/** Решение 2×2/3×3 и т.п. по классификации: единственное / бесконечно много / нет решений. */
export function classify(A, b) {
  const aug = A.map((r, i) => [...r, b[i]])
  const rA = rank(A), rAb = rank(aug)
  const n = A[0].length
  if (rA < rAb) return { kind: 'none', rA, rAb, n }
  if (rA === n) return { kind: 'unique', rA, rAb, n }
  return { kind: 'infinite', rA, rAb, n }
}
