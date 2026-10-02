import * as THREE from 'three'
import { createSanctuary, altarPosition } from './game/scene.ts'
import { createPlayer } from './game/player.ts'
import './style.css'

const mount = document.querySelector<HTMLDivElement>('#scene')!
const intro = document.querySelector<HTMLElement>('#intro')!
const beginButton = document.querySelector<HTMLButtonElement>('#begin-button')!
const hudLeft = document.querySelector<HTMLElement>('#hud-left')!
const hudRight = document.querySelector<HTMLElement>('#hud-right')!
const bottomBar = document.querySelector<HTMLElement>('#bottom-bar')!
const interaction = document.querySelector<HTMLElement>('#interaction')!
const message = document.querySelector<HTMLElement>('#message')!

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15
mount.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 130)
camera.position.set(12, 13, 21)
camera.lookAt(0, 1.5, 3)

const sanctuary = createSanctuary()
const player = createPlayer()
sanctuary.scene.add(player.group)

const keys = new Set<string>()
let playing = false
let awakened = false
let elapsed = 0
let lastTime = 0
let messageTimeout = 0

function setPlaying(value: boolean) {
  playing = value
  intro.classList.toggle('is-hidden', value)
  hudLeft.classList.toggle('is-visible', value)
  hudRight.classList.toggle('is-visible', value)
  bottomBar.classList.toggle('is-visible', value)
}

beginButton.addEventListener('click', () => {
  setPlaying(true)
})

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase()
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault()
  keys.add(key)
  if (key === ' ' && playing) player.jump(elapsed)
  if (key === 'e' && playing && interaction.classList.contains('is-visible') && !awakened) {
    awakened = true
    message.classList.add('is-visible')
    window.clearTimeout(messageTimeout)
    messageTimeout = window.setTimeout(() => message.classList.remove('is-visible'), 4500)
  }
})
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()))
window.addEventListener('blur', () => keys.clear())

function resize() {
  const width = window.innerWidth
  const height = window.innerHeight
  camera.aspect = width / height
  camera.fov = width < 760 ? 54 : 45
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
}
window.addEventListener('resize', resize)

function animate(now: number) {
  requestAnimationFrame(animate)
  const delta = Math.min((now - lastTime) / 1000, 0.04)
  lastTime = now
  elapsed += delta

  if (playing) {
    const direction = new THREE.Vector2(
      Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft')),
      Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup')),
    )
    if (direction.lengthSq() > 0) direction.normalize()
    player.move(direction, delta, elapsed)
    player.update(elapsed)

    const followTarget = new THREE.Vector3(player.group.position.x * 0.42, 1.5, player.group.position.z * 0.35 + 3)
    const desiredCamera = new THREE.Vector3(player.group.position.x + 12, 13, player.group.position.z + 13)
    camera.position.lerp(desiredCamera, 1 - Math.exp(-2.4 * delta))
    camera.lookAt(followTarget)

    const nearAltar = player.group.position.distanceTo(new THREE.Vector3(altarPosition.x, 0, altarPosition.z)) < 3.25
    interaction.classList.toggle('is-visible', nearAltar && !awakened)
    interaction.setAttribute('aria-hidden', String(!nearAltar || awakened))
  }

  sanctuary.update(elapsed, awakened)
  renderer.render(sanctuary.scene, camera)
}
requestAnimationFrame(animate)
