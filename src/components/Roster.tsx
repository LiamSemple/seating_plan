import { useState } from 'react'
import { formatStudentName } from '../parseNames'
import type { Student } from '../types'

type RosterProps = {
  students: Student[]
  seatedIds: Set<string>
  dropActive: boolean
  draggingStudentId: string | null
  onAddNames: (text: string) => number
  onRemoveStudent: (id: string) => void
  onStudentDragStart: (
    studentId: string,
    fromDeskId: string | null,
    clientX: number,
    clientY: number,
  ) => void
}

export function Roster({
  students,
  seatedIds,
  dropActive,
  draggingStudentId,
  onAddNames,
  onRemoveStudent,
  onStudentDragStart,
}: RosterProps) {
  const [text, setText] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const unseated = students
    .filter(
      (student) =>
        !seatedIds.has(student.id) && student.id !== draggingStudentId,
    )
    .slice()
    .sort((a, b) => {
      const last = a.lastName.localeCompare(b.lastName)
      if (last !== 0) return last
      return a.firstName.localeCompare(b.firstName)
    })

  function handleAdd() {
    const added = onAddNames(text)
    if (added === 0) {
      setMessage('Use Lastname, Firstname — one per line, or pasted in a row.')
      return
    }
    setText('')
    setMessage(
      added === 1 ? 'Added 1 student.' : `Added ${added} students.`,
    )
  }

  return (
    <aside
      className={dropActive ? 'roster roster-drop' : 'roster'}
      data-drop="roster"
    >
      <h2>Class list</h2>
      <p className="roster-hint">
        Drag a name onto a desk. Drop someone back here to unseat them.
      </p>
      <ul className="roster-list">
        {unseated.length === 0 && (
          <li className="roster-empty">
            {students.length === 0
              ? 'No students yet.'
              : 'Everyone is seated.'}
          </li>
        )}
        {unseated.map((student) => (
          <li key={student.id}>
            <button
              type="button"
              className="roster-student"
              onPointerDown={(e) => {
                if (e.button !== 0) return
                e.preventDefault()
                onStudentDragStart(student.id, null, e.clientX, e.clientY)
              }}
            >
              {formatStudentName(student.lastName, student.firstName)}
            </button>
            <button
              type="button"
              className="roster-remove"
              aria-label={`Remove ${formatStudentName(student.lastName, student.firstName)}`}
              title="Remove student"
              onClick={() => onRemoveStudent(student.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <label className="roster-label" htmlFor="name-input">
        Add names
      </label>
      <textarea
        id="name-input"
        className="roster-textarea"
        rows={6}
        value={text}
        placeholder={'Smith, John\nDoe, Jane'}
        onChange={(e) => {
          setText(e.target.value)
          setMessage(null)
        }}
      />
      <button type="button" className="btn btn-block" onClick={handleAdd}>
        Add names
      </button>
      {message && <p className="roster-message">{message}</p>}
    </aside>
  )
}
