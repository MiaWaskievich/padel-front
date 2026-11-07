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

const inputFecha = document.getElementById('fecha');
const mensaje = document.getElementById('mensaje');

// Texto "N pagos" / "1 pago" para debajo de cada monto
function cantidad(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}

async function cargarDashboard() {
  const d = await apiFetch(`/admin/dashboard?fecha=${inputFecha.value}`);

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

  document.getElementById('sin-ingresos').hidden = d.ingresos_por_cancha.length > 0;
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

// Alta de otro administrador
document.getElementById('form-admin').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const formulario = evento.target;
  const mensajeAdmin = document.getElementById('mensaje-admin');
  try {
    const nuevo = await apiFetch('/admin/usuarios', {
      method: 'POST',
      body: JSON.stringify({
        nombre: document.getElementById('admin-nombre').value.trim(),
        email: document.getElementById('admin-email').value.trim(),
        password: document.getElementById('admin-password').value
      })
    });
    mostrarMensaje(mensajeAdmin, `Administrador ${nuevo.email} creado.`, 'exito');
    formulario.reset();
  } catch (error) {
    mostrarMensaje(mensajeAdmin, error.message, 'error');
  }
});

if (exigirRol('admin')) {
  pintarEncabezado();
  inputFecha.value = fechaHoy();
  document.getElementById('actualizar').addEventListener('click', () => {
    mostrarMensaje(mensaje, '');
    actualizar();
  });
  actualizar();
  cargarHorarios();
}
