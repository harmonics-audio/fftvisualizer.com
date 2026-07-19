---
seo:
  title: FFT Visualizer — WebGL audio spectrum analyzer for Vue
  description: A high-performance, WebGL-based real-time audio spectrum analyzer and
    FFT visualizer component for Vue 3. Microphone, tab/system audio, WebSocket, or
    your own Web Audio data — rendered on the GPU in a single draw call.
---

::u-page-hero
#title
Real-time audio spectrum, on the GPU

#description
A high-performance, WebGL-based audio spectrum analyzer and FFT visualizer for Vue 3.
Visualize the microphone, tab/system audio, a WebSocket stream, or your own data —
the entire frame drawn by a single fragment shader.

#links
  :::u-button
  ---
  color: neutral
  size: xl
  to: /getting-started/installation
  trailing-icon: i-lucide-arrow-right
  ---
  Get started
  :::

  :::u-button
  ---
  color: neutral
  icon: i-lucide-play
  size: xl
  to: https://vue-fft-visualizer.vercel.app
  target: _blank
  variant: subtle
  ---
  Live demo
  :::

  :::u-button
  ---
  color: neutral
  icon: i-simple-icons-github
  size: xl
  to: https://github.com/harmonics-audio/vue-fft-visualizer
  variant: outline
  ---
  View on GitHub
  :::
::

::u-container
:demo-player
::

::u-page-section
#title
Why FFT Visualizer

#features
  :::u-page-feature
  ---
  icon: i-lucide-cpu
  ---
  #title
  Single-draw-call WebGL

  #description
  Every bar, LED segment, gradient, glow and reflection is rendered by one fragment
  shader — smooth at 120fps with 80 bands in stereo.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-mic
  ---
  #title
  Three data sources

  #description
  Capture audio locally (mic or tab/system), stream pre-computed FFT over WebSocket,
  or feed your own magnitudes via props.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-waves
  ---
  #title
  In-browser FFT (Rust/WASM)

  #description
  Optional WebAssembly FFT processor, lazy-loaded only when you capture audio locally.
  Zero backend required.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-palette
  ---
  #title
  Rich visual modes

  #description
  LED segments, radial layout, stereo, mirrored reflection, glow, rotation, and 10
  gradient presets or your own CSS-color stops.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-package
  ---
  #title
  One peer dependency

  #description
  Just Vue 3. Rendering uses native WebGL — no charting library, no canvas 2D.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-square-dashed
  ---
  #title
  Transparent & themeable

  #description
  Any background color, including a fully transparent canvas that blends into your
  page. SSR-safe for Nuxt.
  :::
::
