/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Fail loudly instead of quietly moving to 5174, because the server's
    // CORS_ORIGIN setting names this exact port.
    strictPort: true,
  },
  test: {
    // A browser-shaped environment, so components can actually be rendered and
    // queried the way a person meets them.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Only tests. Without this, vitest walks into dist/ after a build.
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // The frame and the entry point are wiring, not logic — including them
      // would measure how much of main.tsx got imported rather than anything
      // worth knowing.
      exclude: ['src/main.tsx', 'src/test/**', '**/*.d.ts'],
    },
  },
})
