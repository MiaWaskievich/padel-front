// js/admin.js
// Lógica de admin.html (solo administradores): dashboard de caja, reservas del día,
// horarios de los turnos y alta de admins.
// Endpoints:
//   GET    /api/admin/dashboard?fecha=
//   GET    /api/admin/reservas?fecha=
//   PUT    /api/reservas/:id/pagar-saldo   (el admin puede cobrar el saldo de cualquier reserva)
//   PUT    /api/reservas/:id/cancelar
//   GET    /api/admin/horarios
//   POST   /api/admin/horarios
//   DELETE /api/admin/horarios/:id
//   POST   /api/admin/usuarios
// Los horarios que se cargan acá son los que muestra la grilla de reservar.html (js/reservar.js).
// Usa js/config.js y js/api.js (apiFetch, formatearPlata, escaparHTML, etc.).

const inputFecha = document.getElementById('fecha'); //busca en el HTML el elemento con id="fecha": 
// el <input type="date"> del panel. Lo guarda en inputFecha para no tener que buscarlo cada vez.
const mensaje = document.getElementById('mensaje'); //es el mensaje donde se muestran los errores o avisos del dashboard.

// Usuario logueado y si es admin. Se usa para decidir qué partes del panel se muestran.
// (Si no hay sesión, exigirRol más abajo lo manda al login)
const usuarioLogueado = obtenerUsuario();
const esAdmin = usuarioLogueado !== null && usuarioLogueado.rol === 'admin';

