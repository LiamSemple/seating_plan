import { useEffect, useRef, useState } from 'react'

type ClassTabsProps = {
  classes: { id: string; name: string }[]
  activeClassId: string
  onSelect: (id: string) => void
  onAdd: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

export function ClassTabs({
  classes,
  activeClassId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}: ClassTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const skipBlur = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editingId])

  function startEditing(id: string, name: string) {
    skipBlur.current = false
    setEditingId(id)
    setDraft(name)
  }

  function commit() {
    if (!editingId) return
    if (skipBlur.current) return
    onRename(editingId, draft)
    setEditingId(null)
  }

  function cancel() {
    skipBlur.current = true
    setEditingId(null)
  }

  return (
    <div className="tabs no-print">
      {classes.map((cls) => {
        const active = cls.id === activeClassId
        return (
          <div
            key={cls.id}
            className={active ? 'tab tab-active' : 'tab'}
            title="Double-click to rename"
            onClick={() => onSelect(cls.id)}
            onDoubleClick={() => startEditing(cls.id, cls.name)}
          >
            {editingId === cls.id ? (
              <input
                ref={inputRef}
                className="tab-input"
                value={draft}
                aria-label="Class name"
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    skipBlur.current = false
                    commit()
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    cancel()
                  }
                }}
              />
            ) : (
              <span className="tab-name">{cls.name}</span>
            )}
            <button
              type="button"
              className="tab-delete"
              aria-label={`Delete ${cls.name}`}
              title="Delete class"
              onClick={(e) => {
                e.stopPropagation()
                if (
                  window.confirm(
                    `Delete "${cls.name}"? This cannot be undone.`,
                  )
                ) {
                  onDelete(cls.id)
                }
              }}
            >
              ×
            </button>
          </div>
        )
      })}
      <button type="button" className="tab tab-add" onClick={onAdd}>
        + New class
      </button>
    </div>
  )
}
