// js/auth.js
// Lógica de index.html: login y registro.
// Endpoints: POST /api/auth/login y POST /api/auth/registro (routes/auth.js de padel-back).
// Usa js/config.js y js/api.js (apiFetch, guardarSesion, mostrarMensaje).
// Después del login manda al admin a admin.html y al cliente a reservar.html.

const formLogin = document.getElementById('form-login');
const formRegistro = document.getElementById('form-registro');
const pestanaLogin = document.getElementById('pestana-login');
const pestanaRegistro = document.getElementById('pestana-registro');
const mensaje = document.getElementById('mensaje');

// Lleva a la página que corresponde según el rol
function irSegunRol(usuario) {
  location.href = usuario.rol === 'admin' ? 'admin.html' : 'reservar.html';
}

// Si ya hay sesión, no tiene sentido mostrar el login
const usuarioActual = obtenerUsuario();
if (obtenerToken() && usuarioActual) {
  irSegunRol(usuarioActual);
}

// Cambia entre el formulario de login y el de registro
function mostrarPestana(esLogin) {
  formLogin.hidden = !esLogin;
  formRegistro.hidden = esLogin;
  pestanaLogin.classList.toggle('activa', esLogin);
  pestanaRegistro.classList.toggle('activa', !esLogin);
  mostrarMensaje(mensaje, '');
}

pestanaLogin.addEventListener('click', () => mostrarPestana(true));
pestanaRegistro.addEventListener('click', () => mostrarPestana(false));

// Hace el login, guarda la sesión y redirige
async function ingresar(email, password) {
  const datos = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  guardarSesion(datos.token, datos.usuario);
  irSegunRol(datos.usuario);
}

formLogin.addEventListener('submit', async (evento) => {
  evento.preventDefault(); // evita que el formulario recargue la página
  mostrarMensaje(mensaje, '');
  try {
    await ingresar(
      document.getElementById('login-email').value.trim(),
      document.getElementById('login-password').value
    );
  } catch (error) {
    mostrarMensaje(mensaje, error.message, 'error');
  }
});

formRegistro.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mostrarMensaje(mensaje, '');
  const email = document.getElementById('registro-email').value.trim();
  const password = document.getElementById('registro-password').value;

  try {
    await apiFetch('/auth/registro', {
      method: 'POST',
      body: JSON.stringify({
        nombre: document.getElementById('registro-nombre').value.trim(),
        email,
        password
      })
    });
    mostrarMensaje(mensaje, '¡Cuenta creada! Ingresando...', 'exito');
    // Login automático con los mismos datos (esperamos un momento para que se lea el mensaje)
    setTimeout(() => {
      ingresar(email, password).catch((error) => mostrarMensaje(mensaje, error.message, 'error'));
    }, 1000);
  } catch (error) {
    mostrarMensaje(mensaje, error.message, 'error');
  }
});
