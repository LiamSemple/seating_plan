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

type FilePayload = {
  version: 1
  classes: AppState['classes']
  activeClassId: string
}

function normalizeState(parsed: {
  classes?: SchoolClass[]
  activeClassId?: string
}): AppState | null {
  if (!parsed || !Array.isArray(parsed.classes) || parsed.classes.length === 0) {
    return null
  }
  const classes = parsed.classes.map((cls) => ({
    ...cls,
    frontAtTop: cls.frontAtTop === true,
  }))
  const activeExists = classes.some((cls) => cls.id === parsed.activeClassId)
  return {
    classes,
    activeClassId: activeExists ? parsed.activeClassId! : classes[0].id,
  }
}

export function parseImportedFile(text: string): AppState | null {
  try {
    const parsed = JSON.parse(text) as FilePayload | AppState
    return normalizeState(parsed)
  } catch {
    return null
  }
}

export function buildExportFile(state: AppState): string {
  const payload: FilePayload = {
    version: 1,
    classes: state.classes,
    activeClassId: state.activeClassId,
  }
  return JSON.stringify(payload, null, 2)
}

export function downloadExportFile(state: AppState): void {
  const blob = new Blob([buildExportFile(state)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'seating-plan.json'
  link.click()
  URL.revokeObjectURL(url)
}

export { createClass }
