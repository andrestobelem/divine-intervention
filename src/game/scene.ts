import * as THREE from 'three'

export const altarPosition = new THREE.Vector3(0, 0, -1.3)

export interface Sanctuary {
  scene: THREE.Scene
  altarLight: THREE.PointLight
  altarCore: THREE.Mesh
  update: (time: number, awakened: boolean) => void
}

const stone = new THREE.MeshStandardMaterial({ color: 0x343744, roughness: 0.86, metalness: 0.12 })
const darkStone = new THREE.MeshStandardMaterial({ color: 0x202430, roughness: 0.8, metalness: 0.16 })
const gold = new THREE.MeshStandardMaterial({ color: 0xb69a61, roughness: 0.38, metalness: 0.7 })
const paleGold = new THREE.MeshStandardMaterial({ color: 0xffdf9a, emissive: 0x57380d, roughness: 0.25, metalness: 0.45 })
const blueGlow = new THREE.MeshStandardMaterial({ color: 0x9ecfff, emissive: 0x2464ac, emissiveIntensity: 1.4, roughness: 0.2 })

function addColumn(scene: THREE.Scene, x: number, z: number, height: number, broken = false) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, 0.28, 12), darkStone)
  base.position.set(x, 0.15, z)
  scene.add(base)

  const shaftHeight = broken ? height * 0.67 : height
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.56, shaftHeight, 12), stone)
  shaft.position.set(x, 0.28 + shaftHeight / 2, z)
  if (broken) shaft.rotation.z = x < 0 ? -0.035 : 0.035
  scene.add(shaft)

  const capital = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.32, 1.25), stone)
  capital.position.set(x, 0.28 + shaftHeight + 0.13, z)
  scene.add(capital)
}

function addPillar(scene: THREE.Scene, x: number, y: number, z: number, height: number, radius: number) {
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.88, radius, height, 8), stone)
  pillar.position.set(x, y, z)
  pillar.rotation.z = (x + z) * 0.008
  scene.add(pillar)
}

function addArch(scene: THREE.Scene, x: number, z: number, rotationY: number) {
  const group = new THREE.Group()
  const archMaterial = new THREE.MeshStandardMaterial({ color: 0x444451, roughness: 0.88, metalness: 0.08 })
  const top = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.22, 6, 12, Math.PI), archMaterial)
  top.rotation.z = Math.PI
  top.position.y = 5.65
  group.add(top)
  for (const side of [-3.1, 3.1]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.62, 5.65, 0.72), archMaterial)
    pier.position.set(side, 2.82, 0)
    group.add(pier)
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.3, 1.05), stone)
    cap.position.set(side, 5.55, 0)
    group.add(cap)
  }
  group.position.set(x, 0, z)
  group.rotation.y = rotationY
  scene.add(group)
}

