export type ParsedName = {
  lastName: string
  firstName: string
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function parseLine(line: string): ParsedName | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  const comma = trimmed.indexOf(',')
  if (comma === -1) return null
  const lastName = clean(trimmed.slice(0, comma))
  const firstName = clean(trimmed.slice(comma + 1))
  if (!lastName || !firstName) return null
  return { lastName, firstName }
}

function parseCompact(text: string): ParsedName[] {
  const parts = text.split(',').map((part) => part.trim())
  if (parts.length < 2) return []

  const names: ParsedName[] = []
  let lastName = clean(parts[0])
  if (!lastName) return []

  for (let i = 1; i < parts.length; i++) {
    const tokens = parts[i].split(/\s+/).filter(Boolean)
    if (tokens.length === 0) continue

    const isLast = i === parts.length - 1
    if (isLast) {
      names.push({ lastName, firstName: clean(tokens.join(' ')) })
      break
    }

    const firstName = clean(tokens[0])
    const nextLast = clean(tokens.slice(1).join(' '))
    if (!firstName || !nextLast) continue
    names.push({ lastName, firstName })
    lastName = nextLast
  }

  return names.filter((name) => name.lastName && name.firstName)
}

export function parseNames(input: string): ParsedName[] {
  const trimmed = input.trim()
  if (!trimmed) return []

  if (/[\r\n]/.test(trimmed)) {
    return trimmed
      .split(/\r?\n/)
      .map(parseLine)
      .filter((name): name is ParsedName => name !== null)
  }

  return parseCompact(trimmed)
}

export function formatStudentName(lastName: string, firstName: string): string {
  return `${lastName}, ${firstName}`
}
