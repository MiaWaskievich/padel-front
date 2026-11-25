// js/api.js
// Funciones compartidas por todas las páginas. Se carga después de js/config.js (usa API_URL)
// y antes del script de cada página (js/auth.js, js/reservar.js, js/mis-reservas.js, js/admin.js).
// - Sesión: guarda el token y el usuario en localStorage (los devuelve POST /api/auth/login).
// - apiFetch: hace todas las llamadas a padel-back agregando el token.
// - Utilidades: formato de plata, fecha de hoy, escapar HTML y la barra superior.
// No llama a ningún endpoint por sí mismo: cada página le pasa la ruta.

// ---------- Sesión ----------

function guardarSesion(token, usuario) {
  localStorage.setItem('token', token);
  localStorage.setItem('usuario', JSON.stringify(usuario));
}

function obtenerToken() {
  return localStorage.getItem('token');
}

// Devuelve { id, nombre, email, rol } o null si no hay sesión
function obtenerUsuario() {
  const texto = localStorage.getItem('usuario');
  return texto ? JSON.parse(texto) : null;
}

function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
}

// Si no hay sesión o el rol no coincide, vuelve al login.
// Devuelve true si puede seguir, así la página no arranca cuando se está yendo.
// Si no hay sesión o el rol del usuario no está entre los permitidos, vuelve al login.
// Ejemplos: exigirRol('cliente')  o  exigirRol('admin', 'dueno')
// "...roles" junta todos los roles que se pasen en una lista.
function exigirRol(...roles) {
  const usuario = obtenerUsuario();
  if (!obtenerToken() || !usuario || !roles.includes(usuario.rol)) {
    location.href = 'index.html';
    return false;
  }
  return true;
}
// ---------- Llamadas a la API ----------

// Ejemplo: apiFetch('/reservas', { method: 'POST', body: JSON.stringify({...}) })
async function apiFetch(ruta, opciones = {}) {
  const token = obtenerToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;

  let respuesta;
  try {
    respuesta = await fetch(API_URL + ruta, { ...opciones, headers });
  } catch (error) {
    // fetch solo falla así cuando no hay conexión (back apagado, sin internet, CORS)
    throw new Error('No se pudo conectar con el servidor');
  }

  const datos = await respuesta.json().catch(() => ({}));

  // 401 con token = la sesión venció o el token no sirve: volvemos al login.
  // (Sin token, un 401 es "email o contraseña incorrectos" del login y se muestra como error normal)
  if (respuesta.status === 401 && token) {
    cerrarSesion();
    location.href = 'index.html';
    throw new Error('La sesión venció, volvé a ingresar');
  }

  if (!respuesta.ok) {
    const error = new Error(datos.error || 'Ocurrió un error inesperado');
    error.status = respuesta.status; // por ejemplo 409 = turno ya reservado
    throw error;
  }

  return datos;
}

// ---------- Utilidades ----------

const formatoPlata = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

function formatearPlata(n) {
  return formatoPlata.format(Number(n) || 0);
}

// Fecha de hoy en formato YYYY-MM-DD según la hora local del navegador
function fechaHoy() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// Convierte 'YYYY-MM-DD' en 'DD/MM/YYYY' para mostrar
function formatearFecha(fecha) {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

// Reemplaza los caracteres especiales para poder usar el texto dentro de innerHTML sin riesgo
function escaparHTML(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Muestra un mensaje en un elemento. tipo: 'error' | 'exito' | 'aviso'. Texto vacío = lo oculta.
function mostrarMensaje(elemento, texto, tipo = 'error') {
  elemento.textContent = texto;
  elemento.className = 'mensaje ' + tipo;
  elemento.hidden = !texto;
}

// Arma la barra superior dentro de <header id="encabezado">
function pintarEncabezado() {
  const usuario = obtenerUsuario();
  const header = document.getElementById('encabezado');
  if (!header || !usuario) return;

  // Links administrador
  // #config identificador que permite dirigirse a la seccion de la pagina.
  // admin panel no usa porque esta en la pagina principal.
    let links;
  if (usuario.rol === 'admin') {
    // El admin ve el panel y la configuración (horarios y alta de dueños)
    links = [['admin.html', 'Panel'], ['admin.html#config', 'Configuración']];
  } else if (usuario.rol === 'dueno') {
    // El dueño solo ve el panel de su club
    links = [['admin.html', 'Panel']];
  } else {
    // El cliente reserva y ve sus reservas
    links = [['reservar.html', 'Reservar'], ['mis-reservas.html', 'Mis reservas']];
  }

  const marca = document.createElement('span');
  marca.className = 'marca';
    const logo = document.createElement('img');
  logo.src = 'imagen/icono-padel-claro.png';
  logo.alt = '';
  logo.className = 'logo-encabezado';
  marca.append(logo, 'Pádel Reservas');

  const nav = document.createElement('nav');
  for (const [href, texto] of links) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = texto;
    if (location.pathname.endsWith(href)) a.className = 'activo';
    nav.appendChild(a);
  }

  const nombre = document.createElement('span');
  nombre.className = 'nombre-usuario';
  nombre.textContent = usuario.nombre;

  const boton = document.createElement('button');
  boton.className = 'boton secundario';
  boton.textContent = 'Cerrar sesión';
  boton.addEventListener('click', () => {
    cerrarSesion();
    location.href = 'index.html';
  });

  const derecha = document.createElement('div');
  derecha.className = 'derecha';
  derecha.append(nombre, boton);

  header.replaceChildren(marca, nav, derecha);
}
