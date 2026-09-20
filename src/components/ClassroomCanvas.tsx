import { useEffect, useRef, useState } from 'react'
import { formatDeskName } from '../parseNames'
import type { Desk, Student } from '../types'

type ClassroomCanvasProps = {
  desks: Desk[]
  students: Student[]
  className: string
  frontAtTop: boolean
  roomWidth: number
  roomHeight: number
  dropDeskId: string | null
  draggingStudentId: string | null
  onAddDesk: () => void
  onClearDesks: () => void
  onAssignRandomly: () => void
  onFlipView: () => void
  onMoveDesks: (updates: { id: string; x: number; y: number }[]) => void
  onAddEmptyDesks: (
    desks: { x: number; y: number; width: number; height: number }[],
  ) => string[]
  onDeleteDesk: (deskId: string) => void
  onDeleteDesks: (ids: string[]) => void
  onBeginUndo: () => void
  onUndo: () => void
  onStudentDragStart: (
    studentId: string,
    fromDeskId: string | null,
    clientX: number,
    clientY: number,
  ) => void
}

type Marquee = { x1: number; y1: number; x2: number; y2: number }

function canvasPoint(
  clientX: number,
  clientY: number,
  canvas: HTMLDivElement,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  return {
    x: clientX - rect.left + canvas.scrollLeft,
    y: clientY - rect.top + canvas.scrollTop,
  }
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function marqueeBox(marquee: Marquee): {
  x: number
  y: number
  w: number
  h: number
} {
  return {
    x: Math.min(marquee.x1, marquee.x2),
    y: Math.min(marquee.y1, marquee.y2),
    w: Math.abs(marquee.x2 - marquee.x1),
    h: Math.abs(marquee.y2 - marquee.y1),
  }
}

export function ClassroomCanvas({
  desks,
  students,
  className,
  frontAtTop,
  roomWidth,
  roomHeight,
  dropDeskId,
  draggingStudentId,
  onAddDesk,
  onClearDesks,
  onAssignRandomly,
  onFlipView,
  onMoveDesks,
  onAddEmptyDesks,
  onDeleteDesk,
  onDeleteDesks,
  onBeginUndo,
  onUndo,
  onStudentDragStart,
}: ClassroomCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const desksRef = useRef(desks)
  const onMoveDesksRef = useRef(onMoveDesks)
  const onAddEmptyDesksRef = useRef(onAddEmptyDesks)
  const onDeleteDesksRef = useRef(onDeleteDesks)
  const onBeginUndoRef = useRef(onBeginUndo)
  const onUndoRef = useRef(onUndo)
  const selectedIdsRef = useRef<string[]>([])
  const scaleRef = useRef({ sx: 1, sy: 1, roomWidth: 1, roomHeight: 1 })
  const clipboardRef = useRef<
    { x: number; y: number; width: number; height: number }[]
  >([])
  const pasteCountRef = useRef(0)

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [draggingDeskIds, setDraggingDeskIds] = useState<string[]>([])
  const [marquee, setMarquee] = useState<Marquee | null>(null)
  const [view, setView] = useState({ w: 1, h: 1 })
  const marqueeRef = useRef<Marquee | null>(null)
  const selecting = marquee !== null
  const visibleSelectedIds = selectedIds.filter((id) =>
    desks.some((desk) => desk.id === id),
  )
  const sx = view.w / Math.max(roomWidth, 1)
  const sy = view.h / Math.max(roomHeight, 1)

  function toRoom(point: { x: number; y: number }) {
    return { x: point.x / sx, y: point.y / sy }
  }

  function screenDesk(desk: Desk) {
    return {
      x: desk.x * sx,
      y: desk.y * sy,
      w: desk.width * sx,
      h: desk.height * sy,
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect
      if (box.width > 0 && box.height > 0) {
        setView({ w: box.width, h: box.height })
      }
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    desksRef.current = desks
    onMoveDesksRef.current = onMoveDesks
    onAddEmptyDesksRef.current = onAddEmptyDesks
    onDeleteDesksRef.current = onDeleteDesks
    onBeginUndoRef.current = onBeginUndo
    onUndoRef.current = onUndo
    selectedIdsRef.current = visibleSelectedIds
    scaleRef.current = { sx, sy, roomWidth, roomHeight }
  })

  const deskDragRef = useRef<{
    ids: string[]
    startX: number
    startY: number
    origins: { id: string; x: number; y: number }[]
    didSnapshot: boolean
  } | null>(null)

  useEffect(() => {
    if (draggingDeskIds.length === 0) return

    function onMove(e: PointerEvent) {
      const drag = deskDragRef.current
      const canvas = canvasRef.current
      if (!drag || !canvas) return
      const { sx, sy, roomWidth, roomHeight } = scaleRef.current
      const point = {
        x: canvasPoint(e.clientX, e.clientY, canvas).x / sx,
        y: canvasPoint(e.clientX, e.clientY, canvas).y / sy,
      }
      if (!drag.didSnapshot) {
        drag.didSnapshot = true
        onBeginUndoRef.current()
      }
      const rawDx = point.x - drag.startX
      const rawDy = point.y - drag.startY
      const moving = drag.origins
        .map((origin) => {
          const desk = desksRef.current.find((item) => item.id === origin.id)
          return desk ? { origin, desk } : null
        })
        .filter((item): item is { origin: (typeof drag.origins)[0]; desk: Desk } =>
          item !== null,
        )

      let dx = rawDx
      let dy = rawDy
      for (const { origin, desk } of moving) {
        dx = Math.max(-origin.x, Math.min(dx, roomWidth - desk.width - origin.x))
        dy = Math.max(
          -origin.y,
          Math.min(dy, roomHeight - desk.height - origin.y),
        )
      }

      onMoveDesksRef.current(
        moving.map(({ origin }) => ({
          id: origin.id,
          x: origin.x + dx,
          y: origin.y + dy,
        })),
      )
    }

    function onUp() {
      deskDragRef.current = null
      setDraggingDeskIds([])
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [draggingDeskIds])

  useEffect(() => {
    if (!selecting) return

    function onMove(e: PointerEvent) {
      const canvas = canvasRef.current
      const start = marqueeRef.current
      if (!canvas || !start) return
      const point = canvasPoint(e.clientX, e.clientY, canvas)
      const next = { ...start, x2: point.x, y2: point.y }
      marqueeRef.current = next
      setMarquee(next)
      const box = marqueeBox(next)
      const { sx, sy } = scaleRef.current
      setSelectedIds(
        desksRef.current
          .filter((desk) => {
            const shown = {
              x: desk.x * sx,
              y: desk.y * sy,
              w: desk.width * sx,
              h: desk.height * sy,
            }
            return rectsOverlap(box, shown)
          })
          .map((desk) => desk.id),
      )
    }

    function onUp() {
      const box = marqueeRef.current ? marqueeBox(marqueeRef.current) : null
      if (box && box.w < 4 && box.h < 4) {
        setSelectedIds([])
      }
      marqueeRef.current = null
      setMarquee(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [selecting])

  useEffect(() => {
    function typingInField() {
      const target = document.activeElement
      return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      )
    }

    function onKeyDown(e: KeyboardEvent) {
      if (typingInField()) return

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        onUndoRef.current()
        return
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        const selected = selectedIdsRef.current
        if (selected.length === 0) return
        e.preventDefault()
        onDeleteDesksRef.current(selected)
        setSelectedIds([])
        return
      }

      const copy = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c'
      const paste = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v'
      if (!copy && !paste) return

      if (copy) {
        const selected = desksRef.current.filter((desk) =>
          selectedIdsRef.current.includes(desk.id),
        )
        if (selected.length === 0) return
        e.preventDefault()
        clipboardRef.current = selected.map((desk) => ({
          x: desk.x,
          y: desk.y,
          width: desk.width,
          height: desk.height,
        }))
        pasteCountRef.current = 0
        return
      }

      const canvas = canvasRef.current
      if (!canvas || clipboardRef.current.length === 0) return
      e.preventDefault()
      pasteCountRef.current += 1
      const { roomWidth, roomHeight } = scaleRef.current
      const offset = 28 * pasteCountRef.current
      const created = onAddEmptyDesksRef.current(
        clipboardRef.current.map((desk) => ({
          x: Math.max(
            0,
            Math.min(desk.x + offset, Math.max(0, roomWidth - desk.width)),
          ),
          y: Math.max(
            0,
            Math.min(desk.y + offset, Math.max(0, roomHeight - desk.height)),
          ),
          width: desk.width,
          height: desk.height,
        })),
      )
      setSelectedIds(created)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const studentById = new Map(students.map((student) => [student.id, student]))
  const box = marquee ? marqueeBox(marquee) : null
  return (
    <section className="canvas-panel print-sheet">
      <h2 className="print-class-name">{className}</h2>
      <div className="canvas-toolbar no-print">
        <button type="button" className="btn" onClick={onAddDesk}>
          Add desk
        </button>
        <button
          type="button"
          className="btn btn-muted"
          onClick={() => {
            if (!desks.some((desk) => desk.studentId)) return
            if (
              window.confirm(
                'Take every name off the desks? The desks will stay.',
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
            if (desks.length === 0 || students.length === 0) return
            onAssignRandomly()
          }}
        >
          Seat randomly
        </button>
        <button
          type="button"
          className="btn btn-muted"
          onClick={() => onFlipView()}
        >
          {frontAtTop ? "Teacher's view" : "Students' view"}
        </button>
      </div>
      <div
        ref={canvasRef}
        className="canvas"
        data-drop="canvas"
        onPointerDown={(e) => {
          if (e.button !== 0) return
          if ((e.target as HTMLElement).closest('[data-desk-id]')) return
          const canvas = canvasRef.current
          if (!canvas) return
          e.preventDefault()
          const point = canvasPoint(e.clientX, e.clientY, canvas)
          const next = { x1: point.x, y1: point.y, x2: point.x, y2: point.y }
          marqueeRef.current = next
          setMarquee(next)
        }}
      >
        <div className="front-label">
          {frontAtTop ? 'Front of class' : 'Back of class'}
        </div>
        {desks.length === 0 && (
          <p className="canvas-empty no-print">
            Add a desk, then drag students onto it from the list.
          </p>
        )}
        {box && box.w + box.h > 0 && (
          <div
            className="marquee"
            style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
          />
        )}
        {desks.map((desk) => {
          const seated =
            desk.studentId && desk.studentId !== draggingStudentId
              ? studentById.get(desk.studentId)
              : undefined
          const selected = visibleSelectedIds.includes(desk.id)
          return (
            <div
              key={desk.id}
              className={[
                'desk',
                seated ? 'desk-occupied' : '',
                dropDeskId === desk.id ? 'desk-drop' : '',
                draggingDeskIds.includes(desk.id) ? 'desk-dragging' : '',
                selected ? 'desk-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-desk-id={desk.id}
              style={{
                left: screenDesk(desk).x,
                top: screenDesk(desk).y,
                width: screenDesk(desk).w,
                height: screenDesk(desk).h,
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return
                const canvas = canvasRef.current
                if (!canvas) return
                e.preventDefault()
                e.stopPropagation()
                const point = toRoom(canvasPoint(e.clientX, e.clientY, canvas))
                const ids = visibleSelectedIds.includes(desk.id)
                  ? visibleSelectedIds
                  : [desk.id]
                if (!visibleSelectedIds.includes(desk.id)) {
                  setSelectedIds([desk.id])
                }
                const moving = desksRef.current.filter((item) =>
                  ids.includes(item.id),
                )
                deskDragRef.current = {
                  ids,
                  startX: point.x,
                  startY: point.y,
                  origins: moving.map((item) => ({
                    id: item.id,
                    x: item.x,
                    y: item.y,
                  })),
                  didSnapshot: false,
                }
                setDraggingDeskIds(ids)
              }}
            >
              <button
                type="button"
                className="desk-delete no-print"
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
