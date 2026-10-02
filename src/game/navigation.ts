import { getObstacles, getSurfaces, surfaceHeight } from './level.ts'
import type { Obstacle, Position, Surface } from './level.ts'

export const PLAYER_RADIUS = 0.24
const MAX_STEP = 0.32

export interface Support { height: number; safe: boolean; surfaceId: string }

function atPoint(x: number, z: number, referenceY: number, surfaces: readonly Surface[]): Support | null {
  let best: Support | null = null
  let difference = Infinity
  for (const surface of surfaces) {
    if (x < surface.xMin - 0.001 || x > surface.xMax + 0.001 || z < surface.zMin - 0.001 || z > surface.zMax + 0.001) continue
    const height = surfaceHeight(surface, x, z)
    const gap = Math.abs(height - referenceY)
    if (gap <= MAX_STEP && gap < difference) {
      best = { height, safe: surface.safe, surfaceId: surface.id }
      difference = gap
    }
  }
  return best
}

export function supportAt(position: Position, surfaces: readonly Surface[]): Support | null {
  const support = atPoint(position.x, position.z, position.y, surfaces)
  if (!support) return null
  // Test the whole footprint against the union of surfaces, including seams.
  for (const [dx, dz] of [[-PLAYER_RADIUS, 0], [PLAYER_RADIUS, 0], [0, -PLAYER_RADIUS], [0, PLAYER_RADIUS]]) {
    if (!atPoint(position.x + dx, position.z + dz, support.height, surfaces)) return null
  }
  return support
}

function intersectsObstacle(position: Position, obstacles: readonly Obstacle[]): boolean {
  return obstacles.some((obstacle) => position.y < obstacle.yMax && position.y + 1.7 > obstacle.yMin &&
    position.x > obstacle.xMin - PLAYER_RADIUS && position.x < obstacle.xMax + PLAYER_RADIUS &&
    position.z > obstacle.zMin - PLAYER_RADIUS && position.z < obstacle.zMax + PLAYER_RADIUS)
}

export function canOccupy(position: Position, values: Readonly<Record<string, number>>): Support | null {
  const support = supportAt(position, getSurfaces(values))
  if (!support || intersectsObstacle({ ...position, y: support.height }, getObstacles(values))) return null
  return support
}

export function movePosition(position: Position, dx: number, dz: number, values: Readonly<Record<string, number>>): Position {
  const surfaces = getSurfaces(values)
  const obstacles = getObstacles(values)
  const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.09))
  const result = { ...position }
  const attempt = (x: number, z: number) => {
    const candidate = { x, y: result.y, z }
    const support = supportAt(candidate, surfaces)
    if (!support || intersectsObstacle({ ...candidate, y: support.height }, obstacles)) return
    result.x = x; result.z = z; result.y = support.height
  }
  for (let i = 0; i < count; i += 1) {
    attempt(result.x + dx / count, result.z)
    attempt(result.x, result.z + dz / count)
  }
  return result
}
