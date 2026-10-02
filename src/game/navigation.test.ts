import { describe, expect, test } from 'bun:test'
import { GrowthSystem } from './growth'
import {
  INTERACTION_RANGE,
  PLANTS,
  START_POSITION,
  inTransferRange,
} from './level.ts'
import type { Position } from './level.ts'
import { canOccupy, movePosition } from './navigation.ts'

function makeGrowth(): GrowthSystem {
  return new GrowthSystem(PLANTS)
}

function moveTo(start: Position, target: Position, growth: GrowthSystem): Position {
  let position = { ...start }
  const distance = Math.hypot(target.x - start.x, target.z - start.z)
  const steps = Math.ceil(distance / 0.2)
  for (let index = 1; index <= steps; index += 1) {
    const nextX = start.x + (target.x - start.x) * index / steps
    const nextZ = start.z + (target.z - start.z) * index / steps
    const moved = movePosition(position, nextX - position.x, nextZ - position.z, growth.values)
    expect(moved.x).toBeCloseTo(nextX, 5)
    expect(moved.z).toBeCloseTo(nextZ, 5)
    expect(canOccupy(moved, growth.values)).not.toBeNull()
    position = moved
  }
  return position
}

describe('navigation acceptance', () => {
  test('threshold crack blocks the direct crossing until the root reaches its threshold', () => {
    const growth = makeGrowth()
    const start = { ...START_POSITION }
    const blocked = movePosition(start, 0, -5, growth.values)
    expect(blocked.z).toBeGreaterThan(12)
    expect(canOccupy({ x: 0, y: 0, z: 10.5 }, growth.values)).toBeNull()

    expect(growth.transfer('threshold-shrub', 'threshold-root', 3)).toBe(3)
    expect(canOccupy({ x: 0, y: 0, z: 10.5 }, growth.values)).not.toBeNull()
    const crossed = moveTo(start, { x: 0, y: 0, z: 8.6 }, growth)
    expect(crossed.z).toBeCloseTo(8.6, 5)
  })

  test('five courtyard growth opens either the bridge route or terrace route', () => {
    const bridgeGrowth = makeGrowth()
    bridgeGrowth.transfer('threshold-shrub', 'threshold-root', 3)
    bridgeGrowth.transfer('courtyard-shrub', 'courtyard-bridge', 3)
    expect(bridgeGrowth.get('courtyard-bridge')).toBe(3)

    let bridgeStart = moveTo({ ...START_POSITION }, { x: 0, y: 0, z: 8.6 }, bridgeGrowth)
    bridgeStart = moveTo(bridgeStart, { x: 1, y: 0, z: 5 }, bridgeGrowth)
    bridgeStart = moveTo(bridgeStart, { x: 1, y: 0, z: 2 }, bridgeGrowth)
    bridgeStart = moveTo(bridgeStart, { x: 0, y: 0, z: 2 }, bridgeGrowth)
    const bridgeHeart = moveTo(bridgeStart, { x: 0, y: 0, z: -4 }, bridgeGrowth)
    expect(bridgeHeart.z).toBeLessThan(-3)
    expect(canOccupy(bridgeHeart, bridgeGrowth.values)).not.toBeNull()

    const terraceGrowth = makeGrowth()
    terraceGrowth.transfer('threshold-shrub', 'threshold-root', 3)
    terraceGrowth.transfer('courtyard-shrub', 'courtyard-ramp', 4)
    let terraceStart = moveTo({ ...START_POSITION }, { x: 0, y: 0, z: 8.6 }, terraceGrowth)
    terraceStart = moveTo(terraceStart, { x: 1, y: 0, z: 2 }, terraceGrowth)
    terraceStart = moveTo(terraceStart, { x: 5.8, y: 0, z: 2 }, terraceGrowth)
    const terraceTop = moveTo(terraceStart, { x: 5.8, y: 1.5, z: -4 }, terraceGrowth)
    expect(terraceTop.y).toBeCloseTo(1.5, 5)
    expect(terraceTop.z).toBeLessThan(-3)
    const belowWall = moveTo(terraceTop, { x: 5.8, y: 1.5, z: -6 }, terraceGrowth)
    const descended = moveTo(belowWall, { x: 3, y: 0, z: -6 }, terraceGrowth)
    expect(descended.x).toBeCloseTo(3, 5)
    expect(descended.y).toBeCloseTo(0, 5)
    expect(descended.z).toBeCloseTo(-6, 5)
    expect(canOccupy(descended, terraceGrowth.values)).not.toBeNull()
  })

  test('the shared courtyard budget cannot fully enable bridge and ramp together', () => {
    const growth = makeGrowth()
    growth.transfer('courtyard-shrub', 'courtyard-bridge', 2.5)
    growth.transfer('courtyard-shrub', 'courtyard-ramp', 2.5)

    expect(growth.get('courtyard-shrub')).toBe(0)
    expect(growth.get('courtyard-bridge')).toBeLessThan(2.8)
    expect(growth.get('courtyard-ramp')).toBeLessThan(3.8)
    expect(2.8 + 3.8).toBeGreaterThan(5)
  })

  test('interaction range forbids transferring directly between sanctuary stages', () => {
    const thresholdRoot = PLANTS.find((plant) => plant.id === 'threshold-root')!
    const courtyardBridge = PLANTS.find((plant) => plant.id === 'courtyard-bridge')!
    const heartSeed = PLANTS.find((plant) => plant.id === 'heart-seed')!
    const player: Position = { x: 0, y: 0, z: 0 }

    expect(inTransferRange(thresholdRoot, courtyardBridge, player)).toBe(false)
    expect(inTransferRange(courtyardBridge, heartSeed, player)).toBe(false)
    expect(Math.hypot(courtyardBridge.position.x - heartSeed.position.x, courtyardBridge.position.z - heartSeed.position.z)).toBeGreaterThan(INTERACTION_RANGE)
  })

  test('draining the heart vine opens the veil, then growth from both plants fills the seed', () => {
    const growth = makeGrowth()
    growth.transfer('threshold-shrub', 'threshold-root', 3)
    growth.transfer('courtyard-shrub', 'courtyard-bridge', 3)
    let position = moveTo({ ...START_POSITION }, { x: 0, y: 0, z: 8.6 }, growth)
    position = moveTo(position, { x: 1, y: 0, z: 5 }, growth)
    position = moveTo(position, { x: 1, y: 0, z: 2 }, growth)
    position = moveTo(position, { x: 0, y: 0, z: 2 }, growth)
    position = moveTo(position, { x: 0, y: 0, z: -3.5 }, growth)

    expect(canOccupy({ x: 0, y: 0, z: -7.3 }, growth.values)).toBeNull()
    const vine = PLANTS.find((plant) => plant.id === 'heart-vine')!
    const seed = PLANTS.find((plant) => plant.id === 'heart-seed')!
    expect(inTransferRange(vine, seed, position)).toBe(true)
    growth.transfer('heart-vine', 'heart-seed', 2)
    expect(growth.get('heart-vine')).toBe(0)
    expect(canOccupy({ x: 0, y: 0, z: -7.3 }, growth.values)).not.toBeNull()

    position = moveTo(position, { x: 0, y: 0, z: -8 }, growth)
    const heartShrub = PLANTS.find((plant) => plant.id === 'heart-shrub')!
    expect(inTransferRange(heartShrub, seed, position)).toBe(true)
    growth.transfer('heart-shrub', 'heart-seed', 2)
    expect(growth.get('heart-seed')).toBe(4)
    const reachedHeart = moveTo(position, { x: 0, y: 0, z: -9 }, growth)
    expect(reachedHeart.z).toBeLessThan(-8.8)
  })

  test('removing the bridge removes midspan support and undo restores a walkable safe position', () => {
    const growth = makeGrowth()
    growth.transfer('courtyard-shrub', 'courtyard-bridge', 3)
    const safePosition: Position = { x: 0, y: 0, z: 0.7 }
    const midspan: Position = { x: 0, y: 0, z: -1 }
    expect(canOccupy(safePosition, growth.values)).not.toBeNull()
    expect(canOccupy(midspan, growth.values)).not.toBeNull()

    growth.beginTransfer('courtyard-bridge', 'courtyard-shrub', safePosition)
    growth.transfer('courtyard-bridge', 'courtyard-shrub', 3)
    growth.endTransfer()
    expect(canOccupy(midspan, growth.values)).toBeNull()

    const restoredPosition = growth.undo()
    expect(restoredPosition).toEqual(safePosition)
    expect(canOccupy(restoredPosition!, growth.values)).not.toBeNull()
    expect(canOccupy(midspan, growth.values)).not.toBeNull()
  })

  test('reset restores the baseline growth total and navigation state', () => {
    const growth = makeGrowth()
    expect(growth.total).toBe(12)
    growth.transfer('threshold-shrub', 'threshold-root', 3)
    growth.transfer('courtyard-shrub', 'courtyard-ramp', 4)
    growth.transfer('heart-vine', 'heart-seed', 2)
    expect(growth.total).toBeCloseTo(12)
    growth.reset()

    expect(growth.total).toBe(12)
    expect(growth.values).toEqual(Object.fromEntries(PLANTS.map((plant) => [plant.id, plant.initialGrowth])))
    expect(canOccupy({ x: 0, y: 0, z: 10.5 }, growth.values)).toBeNull()
    expect(canOccupy({ x: 0, y: 0, z: -7.3 }, growth.values)).toBeNull()
  })
})
