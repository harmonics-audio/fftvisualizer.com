/**
 * SomaFM "Groove Salad Classic" radio source for the demo.
 *
 * Plays the live stream through an <audio> element and analyses the LEFT / RIGHT
 * channels with the same Rust/WASM FFT the component uses, feeding the visualizer
 * real, genuinely-stereo data. SomaFM sends `Access-Control-Allow-Origin: *`, so
 * the media element can be `crossOrigin="anonymous"` and the Web Audio graph is
 * not tainted (without CORS the analyser would only ever see silence).
 *
 * SomaFM is listener-supported — the UI shows attribution + a support link.
 * Autoplay policy: start() must be called from a user gesture (a click).
 */
import type { FftProcessor } from 'fft-visualizer-vue/wasm'

export const SOMA = {
  name: 'Groove Salad Classic',
  station: 'https://somafm.com/gsclassic/',
  support: 'https://somafm.com/support/',
  songs: 'https://somafm.com/songs/gsclassic.json'
}

// Same-origin proxy (server/api/radio.get.ts). SomaFM 403s the `Range: bytes=0-`
// header every browser sends on a media fetch, so we can't point <audio> straight
// at it — the proxy fetches the stream server-side without a Range header and
// pipes it back same-origin, which the browser plays cleanly.
const STREAM_URL = '/api/radio'

export interface RadioAudio {
  start: (onData: (mono: Uint8Array, left: Uint8Array, right: Uint8Array) => void) => Promise<void>
  stop: () => void
}

export function createRadioAudio(bins: number, fftSize = 2048): RadioAudio {
  let ctx: AudioContext | null = null
  let audioEl: HTMLAudioElement | null = null
  let analyserL: AnalyserNode | null = null
  let analyserR: AnalyserNode | null = null
  let procL: FftProcessor | null = null
  let procR: FftProcessor | null = null
  let bufL: Float32Array | null = null
  let bufR: Float32Array | null = null
  let rafId: number | null = null

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

    // Same-origin stream (via the proxy), so no crossOrigin needed and the
    // analyser is never tainted. Kick it off before the WASM import so it can
    // buffer while that loads.
    audioEl = new Audio()
    audioEl.preload = 'auto'
    audioEl.src = STREAM_URL

    const { FftProcessor } = await import('fft-visualizer-vue/wasm')

    ctx = new AudioContext()
    await ctx.resume()

    const srcNode = ctx.createMediaElementSource(audioEl)
    srcNode.connect(ctx.destination) // audible

    const splitter = ctx.createChannelSplitter(2)
    srcNode.connect(splitter)
    analyserL = ctx.createAnalyser(); analyserL.fftSize = fftSize
    analyserR = ctx.createAnalyser(); analyserR.fftSize = fftSize
    splitter.connect(analyserL, 0)
    splitter.connect(analyserR, 1)

    procL = new FftProcessor(fftSize, bins, 100, 18000, ctx.sampleRate)
    procR = new FftProcessor(fftSize, bins, 100, 18000, ctx.sampleRate)
    bufL = new Float32Array(fftSize)
    bufR = new Float32Array(fftSize)

    // Fire-and-forget: do NOT await or fail on the initial Range 403 — let the
    // browser settle the connection on its own. The bars stay flat until audio
    // actually starts flowing, then react.
    void audioEl.play().catch(() => {})
    analyse(onData)
  }

  function stop() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
    if (procL) { procL.free(); procL = null }
    if (procR) { procR.free(); procR = null }
    if (audioEl) {
      audioEl.pause()
      audioEl.removeAttribute('src')
      audioEl.load()
      audioEl = null
    }
    if (ctx) { ctx.close(); ctx = null }
    analyserL = null
    analyserR = null
    bufL = null
    bufR = null
  }

  return { start, stop }
}
