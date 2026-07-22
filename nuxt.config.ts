export default defineNuxtConfig({
  extends: ['docus'],
  css: ['~/assets/css/main.css'],
  // Disable OG image generation — the @nuxtjs/og-image renderer needs the native
  // @takumi-rs/core module, which isn't installed and fails the build. We ship a
  // static og-image.png (public/) and point the social meta at it below instead.
  ogImage: { enabled: false },
  app: {
    head: {
      meta: [
        { property: 'og:image', content: 'https://fftvisualizer.com/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:type', content: 'image/png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: 'https://fftvisualizer.com/og-image.png' },
      ],
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
