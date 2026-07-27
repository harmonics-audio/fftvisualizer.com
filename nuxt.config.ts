export default defineNuxtConfig({
  extends: ['docus'],
  css: ['~/assets/css/main.css'],
  // Feeds the SEO module the real site name (otherwise it falls back to the package
  // name, "fftvisualizer-com") and the canonical/OG base URL.
  site: {
    name: 'FFT Visualizer',
    // www, not the apex: the apex 301s here, and a canonical/sitemap/llms.txt URL
    // that redirects is one a naive fetcher reads as an empty 5-byte body.
    url: 'https://www.fftvisualizer.com',
  },
  // Disable OG image generation — the @nuxtjs/og-image renderer needs the native
  // @takumi-rs/core module, which isn't installed and fails the build. We ship a
  // static og-image.png (public/) and point the social meta at it below instead.
  ogImage: { enabled: false },
  app: {
    head: {
      meta: [
        { property: 'og:image', content: 'https://www.fftvisualizer.com/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:type', content: 'image/png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: 'https://www.fftvisualizer.com/og-image.png' },
      ],
      link: [
        // Docus already emits the /favicon.ico link (now pointing at our replaced file).
        // We add the crisp SVG (preferred by modern browsers over the .ico fallback) and
        // the Apple touch icon, which Docus does not provide.
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },
  // nuxt-llms (pulled in by Docus) bails out entirely without an absolute domain — it
  // needs one to write absolute links — so until this was set, no /llms.txt existed at
  // all. Sections are left unset on purpose: @nuxt/content then auto-generates one per
  // page collection, so new tabs (React, …) are picked up without touching this config.
  llms: {
    // Must match site.url — every link in llms.txt is built from this, and Coolify
    // is set to redirect the apex to www (application setting `redirect: www`).
    domain: 'https://www.fftvisualizer.com',
    title: 'FFT Visualizer',
    description: 'A high-performance, WebGL audio spectrum analyzer and FFT visualizer for '
      + 'the web — a framework-agnostic TypeScript core with Vue 3 and React components. '
      + 'Visualize a mic, tab/system audio, a WebSocket stream, or your own data, all on the GPU.',
    full: {
      title: 'FFT Visualizer — complete documentation',
      description: 'The full guide, Core API, and Vue/React wrapper docs in a single file.',
    },
  },
  nitro: {
    prerender: {
      // Emit each page as foo/index.html so the production server serves clean
      // extensionless URLs (/reference/props). Without this, pages prerender to
      // foo.html and only resolve at /reference/props.html (clean URL 404s).
      autoSubfolderIndex: true,
    },
  },
})
