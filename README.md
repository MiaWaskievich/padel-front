# Pádel Reservas – Frontend

Frontend del Sistema de Reservas de Canchas de Pádel, hecho con **HTML, CSS y JavaScript puro**
(sin frameworks, librerías ni build). Los clientes reservan turnos con un carrito y pago simulado
(seña del 30 % o total); los administradores ven la caja del día, las reservas y los horarios.

📄 **Documentación completa del sistema:**
[ARQUITECTURA.md](https://github.com/MiaWaskievich/padel-back/blob/main/ARQUITECTURA.md)

Backend: [github.com/MiaWaskievich/padel-back](https://github.com/MiaWaskievich/padel-back)

## Estructura

| Archivo | Para qué sirve |
|---|---|
| `index.html` + `js/auth.js` | Login y registro. Después del login manda al cliente a Reservar y al admin al Panel. |
| `reservar.html` + `js/reservar.js` | Grilla de turnos (horarios × canchas), carrito, pago simulado y confirmación. Se actualiza cada 10 s. |
| `mis-reservas.html` + `js/mis-reservas.js` | Reservas del cliente: pagar saldo y cancelar. |
| `admin.html` + `js/admin.js` | Dashboard del día, reservas del día, horarios de turnos y alta de administradores. |
| `js/config.js` | `API_URL` (local o Render) y `PORCENTAJE_SENA` (solo para mostrar la estimación). |
| `js/api.js` | Funciones compartidas: sesión en `localStorage`, `apiFetch`, `exigirRol`, formato de plata y fechas, `escaparHTML` y la barra superior. |
| `css/styles.css` | Todos los estilos (verde y azul, responsive). |
| `serve.json` | Configuración de `serve` (lo usa `iniciar_proyecto.bat` del back): desactiva las "clean URLs" para que las páginas mantengan su `.html`. |

- **Opción 1:** doble clic en `padel-back/iniciar_proyecto.bat` (levanta el back, este front en
  `http://localhost:5500` y abre el navegador). Las dos carpetas tienen que estar una al lado de la otra.
- **Opción 2:** `npm run dev` en `padel-back` y, en VS Code, clic derecho en `index.html` →
  **Open with Live Server** (`http://127.0.0.1:5500`).

Usuario administrador de prueba: `admin@padel.com` / `admin123`.
