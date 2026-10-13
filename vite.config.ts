/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Tests must not depend on a developer's .env.local: RTK Query needs an absolute
    // base URL to build Request objects. Fake host; fetch is stubbed in every test.
    env: { VITE_API_BASE_URL: 'http://api.test' },
  },
})
