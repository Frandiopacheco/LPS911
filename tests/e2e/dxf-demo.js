// DXF de prueba para planos-dxf.spec.js y casco-dxf.spec.js: la planta del techo 3 de casco-vigas.spec.js.
// Como un DXF real: y hacia arriba, ejes A–E (x = 2…18 m) y 1–3 (y = 17, 13, 9) dentro de un bloque insertado en (1, 1) con su burbuja
// (círculo + nombre), $INSUNITS equivocado (pulgadas), columnas en el eje 2 (A de 0.50 excéntrica, B–E de 0.40), un cuadradito de 0.25 que se
// ignora, caras de la viga del eje 2 (0.30), un rótulo de sección, un achurado sólido, una polilínea con un arco (bulge), un texto de varios
// renglones y un objeto lejano que queda fuera de la lámina.
// k: unidades por metro (100 = centímetros). layout: el plano en una presentación A3 (mm) con una ventana al modelo a 1/100.
export function dxfDemo({ k = 1, layout = false } = {}) {
  const o = []; const P = (c, v) => o.push(String(c), String(v)); const n = v => Math.round(v * k * 1e6) / 1e6;
  const ent = (t, l, f, ps) => { P(0, t); P(8, l); if (ps) P(67, 1); f(); };
  const line = (l, x1, y1, x2, y2) => ent('LINE', l, () => { P(10, n(x1)); P(20, n(y1)); P(11, n(x2)); P(21, n(y2)); });
  const poly = (l, pts, cl = true, bul = []) => ent('LWPOLYLINE', l, () => { P(90, pts.length); P(70, cl ? 1 : 0); pts.forEach(([x, y], i) => { P(10, n(x)); P(20, n(y)); if (bul[i]) P(42, bul[i]); }); });
  const rect = (l, x0, y0, x1, y1) => poly(l, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  const text = (l, s, x, y, h = 0.25) => ent('TEXT', l, () => { P(10, n(x)); P(20, n(y)); P(40, n(h)); P(1, s); P(72, 1); P(11, n(x)); P(21, n(y)); P(73, 2); });
  const circ = (l, x, y, r) => ent('CIRCLE', l, () => { P(10, n(x)); P(20, n(y)); P(40, n(r)); });
  P(0, 'SECTION'); P(2, 'HEADER'); P(9, '$ACADVER'); P(1, 'AC1032'); P(9, '$INSUNITS'); P(70, 1); P(0, 'ENDSEC');
  P(0, 'SECTION'); P(2, 'TABLES'); P(0, 'TABLE'); P(2, 'LAYER');
  for (const [nm, c] of [['0', 7], ['EST-EJES', 1], ['EST-COLUMNAS', 7], ['EST-TRAZO', 7], ['EST-TEXTOS', 7], ['EST-ACHURADO', 8], ['APAGADA', -7]]) { P(0, 'LAYER'); P(2, nm); P(70, 0); P(62, c); P(6, nm === 'EST-EJES' ? 'CENTER' : 'Continuous'); }
  P(0, 'ENDTAB'); P(0, 'ENDSEC');
  const b = x => x - 1;
  P(0, 'SECTION'); P(2, 'BLOCKS'); P(0, 'BLOCK'); P(8, '0'); P(2, 'EJES'); P(70, 0); P(10, 0); P(20, 0);
  [['A', 2], ['B', 6], ['C', 10], ['D', 14], ['E', 18]].forEach(([nm, x]) => { line('0', b(x), b(8.5), b(x), b(17.5)); circ('0', b(x), b(18), 0.4); text('0', nm, b(x), b(18)); });
  [['1', 17], ['2', 13], ['3', 9]].forEach(([nm, y]) => { line('0', b(1.5), b(y), b(18.5), b(y)); circ('0', b(1), b(y), 0.4); text('0', nm, b(1), b(y)); });
  P(0, 'ENDBLK'); P(8, '0'); P(0, 'ENDSEC');
  P(0, 'SECTION'); P(2, 'ENTITIES');
  ent('INSERT', 'EST-EJES', () => { P(2, 'EJES'); P(10, n(1)); P(20, n(1)); });
  rect('EST-COLUMNAS', 1.95, 12.8, 2.45, 13.2);
  [6, 10, 14, 18].forEach(x => rect('EST-COLUMNAS', x - 0.2, 12.8, x + 0.2, 13.2));
  rect('EST-COLUMNAS', 3.9, 12.9, 4.15, 13.15); /* cuadradito de 0.25: se ignora */
  line('EST-TRAZO', 2.45, 12.85, 17.8, 12.85); line('EST-TRAZO', 2.45, 13.15, 17.8, 13.15);
  text('EST-TEXTOS', '(.30x.60)', 4, 13.0); text('EST-TEXTOS', '3/8"%%C@.20', 8, 12);
  ent('MTEXT', 'EST-TEXTOS', () => { P(10, n(3)); P(20, n(10)); P(40, n(0.2)); P(71, 1); P(1, '{\\H0.9x;NOTA}\\PLOSA h=0.20'); });
  /* achurado sólido de la columna C (borde polilínea) */
  ent('HATCH', 'EST-ACHURADO', () => { P(2, 'SOLID'); P(70, 1); P(91, 1); P(92, 2); P(72, 0); P(73, 1); P(93, 4); for (const [x, y] of [[9.8, 12.8], [10.2, 12.8], [10.2, 13.2], [9.8, 13.2]]) { P(10, n(x)); P(20, n(y)); } P(97, 0); P(75, 0); P(76, 1); P(98, 0); });
  poly('EST-TRAZO', [[6, 15], [8, 15]], false, [1]); /* semicírculo de (6,15) a (8,15) */
  line('APAGADA', 0, 0, 30, 30); /* capa apagada: no se dibuja */
  rect('EST-COLUMNAS', 900, 900, 900.5, 900.5); /* lejos de todo: fuera de la lámina */
  if (layout) {
    /* presentación A3 (mm): marco, rótulo y una ventana al modelo a 1/100 centrada en (10, 13) */
    const pl = (x1, y1, x2, y2) => ent('LINE', 'MARCO', () => { P(10, x1); P(20, y1); P(11, x2); P(21, y2); }, true);
    pl(0, 0, 420, 0); pl(420, 0, 420, 297); pl(420, 297, 0, 297); pl(0, 297, 0, 0);
    ent('TEXT', 'MARCO', () => { P(10, 300); P(20, 10); P(40, 5); P(1, 'E-03 ENCOFRADO'); }, true);
    ent('VIEWPORT', '0', () => { P(10, 210); P(20, 148.5); P(40, 500); P(41, 350); P(68, 1); P(69, 1); P(12, 210); P(22, 148.5); P(45, 350); }, true);
    ent('VIEWPORT', 'VENTANAS', () => { P(10, 200); P(20, 150); P(40, 380); P(41, 260); P(68, 2); P(69, 2); P(12, n(10)); P(22, n(13)); P(45, n(26)); }, true);
  }
  P(0, 'ENDSEC'); P(0, 'EOF');
  return o.join('\n') + '\n';
}
