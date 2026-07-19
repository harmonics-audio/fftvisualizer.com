<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { FFTVisualizer } from 'vue-fft-visualizer'
import 'vue-fft-visualizer/style.css'
import { createDemoAudio, type DemoAudio } from './demoAudio'

const data = ref(new Uint8Array(80))
const dataLeft = ref(new Uint8Array(80))
const dataRight = ref(new Uint8Array(80))
const playing = ref(false)
const loading = ref(false)
let demo: DemoAudio | null = null

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
  }
] as const

const active = ref(0)
const activeProps = computed(() => presets[active.value]!.props)

async function toggle() {
  if (playing.value) {
    demo?.stop()
    demo = null
    playing.value = false
    return
  }
  loading.value = true
  demo = createDemoAudio(80)
  await demo.start((mono, left, right) => {
    data.value = mono
    dataLeft.value = left
    dataRight.value = right
  })
  loading.value = false
  playing.value = true
}

onBeforeUnmount(() => demo?.stop())
</script>

<template>
  <div class="not-prose">
    <div class="demo-player">
      <ClientOnly>
        <FFTVisualizer
          mode="external"
          :data="data"
          :data-left="dataLeft"
          :data-right="dataRight"
          :bands="80"
          background="#0a0a12"
          :show-stats="false"
          v-bind="activeProps"
        />
      </ClientOnly>
    </div>

    <div class="demo-bar">
      <button class="demo-play" @click="toggle">
        <template v-if="loading">Loading…</template>
        <template v-else-if="playing">❚❚ Pause</template>
        <template v-else>▶ Play</template>
      </button>
      <div class="demo-presets">
        <button
          v-for="(p, i) in presets"
          :key="p.name"
          :class="{ active: i === active }"
          @click="active = i"
        >{{ p.name }}</button>
      </div>
    </div>

    <p class="demo-hint">
      Want every knob? <a href="https://vue-fft-visualizer.vercel.app" target="_blank" rel="noopener">Open the full playground →</a>
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
</style>
