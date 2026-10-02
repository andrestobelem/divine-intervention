import * as THREE from 'three'

export interface Player {
  group: THREE.Group
  move: (direction: THREE.Vector2, delta: number, elapsed: number) => void
  jump: (elapsed: number) => void
  update: (elapsed: number) => void
}

export function createPlayer(): Player {
  const group = new THREE.Group()
  group.position.set(0, 0, 8.2)

  const robe = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 1.38, 9),
    new THREE.MeshStandardMaterial({ color: 0x6e303e, roughness: 0.76 }),
  )
  robe.position.y = 0.76
  group.add(robe)

  const mantle = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1.16, 9),
    new THREE.MeshStandardMaterial({ color: 0x9b6a51, roughness: 0.74 }),
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
    move: (direction, delta, elapsed) => {
      if (direction.lengthSq() === 0) return
      const speed = 4.2
      group.position.x = THREE.MathUtils.clamp(group.position.x + direction.x * speed * delta, -9.7, 9.7)
      group.position.z = THREE.MathUtils.clamp(group.position.z + direction.y * speed * delta, -3.8, 12.3)
      group.rotation.y = Math.atan2(direction.x, direction.y)
      robe.rotation.z = Math.sin(elapsed * 12) * 0.025
    },
    jump: (elapsed) => {
      group.userData.jumpUntil = elapsed + 0.72
    },
    update: (elapsed) => {
      const jumpUntil = group.userData.jumpUntil as number | undefined
      const remaining = jumpUntil ? jumpUntil - elapsed : -1
      if (remaining > 0) {
        const progress = 1 - remaining / 0.72
        group.position.y = Math.sin(progress * Math.PI) * 1.15
      } else {
        group.position.y = 0
        if (jumpUntil) delete group.userData.jumpUntil
      }
    },
  }
}
