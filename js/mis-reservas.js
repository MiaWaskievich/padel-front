// js/mis-reservas.js
// Lógica de mis-reservas.html (solo clientes): lista las reservas del usuario y permite
// pagar el saldo o cancelar.
// Endpoints:
//   GET /api/reservas/mias
//   PUT /api/reservas/:id/pagar-saldo
//   PUT /api/reservas/:id/cancelar
// Usa js/config.js y js/api.js (apiFetch, formatearPlata, escaparHTML, etc.).

const tablaReservas = document.getElementById('tabla-reservas');
const mensaje = document.getElementById('mensaje');
const sinReservas = document.getElementById('sin-reservas');

async function cargarReservas() {
  let reservas;
  try {
    reservas = await apiFetch('/reservas/mias');
  } catch (error) {
    mostrarMensaje(mensaje, error.message, 'error');
    return;
  }

  sinReservas.hidden = reservas.length > 0;

  // Los datos se escapan con escaparHTML antes de meterlos en el HTML
  tablaReservas.innerHTML = reservas.map((r) => `
    <tr class="${r.estado === 'cancelada' ? 'cancelada' : ''}">
      <td>${escaparHTML(r.club)}</td>
      <td>${escaparHTML(r.cancha)}</td>
      <td>${formatearFecha(r.fecha)}</td>
      <td>${escaparHTML(r.hora)}</td>
      <td>${formatearPlata(r.precio_total)}</td>
      <td>${formatearPlata(r.monto_pagado)}</td>
      <td>${r.estado === 'activa' ? formatearPlata(r.saldo) : '-'}</td>
      <td><span class="estado ${escaparHTML(r.estado)}">${escaparHTML(r.estado)}</span></td>
      <td class="acciones"></td>
    </tr>`).join('');

  // Los botones se agregan con JS para poder asignarles el evento click
  const celdasAcciones = tablaReservas.querySelectorAll('td.acciones');
  reservas.forEach((r, i) => {
    if (r.estado !== 'activa') return; // las canceladas no tienen botones

    if (r.saldo > 0) {
      celdasAcciones[i].appendChild(crearBoton('Pagar saldo', 'boton chico', () => pagarSaldo(r)));
    }
    celdasAcciones[i].appendChild(crearBoton('Cancelar', 'boton peligro chico', () => cancelar(r)));
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

async function pagarSaldo(reserva) {
  if (!confirm(`Vas a pagar el saldo de ${formatearPlata(reserva.saldo)}. ¿Confirmás?`)) return;
  try {
    await apiFetch(`/reservas/${reserva.id}/pagar-saldo`, { method: 'PUT' });
    mostrarMensaje(mensaje, 'Saldo pagado. ¡La reserva quedó completa!', 'exito');
  } catch (error) {
    mostrarMensaje(mensaje, error.message, 'error');
  }
  cargarReservas();
}

async function cancelar(reserva) {
  if (!confirm(`No hay devolución: se retienen ${formatearPlata(reserva.monto_pagado)}. ¿Cancelar?`)) return;
  try {
    await apiFetch(`/reservas/${reserva.id}/cancelar`, { method: 'PUT' });
    mostrarMensaje(mensaje, 'La reserva fue cancelada.', 'exito');
  } catch (error) {
    mostrarMensaje(mensaje, error.message, 'error');
  }
  cargarReservas();
}

if (exigirRol('cliente')) {
  pintarEncabezado();
  cargarReservas();
}
