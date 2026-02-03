# TuBoleta - Sistema de Venta de Boletas

Sistema completo de venta de boletas en línea con carrito de compras, checkout con múltiples métodos de pago y panel de administración.

## Características

- **Página Principal**: Header, búsqueda con filtros, banner, eventos, categorías
- **Búsqueda**: Filtrar por ciudad, categoría, fecha y nombre
- **Carrito de Compras**: Agregar/eliminar boletas, persistencia en localStorage
- **Checkout con 2 métodos de pago**:
  - Tarjeta de crédito/débito
  - Transferencia/Billetera digital (Nequi, Daviplata, Bancolombia, etc.)
- **Generación de QR**: Para pagos por transferencia
- **Panel de Administración**: Confirmar/rechazar pagos, configurar QR
- **Autenticación**: Login/registro de usuarios

## Requisitos

- [Node.js](https://nodejs.org/) versión 18 o superior
- [Visual Studio Code](https://code.visualstudio.com/) (recomendado)
- Navegador web moderno (Chrome, Firefox, Edge, Safari)

## Instalación

### Opción 1: Con Bun (Recomendado)

```bash
# Instalar Bun (si no lo tienes)
curl -fsSL https://bun.sh/install | bash

# Clonar o descargar el proyecto
cd tuboleta

# Instalar dependencias
bun install

# Iniciar servidor de desarrollo
bun run dev
```

### Opción 2: Con npm

```bash
# Clonar o descargar el proyecto
cd tuboleta

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

### Opción 3: Con pnpm

```bash
# Instalar pnpm (si no lo tienes)
npm install -g pnpm

# Clonar o descargar el proyecto
cd tuboleta

# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm run dev
```

## Abrir en Visual Studio Code

1. Abre Visual Studio Code
2. Ve a `Archivo > Abrir Carpeta...`
3. Selecciona la carpeta `tuboleta`
4. Abre la terminal integrada (`Ctrl + ñ` o `Ver > Terminal`)
5. Ejecuta `bun run dev` o `npm run dev`
6. Abre `http://localhost:5173` en tu navegador

### Extensiones Recomendadas para VS Code

- **ES7+ React/Redux/React-Native snippets**
- **Prettier - Code formatter**
- **Live Server** (alternativa para desarrollo)
- **TypeScript Vue Plugin (Volar)**

## Estructura del Proyecto

```
tuboleta/
├── index.html          # Página principal
├── evento.html         # Página de detalle de evento
├── checkout.html       # Página de checkout/pago
├── admin.html          # Panel de administración
├── src/
│   ├── main.ts         # JavaScript principal
│   ├── styles.css      # Estilos CSS
│   └── supabase.ts     # Configuración para Supabase (opcional)
├── public/             # Archivos estáticos
├── package.json        # Dependencias del proyecto
└── README.md           # Este archivo
```

## Configuración del Panel Admin

1. Abre `http://localhost:5173/admin.html`
2. Configura los datos del QR de pago:
   - Número de cuenta/celular
   - Nombre del titular
   - Banco principal
   - NIT/Cédula
3. Haz clic en "Guardar"

## Uso del Sistema

### Como Cliente

1. Navega por los eventos en la página principal
2. Usa los filtros de ciudad, categoría o busca por nombre
3. Haz clic en un evento para ver detalles
4. Selecciona el tipo de boleta y cantidad
5. Agrega al carrito
6. Ve al checkout
7. Elige método de pago:
   - **Tarjeta**: Ingresa datos y paga
   - **Transferencia**: Selecciona proveedor, genera QR, realiza el pago

### Como Administrador

1. Ve a `/admin.html`
2. Configura los datos del QR de pago
3. Revisa las órdenes pendientes
4. Confirma o rechaza pagos según corresponda

## Despliegue en Producción

### Netlify (Recomendado)

1. Crea una cuenta en [Netlify](https://netlify.com)
2. Conecta tu repositorio o arrastra la carpeta
3. Configura:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Despliega

### Vercel

1. Crea una cuenta en [Vercel](https://vercel.com)
2. Importa tu proyecto
3. Despliega automáticamente

### Servidor Propio

```bash
# Construir para producción
npm run build

# Los archivos estarán en la carpeta 'dist'
# Súbelos a tu servidor web (Apache, Nginx, etc.)
```

## Conectar a Supabase (Base de Datos)

1. Crea una cuenta en [Supabase](https://supabase.com)
2. Crea un nuevo proyecto
3. Ejecuta los scripts SQL del archivo `src/supabase.ts`
4. Copia tu URL y Anon Key
5. Actualiza las credenciales en `src/supabase.ts`

## Almacenamiento de Datos

Por defecto, el proyecto usa localStorage del navegador:

- `tuboleta-cart`: Carrito de compras
- `tuboleta-pending`: Órdenes pendientes de pago
- `tuboleta-auth`: Usuario autenticado
- `tuboleta-qr-config`: Configuración del QR

## Personalización

### Cambiar Colores

Edita las variables CSS en `src/styles.css`:

```css
:root {
  --blue: #1a3a4a;      /* Color principal */
  --cyan: #00b4d8;      /* Color secundario */
  --yellow: #e6b800;    /* Color de acento */
  --gray: #f5f5f5;      /* Fondo */
}
```

### Agregar Eventos

Edita el array `events` en `src/main.ts`:

```typescript
{
  id: 17,
  title: "Nombre del Evento",
  image: "URL de la imagen",
  venue: "Lugar",
  city: "Ciudad",
  category: "conciertos",
  price: 150000,
  date: { day: "01", month: "ENE", full: "1 de Enero, 2027" },
  time: "8:00 PM",
  tickets: [
    { type: "General", price: 150000, color: "#22c55e" },
    { type: "VIP", price: 300000, color: "#a855f7" }
  ]
}
```

## Soporte

Para preguntas o problemas, contacta a support@same.new

## Licencia

MIT License - Libre para uso personal y comercial.
