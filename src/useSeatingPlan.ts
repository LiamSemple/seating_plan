import { useEffect, useMemo, useState } from 'react'
import { parseNames } from './parseNames'
import { createClass, createInitialState, loadState, saveState } from './storage'
import { DESK_HEIGHT, DESK_WIDTH, type SchoolClass } from './types'

function nextClassName(classes: SchoolClass[]): string {
  const used = new Set(classes.map((cls) => cls.name))
  let n = 1
  while (used.has(`Class ${n}`)) n += 1
  return `Class ${n}`
}

function nextDeskPosition(desks: SchoolClass['desks']): { x: number; y: number } {
  const col = desks.length % 5
  const row = Math.floor(desks.length / 5)
  return {
    x: 20 + col * (DESK_WIDTH + 16),
    y: 48 + row * (DESK_HEIGHT + 16),
  }
}

export function useSeatingPlan() {
  const [state, setState] = useState(loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  const activeClass = useMemo((): SchoolClass => {
    return (
      state.classes.find((cls) => cls.id === state.activeClassId) ??
      state.classes[0] ??
      createClass('Class 1')
    )
  }, [state])

  function updateActive(updater: (cls: SchoolClass) => SchoolClass) {
    setState((prev) => ({
      ...prev,
      classes: prev.classes.map((cls) =>
        cls.id === prev.activeClassId ? updater(cls) : cls,
      ),
    }))
  }

  function selectClass(id: string) {
    setState((prev) => ({ ...prev, activeClassId: id }))
  }

  function addClass() {
    setState((prev) => {
      const next = createClass(nextClassName(prev.classes))
      return {
        classes: [...prev.classes, next],
        activeClassId: next.id,
      }
    })
  }

  function renameClass(id: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    setState((prev) => ({
      ...prev,
      classes: prev.classes.map((cls) =>
        cls.id === id ? { ...cls, name: trimmed } : cls,
      ),
    }))
  }

  function deleteClass(id: string) {
    setState((prev) => {
      const remaining = prev.classes.filter((cls) => cls.id !== id)
      if (remaining.length === 0) {
        return createInitialState()
      }
      const activeClassId =
        prev.activeClassId === id ? remaining[0].id : prev.activeClassId
      return { classes: remaining, activeClassId }
    })
  }

  function addDesk() {
    updateActive((cls) => {
      const pos = nextDeskPosition(cls.desks)
      return {
        ...cls,
        desks: [
          ...cls.desks,
          {
            id: crypto.randomUUID(),
            x: pos.x,
            y: pos.y,
            width: DESK_WIDTH,
            height: DESK_HEIGHT,
            studentId: null,
          },
        ],
      }
    })
  }

  function moveDesk(deskId: string, x: number, y: number) {
    updateActive((cls) => ({
      ...cls,
      desks: cls.desks.map((desk) =>
        desk.id === deskId ? { ...desk, x, y } : desk,
      ),
    }))
  }

  function deleteDesk(deskId: string) {
    updateActive((cls) => ({
      ...cls,
      desks: cls.desks.filter((desk) => desk.id !== deskId),
    }))
  }

  function clearDesks() {
    updateActive((cls) => ({ ...cls, desks: [] }))
  }

  function addStudents(text: string): number {
    const parsed = parseNames(text)
    if (parsed.length === 0) return 0
    updateActive((cls) => ({
      ...cls,
      students: [
        ...cls.students,
        ...parsed.map((name) => ({
          id: crypto.randomUUID(),
          lastName: name.lastName,
          firstName: name.firstName,
        })),
      ],
    }))
    return parsed.length
  }

  function removeStudent(studentId: string) {
    updateActive((cls) => ({
      ...cls,
      students: cls.students.filter((student) => student.id !== studentId),
      desks: cls.desks.map((desk) =>
        desk.studentId === studentId ? { ...desk, studentId: null } : desk,
      ),
    }))
  }

  function assignStudent(
    studentId: string,
    targetDeskId: string,
    fromDeskId: string | null,
  ) {
    if (targetDeskId === fromDeskId) return
    updateActive((cls) => {
      const target = cls.desks.find((desk) => desk.id === targetDeskId)
      if (!target) return cls
      const occupant = target.studentId
      return {
        ...cls,
        desks: cls.desks.map((desk) => {
          if (desk.id === targetDeskId) {
            return { ...desk, studentId }
          }
          if (fromDeskId && desk.id === fromDeskId) {
            return { ...desk, studentId: occupant }
          }
          if (!fromDeskId && desk.studentId === studentId) {
            return { ...desk, studentId: null }
          }
          return desk
        }),
      }
    })
  }

  function unseatStudent(studentId: string) {
    updateActive((cls) => ({
      ...cls,
      desks: cls.desks.map((desk) =>
        desk.studentId === studentId ? { ...desk, studentId: null } : desk,
      ),
    }))
  }

  return {
    classes: state.classes,
    activeClassId: state.activeClassId,
    activeClass,
    selectClass,
    addClass,
    renameClass,
    deleteClass,
    addDesk,
    moveDesk,
    deleteDesk,
    clearDesks,
    addStudents,
    removeStudent,
    assignStudent,
    unseatStudent,
  }
}
