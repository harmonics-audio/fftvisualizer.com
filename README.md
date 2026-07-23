# fftvisualizer.com

The documentation and landing site for [**FFT Visualizer**](https://www.npmjs.com/package/fft-visualizer-vue)
(`fft-visualizer-vue`) — a WebGL-based real-time audio spectrum analyzer component for Vue 3.

**Live:** https://fftvisualizer.com

The component library itself lives in a separate repo:
[harmonics-audio/fft-visualizer](https://github.com/harmonics-audio/fft-visualizer).

## Stack

- [Docus](https://docus.dev) — documentation theme (extended via `extends: ['docus']`)
- [Nuxt 4](https://nuxt.com) + [Nuxt Content v3](https://content.nuxt.com) + [Nuxt UI v4](https://ui.nuxt.com)
- pnpm · Node 24
- The site embeds a **live demo** of the actual `fft-visualizer-vue` package (installed as a dependency)

## Development

```bash
pnpm install
pnpm dev      # dev server at http://localhost:3000
pnpm build    # production build → .output/
```

## Structure

```
content/                     # Markdown docs (Nuxt Content)
├── index.md                 # Homepage: hero + live demo + features
├── 1.getting-started/       # Introduction, Installation, Data modes, How it works
└── 2.reference/             # Props, Gradients, Composables
components/content/
├── DemoPlayer.vue           # Live embedded visualizer (::demo-player in index.md)
└── demoAudio.ts             # Generative stereo synth that feeds the demo
app.config.ts                # Docus/Nuxt UI config (reefgold/woodsmoke theme, nav, socials)
assets/css/main.css          # Brand palette as :root CSS variables
public/
├── og-image.png             # Social share card (1200×630)
└── favicon.ico
nuxt.config.ts               # Docus extend + build/deploy tweaks
Dockerfile / .dockerignore   # Container build for Coolify
```

## Implementation notes

A few non-obvious choices worth knowing before editing:

- **Live demo, not a GIF.** `components/content/DemoPlayer.vue` mounts the real
  `<FFTVisualizer>` and drives it with a generative Web Audio track (`demoAudio.ts`) or the
  visitor's microphone. It's referenced from `content/index.md` as `:demo-player` inside a
  `<ClientOnly>` boundary.

- **Theme via plain CSS variables.** `assets/css/main.css` defines the `reefgold` /
  `woodsmoke` palette as `--color-reefgold-*` / `--color-woodsmoke-*` on `:root`, and
  `app.config.ts` maps them (`ui.colors.primary: 'reefgold'`). It deliberately does **not**
  `@import "@nuxt/ui"` / `"tailwindcss"` — those resolve transitively through Docus and
  fail to import directly.

- **Static OG image.** Docus' dynamic OG image renderer (`@nuxtjs/og-image` →
  `@takumi-rs/core`) is disabled in `nuxt.config.ts` (`ogImage: { enabled: false }`) because
  the native module isn't installed. Instead a static `public/og-image.png` is shipped and
  the social meta tags point at it via `app.head` in `nuxt.config.ts`.

- **Clean URLs.** `nitro.prerender.autoSubfolderIndex` emits each page as `foo/index.html`
  so extensionless routes (`/reference/props`) resolve on the production server.

## Deployment

Self-hosted on [Coolify](https://coolify.io) via the multi-stage `Dockerfile`
(`node:24-slim`, pnpm). The build installs `python3 make g++` for `better-sqlite3` (a Nuxt
Content dependency that compiles from source), runs `pnpm build`, and serves the Nitro
output with `node .output/server/index.mjs`. Pushes to `main` trigger a redeploy.
