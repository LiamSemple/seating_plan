import type { Desk, SchoolClass } from './types'

export const DEFAULT_ROOM_WIDTH = 1200
export const DEFAULT_ROOM_HEIGHT = 700

export function inferRoomSize(desks: Desk[]): {
  roomWidth: number
  roomHeight: number
} {
  let roomWidth = DEFAULT_ROOM_WIDTH
  let roomHeight = DEFAULT_ROOM_HEIGHT
  for (const desk of desks) {
    roomWidth = Math.max(roomWidth, desk.x + desk.width + 24)
    roomHeight = Math.max(roomHeight, desk.y + desk.height + 24)
  }
  return { roomWidth, roomHeight }
}

export function withRoomSize(cls: SchoolClass): SchoolClass {
  if (cls.roomWidth > 0 && cls.roomHeight > 0) return cls
  if (cls.desks.length === 0) {
    return {
      ...cls,
      roomWidth: DEFAULT_ROOM_WIDTH,
      roomHeight: DEFAULT_ROOM_HEIGHT,
    }
  }
  return { ...cls, ...inferRoomSize(cls.desks) }
}
