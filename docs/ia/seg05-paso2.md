# SEG-05: lectura por partida del subcontratista (paso 1 hecho, paso 2 pendiente)

Parte de la guía para IA (ver `CLAUDE.md`). Léela solo si tu tarea toca este tema.

## Decisión del dueño (oct 2026)

Solo para el rol `sc`. El **capataz queda fuera** (todavía no se usa en obra): no se cambia nada del capataz, ni en la página ni en las reglas.

- El SC sigue viendo en solo lectura el **lookahead de todos los SC** con sus marcas (⛔ restricción, liberación, cumplido o terminada del día). Por eso `acts`, `restr`, `lib`, `daily`, `live`, `doneidx`, `weeks`, `dplan`, `lhlog`, `mamb` y demás siguen legibles enteras.
- En el Plan diario sigue viendo las zonas de los otros SC (cruces y numeración): `pdz` y `pzon` sin cambios.
- Se limita a **su partida** (`me.scs` en la página, `scsOf()` en las reglas) lo que no necesita ver de los demás:
  - `nprog`: trabajo no programado.
  - `lhprop`: propuestas del lookahead (solo el documento `lhprop/{su sc}`).
  - `lhphist`: historial de decisiones sobre propuestas.
  - `mcatp`: propuestas al catálogo de la Matriz.
  - `mlog`: cambios del SC en la Matriz.
- Revisión del grupo (plan `SEG05-plan.md`): ninguna otra colección de ese tipo la lee el SC sin necesitarla. `lhlog` (historial del lookahead), `mver` (fotos de la Matriz) y `lib` quedan como parte del lookahead, por la decisión anterior.
- **Indicadores:** el SC ve solo su PPC. Es un filtro de pantalla (`indScs`, `indScD`, `wkScAgg` en `indicadores.js`) y no lleva reglas, porque `daily` y `weeks` mezclan todas las partidas en cada documento.

## Paso 1 (este PR: solo la página)

Las consultas del SC piden solo lo de su partida. Funcionan con las reglas de hoy y con las del paso 2.

- `scSubs(col, more, keep, cb, onErr)` y `scGet(col, more, keep)` en `base.js`:
  - Hacen una consulta por partida (`me.scs`), con `where('sc','==',s)` y luego los demás filtros (`more`).
  - Si falta el índice compuesto (`failed-precondition`, índice en construcción), repiten la consulta con solo `where('sc','==',s)`, que no necesita índice, y la página filtra el resto (`keep`).
  - Sin partidas responden `[]` al momento.
- Qué consulta cada colección:

  | Colección | Archivo | Consulta del SC |
  |---|---|---|
  | `nprog` | `ensureNP`, `no-programado.js` | `sc == s` y `date >= desde` |
  | `lhprop` | `ensureProp`, `propuestas.js` | `doc(s).onSnapshot`, una por partida; nunca la colección |
  | `lhphist` | `ensureLhh` (`propuestas.js`) y `histLoad` (`historial.js`) | `sc == s` y rango en `sk` |
  | `mcatp` | `ensureMx` (`matriz.js`) | `sc == s` |
  | `mlog` | `ensureMx` (`matriz.js`) | `sc == s` y `st == 'pend'` |

  - Antes, el SC leía `mcatp` entera, y también `mlog` entera si la Matriz se cargaba desde el Lookahead (`canWrite` = `PM()`).
  - Las rutas de `lhprop`/`mlog` que leen todo (`mxPendProp`, `mxUnifyDlg`, `mxScPendN`, `freezeWeek`, `nvProgDef`) son solo del ingeniero.
- **Índices nuevos** (`firebase/firestore.indexes.json`): `nprog(sc, date)` y `lhphist(sc, sk)`. CI los instala sin `--force`. Mientras se construyen, la página usa la consulta sin índice.
- **«Conectando…»:** ninguna de estas colecciones está en `COLS`. `onData` (`base.js`) solo espera `COLS`, así que una consulta filtrada que falle o tarde no deja al SC sin entrar. Lo prueba `lectura-por-partida.spec.js` sin índice.
- **Cambio de partida o de rol:** si un usuario entra o sale del rol `sc`, o cambian sus `scs`, la página se recarga sola (`memCb` en `base.js`, `sk0`/`sk1`). Así las suscripciones se vuelven a abrir con las partidas nuevas.
- **`sc` en `lhphist`:** todos los documentos lo tienen desde que existe la colección (`propLocal`, `rejectMany` y `decideMany` lo guardan junto con `sk`). No hay documentos antiguos sin `sc`. El historial más antiguo (`lhprop.hist`) vive dentro del documento de la propia partida.
- **Indicadores (SC):**
  - **Diario:** las filas de `dayData` se recortan a sus partidas y se recalculan con `dayAgg`.
  - **Semanal:** `wkScAgg` suma solo sus partidas, a partir de `wkScStats`. El histórico no usa los datos cargados a mano, que son de toda la obra.
  - Causas, PPC por piso, Reprogramaciones, Restricciones registradas, No cumplidos y Carga diaria: solo sus partidas.
  - Sin «Presentar», «Excel del PPC» ni «Reporte PDF», porque esos llevan a todas las partidas.

