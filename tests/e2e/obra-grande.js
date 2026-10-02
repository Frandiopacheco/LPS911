// Datos de una obra grande para medir la velocidad: 25 subcontratistas, 120 ambientes y 2400 actividades.
export function obraGrande({ acts = 2400, ambs = 120, scs = 25 } = {}) {
  const extra = [];
  for (let c = 4; c <= scs; c++) extra.push(['contractors', 'c' + c, { name: 'SC EMPRESA ' + c, partida: 'P' + c, color: '#557799' }]);
  for (let s = 0; s < 6; s++) extra.push(['sectors', 'xs' + s, { pisoId: 'p1', code: 'X' + s, name: 'Sector grande ' + s, order: 10 + s }]);
  for (let a = 0; a < ambs; a++) extra.push(['ambientes', 'xa' + a, { sectorId: 'xs' + (a % 6), code: 'B-' + a, name: 'Ambiente ' + a, order: a }]);
  for (let i = 0; i < acts; i++) {
    const d = new Date(Date.UTC(2026, 8, 28 + (i % 30))); const iso = d.toISOString().slice(0, 10); const iso2 = new Date(d.getTime() + 864e5).toISOString().slice(0, 10);
    extra.push(['acts', 'xx' + i, { ambId: 'xa' + (i % ambs), sc: 'c' + (1 + (i % scs)), name: 'Actividad ' + (i % 37), und: 'm2', metrado: 10, days: [iso, iso2], order: i }]);
  }
  return extra;
}
