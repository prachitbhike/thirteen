import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@/database": path.resolve(__dirname, "../../packages/database/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
})