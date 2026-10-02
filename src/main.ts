import * as THREE from 'three'
import { createSanctuary } from './game/scene.ts'
import type { SceneSelection } from './game/scene.ts'
import { createPlayer } from './game/player.ts'
import { GrowthSystem } from './game/growth.ts'
import { createAudio } from './game/audio.ts'
import { PLANTS, BASE_SURFACES, START_POSITION, INTERACTION_RANGE, getSurfaces, inTransferRange, stageAt, surfaceHeight } from './game/level.ts'
import type { Position, StageId } from './game/level.ts'
import { canOccupy, supportAt } from './game/navigation.ts'
import './style.css'

const element = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const setText = (node: HTMLElement, text: string) => {
  if (node.textContent !== text) node.textContent = text
}

function boot() {
  const mount = element<HTMLDivElement>('#scene')
  const intro = element<HTMLElement>('#intro')
  const begin = element<HTMLButtonElement>('#begin-button')
  const chapter = element<HTMLElement>('#chapter')
  const objective = element<HTMLElement>('#objective')
  const objectiveSub = element<HTMLElement>('#objective-sub')
  const prompt = element<HTMLElement>('#prompt')
  const pair = element<HTMLElement>('#pair')
  const toast = element<HTMLElement>('#message')
  const toastTitle = element<HTMLElement>('#message-title')
  const toastCopy = element<HTMLElement>('#message-copy')
  const undoButton = element<HTMLButtonElement>('#undo-button')
  const resetButton = element<HTMLButtonElement>('#reset-button')
  const soundButton = element<HTMLButtonElement>('#sound-button')
  const labelLayer = element<HTMLElement>('#plant-labels')
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.4
  mount.appendChild(renderer.domElement)
  renderer.domElement.setAttribute('aria-label', 'Santuario tridimensional de Milagros prestados')
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 110)
  const sanctuary = createSanctuary()
  const player = createPlayer()
  sanctuary.scene.add(player.group)
  const growth = new GrowthSystem(PLANTS)
  const audio = createAudio()
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2(3, 3)
  const projected = new THREE.Vector3()
  const forward = new THREE.Vector3()
  const right = new THREE.Vector3()
  const direction = new THREE.Vector2()
  const up = new THREE.Vector3(0, 1, 0)
  const cameraOffset = new THREE.Vector3(10.5, 16.5, 13)
  const lookTarget = new THREE.Vector3()
  const cameraTarget = new THREE.Vector3()
  const selection: SceneSelection = { source: null, target: null, hover: null, inRange: false, transferring: false }
  const keys = new Set<string>()
  const visited = new Set<StageId>()
  const routes = new Set<string>()
  let playing = false
  let revealed = false
  let muted = false
  let safePosition: Position = { ...START_POSITION }
  let lastTime = 0
  let elapsed = 0
  let movedThisSession = 0
  let toastTimer = 0
  let lastPrompt = ''
  let lastPair = ''
  let currentStage: StageId = 'threshold'
  const labels = new Map<string, { button: HTMLButtonElement; petals: HTMLElement[] }>()

  for (const plant of PLANTS) {
    const button = document.createElement('button')
    button.className = 'plant-marker'
    button.type = 'button'
    button.dataset.plantId = plant.id
    button.setAttribute('aria-label', plant.name)
    button.innerHTML = `<span class="marker-ring"><span class="marker-symbol">${plant.kind === 'heart' ? '✳' : '✧'}</span></span><span class="plant-card"><span class="plant-name">${plant.name}</span><span class="growth-petals">${'<i></i>'.repeat(5)}</span></span>`
    button.addEventListener('click', () => selectPlant(plant.id))
    button.addEventListener('pointerenter', () => selection.hover = plant.id)
    button.addEventListener('pointerleave', () => selection.hover = null)
    labelLayer.appendChild(button)
    labels.set(plant.id, { button, petals: Array.from(button.querySelectorAll<HTMLElement>('i')) })
  }

  function notify(title: string, copy: string, duration = 5500) {
    toastTitle.textContent = title
    toastCopy.textContent = copy
    toast.hidden = false
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => toast.hidden = true, duration)
  }

  function finishTransfer() {
    if (!selection.transferring) return
    growth.endTransfer()
    selection.transferring = false
    audio.stopTransfer()
    if (movedThisSession > 0.05) audio.chime()
    movedThisSession = 0
  }

  function selectPlant(id: string) {
    if (!playing) return
    finishTransfer()
    keys.delete('e')
    if (!selection.source) selection.source = id
    else if (selection.source === id) {
      if (selection.target) [selection.source, selection.target] = [selection.target, selection.source]
      else selection.source = null
    } else selection.target = id
    updatePrompt()
  }

  function clearSelection() {
    finishTransfer()
    selection.source = null
    selection.target = null
    keys.delete('e')
    updatePrompt()
  }

  function nearestSafe(origin: Position): Position {
    const values = growth.values
    let result = { ...START_POSITION }
    let best = Infinity
    for (const surface of BASE_SURFACES) {
      for (let x = surface.xMin + 0.5; x < surface.xMax - 0.4; x += 0.5) {
        for (let z = surface.zMin + 0.5; z < surface.zMax - 0.4; z += 0.5) {
          const position = { x, y: surfaceHeight(surface, x, z), z }
          if (!canOccupy(position, values)) continue
          const distance = Math.hypot(x - origin.x, z - origin.z) + Math.abs(position.y - origin.y)
          if (distance < best) { result = position; best = distance }
        }
      }
    }
    return result
  }

  function placeAtSafe(position: Position) {
    const next = canOccupy(position, growth.values) ? position : nearestSafe(position)
    player.group.position.set(next.x, next.y, next.z)
    safePosition = { ...next }
  }

  function undo() {
    finishTransfer()
    keys.delete('e')
    const position = growth.undo()
    if (!position) return
    placeAtSafe(position)
    notify('El milagro vuelve sobre sus pasos', 'La vida y tu posición segura han sido restauradas.', 3500)
  }

  function reset() {
    finishTransfer()
    growth.reset()
    clearSelection()
    keys.clear()
    revealed = false
    visited.clear()
    routes.clear()
    placeAtSafe(START_POSITION)
    snapCamera()
    notify('Una nueva plegaria', 'Todo el crecimiento vuelve a su lugar. Nada se pierde.', 4000)
  }

  function updatePrompt() {
    const source = PLANTS.find((plant) => plant.id === selection.source)
    const target = PLANTS.find((plant) => plant.id === selection.target)
    selection.inRange = !!source && !!target && inTransferRange(source, target, player.group.position)
    let text = 'Elegí una planta con vida.'
    if (source && !target) text = 'Ahora elegí la planta que querés hacer crecer.'
    if (source && target) {
      if (Math.hypot(source.position.x - target.position.x, source.position.z - target.position.z) > INTERACTION_RANGE) text = 'Estas raíces están demasiado separadas. Elegí otra pareja.'
      else if (!selection.inRange) text = 'El hilo no alcanza. Acercate a ambas plantas.'
      else if (growth.get(source.id) < 0.001) text = 'La donante está en reposo. X invierte el hilo.'
      else if (growth.ratio(target.id) > 0.9999) text = 'La receptora está llena. X invierte el hilo.'
      else text = selection.transferring ? 'La vida está cambiando de manos…' : 'Mantené E para prestar crecimiento · X para devolverlo'
    }
    const pairText = source ? `${source.name}${target ? `  →  ${target.name}` : ''}` : 'UN SOLO DON. MUCHAS POSIBILIDADES.'
    if (text !== lastPrompt) { prompt.textContent = text; lastPrompt = text }
    if (pairText !== lastPair) { pair.textContent = pairText; lastPair = pairText }
    element<HTMLElement>('#interaction').classList.toggle('is-linked', !!source && !!target)
    element<HTMLElement>('#interaction').classList.toggle('is-unreachable', !!source && !!target && !selection.inRange)
    undoButton.disabled = !growth.canUndo
  }

  function updateStory() {
    currentStage = stageAt(player.group.position)
    const stageNames: Record<StageId, string> = { threshold: 'I / EL UMBRAL', courtyard: 'II / LOS DOS CAMINOS', heart: 'III / EL CORAZÓN' }
    setText(chapter, stageNames[currentStage])
    if (!visited.has(currentStage)) {
      visited.add(currentStage)
      if (currentStage === 'courtyard') { notify('Los dos caminos', 'El puente y la terraza se alimentan de una misma vida.'); audio.chime() }
      if (currentStage === 'heart') { notify('Algo sigue latiendo', 'Las raíces se reúnen debajo de la piedra.'); audio.chime() }
    }
    if (player.group.position.z < -2.7 && Math.abs(player.group.position.x) < 1.1 && player.group.position.y < 0.3 && growth.get('courtyard-bridge') > 2.6) routes.add('bridge')
    if (player.group.position.z < -3.1 && player.group.position.x > 4.7 && player.group.position.y > 1.3) {
      if (!routes.has('terrace')) notify('La memoria de la terraza', 'Desde arriba, todas las raíces dibujan un mismo árbol.')
      routes.add('terrace')
    }
    if (!revealed && growth.get('heart-seed') >= 3.6 && currentStage === 'heart') {
      revealed = true
      notify('Nunca fueron plantas separadas', 'El santuario es la memoria de un único árbol enterrado. Su corazón todavía vive.', 9000)
      audio.reveal()
    }
    const titles: Record<StageId, string> = { threshold: 'Prestá vida a la raíz', courtyard: 'Elegí un camino', heart: 'Escuchá el corazón' }
    const subtitles: Record<StageId, string> = {
      threshold: 'El arbusto guarda lo que la raíz necesita.',
      courtyard: routes.size === 2 ? 'Dos caminos. Una misma raíz.' : routes.size === 1 ? 'La otra ruta guarda otra perspectiva.' : 'Hay vida para un camino. Probá qué cambia.',
      heart: 'Apartá el velo y reuní vida en el brote central.',
    }
    setText(objective, revealed ? 'El jardín despertó' : titles[currentStage])
    setText(objectiveSub, revealed ? 'Podés seguir explorando y devolver cada milagro.' : subtitles[currentStage])
    setText(element<HTMLElement>('#route-status'), routes.size ? `${routes.has('bridge') ? '✧ PUENTE' : '◇ PUENTE'}  ·  ${routes.has('terrace') ? '✧ TERRAZA' : '◇ TERRAZA'}` : 'LA VIDA NO SE CREA. SE PRESTA.')
  }

  function snapCamera() {
    lookTarget.copy(player.group.position).add(new THREE.Vector3(0, 0.4, -2.5))
    camera.position.copy(lookTarget).add(cameraOffset)
    camera.lookAt(lookTarget)
  }

  begin.addEventListener('click', () => {
    playing = true
    document.body.classList.add('is-playing')
    intro.hidden = true
    element<HTMLElement>('#game-ui').hidden = false
    void audio.unlock()
    updateStory()
    updatePrompt()
  })
  undoButton.addEventListener('click', undo)
  resetButton.addEventListener('click', reset)
  soundButton.addEventListener('click', () => {
    muted = !muted
    audio.setMuted(muted)
    if (playing) void audio.unlock()
    soundButton.setAttribute('aria-pressed', String(muted))
    soundButton.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar sonido')
    soundButton.textContent = muted ? '◌ SONIDO OFF' : '◉ SONIDO ON'
  })

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase()
    if (!playing) return
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault()
    keys.add(key)
    if (event.repeat) return
    if (key === 'z') undo()
    if (key === 'r') reset()
    if (key === 'escape') clearSelection()
    if (key === 'x' && selection.source && selection.target) {
      finishTransfer()
      keys.delete('e')
      ;[selection.source, selection.target] = [selection.target, selection.source]
      updatePrompt()
    }
  })
  window.addEventListener('keyup', (event) => {
    keys.delete(event.key.toLowerCase())
    if (event.key.toLowerCase() === 'e') finishTransfer()
  })
  window.addEventListener('blur', () => { keys.clear(); finishTransfer() })
  document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); finishTransfer() } })
  renderer.domElement.addEventListener('pointermove', (event) => {
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1)
  })
  renderer.domElement.addEventListener('pointerleave', () => { pointer.set(3, 3); selection.hover = null })
  renderer.domElement.addEventListener('click', () => {
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(sanctuary.pickables, false)[0]
    if (hit) selectPlant(hit.object.userData.plantId as string)
  })
  window.addEventListener('pagehide', () => audio.dispose(), { once: true })

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.fov = window.innerWidth < 800 ? 54 : 43
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', resize)
  resize()
  snapCamera()
  updatePrompt()

  function animate(now: number) {
    requestAnimationFrame(animate)
    const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.04) : 0
    lastTime = now
    elapsed += delta
    let values = growth.values
    if (playing) {
      camera.getWorldDirection(forward)
      forward.y = 0; forward.normalize()
      right.crossVectors(forward, up).normalize()
      const vertical = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'))
      const horizontal = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'))
      direction.set(forward.x * vertical + right.x * horizontal, forward.z * vertical + right.z * horizontal)
      if (direction.lengthSq() > 0) direction.normalize()
      player.move(direction, delta, elapsed, values)
      player.update(elapsed)
      const support = supportAt(player.group.position, getSurfaces(values))
      if (support?.safe && canOccupy(player.group.position, values)) safePosition = { x: player.group.position.x, y: player.group.position.y, z: player.group.position.z }
      updatePrompt()
      const source = selection.source
      const target = selection.target
      const canTransfer = keys.has('e') && source && target && selection.inRange && growth.get(source) > 0.00001 && growth.ratio(target) < 0.99999
      if (canTransfer) {
        if (!selection.transferring) {
          growth.beginTransfer(source, target, safePosition)
          selection.transferring = true
          audio.startTransfer()
        }
        movedThisSession += growth.transfer(source, target, delta * 0.85)
        values = growth.values
      } else finishTransfer()
      if (!canOccupy(player.group.position, values)) {
        placeAtSafe(safePosition)
        notify('La raíz se repliega', 'Volvés a suelo firme. El crecimiento sigue donde lo dejaste.', 4000)
      }
      lookTarget.copy(player.group.position); lookTarget.y += 0.4; lookTarget.z -= 2.5
      cameraTarget.copy(lookTarget).add(cameraOffset)
      camera.position.lerp(cameraTarget, 1 - Math.exp(-4 * delta))
      camera.lookAt(lookTarget)
      updateStory()
      updatePrompt()
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(sanctuary.pickables, false)[0]
      if (pointer.x < 2) selection.hover = hit ? hit.object.userData.plantId as string : null
    }
    sanctuary.update(elapsed, delta, values, selection, revealed)
    camera.updateMatrixWorld()
    for (const definition of PLANTS) {
      const view = sanctuary.plants.get(definition.id)!
      const { button, petals } = labels.get(definition.id)!
      projected.copy(view.anchor).project(camera)
      const distance = Math.hypot(definition.position.x - player.group.position.x, definition.position.z - player.group.position.z)
      const visible = playing && projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 0.92 && Math.abs(projected.y) < 0.84 && distance < 11
      button.hidden = !visible
      if (!visible) continue
      button.style.transform = `translate(${(projected.x * 0.5 + 0.5) * window.innerWidth}px, ${(-projected.y * 0.5 + 0.5) * window.innerHeight}px) translate(-50%, -50%)`
      button.dataset.selected = selection.source === definition.id ? 'source' : selection.target === definition.id ? 'target' : ''
      button.dataset.reachable = String(distance <= INTERACTION_RANGE)
      button.dataset.dormant = String(growth.get(definition.id) < 0.01)
      button.setAttribute('aria-pressed', String(selection.source === definition.id || selection.target === definition.id))
      const ratio = growth.ratio(definition.id)
      button.setAttribute('aria-description', ratio < 0.01 ? 'En reposo' : ratio > 0.999 ? 'Crecimiento completo' : 'Crecimiento disponible')
      for (let i = 0; i < petals.length; i++) petals[i].style.opacity = String(0.12 + Math.max(0, Math.min(1, ratio * petals.length - i)) * 0.88)
    }
    renderer.render(sanctuary.scene, camera)
  }
  requestAnimationFrame(animate)
}

try { boot() } catch (error) {
  element<HTMLButtonElement>('#begin-button').disabled = true
  element<HTMLElement>('#intro-copy').textContent = 'Este santuario necesita un navegador con WebGL 2. Activá la aceleración gráfica y volvé a entrar.'
  console.error('No se pudo iniciar el santuario:', error)
}
