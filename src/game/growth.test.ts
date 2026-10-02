import { describe, expect, test } from 'bun:test'
import { GrowthSystem } from './growth'
import type { PlantDefinition, Position } from './level'

const plants: readonly PlantDefinition[] = [
  { id: 'donor', name: 'Donor', kind: 'shrub', stage: 'threshold', position: { x: 0, y: 0, z: 0 }, initialGrowth: 8, capacity: 10 },
  { id: 'receiver', name: 'Receiver', kind: 'bridge', stage: 'courtyard', position: { x: 1, y: 0, z: 0 }, initialGrowth: 1, capacity: 5 },
  { id: 'empty', name: 'Empty', kind: 'ramp', stage: 'heart', position: { x: 2, y: 0, z: 0 }, initialGrowth: 0, capacity: 4 },
]

const safePosition: Position = { x: 3, y: 0, z: -2 }

function system(): GrowthSystem {
  return new GrowthSystem(plants)
}

describe('GrowthSystem', () => {
  test('conserves total through a sequence of transfers', () => {
    const growth = system()
    const startingTotal = growth.total

    expect(growth.transfer('donor', 'receiver', 2.5)).toBe(2.5)
    expect(growth.transfer('receiver', 'empty', 1.75)).toBe(1.75)
    expect(growth.transfer('empty', 'donor', 0.25)).toBe(0.25)
    expect(growth.total).toBeCloseTo(startingTotal)
    expect(growth.get('donor') + growth.get('receiver') + growth.get('empty')).toBeCloseTo(startingTotal)
  })

  test('clamps transfers to donor growth and receiver capacity', () => {
    const growth = system()
    expect(growth.transfer('donor', 'receiver', 100)).toBe(4)
    expect(growth.get('receiver')).toBe(5)
    expect(growth.get('donor')).toBe(4)
    expect(growth.transfer('empty', 'receiver', 1)).toBe(0)
    expect(growth.transfer('donor', 'empty', 100)).toBe(4)
    expect(growth.get('empty')).toBe(4)
  })

  test('rejects invalid transfers without changing growth', () => {
    const growth = system()
    const starting = growth.values
    for (const amount of [-1, 0, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(growth.transfer('donor', 'receiver', amount)).toBe(0)
    }
    expect(growth.transfer('missing', 'receiver', 1)).toBe(0)
    expect(growth.transfer('donor', 'missing', 1)).toBe(0)
    expect(growth.transfer('donor', 'donor', 1)).toBe(0)
    expect(growth.values).toEqual(starting)
  })

  test('records one reversible transaction and returns a copied safe position', () => {
    const growth = system()
    const position = { ...safePosition }
    growth.beginTransfer('donor', 'receiver', position)
    position.x = 99
    growth.transfer('donor', 'receiver', 2)
    growth.transfer('donor', 'receiver', 1)
    growth.endTransfer()

    expect(growth.canUndo).toBe(true)
    const restoredPosition = growth.undo()
    expect(growth.values).toEqual({ donor: 8, receiver: 1, empty: 0 })
    expect(restoredPosition).toEqual(safePosition)
    expect(restoredPosition).not.toBe(safePosition)
    expect(growth.canUndo).toBe(false)
  })

  test('does not create history for a transaction with no changes', () => {
    const growth = system()
    growth.beginTransfer('donor', 'receiver', safePosition)
    growth.endTransfer()
    expect(growth.canUndo).toBe(false)
    expect(growth.undo()).toBeNull()
  })

  test('undo ends an active transaction and restores its captured state and position', () => {
    const growth = system()
    growth.beginTransfer('donor', 'receiver', safePosition)
    growth.transfer('donor', 'receiver', 3)

    expect(growth.undo()).toEqual(safePosition)
    expect(growth.values).toEqual({ donor: 8, receiver: 1, empty: 0 })
    expect(growth.canUndo).toBe(false)
  })

  test('values snapshots cannot alias internal state or each other', () => {
    const growth = system()
    const snapshot = growth.values
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(() => { (snapshot as Record<string, number>).donor = 0 }).toThrow()
    expect(growth.get('donor')).toBe(8)
    expect(growth.values).not.toBe(snapshot)
  })

  test('reset restores the initial sanctuary state and clears undo history', () => {
    const growth = system()
    growth.beginTransfer('donor', 'receiver', safePosition)
    growth.transfer('donor', 'receiver', 4)
    growth.endTransfer()
    growth.transfer('receiver', 'empty', 2)
    growth.reset()

    expect(growth.values).toEqual({ donor: 8, receiver: 1, empty: 0 })
    expect(growth.total).toBe(9)
    expect(growth.canUndo).toBe(false)
    expect(growth.undo()).toBeNull()
  })

  test('ratio is normalized by capacity and safe for unknown or zero-capacity plants', () => {
    const growth = new GrowthSystem([
      ...plants,
      { id: 'closed', name: 'Closed', kind: 'heart', stage: 'heart', position: { x: 0, y: 0, z: 0 }, initialGrowth: 0, capacity: 0 },
    ])
    expect(growth.ratio('donor')).toBe(0.8)
    expect(growth.ratio('missing')).toBe(0)
    expect(growth.ratio('closed')).toBe(0)
  })
})
