<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { FFTVisualizer } from '@fft-visualizer/vue'
import '@fft-visualizer/vue/style.css'
import { createDemoAudio, type DemoAudio } from './demoAudio'
import { createRadioAudio, type RadioAudio, SOMA } from './radioAudio'

const data = ref(new Uint8Array(80))
const dataLeft = ref(new Uint8Array(80))
const dataRight = ref(new Uint8Array(80))
// Audio source: 'synth' feeds the generative track, 'radio' the SomaFM stream
// (both external mode), 'mic' hands off to the component's built-in local capture.
// Nothing starts automatically.
const source = ref<'none' | 'synth' | 'mic' | 'radio'>('none')
const loading = ref(false)
let demo: DemoAudio | null = null
let radio: RadioAudio | null = null
const nowPlaying = ref('')
let npTimer: ReturnType<typeof setInterval> | null = null

const mode = computed(() => (source.value === 'mic' ? 'local' : 'external'))

// Curated looks — each is guaranteed to look good, and together they show the range.
const presets = [
  {
    // playground "stereo glow" preset
    name: 'Stereo',
    props: {
      stereo: true, barSpace: 0.4, reflexRatio: 0.35, reflexAlpha: 0.5, glow: 1,
      gradient: 'rainbow', gradientDirection: 'horizontal',
      showPeaks: false, smoothing: 0.65
    }
  },
  {
    name: 'Reflected',
    props: { 
      gradient: 'aurora', 
      glow: 0.5, 
      barSpace: 0.3, 
      reflexRatio: 0.3, 
      reflexAlpha: 0.3, 
      showPeaks: false, 
      smoothing: 0.65
    }
  },
  {
    name: 'LED meter',
    props: {
      ledBars: true, ledShape: 'meter', barSpace: 0.35,
      gradient: [
        { stop: 0, color: '#22dd66' },
        { stop: 0.6, color: '#ffd000' },
        { stop: 1, color: '#ff3344' }
      ]
    }
  },
  {
    // playground "disco" preset
    name: 'Radial',
    props: {
      radial: true, radialInnerRadius: 0.35, barSpace: 0.2,
      reflexRatio: 0.65, reflexAlpha: 0.5, glow: 0.9,
      gradient: 'rainbow', gradientDirection: 'horizontal',
      showPeaks: false, smoothing: 0.65
    }
  },
  {
    // playground "horizontal lumi bars" preset (noiseFloor dropped for the clean synth)
    name: 'Lumi bars',
    props: {
      lumiBars: true, bands: 40, barSpace: 0.05,
      reflexRatio: 0.35, reflexAlpha: 0.25, glow: 1,
      gradient: 'rainbow', gradientDirection: 'horizontal',
      colorMode: 'bar-level', stereo: true,
      showPeaks: true, peakDecay: 0.99, smoothing: 0.65
    }
  },
  {
    // playground "lazers" preset (noiseFloor dropped for the clean synth)
    name: 'Lazers',
    props: {
      radial: true, radialInnerRadius: 0, barSpace: 0.35, glow: 1,
      gradient: 'rainbow', gradientDirection: 'horizontal',
      stereo: true, showPeaks: false, smoothing: 0.5, bands: 40
    }
  },
  {
    // playground "fireplace" preset (noiseFloor dropped for the clean synth;
    // the high smoothing is what gives the slow, flickering flame-like motion)
    name: 'Fireplace',
    props: {
      barSpace: 0.35, glow: 1,
      gradient: 'rainbow', gradientDirection: 'horizontal',
      showPeaks: false, smoothing: 0.9
    }
  }
] as const

const active = ref(0)
const activeProps = computed(() => presets[active.value]!.props)

// Which generative track each look sounds best with: Fireplace wants the calm
// ambient bed, everything else the rhythmic music loop.
type Track = 'music' | 'ambient'
const ambientPresets = new Set<string>(['Fireplace'])
const trackFor = (i: number): Track => (ambientPresets.has(presets[i]!.name) ? 'ambient' : 'music')

// The track currently sounding (null when the synth is stopped) — lets us tell
// whether switching preset needs to swap the audio.
const playingTrack = ref<Track | null>(null)

function feed(mono: Uint8Array, left: Uint8Array, right: Uint8Array) {
  data.value = mono
  dataLeft.value = left
  dataRight.value = right
}

function stopSynth() {
  demo?.stop()
  demo = null
  playingTrack.value = null
}

function stopRadio() {
  radio?.stop()
  radio = null
  stopNowPlaying()
}

async function startSynth(track: Track) {
  stopRadio()
  loading.value = true
  source.value = 'synth' // mode → external (also releases the mic if it was running)
  demo = createDemoAudio(80, { mood: track })
  playingTrack.value = track
  await demo.start(feed)
  loading.value = false
}

async function toggleSynth() {
  if (source.value === 'synth') {
    stopSynth()
    source.value = 'none'
    return
  }
  await startSynth(trackFor(active.value))
}

// Opt-in SomaFM stream — real, licensed music straight from the source, kept
// separate from the always-available generative synth so the demo still works
// if the stream is unreachable.
async function toggleRadio() {
  if (source.value === 'radio') {
    stopRadio()
    source.value = 'none'
    return
  }
  stopSynth()
  loading.value = true
  source.value = 'radio' // mode → external (releases the mic if it was running)
  radio = createRadioAudio(80)
  try {
    await radio.start(feed)
  } catch {
    stopRadio()
    source.value = 'none'
    loading.value = false
    return
  }
  loading.value = false
  startNowPlaying()
}

