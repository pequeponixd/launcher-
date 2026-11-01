'use strict';
/**
 * Portátiles con gráfica híbrida (Intel/AMD + NVIDIA) en Linux: por defecto el juego se dibuja con la
 * gráfica integrada y va lento aunque el equipo sea potente. «PRIME render offload» manda el dibujo a la
 * NVIDIA con estas dos variables de entorno (son las mismas que pone `prime-run`).
 *
 * Solo Linux: en Windows la gráfica se elige en Configuración → Pantalla → Gráficos, y estas variables no
 * tienen efecto. Debe ser opcional: en un equipo sin NVIDIA estas variables impiden abrir la ventana.
 */
function gpuEnv(platform, enabled) {
  if (!enabled || platform !== 'linux') return {};
  return { __NV_PRIME_RENDER_OFFLOAD: '1', __GLX_VENDOR_LIBRARY_NAME: 'nvidia' };
}

/** Pone `vars` en process.env mientras dura `fn` (el proceso hijo hereda el entorno al crearse) y lo restaura. */
async function withEnv(vars, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

module.exports = { gpuEnv, withEnv };
