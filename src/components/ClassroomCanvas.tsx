import { useEffect, useRef, useState } from 'react'
import { formatDeskName } from '../parseNames'
import type { Desk, Student } from '../types'

type ClassroomCanvasProps = {
  desks: Desk[]
  students: Student[]
  frontAtTop: boolean
  dropDeskId: string | null
  draggingStudentId: string | null
  onAddDesk: () => void
  onClearDesks: () => void
  onFlipView: (canvasWidth: number, canvasHeight: number) => void
  onMoveDesk: (deskId: string, x: number, y: number) => void
  onDeleteDesk: (deskId: string) => void
  onStudentDragStart: (
    studentId: string,
    fromDeskId: string | null,
    clientX: number,
    clientY: number,
  ) => void
}

export function ClassroomCanvas({
  desks,
  students,
  frontAtTop,
  dropDeskId,
  draggingStudentId,
  onAddDesk,
  onClearDesks,
  onFlipView,
  onMoveDesk,
  onDeleteDesk,
  onStudentDragStart,
}: ClassroomCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const desksRef = useRef(desks)
  const onMoveDeskRef = useRef(onMoveDesk)

  useEffect(() => {
    desksRef.current = desks
    onMoveDeskRef.current = onMoveDesk
  })
  const deskDragRef = useRef<{
    id: string
    grabX: number
    grabY: number
  } | null>(null)
  const [draggingDeskId, setDraggingDeskId] = useState<string | null>(null)

  useEffect(() => {
    if (!draggingDeskId) return

    function onMove(e: PointerEvent) {
      const drag = deskDragRef.current
      const canvas = canvasRef.current
      if (!drag || !canvas) return
      const rect = canvas.getBoundingClientRect()
      const desk = desksRef.current.find((item) => item.id === drag.id)
      if (!desk) return
      const maxX = Math.max(0, canvas.clientWidth - desk.width)
      const maxY = Math.max(0, canvas.clientHeight - desk.height)
      const x = Math.max(
        0,
        Math.min(
          e.clientX - rect.left + canvas.scrollLeft - drag.grabX,
          maxX,
        ),
      )
      const y = Math.max(
        0,
        Math.min(
          e.clientY - rect.top + canvas.scrollTop - drag.grabY,
          maxY,
        ),
      )
      onMoveDeskRef.current(drag.id, x, y)
    }

    function onUp() {
      deskDragRef.current = null
      setDraggingDeskId(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [draggingDeskId])

  const studentById = new Map(students.map((student) => [student.id, student]))

  return (
    <section className="canvas-panel">
      <div className="canvas-toolbar">
        <button type="button" className="btn" onClick={onAddDesk}>
          Add desk
        </button>
        <button
          type="button"
          className="btn btn-muted"
          onClick={() => {
            if (desks.length === 0) return
            if (
              window.confirm(
                'Remove all desks in this class? Students will go back to the list.',
              )
            ) {
              onClearDesks()
            }
          }}
        >
          Clear all desks
        </button>
        <button
          type="button"
          className="btn btn-muted"
          onClick={() => {
            const canvas = canvasRef.current
            if (!canvas) return
            onFlipView(canvas.clientWidth, canvas.clientHeight)
          }}
        >
          {frontAtTop ? 'View from back of class' : "Students' view"}
        </button>
      </div>
      <div
        ref={canvasRef}
        className="canvas"
        data-drop="canvas"
      >
        <div className="front-label">
          {frontAtTop ? 'Front of class' : 'Back of class'}
        </div>
        {desks.length === 0 && (
          <p className="canvas-empty">
            Add a desk, then drag students onto it from the list.
          </p>
        )}
        {desks.map((desk) => {
          const seated =
            desk.studentId && desk.studentId !== draggingStudentId
              ? studentById.get(desk.studentId)
              : undefined
          return (
            <div
              key={desk.id}
              className={[
                'desk',
                seated ? 'desk-occupied' : '',
                dropDeskId === desk.id ? 'desk-drop' : '',
                draggingDeskId === desk.id ? 'desk-dragging' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-desk-id={desk.id}
              style={{
                left: desk.x,
                top: desk.y,
                width: desk.width,
                height: desk.height,
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return
                const canvas = canvasRef.current
                if (!canvas) return
                e.preventDefault()
                const rect = canvas.getBoundingClientRect()
                deskDragRef.current = {
                  id: desk.id,
                  grabX:
                    e.clientX - rect.left + canvas.scrollLeft - desk.x,
                  grabY: e.clientY - rect.top + canvas.scrollTop - desk.y,
                }
                setDraggingDeskId(desk.id)
              }}
            >
              <button
                type="button"
                className="desk-delete"
                aria-label="Delete desk"
                title="Delete desk"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteDesk(desk.id)
                }}
              >
                ×
              </button>
              {seated ? (
                <button
                  type="button"
                  className="desk-student"
                  onPointerDown={(e) => {
                    if (e.button !== 0) return
                    e.preventDefault()
                    e.stopPropagation()
                    onStudentDragStart(
                      seated.id,
                      desk.id,
                      e.clientX,
                      e.clientY,
                    )
                  }}
                >
                  {formatDeskName(seated.lastName, seated.firstName)}
                </button>
              ) : (
                <span className="desk-empty-label">Empty</span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
