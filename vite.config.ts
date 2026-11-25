/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Fail loudly if 5174 is taken: the dev storage account's CORS allow-list for admin blob uploads
    // (dish/shop images) is http://localhost:5174.
    port: 5174,
    strictPort: true,
    // Nested git worktrees under `.worktrees/` are full repo copies; edits or tsconfig changes
    // inside them must not clear this dev server's dependency cache (white page, 504 Outdated Optimize Dep).
    watch: { ignored: ['**/.worktrees/**'] },
  },
  test: {
    // Tests must not depend on a developer's .env.local: RTK Query needs an absolute
    // base URL to build Request objects. Fake host; fetch is stubbed in every test.
    env: { VITE_API_BASE_URL: 'http://api.test' },
    // Nested git worktrees under `.worktrees/` are full copies of this repo and must not be
    // collected: they inflate the file/test counts and can carry their own stale configs.
    // Vitest replaces its defaults when `exclude` is set, so the standard defaults are
    // spelled out here alongside the worktree pattern.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      '**/.worktrees/**',
    ],
  },
})
