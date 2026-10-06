'use strict';
// Cuentas de capataz del tareo (DNI + contraseña): lógica pura de la función cuentaCapataz.
const test = require('node:test');
const assert = require('node:assert');
const { ctaDni, ctaMail, ctaEsMail, ctaClaveOk, ctaClave, ctaPuede, ctaNombre, ctaPedido, ctaMigrables } = require('../lib');

test('DNI y correo sintético', () => {
  assert.strictEqual(ctaDni('12345678'), '12345678');
  assert.strictEqual(ctaDni(' 3684337 '), '03684337');
  assert.strictEqual(ctaDni(3684337), '03684337');
  assert.strictEqual(ctaDni('ce001234567'), 'CE001234567');
  assert.strictEqual(ctaDni('43241048 II'), '');
  assert.strictEqual(ctaDni('123'), '');
  assert.strictEqual(ctaDni(''), '');
  assert.strictEqual(ctaDni('1234567890123'), '');
  assert.strictEqual(ctaMail('03684337'), '03684337@tareo.lps911.pe');
  assert.strictEqual(ctaMail('CE001234567'), 'ce001234567@tareo.lps911.pe');
  assert.strictEqual(ctaMail('x'), '');
  assert.ok(ctaEsMail('12345678@TAREO.lps911.pe'));
  assert.ok(!ctaEsMail('juan@obra.pe'));
});

test('contraseña: mínimo 6, propuesta de 6 dígitos', () => {
  assert.ok(ctaClaveOk('123456'));
  assert.ok(!ctaClaveOk('12345'));
  assert.ok(!ctaClaveOk(' 123456'));
  assert.ok(!ctaClaveOk(123456));
  assert.ok(!ctaClaveOk('x'.repeat(65)));
  for (let i = 0; i < 50; i++) assert.match(ctaClave(), /^\d{6}$/);
  assert.strictEqual(ctaClave(() => 0.999999), '999999');
  assert.strictEqual(ctaClave(() => 0), '000000');
});

test('quién puede: dueño, admin y asistente de tareo con correo confirmado', () => {
  assert.ok(ctaPuede('frandiopacheco@gmail.com', true, null));
  assert.ok(ctaPuede('a@obra.pe', true, { role: 'admin' }));
  assert.ok(ctaPuede('t@obra.pe', true, { role: 'tasis' }));
  assert.ok(!ctaPuede('t@obra.pe', false, { role: 'tasis' }));
  assert.ok(!ctaPuede('t@obra.pe', true, { role: 'tasis', off: true }));
  for (const role of ['editor', 'campo', 'tcap', 'tcos', 'lector', 'sc']) assert.ok(!ctaPuede('x@obra.pe', true, { role }), role);
  assert.ok(!ctaPuede('x@obra.pe', true, null));
  assert.ok(!ctaPuede('', true, { role: 'admin' }));
});

test('nombre visible desde la ficha', () => {
  assert.strictEqual(ctaNombre({ ape: 'QUISPE  MAMANI', nom: 'JUAN CARLOS' }), 'Juan Carlos Quispe Mamani');
  assert.strictEqual(ctaNombre({ ape: 'ÑAHUI', nom: 'ÁNGEL' }), 'Ángel Ñahui');
  assert.strictEqual(ctaNombre({}), 'Capataz');
});

test('pedido: valida acción, DNI, contraseña y capataz anterior', () => {
  assert.deepStrictEqual(ctaPedido({ accion: 'crear', dni: '3684337', clave: '123456' }), { ok: true, accion: 'crear', dni: '03684337', mail: '03684337@tareo.lps911.pe', clave: '123456', de: '' });
  assert.match(ctaPedido({ accion: 'borrar', dni: '12345678' }).error, /Acción/);
  assert.match(ctaPedido({ accion: 'crear', dni: '12', clave: '123456' }).error, /DNI/);
  assert.match(ctaPedido({ accion: 'crear', dni: '12345678', clave: '123' }).error, /6 caracteres/);
  assert.match(ctaPedido({ accion: 'clave', dni: '12345678' }).error, /6 caracteres/);
  assert.strictEqual(ctaPedido({ accion: 'desactivar', dni: '12345678' }).ok, true);
  assert.match(ctaPedido({ accion: 'crear', dni: '12345678', clave: '123456', de: 'juan@obra.pe' }).error, /u_/);
  assert.strictEqual(ctaPedido({ accion: 'crear', dni: '12345678', clave: '123456', de: 'u_abcDEF123456' }).de, 'u_abcDEF123456');
  assert.match(ctaPedido({ accion: 'migrar', dni: '12345678' }).error, /Elige/);
  assert.strictEqual(ctaPedido(null).error, 'Acción no válida.');
});

test('migrar: solo los obreros del capataz anterior', () => {
  const F = [{ id: '1', cap: 'u_a' }, { id: '2', cap: 'u_b' }, { id: '3', cap: 'u_a' }, { id: '4', cap: '' }];
  assert.deepStrictEqual(ctaMigrables(F, 'u_a'), ['1', '3']);
  assert.deepStrictEqual(ctaMigrables(F, ''), []);
});
