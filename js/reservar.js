// js/reservar.js
// Lógica de reservar.html (solo clientes): grilla de turnos, carrito y pago simulado.
// Endpoints:
//   GET  /api/clubes                              -> lista de clubes para el <select>
//   GET  /api/disponibilidad?club_id=&fecha=       -> grilla de turnos libres/ocupados
//   POST /api/reservas { items, tipo_pago }        -> reserva todo el carrito junto
// Usa js/config.js (PORCENTAJE_SENA) y js/api.js (apiFetch, formatearPlata, etc.).
// Los datos de la tarjeta NO se envían al back: el pago es simulado.

const selectClub = document.getElementById('club');
const inputFecha = document.getElementById('fecha');
const grilla = document.getElementById('grilla');
const mensajeGrilla = document.getElementById('mensaje-grilla');
const listaCarrito = document.getElementById('lista-carrito');
const carritoVacio = document.getElementById('carrito-vacio');
const botonIrAPagar = document.getElementById('ir-a-pagar');
const formPago = document.getElementById('form-pago');
const mensajePago = document.getElementById('mensaje-pago');
const seccionConfirmacion = document.getElementById('confirmacion');

let clubes = [];  // lo que devuelve GET /clubes
// Turnos elegidos: { club_id, club, cancha_id, cancha, fecha, hora, precio }
// Pueden ser de distintos clubes y fechas: cambiar el filtro NO vacía el carrito.
let carrito = [];

// Clave única de un turno, para comparar fácil
function claveTurno(cancha_id, fecha, hora) {
  return `${cancha_id}|${fecha}|${hora}`;
}

function estaEnCarrito(cancha_id, fecha, hora) {
  return carrito.some((item) => claveTurno(item.cancha_id, item.fecha, item.hora) === claveTurno(cancha_id, fecha, hora));
}

function tipoPagoElegido() {
  return document.querySelector('input[name="tipo_pago"]:checked').value;
}

// ---------- Grilla ----------

// Pide la disponibilidad del club y la fecha elegidos y dibuja la tabla
async function cargarGrilla() {
  const club = clubes.find((c) => c.id === Number(selectClub.value));
  const fecha = inputFecha.value;
  if (!club || !fecha) return;

  try {
    const datos = await apiFetch(`/disponibilidad?club_id=${club.id}&fecha=${fecha}`);
    dibujarGrilla(datos, club);
    if (mensajeGrilla.classList.contains('error')) mostrarMensaje(mensajeGrilla, '');
  } catch (error) {
    mostrarMensaje(mensajeGrilla, error.message, 'error');
  }
}

// Filas = horarios, columnas = canchas
function dibujarGrilla(datos, club) {
  // Encabezado: "Hora" + una columna por cancha con su precio
  const filaEncabezado = document.createElement('tr');
  const thHora = document.createElement('th');
  thHora.textContent = 'Hora';
  filaEncabezado.appendChild(thHora);
  for (const cancha of datos.canchas) {
    const th = document.createElement('th');
    th.textContent = cancha.nombre;
    const precio = document.createElement('small');
    precio.textContent = formatearPlata(cancha.precio_turno);
    th.append(document.createElement('br'), precio);
    filaEncabezado.appendChild(th);
  }
  const thead = document.createElement('thead');
  thead.appendChild(filaEncabezado);

  const tbody = document.createElement('tbody');
  datos.horarios.forEach((hora, i) => {
    const fila = document.createElement('tr');
    const tdHora = document.createElement('th');
    tdHora.textContent = hora;
    fila.appendChild(tdHora);

    for (const cancha of datos.canchas) {
      const turno = cancha.turnos[i];
      const boton = document.createElement('button');
      boton.type = 'button';

      if (turno.ocupado) {
        boton.className = 'turno ocupado';
        boton.textContent = 'Ocupado';
        boton.disabled = true;
      } else if (estaEnCarrito(cancha.id, datos.fecha, hora)) {
        boton.className = 'turno en-carrito';
        boton.textContent = 'En carrito';
        boton.addEventListener('click', () => quitarDelCarrito(cancha.id, datos.fecha, hora));
      } else {
        boton.className = 'turno libre';
        boton.textContent = 'Libre';
        boton.addEventListener('click', () => agregarAlCarrito({
          club_id: club.id,
          club: club.nombre,
          cancha_id: cancha.id,
          cancha: cancha.nombre,
          fecha: datos.fecha,
          hora,
          precio: cancha.precio_turno
        }));
      }

      const td = document.createElement('td');
      td.appendChild(boton);
      fila.appendChild(td);
    }
    tbody.appendChild(fila);
  });

  grilla.replaceChildren(thead, tbody);
}

