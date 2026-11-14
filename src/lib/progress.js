import { STAGES } from '../content/index.js'

export function mastery(l, w) {
  if (!l) return 0
  const stages = STAGES.filter(s => l.stages?.[s.id]).length / STAGES.length
  const tasks = w.tasks.filter(t => t.lvl !== 'C')
  let tv = 0
  for (const t of tasks) { const g = l.tasks?.[t.id]; tv += g === 'ok' ? 1 : g === 'hint' ? 0.6 : g === 'fail' ? 0.15 : 0 }
  const tasksP = tasks.length ? tv / tasks.length : 0
  const quiz = (l.quiz?.best ?? 0) / 100
  const canKeys = w.can.map((_, i) => l.can?.[i])
  const canP = w.can.length ? canKeys.reduce((a, v) => a + (v === 'yes' ? 1 : v === 'mid' ? 0.5 : 0), 0) / w.can.length : 0
  return Math.round(100 * (0.25 * stages + 0.35 * tasksP + 0.2 * quiz + 0.2 * canP))
}
export const stageCount = l => (l ? STAGES.filter(s => l.stages?.[s.id]).length : 0)
