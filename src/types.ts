export type Student = {
  id: string
  lastName: string
  firstName: string
}

export type Desk = {
  id: string
  x: number
  y: number
  width: number
  height: number
  studentId: string | null
}

export type SchoolClass = {
  id: string
  name: string
  desks: Desk[]
  students: Student[]
  frontAtTop: boolean
}

export type AppState = {
  classes: SchoolClass[]
  activeClassId: string
}

export const DESK_WIDTH = 148
export const DESK_HEIGHT = 88
