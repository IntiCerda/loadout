import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': import.meta.dirname } },
  test: { environment: 'node', include: ['lib/**/*.test.ts', 'app/**/*.test.ts'] },
})