// Selecting a look also drives the audio: start the synth if nothing is playing,
// or swap its track when the new look wants a different one. The click is a user
// gesture, so starting audio here satisfies the autoplay policy. A running mic or
// radio is never interrupted — only the look changes.
async function selectPreset(i: number) {
  active.value = i
  const track = trackFor(i)
  if (source.value === 'none') {
    await startSynth(track)
  } else if (source.value === 'synth' && track !== playingTrack.value) {
    stopSynth()
    await startSynth(track)
  }
}

function toggleMic() {
  if (source.value === 'mic') {
    source.value = 'none' // mode → external → the component releases the mic
    return
  }
  stopSynth()
  stopRadio()
  source.value = 'mic' // mode → local → the component requests mic permission
}

// e.g. mic permission denied / WebGL failure — revert to no source
function onError() {
  if (source.value === 'mic') source.value = 'none'
  loading.value = false
}

// SomaFM now-playing (CORS-enabled JSON); the newest song is first.
async function refreshNowPlaying() {
  try {
    const res = await fetch(SOMA.songs, { cache: 'no-store' })
    const json = await res.json()
    const s = json?.songs?.[0]
    nowPlaying.value = s ? `${s.artist} — ${s.title}` : ''
  } catch {
    // leave the previous value; attribution still shows the station name
  }
}
function startNowPlaying() {
  refreshNowPlaying()
  npTimer = setInterval(refreshNowPlaying, 20000)
}
function stopNowPlaying() {
  if (npTimer) { clearInterval(npTimer); npTimer = null }
  nowPlaying.value = ''
}

onBeforeUnmount(() => {
  stopSynth()
  stopRadio()
})
</script>

<template>
  <div class="not-prose">
    <div class="demo-player">
      <ClientOnly>
        <FFTVisualizer
          :mode="mode"
          audio-source="mic"
          :data="data"
          :data-left="dataLeft"
          :data-right="dataRight"
          :bands="80"
          background="#0a0a12"
          :show-stats="false"
          v-bind="activeProps"
          @error="onError"
        />
      </ClientOnly>
    </div>

    <div class="demo-bar">
      <button class="demo-play" @click="toggleSynth">
        <template v-if="loading && source === 'synth'">Loading…</template>
        <template v-else-if="source === 'synth'">❚❚ Pause</template>
        <template v-else>▶ Play</template>
      </button>
      <button class="demo-play" @click="toggleRadio">
        <template v-if="loading && source === 'radio'">Loading…</template>
        <template v-else-if="source === 'radio'">■ Stop radio</template>
        <template v-else>📻 Radio</template>
      </button>
      <button class="demo-play" @click="toggleMic">
        <template v-if="source === 'mic'">■ Stop mic</template>
        <template v-else>🎤 Use mic</template>
      </button>
      <div class="demo-presets">
        <button
          v-for="(p, i) in presets"
          :key="p.name"
          :class="{ active: i === active }"
          @click="selectPreset(i)"
        >{{ p.name }}</button>
      </div>
    </div>

    <p v-if="source === 'radio'" class="demo-radio">
      <span v-if="nowPlaying">♫ {{ nowPlaying }} · </span>
      <a :href="SOMA.station" target="_blank" rel="noopener">{{ SOMA.name }}</a>
      on <a href="https://somafm.com" target="_blank" rel="noopener">SomaFM</a> ·
      <a :href="SOMA.support" target="_blank" rel="noopener">support them</a>
    </p>

    <p class="demo-hint">
      Want every knob? <a href="https://demo.fftvisualizer.com/" target="_blank" rel="noopener">Open the full playground →</a>
    </p>
  </div>
</template>

<style scoped>
.demo-player {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 6;
  min-height: 220px;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 10px 40px -12px rgba(0, 0, 0, 0.5);
}

.demo-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.85rem;
}

.demo-play {
  flex: none;
  padding: 0.4rem 1rem;
  border-radius: 9999px;
  border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
  background: color-mix(in srgb, currentColor 8%, transparent);
  color: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.demo-play:hover { background: color-mix(in srgb, currentColor 16%, transparent); }

.demo-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-left: auto;
}

.demo-presets button {
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
  background: transparent;
  color: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s, background 0.15s;
}

.demo-presets button:hover {
  opacity: 1;
  background: color-mix(in srgb, currentColor 10%, transparent);
}

.demo-presets button.active {
  opacity: 1;
  font-weight: 700;
  color: var(--ui-primary, currentColor);
  background: color-mix(in srgb, var(--ui-primary, currentColor) 14%, transparent);
  border-color: color-mix(in srgb, var(--ui-primary, currentColor) 65%, transparent);
}

.demo-hint {
  margin: 0.75rem 0 0;
  text-align: left;
  font-size: 0.85rem;
  opacity: 0.7;
}

.demo-radio {
  margin: 0.75rem 0 0;
  text-align: left;
  font-size: 0.8rem;
  opacity: 0.75;
}
.demo-radio a {
  color: var(--ui-primary, currentColor);
  text-decoration: none;
}
.demo-radio a:hover {
  text-decoration: underline;
}
</style>
