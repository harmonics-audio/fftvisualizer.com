/**
 * Self-contained generative music demo.
 *
 * Synthesizes a short, looping, genuinely-stereo track with the Web Audio API
 * (no audio file, no licensing) — four-on-the-floor drums, a bassline, sustained
 * chords (Am–F–C–G) and a ping-pong arpeggio lead, with instruments panned across
 * the stereo field — then analyses the LEFT and RIGHT channels separately through
 * the same Rust/WASM FFT the component uses. That makes stereo mode show a real
 * left/right difference, not a mirror.
 *
 * Autoplay policy: start() must be called from a user gesture (a click).
 */
import type { FftProcessor } from '@fft-visualizer/vue/wasm'

export interface DemoAudio {
  start: (onData: (mono: Uint8Array, left: Uint8Array, right: Uint8Array) => void) => Promise<void>
  stop: () => void
}

export interface DemoAudioOptions {
  /** FFT window size (default 2048). */
  fftSize?: number
  /** 'music' = the rhythmic loop; 'ambient' = the warm, tempo-less fireplace bed. Default 'music'. */
  mood?: 'music' | 'ambient'
}

const TEMPO = 115
const STEP = 60 / TEMPO / 4 // sixteenth-note seconds
const LOOP_STEPS = 64 // 4 bars × 16 sixteenths

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12)

// Progression: MIDI root + chord third, one bar each. Am – F – C – G.
const BARS = [
  { root: 57, third: 3 }, // Am
  { root: 53, third: 4 }, // F
  { root: 60, third: 4 }, // C
  { root: 55, third: 4 }  // G
]