// Texto "N pagos" / "1 pago" para debajo de cada monto
function cantidad(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`; //Si n es 1 usa singular, sino, plural.
}

async function cargarDashboard() { //le pide al back los números de caja del día elegido y 
  //los escribe en los 6 cuadrados y en la tabla “Ingresos por cancha”.
  const d = await apiFetch(`/admin/dashboard?fecha=${inputFecha.value}`); //Asigna los valores segun la fecha seleccionada en panel administracion.

  document.getElementById('d-total').textContent = formatearPlata(d.total_recaudado);
  document.getElementById('d-totales').textContent = formatearPlata(d.pagos_totales.monto);
  document.getElementById('d-totales-cant').textContent = cantidad(d.pagos_totales.cantidad, 'pago', 'pagos');
  document.getElementById('d-senas').textContent = formatearPlata(d.senas_cobradas.monto);
  document.getElementById('d-senas-cant').textContent = cantidad(d.senas_cobradas.cantidad, 'seña', 'señas');
  document.getElementById('d-saldos').textContent = formatearPlata(d.saldos_cobrados.monto);
  document.getElementById('d-saldos-cant').textContent = cantidad(d.saldos_cobrados.cantidad, 'saldo', 'saldos');
  document.getElementById('d-pendientes').textContent = formatearPlata(d.pendientes.monto);
  document.getElementById('d-pendientes-cant').textContent = cantidad(d.pendientes.cantidad, 'reserva adeuda', 'reservas adeudan');
  document.getElementById('d-retenidos').textContent = formatearPlata(d.retenidos.monto);
  document.getElementById('d-retenidos-cant').textContent = cantidad(d.retenidos.cantidad, 'cancelación', 'cancelaciones');

  document.getElementById('sin-ingresos').hidden = d.ingresos_por_cancha.length > 0; //muestra mensaje sin movimientos (definido en admin.html 39).
  document.getElementById('tabla-ingresos').innerHTML = d.ingresos_por_cancha.map((fila) => `
    <tr>
      <td>${escaparHTML(fila.club)}</td>
      <td>${escaparHTML(fila.cancha)}</td>
      <td>${formatearPlata(fila.monto)}</td>
    </tr>`).join('');
}

async function cargarReservas() {
  const { reservas } = await apiFetch(`/admin/reservas?fecha=${inputFecha.value}`);
  const tbody = document.getElementById('tabla-reservas');

  document.getElementById('sin-reservas').hidden = reservas.length > 0;
  tbody.innerHTML = reservas.map((r) => `
    <tr class="${r.estado === 'cancelada' ? 'cancelada' : ''}">
      <td>${escaparHTML(r.cliente)}</td>
      <td>${escaparHTML(r.email)}</td>
      <td>${escaparHTML(r.club)}</td>
      <td>${escaparHTML(r.cancha)}</td>
      <td>${escaparHTML(r.hora)}</td>
      <td>${formatearPlata(r.precio_total)}</td>
      <td>${formatearPlata(r.monto_pagado)}</td>
      <td>${r.estado === 'activa' ? formatearPlata(r.saldo) : '-'}</td>
      <td><span class="estado ${escaparHTML(r.estado)}">${escaparHTML(r.estado)}</span></td>
      <td class="acciones"></td>
    </tr>`).join('');

  // Botones solo para las reservas activas
  const celdas = tbody.querySelectorAll('td.acciones');
  reservas.forEach((r, i) => {
    if (r.estado !== 'activa') return;
    if (r.saldo > 0) {
      celdas[i].appendChild(crearBoton('Cobrar saldo', 'boton chico', () => cobrarSaldo(r)));
    }
    celdas[i].appendChild(crearBoton('Cancelar', 'boton peligro chico', () => cancelar(r)));
  });
}

function crearBoton(texto, clase, alHacerClic) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = clase;
  boton.textContent = texto;
  boton.addEventListener('click', alHacerClic);
  return boton;
}

// Recarga el dashboard y la tabla de reservas
async function actualizar() {
  try {
    await Promise.all([cargarDashboard(), cargarReservas()]);
  } catch (error) {
    mostrarMensaje(mensaje, error.message, 'error');
  }
}

async function cobrarSaldo(reserva) {
  if (!confirm(`¿Cobrar el saldo de ${formatearPlata(reserva.saldo)} a ${reserva.cliente}?`)) return;
  try {
    await apiFetch(`/reservas/${reserva.id}/pagar-saldo`, { method: 'PUT' });
    mostrarMensaje(mensaje, 'Saldo cobrado.', 'exito');
  } catch (error) {
    mostrarMensaje(mensaje, error.message, 'error');
  }
  actualizar();
}

async function cancelar(reserva) {
  if (!confirm(`No hay devolución: se retienen ${formatearPlata(reserva.monto_pagado)}. ¿Cancelar la reserva de ${reserva.cliente}?`)) return;
  try {
    await apiFetch(`/reservas/${reserva.id}/cancelar`, { method: 'PUT' });
    mostrarMensaje(mensaje, 'Reserva cancelada.', 'exito');
  } catch (error) {
    mostrarMensaje(mensaje, error.message, 'error');
  }
  actualizar();
}

// ---------- Horarios de los turnos ----------

const mensajeHorarios = document.getElementById('mensaje-horarios');

async function cargarHorarios() {
  let horarios;
  try {
    horarios = await apiFetch('/admin/horarios');
  } catch (error) {
    mostrarMensaje(mensajeHorarios, error.message, 'error');
    return;
  }

  const lista = document.getElementById('lista-horarios');
  lista.replaceChildren();
  for (const horario of horarios) {
    const li = document.createElement('li');
    const texto = document.createElement('strong');
    texto.textContent = horario.hora;
    li.append(texto, crearBoton('Quitar', 'boton peligro chico', () => quitarHorario(horario)));
    lista.appendChild(li);
  }
  document.getElementById('sin-horarios').hidden = horarios.length > 0;
}

async function quitarHorario(horario) {
  if (!confirm(`¿Quitar el horario de las ${horario.hora}?`)) return;
  try {
    const respuesta = await apiFetch(`/admin/horarios/${horario.id}`, { method: 'DELETE' });
    mostrarMensaje(mensajeHorarios, respuesta.mensaje, 'exito');
  } catch (error) {
    // Si tiene reservas activas el back responde 409 con el motivo
    mostrarMensaje(mensajeHorarios, error.message, 'error');
  }
  cargarHorarios();
}

// El input type="time" ya devuelve 'HH:MM', el formato que espera el back
document.getElementById('form-horario').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const formulario = evento.target;
  try {
    const nuevo = await apiFetch('/admin/horarios', {
      method: 'POST',
      body: JSON.stringify({ hora: document.getElementById('nuevo-horario').value })
    });
    mostrarMensaje(mensajeHorarios, `Horario ${nuevo.hora} agregado.`, 'exito');
    formulario.reset();
  } catch (error) {
    mostrarMensaje(mensajeHorarios, error.message, 'error');
  }
  cargarHorarios();
});

// ---------- Alta de dueños de club (solo admin) ----------

// Llena el <select> con la lista de clubes
async function cargarClubesSelect() {
  const clubes = await apiFetch('/clubes');           // GET /api/clubes: lista de clubes
  const select = document.getElementById('dueno-club');
  select.replaceChildren();                            // lo vacía por si ya tenía opciones
  for (const club of clubes) {
    const opcion = document.createElement('option');
    opcion.value = club.id;                            // lo que se manda al back
    opcion.textContent = club.nombre;                  // lo que ve el admin
    select.appendChild(opcion);
  }
}

// Al enviar el formulario se crea el dueño con el club elegido
document.getElementById('form-dueno').addEventListener('submit', async (evento) => {
  evento.preventDefault();                             // evita que la página se recargue
  const formulario = evento.target;
  const mensajeDueno = document.getElementById('mensaje-dueno');
  try {
    const nuevo = await apiFetch('/admin/usuarios', {
      method: 'POST',
      body: JSON.stringify({
        nombre: document.getElementById('dueno-nombre').value.trim(),
        email: document.getElementById('dueno-email').value.trim(),
        password: document.getElementById('dueno-password').value,
        club_id: Number(document.getElementById('dueno-club').value) // id del club elegido
      })
    });
    mostrarMensaje(mensajeDueno, `Dueño ${nuevo.email} creado.`, 'exito');
    formulario.reset();                                // limpia los campos
        mostrarMensaje(mensajeDueno, `Dueño ${nuevo.email} creado.`, 'exito');
    formulario.reset();                                // limpia los campos
    cargarDuenos();                                    // el dueño nuevo aparece en la lista
  } catch (error) {
    mostrarMensaje(mensajeDueno, error.message, 'error');
  }
});

// ---------- Lista de dueños (solo admin) ----------

// Pide al back la lista de dueños y arma un renglón por cada uno con su botón "Eliminar"
async function cargarDuenos() {
  const mensajeDueno = document.getElementById('mensaje-dueno');
  let duenos;
  try {
    duenos = await apiFetch('/admin/duenos');          // GET /api/admin/duenos
  } catch (error) {
    mostrarMensaje(mensajeDueno, error.message, 'error');
    return;
  }

  const lista = document.getElementById('lista-duenos');
  lista.replaceChildren();                             // vacía la lista antes de volver a llenarla
  for (const dueno of duenos) {
    const li = document.createElement('li');

    // Izquierda: nombre en negrita y, abajo, email y club en letra chica
    const datos = document.createElement('div');
    const nombre = document.createElement('strong');
    nombre.textContent = dueno.nombre;
    const detalle = document.createElement('small');
    detalle.textContent = `${dueno.email} · ${dueno.club || 'sin club'}`;
    datos.append(nombre, document.createElement('br'), detalle);

    // Derecha: el botón (crearBoton ya existe más arriba en este archivo)
    li.append(datos, crearBoton('Eliminar', 'boton peligro chico', () => eliminarDueno(dueno)));
    lista.appendChild(li);
  }

  // Si no hay dueños, muestra el texto "Todavía no hay dueños cargados."
  document.getElementById('sin-duenos').hidden = duenos.length > 0;
}

// Pregunta si está seguro, le pide al back que borre el dueño y recarga la lista
async function eliminarDueno(dueno) {
  if (!confirm(`¿Eliminar al dueño ${dueno.nombre} (${dueno.email})? Ya no va a poder ingresar.`)) return;

  const mensajeDueno = document.getElementById('mensaje-dueno');
  try {
    const respuesta = await apiFetch(`/admin/duenos/${dueno.id}`, { method: 'DELETE' });
    mostrarMensaje(mensajeDueno, respuesta.mensaje, 'exito');   // "Dueño eliminado"
  } catch (error) {
    mostrarMensaje(mensajeDueno, error.message, 'error');
  }
  cargarDuenos();                                      // vuelve a pedir la lista ya actualizada
}

// ---------- Vistas: Panel / Configuración ----------

// Muestra el Panel o la Configuración según lo que diga la dirección después del #
function mostrarVista() {
  // location.hash es lo que está después del # en la barra de direcciones.
  // Si la dirección es admin.html#config, enConfig vale true; si no, false.
  // Solo el admin puede ver Configuración. Aunque un dueño escriba #config
  // a mano en la dirección, enConfig queda en false y sigue viendo el Panel.
  const enConfig = location.hash === '#config' && esAdmin;

  // hidden = true oculta el elemento; hidden = false lo muestra.
  // Si estamos en Configuración, se oculta el Panel...
  document.getElementById('vista-panel').hidden = enConfig;
  // ...y se muestra la Configuración. Si no, al revés.
  document.getElementById('vista-config').hidden = !enConfig;

  // Recorre los links del encabezado (Panel y Configuración)
  for (const a of document.querySelectorAll('#encabezado nav a')) {
    // ¿Este link es el de Configuración?
    const esLinkConfig = a.getAttribute('href') === 'admin.html#config';
    // Le pone la clase "activo" (que lo resalta) solo al link de la vista que se está viendo,
    // y se la saca al otro.
    a.classList.toggle('activo', esLinkConfig === enConfig);
  }
}

if (exigirRol('admin', 'dueno')) {   // entran admin y dueño; cualquier otro vuelve al login
  pintarEncabezado();                // arma el encabezado (el dueño solo ve "Panel")

  mostrarVista();                    // muestra la vista que corresponde
  window.addEventListener('hashchange', mostrarVista); // y la cambia al tocar un link

  inputFecha.value = fechaHoy();
  document.getElementById('actualizar').addEventListener('click', () => {
    mostrarMensaje(mensaje, '');
    actualizar();
  });
  actualizar(); // dashboard y reservas: si es dueño, el back ya devuelve solo su club

  if (esAdmin) {
    // Solo el admin carga lo de Configuración (al dueño el back le respondería 403)
    cargarHorarios();
    cargarDuenos();                  // lista de dueños con su botón Eliminar
    cargarClubesSelect().catch((error) =>
      mostrarMensaje(document.getElementById('mensaje-dueno'), error.message, 'error'));
  } else {
    // El dueño ve un título acorde
    document.getElementById('titulo-panel').textContent = 'Panel de mi club';
  }
}
