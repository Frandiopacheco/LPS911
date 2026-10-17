#!/usr/bin/env node
"use strict";
/**
 * Paquete para auditorías externas (Argon/Gemini, ChatGPT u otra IA).
 *
 * Arma, desde un commit fijo (no desde lo que esté sin guardar en tu equipo):
 *   auditoria/lps911-<commit>-<perfil>.md   un solo archivo de texto con todo el código (para pegar o adjuntar)
 *   auditoria/lps911-<commit>-<perfil>.zip  los mismos archivos con sus carpetas (para IA que aceptan .zip)
 *
 * Uso:
 *   node scripts/paquete-auditoria.mjs                     perfil «lps», commit actual
 *   node scripts/paquete-auditoria.mjs --perfil completo
 *   node scripts/paquete-auditoria.mjs --commit acb48a7 --con-css --con-pruebas
 *   node scripts/paquete-auditoria.mjs web/js/propuestas.js web/js/campo.js   solo esos archivos (+ guía)
 *
 * Perfiles (ver docs/ia/auditoria-externa.md):
 *   lps       Last Planner sin los módulos Tareo y Planos/visor 3D, sin CSS ni pruebas.
 *   completo  Toda la app (los tres módulos), sin CSS ni pruebas.
 *   tareo     Solo el módulo Tareo + base, reglas y servidor.
 *   planos    Solo el módulo Planos + base, reglas.
 * Nunca entran: librerías de terceros (vendor/), package-lock, imágenes, .wasm ni web/firebase-config.js.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 28 });
const root = git("rev-parse", "--show-toplevel").trim();
process.chdir(root);

// ---- argumentos
const args = process.argv.slice(2);
let perfil = "lps", commit = "HEAD", conCss = false, conPruebas = false;
const sueltos = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--perfil") perfil = args[++i];
  else if (a === "--commit") commit = args[++i];
  else if (a === "--con-css") conCss = true;
  else if (a === "--con-pruebas") conPruebas = true;
  else if (a === "-h" || a === "--help") { console.log(execFileSync("sed", ["-n", "3,22p", "scripts/paquete-auditoria.mjs"], { encoding: "utf8" })); process.exit(0); }
  else sueltos.push(a);
}
const sha = git("rev-parse", "--short", commit).trim();
const fecha = git("show", "-s", "--format=%ci", commit).trim();
const todos = git("ls-tree", "-r", "--name-only", commit).split("\n").filter(Boolean);

// ---- qué entra
const nunca = (f) => /(^|\/)vendor\//.test(f) || /package-lock\.json$/.test(f) || /\.(png|jpe?g|gif|ico|wasm|pdf|ifc|zip)$/i.test(f) || f === "web/firebase-config.js";
const guia = (f) => f === "CLAUDE.md" || f.startsWith("docs/ia/");
const css = (f) => f.startsWith("web/css/");
const prueba = (f) => f.startsWith("tests/") || /^functions\/test\//.test(f);
const tareo = (f) => /^web\/js\/tareo/.test(f) || f === "docs/ia/tareo.md" || /tareo/.test(f) && prueba(f);
const planos = (f) => /^web\/js\/planos/.test(f) || f === "docs/ia/planos.md" || f.startsWith("scripts/visor3d/") || /planos/.test(f) && prueba(f);
const app = (f) => f.startsWith("web/") || f.startsWith("firebase/") || f.startsWith("functions/") || f === "firebase.json" || f === "firestore.indexes.json";
const comun = (f) => ["web/index.html", "web/sw.js", "web/js/base.js", "web/js/interfaz.js", "web/js/inicio.js", "web/js/config-equipo.js"].includes(f) || f.startsWith("firebase/") || f.startsWith("functions/") || f === "firebase.json";

let elegir;
if (sueltos.length) {
  const set = new Set(sueltos);
  elegir = (f) => set.has(f) || sueltos.some((s) => s.endsWith("/") && f.startsWith(s)) || f === "CLAUDE.md";
  perfil = "seleccion";
} else if (perfil === "lps") elegir = (f) => (app(f) || guia(f) || (conPruebas && prueba(f))) && !tareo(f) && !planos(f);
else if (perfil === "completo") elegir = (f) => app(f) || guia(f) || (conPruebas && prueba(f)) || f.startsWith("scripts/visor3d/") && !/stubs|harness|tools/.test(f);
else if (perfil === "tareo") elegir = (f) => tareo(f) || comun(f) || f === "CLAUDE.md" || f === "docs/ia/datos.md" || (conPruebas && prueba(f) && /tareo|rules/.test(f));
else if (perfil === "planos") elegir = (f) => planos(f) || comun(f) || f === "CLAUDE.md" || f === "docs/ia/datos.md" || (conPruebas && prueba(f) && /planos|rules/.test(f));
else { console.error(`Perfil desconocido: ${perfil} (usa lps, completo, tareo o planos)`); process.exit(1); }

const archivos = todos.filter((f) => !nunca(f) && elegir(f) && (conCss || !css(f)) && (conPruebas || sueltos.length || !prueba(f)));
// Guía primero (CLAUDE.md, docs), luego el código en el orden de carga de index.html
const html = git("show", `${commit}:web/index.html`);
const orden = [...html.matchAll(/src="(js\/[^"?]+)/g)].map((m) => "web/" + m[1]);
const peso = (f) => f === "CLAUDE.md" ? 0 : f.startsWith("docs/") ? 1 : orden.includes(f) ? 10 + orden.indexOf(f) : f.startsWith("web/") ? 200 : f.startsWith("firebase/") ? 300 : f.startsWith("functions/") ? 400 : 500;
archivos.sort((a, b) => peso(a) - peso(b) || a.localeCompare(b));

// ---- armar el .md
const lang = (f) => ({ js: "js", mjs: "js", html: "html", css: "css", json: "json", md: "markdown", rules: "javascript", yml: "yaml", sh: "bash" })[f.split(".").pop()] || "";
let cuerpo = "", chars = 0;
const indice = [];
for (const f of archivos) {
  const txt = git("show", `${commit}:${f}`);
  chars += txt.length;
  indice.push(`- ${f} (${txt.split("\n").length} líneas)`);
  const cerca = txt.includes("````") ? "`````" : "````";
  cuerpo += `\n\n## Archivo: ${f}\n\n${cerca}${lang(f)}\n${txt}${txt.endsWith("\n") ? "" : "\n"}${cerca}\n`;
}
const tokens = Math.round(chars / 3.2); // código en español: ~3,2 caracteres por token (estimado)
const cabecera = `# LPS 911 — paquete para auditoría externa

- Repositorio: Frandiopacheco/LPS911
- Commit auditado: **${sha}** (${fecha})
- Perfil: ${perfil}${conCss ? " + CSS" : ""}${conPruebas ? " + pruebas" : ""}
- Archivos: ${archivos.length} · ~${tokens.toLocaleString("es-PE")} tokens estimados

Este paquete es **solo de lectura**. Cita siempre el commit ${sha} y, para cada hallazgo, \`archivo:línea\`.
Las instrucciones del encargo están en docs/ia/auditoria-externa.md (sección «Pedido para pegar»).

## Índice

${indice.join("\n")}
`;
mkdirSync("auditoria", { recursive: true });
const base = join("auditoria", `lps911-${sha}-${perfil}`);
writeFileSync(base + ".md", cabecera + cuerpo);
git("archive", "--format=zip", "-o", base + ".zip", commit, "--", ...archivos);

console.log(`Listo: ${base}.md y ${base}.zip`);
console.log(`${archivos.length} archivos · ${(chars / 1e6).toFixed(2)} MB · ~${tokens.toLocaleString("es-PE")} tokens`);
if (tokens > 900000) console.log("Ojo: pasa de ~900 mil tokens; para IA con 1 millón de contexto deja poco margen. Usa un perfil más chico o lista los archivos del tema.");
else if (tokens > 200000) console.log("Nota: pasa de 200 mil tokens; ChatGPT y otras IA con contexto menor necesitan un perfil por tema o una lista de archivos.");
