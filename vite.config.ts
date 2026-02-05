import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        evento: resolve(__dirname, 'evento.html'),
        login: resolve(__dirname, 'login.html'),
        misOrdenes: resolve(__dirname, 'mis-ordenes.html'),
        misBoletas: resolve(__dirname, 'mis-boletas.html'),
        confirmacion: resolve(__dirname, 'confirmacion.html'),
        checkout: resolve(__dirname, 'checkout.html')
      }
    }
  }
})
