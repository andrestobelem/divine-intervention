import * as THREE from 'three'
import { BASE_SURFACES, GROWTH_SURFACES, OBSTACLES, PLANTS, growthProgress, surfaceHeight } from './level'

export interface SceneSelection { source: string | null; target: string | null; hover: string | null; inRange: boolean; transferring: boolean }
export interface PlantView { group: THREE.Group; anchor: THREE.Vector3 }

const mat = (color: number, roughness = 0.82, metalness = 0.04, emissive = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity: emissive ? 0.55 : 0 })
const stone = mat(0x263b40), edgeStone = mat(0x35494a), dark = mat(0x12272e), moss = mat(0x76977b), leaf = mat(0xa1b993), gold = mat(0xe3bd71, 0.45, 0.25, 0x73501c), glow = mat(0xffdd91, 0.28, 0.1, 0xffbd55)
const unitBox = new THREE.BoxGeometry(1, 1, 1)
const sphere = new THREE.IcosahedronGeometry(1, 1)
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 9)
const torus = new THREE.TorusGeometry(1, 0.028, 6, 36)

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, position: THREE.Vector3 | [number, number, number], scale?: [number, number, number]) {
  const m = new THREE.Mesh(geometry, material)
  if (Array.isArray(position)) m.position.set(...position); else m.position.copy(position)
  if (scale) m.scale.set(...scale)
  parent.add(m)
  return m
}

function box(parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sy: number, sz: number, material = stone) {
  return mesh(unitBox, material, parent, [x, y, z], [sx, sy, sz])
}

