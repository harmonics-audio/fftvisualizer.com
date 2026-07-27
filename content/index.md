---
seo:
  title: WebGL Audio Spectrum Analyzer for the Web
  description: A high-performance, WebGL audio spectrum analyzer and FFT visualizer for the
    web — a framework-agnostic TypeScript core with Vue 3 and React components. Visualize a mic,
    tab/system audio, a WebSocket stream, or your own data, all on the GPU.
---

::u-page-hero
---
orientation: horizontal
---
#title
Real-time audio spectrum, on the GPU

#description
A high-performance, WebGL-based audio spectrum analyzer and FFT visualizer for the web —
a framework-agnostic TypeScript core with first-class Vue 3 and React components. Visualize the
microphone, tab/system audio, a WebSocket stream, or your own data — the entire frame
drawn by a single fragment shader.

#default
  :::div{.hero-visual}
    ![FFT Visualizer radial spectrum](/hero.png){width="1034" height="926"}
  :::

#links
  :::u-button
  ---
  color: neutral
  size: xl
  to: /guide/introduction
  trailing-icon: i-lucide-arrow-right
  ---
  Get started
  :::

  :::u-button
  ---
  color: neutral
  icon: i-lucide-play
  size: xl
  to: https://demo.fftvisualizer.com/
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
  to: https://github.com/harmonics-audio/fft-visualizer
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
  Framework-agnostic core

  #description
  A vanilla-TypeScript engine with thin wrappers for Vue and React. Rendering uses
  native WebGL: no charting library, no canvas 2D.
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
