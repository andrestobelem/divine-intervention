export type StageId = 'threshold' | 'courtyard' | 'heart'
export type PlantKind = 'shrub' | 'bridge' | 'ramp' | 'vine' | 'heart'
export interface Position { x: number; y: number; z: number }
export interface PlantDefinition {
  id: string
  name: string
  kind: PlantKind
  stage: StageId
  position: Position
  initialGrowth: number
  capacity: number
  threshold?: number
}
export interface Surface {
  id: string
  xMin: number; xMax: number; zMin: number; zMax: number
  yMin: number; yMax: number
  axis: 'flat' | 'x' | 'z'
  safe: boolean
  plantId?: string
}
export interface Obstacle {
  id: string
  xMin: number; xMax: number; zMin: number; zMax: number
  yMin: number; yMax: number
}
export const INTERACTION_RANGE = 7
export const START_POSITION: Position = { x: 0, y: 0, z: 17 }
export const PLANTS: readonly PlantDefinition[] = [
  { id: 'threshold-shrub', name: 'Arbusto del umbral', kind: 'shrub', stage: 'threshold', position: { x: -2.7, y: 0, z: 14.7 }, initialGrowth: 3, capacity: 3 },
  { id: 'threshold-root', name: 'Raíz del umbral', kind: 'bridge', stage: 'threshold', position: { x: 0, y: 0, z: 12.2 }, initialGrowth: 0, capacity: 3, threshold: 2.8 },
  { id: 'courtyard-shrub', name: 'Árbol de los caminos', kind: 'shrub', stage: 'courtyard', position: { x: 0, y: 0, z: 3.5 }, initialGrowth: 5, capacity: 5 },
  { id: 'courtyard-bridge', name: 'Raíz del puente', kind: 'bridge', stage: 'courtyard', position: { x: 0, y: 0, z: 1.4 }, initialGrowth: 0, capacity: 3, threshold: 2.8 },
  { id: 'courtyard-ramp', name: 'Raíz de la terraza', kind: 'ramp', stage: 'courtyard', position: { x: 5.8, y: 0, z: 1.4 }, initialGrowth: 0, capacity: 4, threshold: 3.8 },
  { id: 'heart-vine', name: 'Enredadera del velo', kind: 'vine', stage: 'heart', position: { x: 0, y: 0, z: -7.15 }, initialGrowth: 2, capacity: 2, threshold: 0.85 },
  { id: 'heart-shrub', name: 'Árbol del silencio', kind: 'shrub', stage: 'heart', position: { x: -3.2, y: 0, z: -8.8 }, initialGrowth: 2, capacity: 2 },
  { id: 'heart-seed', name: 'Corazón del jardín', kind: 'heart', stage: 'heart', position: { x: 0, y: 0, z: -10.1 }, initialGrowth: 0, capacity: 4, threshold: 3.6 },
]