export function createSanctuary() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x07151c)
  scene.fog = new THREE.FogExp2(0x0b2028, 0.022)
  scene.add(new THREE.HemisphereLight(0x9fb8bb, 0x172326, 1.25))
  const moon = new THREE.DirectionalLight(0xacc7cb, 1.8); moon.position.set(-7, 13, 5); scene.add(moon)
  const amber = new THREE.PointLight(0xe8bb76, 11, 17, 1.7); amber.position.set(0, 4, -9); scene.add(amber)

  // Separate slabs preserve the open fissures between the three sanctum stages.
  for (const s of BASE_SURFACES) {
    if (s.id === 'terrace-return') continue
    const w = s.xMax - s.xMin, d = s.zMax - s.zMin
    const slab = mesh(unitBox, stone, scene, [(s.xMin + s.xMax) / 2, s.yMin - 0.22, (s.zMin + s.zMax) / 2], [w, 0.44, d])
    slab.receiveShadow = true
    box(scene, (s.xMin + s.xMax) / 2, s.yMin - 0.01, s.zMin + 0.06, w - 0.24, 0.035, 0.06, edgeStone)
  }
  // A low outer foundation frames the island without bridging the traversable gaps.
  for (const [z, width] of [[19.9, 11], [9, 11], [1, 12], [-3, 12], [-13, 12]] as const) box(scene, 0, -0.64, z, width, 0.45, 0.3, dark)

  // Sparse inlaid path marks guide the eye toward the courtyard and buried heart.
  for (const z of [18, 16.8, 15.6, 14.4, 13.2, 8, 7, 2.3, -4, -5.4, -9.2, -11.2]) {
    const mark = mesh(unitBox, mat(0x647b78, 0.55, 0.1, 0x172922), scene, [0, 0.012, z], [0.12, 0.018, 0.62])
    mark.rotation.y = (z % 2) * 0.08
  }
  // Cracked perimeter columns and compact lintels give each stage a recognizable frame.
  for (const o of OBSTACLES) {
    const cx = (o.xMin + o.xMax) / 2, cz = (o.zMin + o.zMax) / 2
    const h = o.yMax
    box(scene, cx, h / 2, cz, o.xMax - o.xMin, h, o.zMax - o.zMin, edgeStone)
    box(scene, cx, h + 0.08, cz, (o.xMax - o.xMin) + 0.28, 0.16, (o.zMax - o.zMin) + 0.28, stone)
    box(scene, cx, 0.11, cz, (o.xMax - o.xMin) + 0.38, 0.22, (o.zMax - o.zMin) + 0.38, dark)
  }
  // Altar-like fossil rings are embedded in the heart platform.
  const floorRing = mesh(torus, gold, scene, [0, 0.025, -9.3], [2.4, 2.4, 1]); floorRing.rotation.x = Math.PI / 2
  const innerRing = mesh(torus, edgeStone, scene, [0, 0.032, -9.3], [1.5, 1.5, 1]); innerRing.rotation.x = Math.PI / 2

  const plants = new Map<string, PlantView>()
  const pickables: THREE.Object3D[] = []
  const visuals = new Map<string, { group: THREE.Group; parts: THREE.Object3D[]; halo: THREE.Mesh; stem?: THREE.Mesh; canopy?: THREE.Group; bud?: THREE.Mesh }>()
  for (const def of PLANTS) {
    const group = new THREE.Group(); group.position.set(def.position.x, def.position.y, def.position.z); scene.add(group)
    const parts: THREE.Object3D[] = []
    let canopy: THREE.Group | undefined, stem: THREE.Mesh | undefined, bud: THREE.Mesh | undefined
    if (def.kind === 'shrub') {
      stem = mesh(cylinder, moss, group, [0, 0.68, 0], [0.16, 1.36, 0.16]); parts.push(stem)
      canopy = new THREE.Group(); canopy.position.y = 1.35; group.add(canopy)
      for (const [x, y, z, r] of [[0, 0.25, 0, 0.72], [-0.52, -0.05, 0.1, 0.48], [0.48, -0.04, -0.08, 0.52], [0.05, 0.72, -0.05, 0.44]] as const) {
        const leafMesh = mesh(sphere, leaf, canopy, [x, y, z], [r, r * 0.82, r * 0.9]); parts.push(leafMesh)
      }
      bud = mesh(sphere, glow, canopy, [0, 1.08, 0], [0.13, 0.18, 0.13]); parts.push(bud)
    } else if (def.kind === 'heart') {
      stem = mesh(cylinder, moss, group, [0, 0.22, 0], [0.23, 0.44, 0.23]); parts.push(stem)
      canopy = new THREE.Group(); canopy.position.y = 0.5; group.add(canopy)
      // Crown silhouette appears only as the conserved growth returns to its source.
      for (const [x, y, z, r] of [[0, 1.5, 0, 1.05], [-0.85, 1.15, 0.2, 0.78], [0.78, 1.25, -0.18, 0.85], [0.05, 2.18, -0.05, 0.62]] as const) {
        const crown = mesh(sphere, leaf, canopy, [x, y, z], [r, r * 0.9, r]); parts.push(crown)
      }
      bud = mesh(sphere, glow, canopy, [0, 0.8, 0], [0.2, 0.25, 0.2]); parts.push(bud)
    } else if (def.kind === 'vine') {
      for (let i = 0; i < 9; i++) {
        const t = i / 8, x = -1.55 + t * 3.1, y = 0.55 + Math.sin(t * Math.PI) * 1.05
        const leafMesh = mesh(sphere, moss, group, [x, y, 0], [0.24, 0.4, 0.14]); leafMesh.rotation.z = (t - 0.5) * 0.6; parts.push(leafMesh)
      }
    } else {
      stem = mesh(cylinder, moss, group, [0, 0.3, 0], [0.18, 0.6, 0.18]); parts.push(stem)
      bud = mesh(sphere, leaf, group, [0, 0.72, 0], [0.36, 0.46, 0.36]); parts.push(bud)
      const petals = new THREE.Group(); petals.position.y = 0.72; group.add(petals)
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; const petal = mesh(sphere, leaf, petals, [Math.cos(a) * 0.43, 0, Math.sin(a) * 0.43], [0.29, 0.13, 0.2]); petal.rotation.y = -a; parts.push(petal) }
      canopy = petals
    }
    const halo = mesh(torus, gold, group, [0, 0.11, 0], [0.65, 0.65, 1]); halo.rotation.x = Math.PI / 2
    halo.visible = false
    // Invisible, stable selection target sits at the shared projected anchor height.
    const target = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 6), new THREE.MeshBasicMaterial({ visible: false }))
    target.position.set(0, 1.3, 0); target.userData.plantId = def.id; group.add(target); pickables.push(target)
    const anchor = new THREE.Vector3(def.position.x, def.position.y + 1.3, def.position.z)
    plants.set(def.id, { group, anchor }); visuals.set(def.id, { group, parts, halo, stem, canopy, bud })
  }

  // One buried tree feeds every visible plant through a shallow, branching root network.
  const rootMaterial = new THREE.MeshStandardMaterial({ color: 0x526b5b, emissive: 0x17271c, emissiveIntensity: 0.2, roughness: 0.9, transparent: true, opacity: 0.78 })
  const rootBase = new THREE.Color(0x526b5b), rootGold = new THREE.Color(0xd5b86e)
  const rootEmber = new THREE.Color(0x17271c), rootLight = new THREE.Color(0x9c692b)
  const rootGroup = new THREE.Group(); scene.add(rootGroup)
  const heart = PLANTS.find((p) => p.kind === 'heart')!
  for (const plant of PLANTS) {
    if (plant.id === heart.id) continue
    const start = new THREE.Vector3(plant.position.x, 0.048, plant.position.z)
    const end = new THREE.Vector3(heart.position.x, 0.048, heart.position.z)
    const dx = end.x - start.x, dz = end.z - start.z, length = Math.hypot(dx, dz) || 1
    const bend = (plant.position.x < heart.position.x ? -1 : 1) * 0.24
    const points = [start, new THREE.Vector3(start.x + dx * 0.34 - dz / length * bend, 0.048, start.z + dz * 0.34 + dx / length * bend), new THREE.Vector3(start.x + dx * 0.68 + dz / length * bend, 0.048, start.z + dz * 0.68 - dx / length * bend), end]
    const rootCurve = new THREE.CatmullRomCurve3(points)
    const root = new THREE.Mesh(new THREE.TubeGeometry(rootCurve, 20, 0.038, 5, false), rootMaterial)
    root.frustumCulled = false; rootGroup.add(root)
  }
  // A short exposed bole ties the converging roots to the heart's growing crown.
  const buriedBole = mesh(cylinder, rootMaterial, rootGroup, [heart.position.x, -0.24, heart.position.z], [0.2, 0.72, 0.2])
  buriedBole.rotation.z = -0.08

  const dynamic: { surfaceId: string; mesh: THREE.Mesh; geometry: THREE.BufferGeometry }[] = []
  for (const s of GROWTH_SURFACES) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3))
    geometry.setIndex([0, 2, 1, 0, 3, 2]); geometry.computeVertexNormals()
    const deck = new THREE.Mesh(geometry, moss); deck.visible = false; deck.receiveShadow = true; deck.frustumCulled = false; scene.add(deck)
    dynamic.push({ surfaceId: s.id, mesh: deck, geometry })
    // Interleaved stone ribs make the living span read as a walkable bridge/ramp.
    for (let i = 0; i < 8; i++) {
      const rib = box(scene, (s.xMin + s.xMax) / 2, 0, 0, s.xMax - s.xMin, 0.12, 0.22, edgeStone)
      ;(rib as THREE.Mesh).userData.dynamicSurface = s.id
      dynamic.push({ surfaceId: `${s.id}:rib:${i}`, mesh: rib as THREE.Mesh, geometry: rib.geometry as THREE.BufferGeometry })
    }
  }
  // Permanent return deck follows the declared x-axis slope exactly.
  const returnSurface = BASE_SURFACES.find((s) => s.id === 'terrace-return')!
  const returnGeo = new THREE.BufferGeometry(), returnPositions = new Float32Array(12)
  returnGeo.setAttribute('position', new THREE.BufferAttribute(returnPositions, 3)); returnGeo.setIndex([0, 2, 1, 0, 3, 2])
  const returnDeck = new THREE.Mesh(returnGeo, moss); returnDeck.receiveShadow = true; returnDeck.frustumCulled = false; scene.add(returnDeck)
  const returnAttr = returnGeo.getAttribute('position') as THREE.BufferAttribute
  returnAttr.setXYZ(0, returnSurface.xMin, surfaceHeight(returnSurface, returnSurface.xMin, returnSurface.zMin) + 0.025, returnSurface.zMin)
  returnAttr.setXYZ(1, returnSurface.xMax, surfaceHeight(returnSurface, returnSurface.xMax, returnSurface.zMin) + 0.025, returnSurface.zMin)
  returnAttr.setXYZ(2, returnSurface.xMax, surfaceHeight(returnSurface, returnSurface.xMax, returnSurface.zMax) + 0.025, returnSurface.zMax)
  returnAttr.setXYZ(3, returnSurface.xMin, surfaceHeight(returnSurface, returnSurface.xMin, returnSurface.zMax) + 0.025, returnSurface.zMax)
  returnAttr.needsUpdate = true; returnGeo.computeVertexNormals()
  for (let i = 0; i < 7; i++) {
    const z = returnSurface.zMin + (i + 0.5) / 7 * (returnSurface.zMax - returnSurface.zMin)
    const x = (returnSurface.xMin + returnSurface.xMax) / 2
    const rib = box(scene, x, surfaceHeight(returnSurface, x, z), z, returnSurface.xMax - returnSurface.xMin, 0.11, 0.13, edgeStone)
    rib.rotation.z = Math.atan2(returnSurface.yMax - returnSurface.yMin, returnSurface.xMax - returnSurface.xMin)
  }

  const threadGeometry = new THREE.BufferGeometry()
  const threadPositions = new Float32Array(33 * 3)
  threadGeometry.setAttribute('position', new THREE.BufferAttribute(threadPositions, 3))
  const thread = new THREE.Line(threadGeometry, new THREE.LineBasicMaterial({ color: 0x8e9782, transparent: true, opacity: 0.8 }))
  thread.visible = false; scene.add(thread)
  const motesN = 24, motePositions = new Float32Array(motesN * 3)
  const moteGeometry = new THREE.BufferGeometry(); moteGeometry.setAttribute('position', new THREE.BufferAttribute(motePositions, 3))
  const motes = new THREE.Points(moteGeometry, new THREE.PointsMaterial({ color: 0xffd27a, size: 0.095, transparent: true, opacity: 0.9, depthWrite: false }))
  motes.visible = false; motes.frustumCulled = false; scene.add(motes)

  mesh(new THREE.SphereGeometry(1, 16, 12), mat(0xd0dad0, 0.9, 0, 0x15201b), scene, [-11, 18, -25], [2.1, 2.1, 2.1])
  const dustPositions = new Float32Array(96 * 3)
  for (let i = 0; i < 96; i++) { const a = i * 2.399, r = 5 + (i % 13) * 0.55; dustPositions[i * 3] = Math.cos(a) * r; dustPositions[i * 3 + 1] = 0.3 + (i % 9) * 0.38; dustPositions[i * 3 + 2] = 3 - (i % 29) * 0.72 }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xc7bb91, size: 0.045, transparent: true, opacity: 0.48, depthWrite: false })); scene.add(dust)

  const update = (time: number, _delta: number, values: Readonly<Record<string, number>>, selection: SceneSelection, revealed: boolean) => {
    dust.rotation.y = time * 0.008
    amber.intensity = 9 + Math.sin(time * 0.65) * 1.1 + (revealed ? 8 : 0)
    const heartProgress = growthProgress('heart-seed', values)
    const rootAwakening = revealed ? 1 : heartProgress * 0.72
    rootMaterial.color.lerpColors(rootBase, rootGold, rootAwakening)
    rootMaterial.emissive.lerpColors(rootEmber, rootLight, rootAwakening)
    rootMaterial.emissiveIntensity = 0.18 + rootAwakening * (0.65 + Math.sin(time * 1.35) * 0.08)
    rootMaterial.opacity = 0.68 + rootAwakening * 0.27
    for (const def of PLANTS) {
      const v = visuals.get(def.id)!, value = Math.max(0, values[def.id] ?? def.initialGrowth)
      const p = growthProgress(def.id, values)
      v.halo.visible = selection.source === def.id || selection.target === def.id || selection.hover === def.id
      v.halo.material = selection.source === def.id ? glow : selection.target === def.id ? gold : edgeStone as THREE.MeshStandardMaterial
      v.halo.scale.setScalar(1 + Math.sin(time * 3.2) * 0.055)
      if (def.kind === 'shrub') {
        const stages = Math.max(0.12, Math.min(1, value / Math.max(1, def.capacity)))
        const height = 1.36 * (0.35 + 0.65 * stages)
        if (v.canopy) { v.canopy.scale.setScalar(stages); v.canopy.position.y = height }
        if (v.stem) { v.stem.scale.y = height; v.stem.position.y = height / 2 }
        if (v.bud) v.bud.visible = value > def.capacity * 0.58
      } else if (def.kind === 'heart') {
        const amount = Math.max(0.02, p)
        if (v.canopy) v.canopy.scale.setScalar(amount)
        if (v.stem) { v.stem.scale.y = 0.44 * (0.4 + amount * 0.6); v.stem.position.y = v.stem.scale.y / 2 }
        if (v.bud) v.bud.visible = amount > 0.35 || revealed
      } else if (def.kind === 'vine') {
        const amount = Math.max(0, Math.min(1, value / Math.max(1, def.capacity)))
        for (let i = 0; i < v.parts.length; i++) {
          const part = v.parts[i], t = i / (v.parts.length - 1)
          part.visible = amount > 0.005
          part.scale.set(0.24 * amount, 0.4 * amount, 0.14 * amount)
          part.position.set(-1.55 + t * 3.1, (0.55 + Math.sin(t * Math.PI) * 1.05) * amount, (t - 0.5) * (1 - amount) * 0.7)
        }
      } else {
        const amount = Math.max(0.05, p)
        if (v.stem) { v.stem.scale.y = 0.6 * amount; v.stem.position.y = v.stem.scale.y / 2 }
        if (v.bud) { v.bud.scale.set(0.36 * amount, 0.46 * amount, 0.36 * amount); v.bud.position.y = 0.15 + 0.57 * amount }
        if (v.canopy) { v.canopy.scale.setScalar(amount); v.canopy.position.y = 0.15 + 0.57 * amount }
      }
    }
    for (const d of dynamic) {
      if (d.surfaceId.includes(':rib:')) {
        const [id, , indexStr] = d.surfaceId.split(':'); const i = Number(indexStr)
        const surface = GROWTH_SURFACES.find((s) => s.id === id)!
        const prog = growthProgress(surface.plantId!, values), z = surface.zMax - (surface.zMax - surface.zMin) * prog * ((i + 0.5) / 8)
        d.mesh.visible = prog > 0.04; d.mesh.position.set((surface.xMin + surface.xMax) / 2, surfaceHeight({ ...surface, zMin: surface.zMax - (surface.zMax - surface.zMin) * prog, yMin: surface.yMin * prog }, 0, z) + 0.035, z)
        continue
      }
      const surface = GROWTH_SURFACES.find((s) => s.id === d.surfaceId)!, prog = growthProgress(surface.plantId!, values)
      const zMin = surface.zMax - (surface.zMax - surface.zMin) * prog, yMin = surface.yMin * prog
      const hAt = (z: number) => surfaceHeight({ ...surface, zMin, yMin }, (surface.xMin + surface.xMax) / 2, z) + 0.04
      const pos = d.geometry.getAttribute('position') as THREE.BufferAttribute
      pos.setXYZ(0, surface.xMin, hAt(zMin), zMin); pos.setXYZ(1, surface.xMax, hAt(zMin), zMin)
      pos.setXYZ(2, surface.xMax, surface.yMax + 0.04, surface.zMax); pos.setXYZ(3, surface.xMin, surface.yMax + 0.04, surface.zMax)
      pos.needsUpdate = true; d.geometry.computeVertexNormals(); d.mesh.visible = prog > 0.04
    }
    const source = selection.source ? plants.get(selection.source) : undefined, target = selection.target ? plants.get(selection.target) : undefined
    thread.visible = !!source && !!target
    motes.visible = !!source && !!target && selection.transferring
    if (source && target) {
      const a = source.anchor, b = target.anchor
      const cx = (a.x + b.x) / 2, cy = Math.max(a.y, b.y) + 1.1, cz = (a.z + b.z) / 2
      const attr = thread.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i <= 32; i++) {
        const t = i / 32, u = 1 - t
        attr.setXYZ(i, u * u * a.x + 2 * u * t * cx + t * t * b.x, u * u * a.y + 2 * u * t * cy + t * t * b.y, u * u * a.z + 2 * u * t * cz + t * t * b.z)
      }
      attr.needsUpdate = true; thread.geometry.computeBoundingSphere()
      ;(thread.material as THREE.LineBasicMaterial).color.set(selection.inRange ? 0xe4c177 : 0x87938c)
      ;(thread.material as THREE.LineBasicMaterial).opacity = selection.inRange ? 0.95 : 0.48
      for (let i = 0; i < motesN; i++) {
        const t = (i / motesN + time * 0.28) % 1, u = 1 - t
        motePositions[i * 3] = u * u * a.x + 2 * u * t * cx + t * t * b.x
        motePositions[i * 3 + 1] = u * u * a.y + 2 * u * t * cy + t * t * b.y
        motePositions[i * 3 + 2] = u * u * a.z + 2 * u * t * cz + t * t * b.z
      }
      moteGeometry.attributes.position.needsUpdate = true
    }
  }
  return { scene, plants, pickables, update }
}