## Paso 2 (aplicar días después, cuando todos tengan la página nueva)

**Antes de aplicar:**
- Que hayan pasado unos días desde que el paso 1 llegó a producción. Los celulares con la versión anterior en el *service worker* harían la consulta sin `sc`, y con estas reglas fallaría entera: no programado «sin datos», propuestas sin cargar.
- Que en la consola de Firebase (producción) los índices `nprog(sc, date)` y `lhphist(sc, sk)` estén **Habilitados**. Si no lo están, la página igual funciona: usa la consulta sin índice.

### Reglas (`firebase/firestore.rules`)

Agregar la función junto a `crew()`:

```
    // SEG-05: el subcontratista solo lee documentos de su partida (el capataz y los demás roles, todo)
    function scReadOk(d) { return !isSC() || d.sc in scsOf(); }
```

Usa `d.sc`, no `d.get('sc','')`. Así la consulta `where('sc','==',s)` con `s in scsOf()` se puede demostrar sin leer cada documento. Un documento sin `sc` queda negado al SC, pero ninguno de los suyos carece de ese campo.

Cambiar solo el `allow read` de estas cinco colecciones; las escrituras no cambian:

```
    match /lhprop/{sc} {
      allow get: if lpsMember() && (!isSC() || sc in scsOf());
      allow list: if lpsMember() && !isSC();
      // allow write: igual que hoy
    }
    match /lhphist/{id} {
      allow read: if lpsMember() && scReadOk(resource.data);
      // create / update: igual que hoy
    }
    match /nprog/{id} {
      allow read: if lpsMember() && scReadOk(resource.data);
      // create / update / delete: igual que hoy
    }
    match /mlog/{id} {
      allow read: if lpsMember() && scReadOk(resource.data);
      // create / update / delete: igual que hoy (scLogOk usa get()/getAfter() de las reglas: no necesita permiso de lectura)
    }
    match /mcatp/{id} {
      allow read: if lpsMember() && scReadOk(resource.data);
      // create / update / delete: igual que hoy
    }
```

**Límite de accesos** (ver `seguridad.md`):
- `isSC()` y `scsOf()` leen el mismo `members/<correo>` que ya lee `lpsMember()`, así que cuenta una sola vez.
- No se suma ningún `get()` a otro documento.
- El SC escribe `lhprop` con `update` o `set` con `merge`, que no necesitan permiso de lectura. Las transacciones que releen `lhprop` (`decideProp`, `decideMany`, `rejectMany`) son del ingeniero.

### Pruebas (`tests/rules/firestore.test.mjs`)

Agregar al final del archivo. Usa los `members` del `beforeEach` (`sc@obra.pe` con `c-gabel`, `u_cap1` capataz):

