import type { PlantDefinition, Position } from './level'

interface HistoryEntry {
  values: Map<string, number>
  safePosition: Position
}

interface ActiveTransfer {
  before: Map<string, number>
  safePosition: Position
}

function copyPosition(position: Position): Position {
  return { x: position.x, y: position.y, z: position.z }
}

export class GrowthSystem {
  private readonly capacities = new Map<string, number>()
  private readonly initial = new Map<string, number>()
  private current = new Map<string, number>()
  private history: HistoryEntry[] = []
  private active: ActiveTransfer | null = null

  constructor(definitions: readonly PlantDefinition[]) {
    for (const definition of definitions) {
      const capacity = Number.isFinite(definition.capacity) ? Math.max(0, definition.capacity) : 0
      const rawInitial = Number.isFinite(definition.initialGrowth) ? definition.initialGrowth : 0
      this.capacities.set(definition.id, capacity)
      this.initial.set(definition.id, Math.min(capacity, Math.max(0, rawInitial)))
    }
    this.current = new Map(this.initial)
  }

  get(id: string): number {
    return this.current.get(id) ?? 0
  }

  ratio(id: string): number {
    const capacity = this.capacities.get(id) ?? 0
    return capacity > 0 ? this.get(id) / capacity : 0
  }

  get values(): Readonly<Record<string, number>> {
    return Object.freeze(Object.fromEntries(this.current))
  }

  get total(): number {
    let sum = 0
    for (const value of this.current.values()) sum += value
    return sum
  }

  get canUndo(): boolean {
    return this.active !== null || this.history.length > 0
  }

  beginTransfer(_from: string, _to: string, safePosition: Position): void {
    if (this.active) this.endTransfer()
    this.active = {
      before: new Map(this.current),
      safePosition: copyPosition(safePosition),
    }
  }

  transfer(from: string, to: string, amount: number): number {
    if (from === to || !this.current.has(from) || !this.current.has(to)) return 0
    if (!Number.isFinite(amount) || amount <= 0) return 0

    const available = this.get(from)
    const room = (this.capacities.get(to) ?? 0) - this.get(to)
    const moved = Math.min(amount, available, Math.max(0, room))
    if (!(moved > 0)) return 0

    this.current.set(from, Math.max(0, available - moved))
    this.current.set(to, Math.min(this.capacities.get(to) ?? 0, this.get(to) + moved))
    return moved
  }

  endTransfer(): void {
    if (!this.active) return
    if (!this.mapsEqual(this.active.before, this.current)) {
      this.history.push({ values: new Map(this.active.before), safePosition: copyPosition(this.active.safePosition) })
    }
    this.active = null
  }

  undo(): Position | null {
    this.endTransfer()
    const entry = this.history.pop()
    if (!entry) return null
    this.current = new Map(entry.values)
    return copyPosition(entry.safePosition)
  }

  reset(): void {
    this.active = null
    this.history = []
    this.current = new Map(this.initial)
  }

  private mapsEqual(a: Map<string, number>, b: Map<string, number>): boolean {
    if (a.size !== b.size) return false
    for (const [id, value] of a) {
      if (b.get(id) !== value) return false
    }
    return true
  }
}