export const BASE_SURFACES: readonly Surface[] = [
  { id: 'threshold-bank', xMin: -5.5, xMax: 5.5, zMin: 12, zMax: 20, yMin: 0, yMax: 0, axis: 'flat', safe: true },
  { id: 'courtyard-bank', xMin: -6, xMax: 7.2, zMin: 1, zMax: 9, yMin: 0, yMax: 0, axis: 'flat', safe: true },
  { id: 'heart-bank', xMin: -6, xMax: 6, zMin: -13, zMax: -3, yMin: 0, yMax: 0, axis: 'flat', safe: true },
  { id: 'terrace', xMin: 4.8, xMax: 7.8, zMin: -7, zMax: -3, yMin: 1.5, yMax: 1.5, axis: 'flat', safe: true },
  { id: 'terrace-return', xMin: 3, xMax: 4.8, zMin: -7, zMax: -5.2, yMin: 0, yMax: 1.5, axis: 'x', safe: true },
]
export const GROWTH_SURFACES: readonly Surface[] = [
  { id: 'threshold-crossing', xMin: -1, xMax: 1, zMin: 9, zMax: 12, yMin: 0, yMax: 0, axis: 'flat', safe: false, plantId: 'threshold-root' },
  { id: 'courtyard-crossing', xMin: -1.05, xMax: 1.05, zMin: -3, zMax: 1, yMin: 0, yMax: 0, axis: 'flat', safe: false, plantId: 'courtyard-bridge' },
  { id: 'terrace-ascent', xMin: 4.8, xMax: 7.8, zMin: -3, zMax: 1, yMin: 1.5, yMax: 0, axis: 'z', safe: false, plantId: 'courtyard-ramp' },
]
export const OBSTACLES: readonly Obstacle[] = [
  { id: 'veil-west', xMin: -6, xMax: -1.4, zMin: -7.55, zMax: -7.05, yMin: 0, yMax: 1.7 },
  { id: 'veil-east', xMin: 1.4, xMax: 6, zMin: -7.55, zMax: -7.05, yMin: 0, yMax: 1.7 },
  { id: 'column-a', xMin: -4.7, xMax: -3.9, zMin: 15.9, zMax: 16.7, yMin: 0, yMax: 4.5 },
  { id: 'column-b', xMin: 3.9, xMax: 4.7, zMin: 15.9, zMax: 16.7, yMin: 0, yMax: 4.5 },
  { id: 'column-c', xMin: -4.9, xMax: -4.1, zMin: 5.2, zMax: 6, yMin: 0, yMax: 5 },
  { id: 'column-d', xMin: 5.6, xMax: 6.4, zMin: 5.2, zMax: 6, yMin: 0, yMax: 5 },
  { id: 'terrace-wall', xMin: 4.65, xMax: 4.85, zMin: -5.2, zMax: -3, yMin: 0, yMax: 1.35 },
]
export function surfaceHeight(surface: Surface, x: number, z: number): number {
  if (surface.axis === 'flat') return surface.yMin
  const progress = surface.axis === 'x' ? (x - surface.xMin) / (surface.xMax - surface.xMin) : (z - surface.zMin) / (surface.zMax - surface.zMin)
  return surface.yMin + (surface.yMax - surface.yMin) * Math.max(0, Math.min(1, progress))
}
export function growthProgress(plantId: string, values: Readonly<Record<string, number>>): number {
  const plant = PLANTS.find((p) => p.id === plantId)!
  return Math.min(1, Math.max(0, (values[plantId] ?? 0) / (plant.threshold ?? plant.capacity)))
}
export function getSurfaces(values: Readonly<Record<string, number>>): Surface[] {
  const surfaces = [...BASE_SURFACES]
  for (const surface of GROWTH_SURFACES) {
    const progress = growthProgress(surface.plantId!, values)
    if (progress < 0.04) continue
    surfaces.push({ ...surface, zMin: surface.zMax - (surface.zMax - surface.zMin) * progress, yMin: surface.yMin * progress })
  }
  return surfaces
}
export function getObstacles(values: Readonly<Record<string, number>>): Obstacle[] {
  const result = [...OBSTACLES]
  for (const plant of PLANTS) {
    if (plant.kind !== 'shrub' && plant.kind !== 'heart') continue
    result.push({ id: `${plant.id}-trunk`, xMin: plant.position.x - 0.25, xMax: plant.position.x + 0.25, zMin: plant.position.z - 0.25, zMax: plant.position.z + 0.25, yMin: 0, yMax: 2 })
  }
  if ((values['heart-vine'] ?? 0) > 0.85) result.push({ id: 'living-veil', xMin: -1.4, xMax: 1.4, zMin: -7.55, zMax: -7.05, yMin: 0, yMax: 2.5 })
  return result
}
export function stageAt(position: Position): StageId {
  return position.z > 9 ? 'threshold' : position.z > -3 ? 'courtyard' : 'heart'
}
export function inTransferRange(source: PlantDefinition, target: PlantDefinition, player: Position): boolean {
  const distance = (a: Position, b: Position) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
  return distance(source.position, player) <= INTERACTION_RANGE && distance(target.position, player) <= INTERACTION_RANGE && distance(source.position, target.position) <= INTERACTION_RANGE
}
