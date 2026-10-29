#!/usr/bin/env bash
# LPS 911 · Preparación del entorno de nube de Claude Code (oct 2026, decidido con el dueño).
#
# Para qué: que cada sesión de Claude Code en la nube (claude.ai/code, app de Claude › Code) arranque con lo
# necesario para probar LPS 911 sin instalar nada a mano: Node (ya viene), Java y Firebase CLI (emulador de las
# reglas) y Chromium de Playwright (pruebas de la interfaz).
#
# Cómo se usa: en claude.ai/code › entorno de la nube › «Setup script» (script de instalación), pega:
#
#     curl -fsSL https://raw.githubusercontent.com/Frandiopacheco/LPS911/main/scripts/entorno-nube.sh | bash
#
# o el contenido de este archivo. Si termina en ~5 minutos, el entorno queda en caché y las siguientes sesiones
# arrancan listas. El acceso de red del entorno debe permitir npm, GitHub, Maven/Ubuntu (Java), storage.googleapis.com
# (emulador de Firestore) y playwright.azureedge.net / cdn.playwright.dev (Chromium); si algo falla, el script avisa y
# sigue (la batería completa igual corre en GitHub en cada PR).
#
# No toca el repositorio ni la base de la obra: solo instala herramientas. Seguro de volver a correr.
set -u
PW_VER=1.56.0          # misma versión que tests/e2e/package.json (@playwright/test)
ok(){ echo "✓ $*"; }
warn(){ echo "⚠ $*" >&2; }
SUDO=""; [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null && SUDO="sudo"

# 1. Java (lo pide el emulador de Firestore)
if command -v java >/dev/null; then ok "Java ya instalado ($(java -version 2>&1 | grep -i version | head -1))"
else
  if command -v apt-get >/dev/null && $SUDO apt-get update -qq && $SUDO apt-get install -y -qq openjdk-17-jre-headless >/dev/null; then ok "Java instalado"
  else warn "No se pudo instalar Java: las pruebas de reglas solo correrán en GitHub"; fi
fi

# 2. Firebase CLI y el emulador de Firestore (queda descargado para no bajarlo en cada prueba)
if command -v firebase >/dev/null || npm install -g firebase-tools@latest --silent >/dev/null 2>&1; then
  ok "Firebase CLI $(firebase --version 2>/dev/null)"
  firebase setup:emulators:firestore >/dev/null 2>&1 && ok "Emulador de Firestore descargado" || warn "No se pudo descargar el emulador de Firestore (se intentará al probar)"
else warn "No se pudo instalar Firebase CLI"; fi

# 3. Chromium de Playwright (con sus dependencias del sistema)
if npx -y "playwright@${PW_VER}" install --with-deps chromium >/dev/null 2>&1 || npx -y "playwright@${PW_VER}" install chromium >/dev/null 2>&1; then ok "Chromium de Playwright ${PW_VER}"
else warn "No se pudo instalar Chromium de Playwright: las pruebas de interfaz solo correrán en GitHub"; fi

echo "Listo. En la sesión: cd tests/e2e && npm install (interfaz) · cd tests/rules && npm install (reglas)."
exit 0