```js
test('SEG-05 paso 2: el SC lee solo lo de su partida en nprog, lhprop, lhphist, mcatp y mlog', async () => {
  const T = 1759330800000, sk = (s, t) => s + '|' + String(t).padStart(15, '0');
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore(); const S = (p, d) => setDoc(doc(db, p), d);
    await S('members/sc3@obra.pe', { role: 'sc', name: 'SC dos partidas', sc: 'c-gabel', scs: ['c-gabel', 'c-dos'] });
    for (const s of ['c-gabel', 'c-otro', 'c-dos']) {
      await S('nprog/n-' + s, { sc: s, date: '2026-10-01', by: 'campo@obra.pe' });
      await S('lhphist/h-' + s, { sc: s, sk: sk(s, T), t: T, st: 'rej' });
      await S('mcatp/m-' + s, { sc: s, st: 'pend', by: 'editor@obra.pe' });
      await S('mlog/l-' + s, { sc: s, st: 'pend', by: 'sc@obra.pe' });
      await S('lhprop/' + s, { sc: s, items: {} });
    }
  });
  const sc = user('sc@obra.pe');
  const q = (db, c, ...w) => getDocs(query(collection(db, c), ...w));
  // lo de su partida, con las consultas de la página
  await assertSucceeds(q(sc, 'nprog', where('sc', '==', 'c-gabel'), where('date', '>=', '2026-09-01')));
  await assertSucceeds(q(sc, 'nprog', where('sc', '==', 'c-gabel')));
  await assertSucceeds(q(sc, 'lhphist', where('sc', '==', 'c-gabel'), where('sk', '>=', sk('c-gabel', 0)), where('sk', '<=', 'c-gabel|~')));
  await assertSucceeds(q(sc, 'mcatp', where('sc', '==', 'c-gabel')));
  await assertSucceeds(q(sc, 'mlog', where('sc', '==', 'c-gabel'), where('st', '==', 'pend')));
  await assertSucceeds(getDoc(doc(sc, 'lhprop/c-gabel')));
  await assertSucceeds(getDoc(doc(sc, 'nprog/n-c-gabel')));
  // lo de otra partida o sin filtro por partida (las consultas de antes del paso 1)
  await assertFails(q(sc, 'nprog', where('date', '>=', '2026-09-01')));
  await assertFails(q(sc, 'nprog', where('sc', '==', 'c-otro')));
  await assertFails(q(sc, 'lhphist', where('sk', '>=', sk('c-gabel', 0)), where('sk', '<=', 'c-gabel|~')));
  await assertFails(q(sc, 'lhphist', where('t', '>=', 0)));
  await assertFails(q(sc, 'mcatp'));
  await assertFails(q(sc, 'mlog', where('st', '==', 'pend')));
  await assertFails(q(sc, 'lhprop'));
  await assertFails(getDoc(doc(sc, 'lhprop/c-otro')));
  await assertFails(getDoc(doc(sc, 'nprog/n-c-otro')));
  await assertFails(getDoc(doc(sc, 'lhphist/h-c-otro')));
  await assertFails(getDoc(doc(sc, 'mcatp/m-c-otro')));
  await assertFails(getDoc(doc(sc, 'mlog/l-c-otro')));
  // varias partidas: una consulta por partida (como scSubs)
  const sc3 = user('sc3@obra.pe');
  await assertSucceeds(q(sc3, 'nprog', where('sc', '==', 'c-dos'), where('date', '>=', '2026-09-01')));
  await assertSucceeds(getDoc(doc(sc3, 'lhprop/c-dos')));
  await assertFails(getDoc(doc(sc3, 'lhprop/c-otro')));
  // los demás roles leen todo; el capataz queda como hoy (fuera de SEG-05)
  for (const who of ['editor@obra.pe', 'campo@obra.pe', 'lector@obra.pe', 'ot@obra.pe', 'veedor@obra.pe'])
    for (const c of ['nprog', 'lhphist', 'mcatp', 'mlog', 'lhprop']) await assertSucceeds(q(user(who), c));
  for (const c of ['nprog', 'lhphist', 'mcatp', 'mlog', 'lhprop']) await assertSucceeds(q(cap('cap1'), c));
  // el lookahead y el plan diario siguen enteros para el SC
  await assertSucceeds(q(sc, 'acts'));
  await assertSucceeds(q(sc, 'live', where('date', '>=', '2026-09-01')));
  await assertSucceeds(q(sc, 'pzon', where('pisoId', '==', 'p1')));
});

test('SEG-05 paso 2: el SC sigue escribiendo lo suyo sin permiso de lectura de lo ajeno', async () => {
  const sc = user('sc@obra.pe');
  await assertSucceeds(setDoc(doc(sc, 'lhprop/c-gabel'), { sc: 'c-gabel', items: { x1: { sent: false } } }, { merge: true }));
  await assertSucceeds(setDoc(doc(sc, 'nprog/n-sc'), { date: '2026-10-01', pisoId: 'p1', ambId: 'a1', sc: 'c-gabel', desc: 'x', by: 'sc@obra.pe', scProp: true }));
  await assertSucceeds(setDoc(doc(sc, 'mcatp/m-sc'), { sc: 'c-gabel', st: 'pend', by: 'sc@obra.pe', name: 'Nueva' }));
});
```

**Cómo verlo:** las pruebas de reglas no corren en el entorno de las IA, se ven en GitHub. Con el paso 2 aplicado, revisa en la copia de prueba con una cuenta SC real (no con «Ver como», que lee con el usuario administrador):
- Lookahead: «Modo propuesta», «Respuestas» y el Historial › Propuestas.
- En obra: registrar no programado.
- Matriz: marcar y deshacer.
- La barra no debe decir «Sin permiso» ni «Datos desactualizados».

## Lo que sigue abierto (fuera de este alcance)

- **Datos compartidos:** `daily`, `weeks.res`, `pdz` y `live` siguen legibles para el SC, por decisión del dueño. El PPC de otras partidas se puede leer desde la base aunque la pantalla no lo muestre.
- **Otras pantallas del SC:** el **Plan semanal** (pestaña `plan`) y el **Tablero** (si tiene `dash:true`) le siguen mostrando el cumplimiento de todas las partidas. No se tocaron porque la decisión se refiere a Indicadores.
- **Capataz:** sin cambios. Si algún día se le aplica lo mismo, cambia `isSC()` por `crew()` en `scReadOk`/`lhprop`, y en la página `npSC()`/`SCK()` por la condición del capataz. Su celular hoy lee `nprog` entero (`ensureDaily` → `ensureNP`).
