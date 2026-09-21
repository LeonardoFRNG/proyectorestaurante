// ============================================================
// UI — funciones reutilizables de interfaz
// ============================================================

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
});

/** 25000 -> "$25.000" */
function money(n) { return COP.format(Number(n) || 0); }

/** timestamp -> "20/09/2026 19:35" en hora de Colombia */
function fecha(ts, conHora = true) {
  if (!ts) return '—';
  const opt = { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric' };
  if (conHora) { opt.hour = '2-digit'; opt.minute = '2-digit'; opt.hour12 = false; }
  return new Date(ts).toLocaleString('es-CO', opt).replace(',', '');
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Aviso flotante. tipo: 'ok' | 'error' */
function toast(mensaje, tipo = 'ok') {
  const cont = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'px-4 py-3 rounded-lg shadow-lg text-sm text-white ' +
    (tipo === 'ok' ? 'bg-emerald-800' : 'bg-red-700');
  el.textContent = mensaje;
  cont.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/** Modal genérico. contenidoHTML se inyecta dentro de la caja blanca. */
function abrirModal(titulo, contenidoHTML, anchoMax = 'max-w-lg') {
  const m = document.getElementById('modal');
  m.innerHTML = `
    <div class="fixed inset-0 bg-black/50 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4" data-fondo>
      <div class="bg-white w-full ${anchoMax} rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto">
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h3 class="font-medium text-slate-800">${esc(titulo)}</h3>
          <button data-cerrar class="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
        </div>
        <div class="p-5">${contenidoHTML}</div>
      </div>
    </div>`;
  m.classList.remove('hidden');
  m.querySelector('[data-cerrar]').onclick = cerrarModal;
  m.querySelector('[data-fondo]').onclick = e => { if (e.target.dataset.fondo !== undefined) cerrarModal(); };
}

function cerrarModal() {
  const m = document.getElementById('modal');
  m.classList.add('hidden');
  m.innerHTML = '';
}

/** Confirmación con promesa: const ok = await confirmar('¿Eliminar?') */
function confirmar(mensaje, textoBoton = 'Sí, continuar') {
  return new Promise(resolve => {
    abrirModal('Confirmar', `
      <p class="text-slate-700 mb-6">${esc(mensaje)}</p>
      <div class="flex gap-3 justify-end">
        <button data-no class="px-4 py-2 rounded-lg border border-slate-300 text-slate-700">Cancelar</button>
        <button data-si class="px-4 py-2 rounded-lg text-white" style="background:#123F35">${esc(textoBoton)}</button>
      </div>`, 'max-w-sm');
    const m = document.getElementById('modal');
    m.querySelector('[data-si]').onclick = () => { cerrarModal(); resolve(true); };
    m.querySelector('[data-no]').onclick = () => { cerrarModal(); resolve(false); };
    m.querySelector('[data-cerrar]').onclick = () => { cerrarModal(); resolve(false); };
  });
}

function cargando(texto = 'Cargando...') {
  return `<div class="py-16 text-center text-slate-400 text-sm">${esc(texto)}</div>`;
}

function vacio(texto) {
  return `<div class="py-12 text-center text-slate-500 text-sm border border-dashed border-slate-300 rounded-xl">${esc(texto)}</div>`;
}

/** Descarga un CSV desde un arreglo de objetos planos */
function exportarCSV(nombreArchivo, filas) {
  if (!filas.length) { toast('No hay datos para exportar', 'error'); return; }
  const cols = Object.keys(filas[0]);
  const csv = [cols.join(';')]
    .concat(filas.map(f => cols.map(c => `"${String(f[c] ?? '').replace(/"/g, '""')}"`).join(';')))
    .join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = nombreArchivo;
  a.click();
}
