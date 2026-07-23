export default defineAppConfig({
  ui: {
    colors: {
      primary: 'reefgold',
      secondary: 'woodsmoke',
      neutral: 'neutral'
    },
    header: {
      slots: {
        root: 'dark:bg-secondary-500/60'
      }
    }
  },
  site: {
    name: 'FFT Visualizer',
    description:
      'A high-performance, WebGL-based real-time audio spectrum analyzer and FFT visualizer for the web — a framework-agnostic TypeScript core with a Vue 3 component.'
  },
  header: {
    title: 'FFT Visualizer',
    logo: {
      alt: 'FFT Visualizer'
    }
  },
  navigation: {
    sub: 'header'
  },
  socials: {
    github: 'https://github.com/harmonics-audio/fft-visualizer'
  },
  github: {
    url: 'https://github.com/harmonics-audio/fft-visualizer',
    rootDir: '.'
  },
  toc: {
    title: 'On this page'
  }
})
