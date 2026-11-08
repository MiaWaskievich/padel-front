// js/config.js
// Configuración general del frontend. Es el PRIMER script de cada página;
// lo usan js/api.js (API_URL) y js/reservar.js (PORCENTAJE_SENA). No llama a ningún endpoint.

// Si abrimos el front en la compu (Live Server) usamos el back local; si no, el de Render
const API_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3000/api'
  : 'https://padel-back-o6c5.onrender.com/api'; // URL del back publicado en Render

const PORCENTAJE_SENA = 30; // solo para MOSTRAR la estimación; los montos reales los calcula el back
