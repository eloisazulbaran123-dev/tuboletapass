import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        evento: resolve(__dirname, 'evento.html'),
        checkout: resolve(__dirname, 'checkout.html'),
        confirmacion: resolve(__dirname, 'confirmacion.html'),
        'mis-ordenes': resolve(__dirname, 'mis-ordenes.html'),
        'mis-boletas': resolve(__dirname, 'mis-boletas.html'),
        login: resolve(__dirname, 'login.html'),
        'admin-login': resolve(__dirname, 'admin-login.html'),
        admin: resolve(__dirname, 'admin.html')
      }
    }
  }
})