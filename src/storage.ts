import type { AppState, SchoolClass } from './types'

const STORAGE_KEY = 'seating-plan-v1'

function createClass(name: string): SchoolClass {
  return {
    id: crypto.randomUUID(),
    name,
    desks: [],
    students: [],
    frontAtTop: false,
  }
}

export function createInitialState(): AppState {
  const first = createClass('Class 1')
  return {
    classes: [first],
    activeClassId: first.id,
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()
    const parsed = JSON.parse(raw) as AppState
    if (!parsed || !Array.isArray(parsed.classes) || parsed.classes.length === 0) {
      return createInitialState()
    }
    const activeExists = parsed.classes.some((c) => c.id === parsed.activeClassId)
    return {
      classes: parsed.classes.map((cls) => ({
        ...cls,
        frontAtTop: cls.frontAtTop === true,
      })),
      activeClassId: activeExists ? parsed.activeClassId : parsed.classes[0].id,
    }
  } catch {
    return createInitialState()
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export { createClass }