export function createDemoAudio(bins: number, opts: DemoAudioOptions = {}): DemoAudio {
  const fftSize = opts.fftSize ?? 2048
  const mood = opts.mood ?? 'music'
  let ctx: AudioContext | null = null
  let analyserL: AnalyserNode | null = null
  let analyserR: AnalyserNode | null = null
  let procL: FftProcessor | null = null
  let procR: FftProcessor | null = null
  let bufL: Float32Array | null = null
  let bufR: Float32Array | null = null
  let bus: GainNode | null = null // pre-compressor stereo mix bus
  let leadIn: GainNode | null = null // dry + ping-pong send for the lead
  let noiseBuffer: AudioBuffer | null = null
  let rafId: number | null = null
  let schedTimer: ReturnType<typeof setTimeout> | null = null
  let nextTime = 0
  let step = 0

  function panner(pan: number): StereoPannerNode {
    const p = ctx!.createStereoPanner()
    p.pan.value = pan
    return p
  }

  function env(node: AudioParam, time: number, peak: number, attack: number, dur: number) {
    node.setValueAtTime(0.0001, time)
    node.exponentialRampToValueAtTime(peak, time + attack)
    node.exponentialRampToValueAtTime(0.0001, time + dur)
  }

  function tone(freq: number, time: number, dur: number, type: OscillatorType, gain: number, dest: AudioNode, detune = 0, pan = 0) {
    if (!ctx) return
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    osc.detune.value = detune
    env(g.gain, time, gain, 0.01, dur)
    osc.connect(g).connect(panner(pan)).connect(dest)
    osc.start(time)
    osc.stop(time + dur + 0.05)
  }

  function kick(time: number) {
    if (!ctx || !bus) return
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.frequency.setValueAtTime(150, time)
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12)
    env(g.gain, time, 1.0, 0.005, 0.22)
    osc.connect(g).connect(bus) // center
    osc.start(time)
    osc.stop(time + 0.28)
  }

  function noiseHit(time: number, dur: number, gain: number, hp: number, bp = 0, pan = 0) {
    if (!ctx || !bus || !noiseBuffer) return
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer
    const filter = ctx.createBiquadFilter()
    if (bp) { filter.type = 'bandpass'; filter.frequency.value = bp; filter.Q.value = 1 }
    else { filter.type = 'highpass'; filter.frequency.value = hp }
    const g = ctx.createGain()
    env(g.gain, time, gain, 0.002, dur)
    src.connect(filter).connect(g).connect(panner(pan)).connect(bus)
    src.start(time)
    src.stop(time + dur + 0.05)
  }

  function bass(freq: number, time: number, dur: number) {
    if (!ctx || !bus) return
    const osc = ctx.createOscillator()
    const lp = ctx.createBiquadFilter()
    const g = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.value = freq
    lp.type = 'lowpass'
    lp.frequency.value = 500
    env(g.gain, time, 0.5, 0.01, dur)
    osc.connect(lp).connect(g).connect(bus) // center
    osc.start(time)
    osc.stop(time + dur + 0.05)
  }

  function chord(rootMidi: number, third: number, time: number, dur: number) {
    if (!ctx || !bus) return
    const lp = ctx.createBiquadFilter()
    const g = ctx.createGain()
    lp.type = 'lowpass'
    lp.frequency.value = 1600
    g.gain.setValueAtTime(0.0001, time)
    g.gain.exponentialRampToValueAtTime(0.12, time + 0.25)
    g.gain.setValueAtTime(0.12, time + dur * 0.6)
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur)
    lp.connect(g).connect(bus)
    // Spread the three chord tones across the stereo field for width
    const pans = [-0.7, 0, 0.7]
    ;[0, third, 7].forEach((semi, i) => {
      const f = midi(rootMidi + 12 + semi)
      tone(f, time, dur, 'sawtooth', 0.5, lp, -6, pans[i]!)
      tone(f, time, dur, 'sawtooth', 0.5, lp, +6, pans[i]!)
    })
  }

  // Rich broadband hit on one side — used for the intro count-in so a single
  // channel clearly lights up on its own.
  function countIn(time: number, pan: number) {
    if (!bus) return
    noiseHit(time, 0.18, 0.55, 0, 2200, pan)   // snare-ish body (mids)
    noiseHit(time, 0.05, 0.3, 12000, 0, pan)    // high tick
    tone(196, time, 0.22, 'triangle', 0.45, bus, 0, pan) // low-mid body
  }

  function scheduleStep(s: number, time: number) {
    const loop = s % LOOP_STEPS
    const bar = Math.floor(loop / 16)
    const b = loop % 16
    const { root, third } = BARS[bar]!

    if (b === 0) chord(root, third, time, STEP * 16)
    if (b % 4 === 0) kick(time)
    if (b === 4 || b === 12) noiseHit(time, 0.14, 0.5, 0, 1800) // snare, center
    // Hi-hats bounce left/right across the bar
    if (b % 2 === 0) noiseHit(time, 0.03, 0.14, 9000, 0, (b / 2) % 2 ? 0.85 : -0.85)
    if (b === 0 || b === 6 || b === 8 || b === 14) bass(midi(root - 12), time, 0.2)

    // Arp lead → leadIn (dry center + ping-pong send that pans L↔R)
    if ([0, 3, 6, 8, 11, 14].includes(b) && leadIn) {
      const pool = [0, third, 7, 12]
      const idx = Math.floor(loop / 2) % pool.length
      tone(midi(root + 24 + pool[idx]!), time, 0.22, 'triangle', 0.16, leadIn)
    }
  }

  function scheduler() {
    if (!ctx) return
    while (nextTime < ctx.currentTime + 0.12) {
      scheduleStep(step, nextTime)
      nextTime += STEP
      step++
    }
    schedTimer = setTimeout(scheduler, 25)
  }

  // Ambient "fireplace" mood — a slow, musical piece rather than a drone: warm
  // pads on the Am–F–C–G progression, a low bass drone, a sparse echoed melody,
  // and soft ember crackle for the fire texture. Calm and pitched (no drums, no
  // tempo grid), so it reads as gentle flame flicker under the preset's heavy
  // smoothing. Everything hangs off the shared `bus`; ctx.close() tears it down.
  function startAmbient() {
    if (!ctx || !bus || !noiseBuffer) return
    const c = ctx
    const busNode = bus
    const now = c.currentTime
    const CHORD_SEC = 4.5 // seconds per chord — deliberately slow

    // Dreamy feedback echo for the melody line.
    const echo = c.createDelay()
    echo.delayTime.value = 0.38
    const fb = c.createGain(); fb.gain.value = 0.34
    echo.connect(fb).connect(echo)
    const echoWet = c.createGain(); echoWet.gain.value = 0.45
    echo.connect(echoWet).connect(busNode)
    const leadDest = c.createGain()
    leadDest.connect(busNode) // dry
    leadDest.connect(echo)    // send

    // Warm pad: root + third + fifth (octave up), detuned saws through a low-pass,
    // with a slow swell in and out.
    const pad = (rootMidi: number, third: number, time: number, dur: number) => {
      const lp = c.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 1100
      const g = c.createGain()
      const peak = 0.05
      g.gain.setValueAtTime(0.0001, time)
      g.gain.exponentialRampToValueAtTime(peak, time + 1.0)
      g.gain.setValueAtTime(peak, time + dur - 1.4)
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur)
      lp.connect(g).connect(busNode)
      const pans = [-0.5, 0, 0.5]
      ;[0, third, 7].forEach((semi, i) => {
        const f = midi(rootMidi + 12 + semi)
        for (const det of [-7, 7]) {
          const osc = c.createOscillator()
          osc.type = 'sawtooth'
          osc.frequency.value = f
          osc.detune.value = det
          osc.connect(panner(pans[i]!)).connect(lp)
          osc.start(time)
          osc.stop(time + dur + 0.1)
        }
      })
    }

    // Low bass drone under the chord root.
    const droneNote = (freq: number, time: number, dur: number) => {
      const osc = c.createOscillator()
      const lp = c.createBiquadFilter()
      const g = c.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      lp.type = 'lowpass'
      lp.frequency.value = 320
      g.gain.setValueAtTime(0.0001, time)
      g.gain.exponentialRampToValueAtTime(0.16, time + 0.8)
      g.gain.setValueAtTime(0.16, time + dur - 1.0)
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur)
      osc.connect(lp).connect(g).connect(busNode)
      osc.start(time)
      osc.stop(time + dur + 0.1)
    }

    // Soft bell-ish melody note (long decay), routed through the echo.
    const softLead = (freq: number, time: number) => {
      tone(freq, time, 1.6, 'triangle', 0.12, leadDest, 0, Math.random() * 1.2 - 0.6)
    }

    const scheduleChord = (barIndex: number, time: number) => {
      const { root, third } = BARS[barIndex % BARS.length]!
      pad(root, third, time, CHORD_SEC + 1.1) // overlap the next chord for smoothness
      droneNote(midi(root - 12), time, CHORD_SEC + 0.6)
      const pool = [0, third, 7, 12, 14]
      for (let k = 0; k < 3; k++) {
        if (Math.random() < 0.7) {
          const t = time + (0.4 + k) * (CHORD_SEC / 3.6)
          const semi = pool[Math.floor(Math.random() * pool.length)]!
          softLead(midi(root + 24 + semi), t)
        }
      }
    }

    let bar = 0
    let next = now + 0.2

    // One ticking scheduler drives both the chords (by time) and the ember crackle
    // (probabilistic), so a single `schedTimer` covers everything for stop().
    const tick = () => {
      if (!ctx) return
      while (next < c.currentTime + 0.6) {
        scheduleChord(bar, next)
        bar++
        next += CHORD_SEC
      }
      if (Math.random() < 0.5) {
        const center = 800 + Math.random() * 5200
        noiseHit(c.currentTime + 0.02, 0.02 + Math.random() * 0.04, 0.04 + Math.random() * 0.09, 0, center, Math.random() * 1.6 - 0.8)
      }
      if (Math.random() < 0.08) {
        tone(80 + Math.random() * 40, c.currentTime + 0.02, 0.09, 'triangle', 0.1, busNode, 0, Math.random() - 0.5)
      }
      schedTimer = setTimeout(tick, 170)
    }
    tick()
  }

  function analyse(onData: (mono: Uint8Array, left: Uint8Array, right: Uint8Array) => void) {
    if (!analyserL || !analyserR || !procL || !procR || !bufL || !bufR) return
    analyserL.getFloatTimeDomainData(bufL)
    analyserR.getFloatTimeDomainData(bufR)
    const left = new Uint8Array(procL.process(bufL))
    const right = new Uint8Array(procR.process(bufR))
    const mono = new Uint8Array(bins)
    for (let i = 0; i < bins; i++) mono[i] = (left[i]! + right[i]!) >> 1
    onData(mono, left, right)
    rafId = requestAnimationFrame(() => analyse(onData))
  }

  async function start(onData: (mono: Uint8Array, left: Uint8Array, right: Uint8Array) => void) {
    stop()
    const { FftProcessor } = await import('@fft-visualizer/vue/wasm')
    ctx = new AudioContext()
    await ctx.resume()

    bus = ctx.createGain()
    bus.gain.value = 0.9

    // Ping-pong delay for the lead: echoes alternate hard-left / hard-right
    const t = STEP * 3
    const dl = ctx.createDelay()
    const dr = ctx.createDelay()
    dl.delayTime.value = t
    dr.delayTime.value = t
    const fbL = ctx.createGain(); fbL.gain.value = 0.34
    const fbR = ctx.createGain(); fbR.gain.value = 0.34
    dl.connect(fbL).connect(dr)
    dr.connect(fbR).connect(dl)
    dl.connect(panner(-0.9)).connect(bus)
    dr.connect(panner(0.9)).connect(bus)

    leadIn = ctx.createGain()
    leadIn.connect(bus) // dry, center
    const send = ctx.createGain(); send.gain.value = 0.5
    leadIn.connect(send).connect(dl) // into ping-pong (starts left)

    // Master: bus → compressor → masterGain → (speakers + per-channel analysers)
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 3
    const masterGain = ctx.createGain()
    masterGain.gain.value = 0.85
    bus.connect(comp).connect(masterGain)
    masterGain.connect(ctx.destination)

    const splitter = ctx.createChannelSplitter(2)
    masterGain.connect(splitter)
    analyserL = ctx.createAnalyser(); analyserL.fftSize = fftSize
    analyserR = ctx.createAnalyser(); analyserR.fftSize = fftSize
    splitter.connect(analyserL, 0)
    splitter.connect(analyserR, 1)

    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const nd = noiseBuffer.getChannelData(0)
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1

    procL = new FftProcessor(fftSize, bins, 100, 18000, ctx.sampleRate)
    procR = new FftProcessor(fftSize, bins, 100, 18000, ctx.sampleRate)
    bufL = new Float32Array(fftSize)
    bufR = new Float32Array(fftSize)

    if (mood === 'ambient') {
      startAmbient()
    } else {
      // Count-in that bounces left / right / left, so the stereo split is
      // unmistakable before the full mix drops in.
      const beat = STEP * 4
      const t0 = ctx.currentTime + 0.15
      ;[-1, 1, -1].forEach((pan, i) => countIn(t0 + i * beat, pan))

      nextTime = t0 + 3 * beat // main loop starts right after the count-in
      step = 0
      scheduler()
    }
    analyse(onData)
  }

  function stop() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
    if (schedTimer !== null) { clearTimeout(schedTimer); schedTimer = null }
    if (procL) { procL.free(); procL = null }
    if (procR) { procR.free(); procR = null }
    if (ctx) { ctx.close(); ctx = null }
    analyserL = null
    analyserR = null
    bus = null
    leadIn = null
    noiseBuffer = null
    bufL = null
    bufR = null
  }

  return { start, stop }
}
