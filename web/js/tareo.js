"use strict";
/* LPS 911 · Módulo Tareo (personal obrero del consorcio): vistas Tareos del día, Personal, Partidas de control y Configuración.
   Marcador de la fase 0 (docs/ia/tareo.md): lo reemplaza el archivo completo del módulo.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */
const TCOLS={tper:'tper',tpc:'tpc',tcfg:'tcfg'};
function renderTDia(m){m.innerHTML='<div class="scroll"><div class="wrap">Tareo</div></div>'}
function renderTPer(m){m.innerHTML='<div class="scroll"><div class="wrap">Tareo</div></div>'}
function renderTPc(m){m.innerHTML='<div class="scroll"><div class="wrap">Tareo</div></div>'}
function renderTCfg(m){m.innerHTML='<div class="scroll"><div class="wrap">Tareo</div></div>'}
