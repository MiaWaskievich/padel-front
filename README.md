# Pádel Reservas – Frontend

Frontend del Sistema de Reservas de Canchas de Pádel, hecho con HTML, CSS y JavaScript puro
(sin frameworks ni librerías). Permite:

- Clientes: registrarse, ver la grilla de turnos, armar un carrito, pagar (simulado) con seña o total,
  ver sus reservas, pagar el saldo y cancelar.
- Administradores: ver el dashboard de caja del día, las reservas del día y crear otros administradores.

## Requisitos

- **padel-back corriendo** en `http://localhost:3000` (ver el README de padel-back).
- VS Code con la extensión **Live Server**.

## Cómo levantarlo local

1. Levantar el backend: en la carpeta `padel-back`, `npm run dev`.
2. Abrir la carpeta `padel-front` en VS Code.
3. Clic derecho en `index.html` → **Open with Live Server**.
   Se abre en `http://127.0.0.1:5500` (ese origen está permitido en el CORS del back).

Usuario administrador de prueba: `admin@padel.com` / `admin123`.

## Páginas

| Página | Rol | Qué hace |
|--------|-----|----------|
| `index.html` | Público | Login y registro |
| `reservar.html` | Cliente | Grilla de turnos, carrito y pago simulado |
| `mis-reservas.html` | Cliente | Reservas propias: pagar saldo y cancelar |
| `admin.html` | Admin | Dashboard, reservas del día y crear administrador |

La URL de la API se configura en `js/config.js`.
