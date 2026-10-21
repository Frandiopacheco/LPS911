// Datos inventados de publicaciones del tareo (semana 28.09–04.10, hoy 01.10): los usan tareo-pub y tareo-rrhh.
import { HOY } from './helpers.js';
export const T = (f, h) => Date.parse(`${f}T${h}:00-05:00`);
export const PCS = {
  p02_01: { cod: '2.01', nom: 'Excavación masiva', und: 'm3', grp: '2', grpN: 'M. Tierras', ua: 'CD1' },
  p10_05: { cod: '10.05', nom: 'Encofrado de muros', und: 'm2', grp: '10', grpN: 'Estructura', ua: 'CD2' },
  p10_10: { cod: '10.10', nom: 'Encofrado de escaleras', und: 'm2', grp: '10', grpN: 'Estructura', ua: 'CD3' },
};
export const A = (o = {}) => ({ dni: '40000001', ape: 'ALFA ROJAS', nom: 'JUAN', cat: 'OP', cua: 'CARPINTEROS', cap: 'tcap@obra.pe', capN: 'Teodoro Capataz', as: true, mot: '', alt: false, h: {}, trab: 0, ext: 0, ...o });
export const B = (o = {}) => ({ dni: '40000002', ape: 'BETA SOTO', nom: 'LUIS', cat: 'PE', cua: 'ALBAÑILES', cap: 'tcap@obra.pe', capN: 'Teodoro Capataz', as: true, mot: '', alt: false, h: {}, trab: 0, ext: 0, ...o });
export const pub = (fecha, v, rows, o = {}) => ['tpub', `${fecha}_v${v}`, { fecha, v, at: T(fecha, '19:0' + v), by: 'jefe@obra.pe', byN: 'Jaime Jefe', motivo: '', ant: v > 1 ? v - 1 : null,
  fuentes: [{ id: `${fecha}_tcap@obra.pe`, cap: 'tcap@obra.pe', capN: 'Teodoro Capataz', envN: 1, revBy: 'tasis@obra.pe', revAt: T(fecha, '18:00') }],
  pcs: PCS, rows, exc: {}, tot: null, dif: null, ...o }];
export const idx = (fecha, v, o = {}) => ['tpubidx', fecha, { fecha, v, vers: Array.from({ length: v }, (_, i) => ({ v: i + 1, at: T(fecha, '19:0' + (i + 1)), by: 'jefe@obra.pe', motivo: i ? 'Faltaba media hora' : '' })), abierto: null, ...o }];
export const DATOS = [
  // lunes 28.09: ALFA 3 + 6 h (0,5 extra, altura), BETA descanso médico, GAMA sin tareo por vacaciones
  pub('2026-09-28', 1, [A({ h: { p02_01: 3, p10_05: 6 }, trab: 9, ext: 0.5, alt: true }), B({ as: false, mot: 'DM' })],
    { exc: { 40000003: { motivo: 'Vacaciones', ape: 'GAMA DIAZ', nom: 'PEDRO' } } }),
  idx('2026-09-28', 1),
  // miércoles 30.09: v1 con 8,5 h, rectificada (v2) a 7 h
  pub('2026-09-30', 1, [A({ h: { p10_05: 8.5 }, trab: 8.5 }), B({ h: { p10_10: 8.5 }, trab: 8.5 })]),
  pub('2026-09-30', 2, [A({ h: { p10_05: 7 }, trab: 7 }), B({ h: { p10_10: 8.5 }, trab: 8.5 })], { motivo: 'Faltaba media hora', dif: ['ALFA ROJAS JUAN: 8,5 → 7 h'] }),
  idx('2026-09-30', 2),
  // jueves 01.10 (hoy): 10 h con 1,5 extra
  pub(HOY, 1, [A({ h: { p10_05: 10 }, trab: 10, ext: 1.5 }), B({ h: { p10_05: 4.5, p10_10: 4 }, trab: 8.5 })]),
  idx(HOY, 1),
];
// Semana anterior (21.09–27.09), solo para tareo-rrhh (auditoría 21-10-2026): el jueves 24.09 es feriado (congelado en la
// publicación, cfg.fer) y el domingo 27.09 se trabaja. ALFA cambia de categoría y cuadrilla el 22.09 (OF, ENCOFRADORES) y tiene 1 HE
// repartida en 3 partidas iguales; BETA tiene descanso médico por excepción el 22.09; GAMA tiene «Falta» por excepción.
const NL = { nl: true, jor: 0, cfg: { v: 1, jor: null, fer: false, rnl: { ref: 0 } } };
export const SEM2 = [
  pub('2026-09-22', 1, [A({ cat: 'OF', cua: 'ENCOFRADORES', h: { p02_01: 3, p10_05: 3, p10_10: 3 }, trab: 9, ext: 1 })],
    { exc: { 40000002: { motivo: 'Descanso médico', ape: 'BETA SOTO', nom: 'LUIS' } } }),
  idx('2026-09-22', 1),
  pub('2026-09-23', 1, [A({ h: { p10_05: 8.5 }, trab: 8.5 })], { exc: { 40000003: { motivo: 'Falta', ape: 'GAMA DIAZ', nom: 'PEDRO' } } }),
  idx('2026-09-23', 1),
  pub('2026-09-24', 1, [A({ h: { p02_01: 4 }, trab: 4, ext: 4 }), B({ as: false, mot: '' })],
    { ...NL, cfg: { ...NL.cfg, fer: true }, exc: { 40000003: { motivo: 'Falta', ape: 'GAMA DIAZ', nom: 'PEDRO' } } }),
  idx('2026-09-24', 1),
  pub('2026-09-27', 1, [A({ h: { p10_05: 6 }, trab: 6, ext: 6 }), B({ as: false, mot: '' })],
    { ...NL, exc: { 40000003: { motivo: 'Falta', ape: 'GAMA DIAZ', nom: 'PEDRO' } } }),
  idx('2026-09-27', 1),
];
