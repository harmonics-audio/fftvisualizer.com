export default defineAppConfig({
  ui: {
    colors: {
      primary: 'reefgold',
      secondary: 'woodsmoke',
      neutral: 'neutral'
    }
  },
  site: {
    name: 'FFT Visualizer',
    description:
      'A high-performance, WebGL-based real-time audio spectrum analyzer and FFT visualizer component for Vue 3.'
  },
  header: {
    title: 'FFT Visualizer',
    logo: {
      alt: 'FFT Visualizer'
    }
  },
  socials: {
    github: 'https://github.com/harmonics-audio/vue-fft-visualizer'
  },
  github: {
    url: 'https://github.com/harmonics-audio/vue-fft-visualizer',
    rootDir: '.'
  },
  toc: {
    title: 'On this page'
  }
})
