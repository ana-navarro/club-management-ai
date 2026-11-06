import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://127.0.0.1:8080',
    supportFile: false,
    // Mobile viewport is mandatory (constitution, Principle III).
    viewportWidth: 390,
    viewportHeight: 844,
  },
})