// ---------- Carrito ----------

function agregarAlCarrito(item) {
  carrito.push(item);
  dibujarCarrito();
  cargarGrilla();
}

function quitarDelCarrito(cancha_id, fecha, hora) {
  carrito = carrito.filter((item) => claveTurno(item.cancha_id, item.fecha, item.hora) !== claveTurno(cancha_id, fecha, hora));
  dibujarCarrito();
  cargarGrilla();
}

// Estimación para mostrar (el back hace el cálculo real con el precio de la base)
function calcularResumen() {
  const total = carrito.reduce((suma, item) => suma + item.precio, 0);
  const ahora = tipoPagoElegido() === 'total'
    ? total
    : carrito.reduce((suma, item) => suma + Math.round(item.precio * PORCENTAJE_SENA / 100), 0);
  return { total, ahora, saldo: total - ahora };
}

function dibujarCarrito() {
  listaCarrito.replaceChildren();
  for (const item of carrito) {
    const li = document.createElement('li');

    const texto = document.createElement('div');
    const titulo = document.createElement('strong');
    titulo.textContent = `${item.club} – ${item.cancha}`;
    const detalle = document.createElement('span');
    detalle.textContent = `${formatearFecha(item.fecha)} ${item.hora} · ${formatearPlata(item.precio)}`;
    texto.append(titulo, document.createElement('br'), detalle);

    const quitar = document.createElement('button');
    quitar.type = 'button';
    quitar.className = 'boton peligro chico';
    quitar.textContent = 'Quitar';
    quitar.addEventListener('click', () => quitarDelCarrito(item.cancha_id, item.fecha, item.hora));

    li.append(texto, quitar);
    listaCarrito.appendChild(li);
  }

  const vacio = carrito.length === 0;
  carritoVacio.hidden = !vacio;
  botonIrAPagar.disabled = vacio;
  if (vacio) formPago.hidden = true;

  const resumen = calcularResumen();
  document.getElementById('resumen-total').textContent = formatearPlata(resumen.total);
  document.getElementById('resumen-ahora').textContent = formatearPlata(resumen.ahora);
  document.getElementById('resumen-saldo').textContent = formatearPlata(resumen.saldo);
}

// Consulta la disponibilidad de cada club/fecha que hay en el carrito y saca los turnos
// que ahora están ocupados (los reservó otro usuario o ya pasó el horario).
async function verificarCarrito() {
  const grupos = [...new Set(carrito.map((item) => `${item.club_id}|${item.fecha}`))];
  const sacados = [];

  for (const grupo of grupos) {
    const [club_id, fecha] = grupo.split('|');
    const datos = await apiFetch(`/disponibilidad?club_id=${club_id}&fecha=${fecha}`);
    for (const cancha of datos.canchas) {
      for (const turno of cancha.turnos) {
        if (turno.ocupado && estaEnCarrito(cancha.id, fecha, turno.hora)) {
          const item = carrito.find((it) => claveTurno(it.cancha_id, it.fecha, it.hora) === claveTurno(cancha.id, fecha, turno.hora));
          sacados.push(`${item.cancha} ${formatearFecha(fecha)} ${turno.hora}`);
          carrito = carrito.filter((it) => it !== item);
        }
      }
    }
  }

  if (sacados.length > 0) {
    dibujarCarrito();
    mostrarMensaje(mensajeGrilla, `Se sacaron del carrito turnos que ya no están disponibles: ${sacados.join(', ')}`, 'aviso');
  }
}

// "Tiempo real": revisa el carrito y recarga la grilla
async function actualizar() {
  try {
    await verificarCarrito();
  } catch (error) {
    mostrarMensaje(mensajeGrilla, error.message, 'error');
  }
  await cargarGrilla();
}

// ---------- Pago simulado ----------

