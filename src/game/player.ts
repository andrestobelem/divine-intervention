import * as THREE from 'three'
import { START_POSITION } from './level.ts'
import { movePosition } from './navigation.ts'

export interface Player {
  group: THREE.Group
  move: (direction: THREE.Vector2, delta: number, elapsed: number, values: Readonly<Record<string, number>>) => void
  update: (elapsed: number) => void
}

export function createPlayer(): Player {
  const group = new THREE.Group()
  group.position.set(START_POSITION.x, START_POSITION.y, START_POSITION.z)

  const robe = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 1.38, 9),
    new THREE.MeshStandardMaterial({ color: 0xb9b8a1, roughness: 0.76 }),
  )
  robe.position.y = 0.76
  group.add(robe)

  const mantle = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1.16, 9),
    new THREE.MeshStandardMaterial({ color: 0x617e77, roughness: 0.74 }),
  )
  mantle.position.set(0, 0.88, 0.035)
  group.add(mantle)

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 14, 10),
    new THREE.MeshStandardMaterial({ color: 0xb98768, roughness: 0.72 }),
  )
  head.position.y = 1.58
  head.scale.set(0.9, 1.05, 0.95)
  group.add(head)

  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(0.255, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.66),
    new THREE.MeshStandardMaterial({ color: 0x382934, roughness: 0.92, side: THREE.DoubleSide }),
  )
  hood.position.set(0, 1.65, -0.015)
  group.add(hood)

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 5, 12), new THREE.MeshStandardMaterial({ color: 0xc8a66e, metalness: 0.55, roughness: 0.42 }))
  belt.rotation.x = Math.PI / 2
  belt.position.y = 0.73
  group.add(belt)

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.48, 20),
    new THREE.MeshBasicMaterial({ color: 0x05070c, transparent: true, opacity: 0.42, depthWrite: false }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.015
  group.add(shadow)

  return {
    group,
    move: (direction, delta, elapsed, values) => {
      if (direction.lengthSq() === 0) return
      const speed = 2.8
      const position = movePosition(group.position, direction.x * speed * delta, direction.y * speed * delta, values)
      group.position.set(position.x, position.y, position.z)
      group.rotation.y = Math.atan2(direction.x, direction.y)
      robe.rotation.z = Math.sin(elapsed * 12) * 0.025
    },
    update: (elapsed) => {
      mantle.rotation.z = Math.sin(elapsed * 1.4) * 0.008
    },
  }
}
