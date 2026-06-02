import { NS_PER_SECOND, msToNs } from '@/lib/timeline'

export function gridStepNs(bpm: number): number {
  const beatNs = Math.max(1, Math.round(NS_PER_SECOND * (60 / Math.max(1, bpm))))
  return Math.max(1, Math.round(beatNs / 4))
}

export function snapTimeToGrid(timeNs: number, bpm: number, offsetMs: number): number {
  const stepNs = gridStepNs(bpm)
  const offsetNs = msToNs(offsetMs)
  return Math.max(0, Math.round((timeNs + offsetNs) / stepNs) * stepNs - offsetNs)
}
