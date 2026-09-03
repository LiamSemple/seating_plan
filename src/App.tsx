import { useCallback, useEffect, useRef, useState } from 'react'
import { ClassTabs } from './components/ClassTabs'
import { ClassroomCanvas } from './components/ClassroomCanvas'
import { Roster } from './components/Roster'
import { formatDeskName } from './parseNames'
import { useSeatingPlan } from './useSeatingPlan'

type StudentDrag = {
  studentId: string
  fromDeskId: string | null
  x: number
  y: number
}

export default function App() {
  const plan = useSeatingPlan()
  const [studentDrag, setStudentDrag] = useState<StudentDrag | null>(null)
  const [dropDeskId, setDropDeskId] = useState<string | null>(null)
  const [dropRoster, setDropRoster] = useState(false)
  const dragRef = useRef<StudentDrag | null>(null)
  const planRef = useRef(plan)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dragging = studentDrag !== null

  useEffect(() => {
    planRef.current = plan
  })

  const onStudentDragStart = useCallback(
    (
      studentId: string,
      fromDeskId: string | null,
      clientX: number,
      clientY: number,
    ) => {
      const next = { studentId, fromDeskId, x: clientX, y: clientY }
      dragRef.current = next
      setStudentDrag(next)
    },
    [],
  )

  useEffect(() => {
    if (!dragging) return

    function hintFromPoint(x: number, y: number) {
      const el = document.elementFromPoint(x, y)
      const desk = el?.closest('[data-desk-id]')
      const roster = el?.closest('[data-drop="roster"]')
      setDropDeskId(desk?.getAttribute('data-desk-id') ?? null)
      setDropRoster(Boolean(roster) && !desk)
    }

    function onMove(e: PointerEvent) {
      const current = dragRef.current
      if (!current) return
      const next = { ...current, x: e.clientX, y: e.clientY }
      dragRef.current = next
      setStudentDrag(next)
      hintFromPoint(e.clientX, e.clientY)
    }

    function onUp(e: PointerEvent) {
      const current = dragRef.current
      dragRef.current = null
      setStudentDrag(null)
      setDropDeskId(null)
      setDropRoster(false)
      if (!current) return

      const el = document.elementFromPoint(e.clientX, e.clientY)
      const deskEl = el?.closest('[data-desk-id]')
      const rosterEl = el?.closest('[data-drop="roster"]')
      const canvasEl = el?.closest('[data-drop="canvas"]')
      const { assignStudent, unseatStudent } = planRef.current

      if (deskEl) {
        const targetId = deskEl.getAttribute('data-desk-id')
        if (targetId) {
          assignStudent(current.studentId, targetId, current.fromDeskId)
        }
        return
      }

      if (rosterEl || canvasEl) {
        if (current.fromDeskId) {
          unseatStudent(current.studentId)
        }
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragging])

  const seatedIds = new Set(
    plan.activeClass.desks
      .map((desk) => desk.studentId)
      .filter((id): id is string => id !== null),
  )

  const draggedStudent = studentDrag
    ? plan.activeClass.students.find(
        (student) => student.id === studentDrag.studentId,
      )
    : undefined

  function handlePrint() {
    const desks = plan.activeClass.desks
    const roomW = Math.max(
      400,
      ...desks.map((desk) => desk.x + desk.width + 24),
    )
    const roomH = Math.max(
      280,
      ...desks.map((desk) => desk.y + desk.height + 24),
    ) + 48
    const titleH = 44
    const availW = 1150
    const availH = 780
    const scale = Math.min(availW / roomW, (availH - titleH) / roomH)
    const root = document.documentElement
    root.style.setProperty('--print-scale', String(scale))
    root.style.setProperty('--print-room-w', `${roomW}px`)
    root.style.setProperty('--print-room-h', `${roomH}px`)
    window.print()
  }

  return (
    <div className={studentDrag ? 'app dragging' : 'app'}>
      <header className="header">
        <div>
          <h1>Seating Plan</h1>
          <p className="subtitle no-print">
            Saved automatically on this computer. Use Save file to share
            every class with someone else.
          </p>
        </div>
        <div className="header-actions no-print">
          <button
            type="button"
            className="btn"
            onClick={() => plan.exportFile()}
          >
            Save file
          </button>
          <button
            type="button"
            className="btn btn-muted"
            onClick={() => fileInputRef.current?.click()}
          >
            Open file
          </button>
          <button
            type="button"
            className="btn btn-muted"
            onClick={handlePrint}
          >
            Print
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              const hasWork = plan.classes.some(
                (cls) =>
                  cls.students.length > 0 ||
                  cls.desks.length > 0 ||
                  plan.classes.length > 1,
              )
              if (
                hasWork &&
                !window.confirm(
                  'Replace all classes on this computer with this file?',
                )
              ) {
                return
              }
              void file.text().then((text) => {
                if (!plan.importFile(text)) {
                  window.alert(
                    'That file is not a seating plan, or it could not be read.',
                  )
                }
              })
            }}
          />
        </div>
      </header>
      <ClassTabs
        classes={plan.classes}
        activeClassId={plan.activeClassId}
        onSelect={plan.selectClass}
        onAdd={plan.addClass}
        onRename={plan.renameClass}
        onDelete={plan.deleteClass}
      />
      <div className="workspace">
        <ClassroomCanvas
          desks={plan.activeClass.desks}
          students={plan.activeClass.students}
          className={plan.activeClass.name}
          frontAtTop={plan.activeClass.frontAtTop}
          dropDeskId={dropDeskId}
          draggingStudentId={studentDrag?.studentId ?? null}
          onAddDesk={plan.addDesk}
          onClearDesks={plan.clearDesks}
          onAssignRandomly={plan.assignRandomly}
          onFlipView={plan.flipView}
          onMoveDesks={plan.moveDesks}
          onAddEmptyDesks={plan.addEmptyDesks}
          onDeleteDesk={plan.deleteDesk}
          onDeleteDesks={plan.deleteDesks}
          onBeginUndo={plan.beginUndo}
          onUndo={plan.undo}
          onStudentDragStart={onStudentDragStart}
        />
        <Roster
          students={plan.activeClass.students}
          seatedIds={seatedIds}
          dropActive={dropRoster}
          draggingStudentId={studentDrag?.studentId ?? null}
          onAddNames={plan.addStudents}
          onRemoveStudent={plan.removeStudent}
          onStudentDragStart={onStudentDragStart}
        />
      </div>
      {studentDrag && draggedStudent && (
        <div
          className="drag-ghost"
          style={{ left: studentDrag.x + 12, top: studentDrag.y + 12 }}
        >
          {formatDeskName(
            draggedStudent.lastName,
            draggedStudent.firstName,
          )}
        </div>
      )}
    </div>
  )
}
