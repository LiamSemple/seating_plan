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

  return (
    <div className={studentDrag ? 'app dragging' : 'app'}>
      <header className="header">
        <div>
          <h1>Seating Plan</h1>
          <p className="subtitle">
            Saved automatically on this computer in this browser.
          </p>
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
          dropDeskId={dropDeskId}
          draggingStudentId={studentDrag?.studentId ?? null}
          onAddDesk={plan.addDesk}
          onClearDesks={plan.clearDesks}
          onMoveDesk={plan.moveDesk}
          onDeleteDesk={plan.deleteDesk}
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