export function createSanctuary(): Sanctuary {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x090d17)
  scene.fog = new THREE.FogExp2(0x0b101c, 0.022)

  scene.add(new THREE.HemisphereLight(0x9bb8e9, 0x141824, 1.25))
  const moon = new THREE.DirectionalLight(0xa9c7ff, 2.1)
  moon.position.set(-7, 13, 6)
  scene.add(moon)
  const warmRim = new THREE.DirectionalLight(0xffd29a, 1.05)
  warmRim.position.set(8, 7, -5)
  scene.add(warmRim)

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x171b25, roughness: 0.94 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.15
  scene.add(floor)

  const island = new THREE.Mesh(new THREE.CylinderGeometry(13, 11.6, 1.1, 32), darkStone)
  island.position.y = -0.68
  scene.add(island)
  const islandTrim = new THREE.Mesh(new THREE.TorusGeometry(12.8, 0.11, 5, 48), gold)
  islandTrim.rotation.x = Math.PI / 2
  islandTrim.position.y = -0.1
  scene.add(islandTrim)

  for (const [x, z, width, depth] of [
    [0, 1.8, 1.9, 15],
    [-3.15, 1.1, 0.13, 13],
    [3.15, 1.1, 0.13, 13],
  ]) {
    const tile = new THREE.Mesh(new THREE.BoxGeometry(width, 0.055, depth), new THREE.MeshStandardMaterial({ color: 0x333545, roughness: 0.7, metalness: 0.14 }))
    tile.position.set(x, -0.09, z)
    scene.add(tile)
  }

  const dais = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.25, 0.72, 32), stone)
  dais.position.set(0, 0.22, -1.25)
  scene.add(dais)
  const daisRing = new THREE.Mesh(new THREE.TorusGeometry(3.83, 0.085, 6, 48), gold)
  daisRing.rotation.x = Math.PI / 2
  daisRing.position.set(0, 0.6, -1.25)
  scene.add(daisRing)

  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.025, 0.38), paleGold)
    mark.position.set(Math.sin(angle) * 3.54, 0.605, -1.25 + Math.cos(angle) * 3.54)
    mark.rotation.y = -angle
    scene.add(mark)
  }

  const altar = new THREE.Group()
  altar.position.set(altarPosition.x, 0.6, altarPosition.z)
  scene.add(altar)

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.76, 1.45), darkStone)
  plinth.position.y = 0.35
  altar.add(plinth)
  const plinthBand = new THREE.Mesh(new THREE.BoxGeometry(1.53, 0.1, 1.53), gold)
  plinthBand.position.y = 0.73
  altar.add(plinthBand)
  const obelisk = new THREE.Mesh(new THREE.OctahedronGeometry(0.63, 0), blueGlow)
  obelisk.position.y = 1.72
  altar.add(obelisk)
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.035, 8, 48), paleGold)
  halo.rotation.x = Math.PI / 2.5
  halo.position.y = 1.78
  altar.add(halo)

  const altarLight = new THREE.PointLight(0x73baff, 20, 13, 1.8)
  altarLight.position.set(0, 2.1, 0)
  altar.add(altarLight)

  const columns = [
    [-5.2, -1.3, 7.2, false], [5.2, -1.3, 7.2, false],
    [-6.1, 5.4, 5.8, true], [6.1, 5.4, 6.5, false],
    [-7.4, 10.3, 4.9, true], [7.4, 10.3, 5.6, true],
  ] as const
  for (const [x, z, height, broken] of columns) addColumn(scene, x, z, height, broken)

  addArch(scene, 0, 8.2, 0)
  addArch(scene, 0, 16.4, 0)
  addArch(scene, -10.3, 5.4, Math.PI / 2)
  addArch(scene, 10.3, 5.4, -Math.PI / 2)

  const rubble = [
    [-9, -1, 3, 0.4], [9, 1, 4, 0.48], [-10.2, 9, 2.5, 0.4],
    [9.6, 12.5, 3, 0.34], [-4.4, 13.2, 2, 0.34], [4.2, 15, 2.6, 0.32],
    [-8.4, 5.9, 3.2, 0.37], [8.9, 7.4, 2.1, 0.35],
  ] as const
  for (const [x, z, length, radius] of rubble) addPillar(scene, x, 0.25, z, length, radius)

  const brokenBlocks = [
    [-7.7, 2.6, 1.4], [-8.8, 3.1, 0.85], [7.1, 5.8, 1.15],
    [8.2, 6.4, 0.72], [-6.9, 11, 1], [6.8, 13, 1.35],
  ] as const
  for (const [x, z, size] of brokenBlocks) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.65, size * 0.8), stone)
    block.position.set(x, size * 0.31, z)
    block.rotation.set(0.05, x * 0.13, 0.09)
    scene.add(block)
  }

  const starGeometry = new THREE.BufferGeometry()
  const starPositions: number[] = []
  let seed = 31
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  for (let i = 0; i < 480; i += 1) {
    const radius = 15 + random() * 48
    const angle = random() * Math.PI * 2
    starPositions.push(Math.cos(angle) * radius, 2 + random() * 30, Math.sin(angle) * radius + 5)
  }
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3))
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xb7c9f0, size: 0.075, transparent: true, opacity: 0.75 }))
  scene.add(stars)

  const dustGeometry = new THREE.BufferGeometry()
  const dustPositions: number[] = []
  for (let i = 0; i < 75; i += 1) {
    dustPositions.push((random() - 0.5) * 20, 0.4 + random() * 5, random() * 15 - 2)
  }
  dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dustPositions, 3))
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xffdda0, size: 0.055, transparent: true, opacity: 0.58 }))
  scene.add(dust)

  const altarCore = obelisk
  return {
    scene,
    altarLight,
    altarCore,
    update: (time, awakened) => {
      altar.rotation.y = Math.sin(time * 0.22) * 0.12
      obelisk.rotation.x = time * 0.23
      obelisk.rotation.y = time * 0.38
      obelisk.position.y = 1.72 + Math.sin(time * 1.15) * 0.12
      halo.rotation.z = time * 0.18
      stars.rotation.y = time * 0.004
      dust.rotation.y = -time * 0.012
      const strength = awakened ? 34 + Math.sin(time * 3.8) * 4 : 17 + Math.sin(time * 1.7) * 2
      altarLight.intensity += (strength - altarLight.intensity) * 0.045
      obelisk.material = awakened ? paleGold : blueGlow
    },
  }
}