// Valida el formato de los datos de la tarjeta. Devuelve el texto del error o '' si está todo bien.
function validarTarjeta() {
  const titular = document.getElementById('tarjeta-titular').value.trim();
  const numero = document.getElementById('tarjeta-numero').value.replace(/\s/g, '');
  const vencimiento = document.getElementById('tarjeta-vencimiento').value.trim();
  const cvv = document.getElementById('tarjeta-cvv').value.trim();

  if (!titular) return 'Ingresá el nombre del titular';
  if (!/^\d{16}$/.test(numero)) return 'El número de tarjeta debe tener 16 dígitos';
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(vencimiento)) return 'El vencimiento debe tener el formato MM/AA';
  if (!/^\d{3}$/.test(cvv)) return 'El CVV debe tener 3 dígitos';
  return '';
}

// Muestra el detalle que devolvió el back después de reservar
function mostrarConfirmacion(datos) {
  const tbody = document.getElementById('detalle-confirmacion');
  tbody.innerHTML = datos.reservas.map((r) => `
    <tr>
      <td>${escaparHTML(r.club)}</td>
      <td>${escaparHTML(r.cancha)}</td>
      <td>${formatearFecha(r.fecha)}</td>
      <td>${escaparHTML(r.hora)}</td>
      <td>${formatearPlata(r.precio_total)}</td>
      <td>${formatearPlata(r.monto_pagado)}</td>
      <td>${formatearPlata(r.saldo)}</td>
    </tr>`).join('');

  document.getElementById('totales-confirmacion').textContent =
    `Total: ${formatearPlata(datos.totales.total)} · Abonado: ${formatearPlata(datos.totales.abonado)} · ` +
    `Saldo pendiente: ${formatearPlata(datos.totales.saldo_pendiente)}`;

  seccionConfirmacion.hidden = false;
  seccionConfirmacion.scrollIntoView({ behavior: 'smooth' });
}

formPago.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const errorTarjeta = validarTarjeta();
  if (errorTarjeta) {
    mostrarMensaje(mensajePago, errorTarjeta, 'error');
    return;
  }
  if (carrito.length === 0) {
    mostrarMensaje(mensajePago, 'El carrito está vacío', 'error');
    return;
  }

  const botonConfirmar = document.getElementById('confirmar-pago');
  botonConfirmar.disabled = true; // evita que se reserve dos veces por doble clic
  mostrarMensaje(mensajePago, '');

  try {
    // Solo mandamos qué turnos y cómo paga; el precio lo pone el back
    const datos = await apiFetch('/reservas', {
      method: 'POST',
      body: JSON.stringify({
        items: carrito.map((item) => ({ cancha_id: item.cancha_id, fecha: item.fecha, hora: item.hora })),
        tipo_pago: tipoPagoElegido()
      })
    });

    carrito = [];
    formPago.reset();
    formPago.hidden = true;
    dibujarCarrito();
    mostrarConfirmacion(datos);
    cargarGrilla();
  } catch (error) {
    mostrarMensaje(mensajePago, error.message, 'error');
    if (error.status === 409) {
      // Alguien reservó antes: actualizamos y sacamos del carrito lo que ya está ocupado
      await actualizar();
    }
  } finally {
    botonConfirmar.disabled = false;
  }
});

// ---------- Inicio ----------

async function iniciar() {
  pintarEncabezado();

  inputFecha.min = fechaHoy();
  inputFecha.value = fechaHoy();

  try {
    clubes = await apiFetch('/clubes');
  } catch (error) {
    mostrarMensaje(mensajeGrilla, error.message, 'error');
    return;
  }
  for (const club of clubes) {
    const opcion = document.createElement('option');
    opcion.value = club.id;
    opcion.textContent = `${club.nombre} – ${club.direccion}`;
    selectClub.appendChild(opcion);
  }

  selectClub.addEventListener('change', cargarGrilla);
  inputFecha.addEventListener('change', cargarGrilla);
  document.querySelectorAll('input[name="tipo_pago"]').forEach((radio) => radio.addEventListener('change', dibujarCarrito));

  botonIrAPagar.addEventListener('click', () => {
    formPago.hidden = false;
    mostrarMensaje(mensajePago, '');
    document.getElementById('tarjeta-titular').focus();
  });
  document.getElementById('cancelar-pago').addEventListener('click', () => {
    formPago.hidden = true;
  });
  document.getElementById('cerrar-confirmacion').addEventListener('click', () => {
    seccionConfirmacion.hidden = true;
  });

  dibujarCarrito();
  await cargarGrilla();

  setInterval(actualizar, 10000); // cada 10 segundos
}

if (exigirRol('cliente')) {
  iniciar();
}
