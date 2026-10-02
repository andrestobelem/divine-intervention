export interface GameAudio {
  unlock(): Promise<void>
  setMuted(muted: boolean): void
  startTransfer(): void
  stopTransfer(): void
  chime(): void
  reveal(): void
  dispose(): void
}

type AudioContextConstructor = new () => AudioContext

/** Sonido ambiental y musical sintetizado, sin cargar recursos externos. */
export function createAudio(): GameAudio {
  let context: AudioContext | null = null
  let master: GainNode | null = null
  let muted = false
  let disposed = false
  let transferNodes: OscillatorNode[] = []
  let transferGain: GainNode | null = null
  const ambientNodes: OscillatorNode[] = []
  const transientNodes = new Set<OscillatorNode>()

  function getConstructor(): AudioContextConstructor | undefined {
    if (typeof window === 'undefined') return undefined
    const host = window as Window & { webkitAudioContext?: AudioContextConstructor }
    return window.AudioContext ?? host.webkitAudioContext
  }

  function tone(frequency: number, duration: number, gainAmount: number, type: OscillatorType, delay = 0) {
    if (!context || !master || disposed) return
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const start = context.currentTime + delay
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(Math.max(gainAmount, 0.0002), start + 0.035)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(gain)
    gain.connect(master)
    oscillator.onended = () => {
      oscillator.disconnect()
      gain.disconnect()
      transientNodes.delete(oscillator)
    }
    transientNodes.add(oscillator)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.04)
  }

  function unlock(): Promise<void> {
    if (disposed) return Promise.resolve()
    if (!context) {
      const AudioContext = getConstructor()
      if (!AudioContext) return Promise.resolve()
      try {
        context = new AudioContext()
        master = context.createGain()
        master.gain.value = muted ? 0 : 0.18
        master.connect(context.destination)
        const pad = context.createGain()
        pad.gain.value = 0.13
        pad.connect(master)
        for (const [frequency, level] of [[110, 0.48], [164.81, 0.23], [220, 0.12]] as const) {
          const oscillator = context.createOscillator()
          const voiceGain = context.createGain()
          oscillator.type = 'sine'
          oscillator.frequency.value = frequency
          voiceGain.gain.value = level
          oscillator.connect(voiceGain)
          voiceGain.connect(pad)
          oscillator.start()
          ambientNodes.push(oscillator)
        }
      } catch {
        context = null
        master = null
        return Promise.resolve()
      }
    }
    if (context.state === 'suspended') return context.resume().catch(() => undefined)
    return Promise.resolve()
  }

  function stopTransfer() {
    const releasingGain = transferGain
    if (context && releasingGain) {
      const now = context.currentTime
      releasingGain.gain.cancelScheduledValues(now)
      releasingGain.gain.setTargetAtTime(0.0001, now, 0.055)
      const releasing = [...transferNodes]
      let remaining = releasing.length
      for (const oscillator of releasing) {
        oscillator.onended = () => {
          oscillator.disconnect()
          remaining -= 1
          if (remaining === 0) releasingGain.disconnect()
        }
        try { oscillator.stop(now + 0.24) } catch { oscillator.disconnect(); remaining -= 1 }
      }
      if (remaining === 0) releasingGain.disconnect()
    }
    transferNodes = []
    transferGain = null
  }

  return {
    unlock,
    setMuted(value) {
      muted = value
      if (context && master) {
        master.gain.setTargetAtTime(muted ? 0 : 0.18, context.currentTime, 0.025)
      }
    },
    startTransfer() {
      if (!context || !master || disposed || transferNodes.length > 0) return
      transferGain = context.createGain()
      transferGain.gain.value = 0.0001
      transferGain.connect(master)
      transferGain.gain.setTargetAtTime(0.11, context.currentTime, 0.12)
      for (const [frequency, detune] of [[330, -5], [440, 4]] as const) {
        const oscillator = context.createOscillator()
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(frequency, context.currentTime)
        oscillator.frequency.linearRampToValueAtTime(frequency * 1.32, context.currentTime + 3.6)
        oscillator.detune.value = detune
        oscillator.connect(transferGain)
        oscillator.start()
        transferNodes.push(oscillator)
      }
    },
    stopTransfer,
    chime() {
      tone(523.25, 0.85, 0.09, 'sine')
      tone(659.25, 1.05, 0.065, 'sine', 0.035)
      tone(783.99, 1.25, 0.045, 'sine', 0.08)
    },
    reveal() {
      tone(261.63, 2.1, 0.085, 'sine')
      tone(392, 2.35, 0.075, 'sine', 0.05)
      tone(523.25, 2.7, 0.065, 'sine', 0.1)
      tone(659.25, 3.2, 0.045, 'sine', 0.18)
      tone(1046.5, 2.3, 0.025, 'triangle', 0.24)
    },
    dispose() {
      if (disposed) return
      disposed = true
      stopTransfer()
      for (const oscillator of ambientNodes) {
        try { oscillator.stop() } catch { /* ya se detuvo */ }
        oscillator.disconnect()
      }
      ambientNodes.length = 0
      for (const oscillator of transientNodes) {
        try { oscillator.stop() } catch { /* ya se detuvo */ }
      }
      transientNodes.clear()
      master?.disconnect()
      master = null
      if (context) void context.close().catch(() => undefined)
      context = null
    },
  }
}
