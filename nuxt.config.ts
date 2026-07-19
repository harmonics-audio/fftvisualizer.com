export default defineNuxtConfig({
  extends: ['docus'],
  css: ['~/assets/css/main.css'],
  // Disable OG image generation — the @nuxtjs/og-image renderer needs the native
  // @takumi-rs/core module, which isn't installed and fails the build.
  ogImage: { enabled: false },
  nitro: {
    prerender: {
      // Emit each page as foo/index.html so the production server serves clean
      // extensionless URLs (/reference/props). Without this, pages prerender to
      // foo.html and only resolve at /reference/props.html (clean URL 404s).
      autoSubfolderIndex: true,
    },
  },
})
