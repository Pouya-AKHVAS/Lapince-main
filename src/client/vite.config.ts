import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test-setup.ts",
  },
  server: {
    host: true,  // Écoute sur 0.0.0.0
    port: 5173,
    
  
    allowedHosts: [
      'lapince.pooya-dev.com',
      'api.lapince.pooya-dev.com'
    ],
    
    watch: {
      usePolling: true,  // Nécessaire sur Windows
    },
    proxy: {
      '/api': {
        target: 'http://api:3007', 
        changeOrigin: true, 
        rewrite: (path) => path.replace(/^\/api/, ''),  
      },
    },
  },
})