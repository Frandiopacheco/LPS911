"use strict";
/* LPS 911 · Módulo Avance: cálculo del avance físico (docs/ia/avance.md). Funciones puras, sin pantalla ni base de datos:
   - una partida tiene etapas con peso (suman 100) y filas (ítem × ambiente × ubicación) con su metrado `q`;
   - `ex` es lo ejecutado: {filaId:{etapaId:{fecha|'ini':cantidad}}} ('ini' = corte inicial, lo hecho antes del registro diario);
   - avance de una fila = Σ etapas (mín(ejecutado ÷ metrado, 1) × peso ÷ 100); un grupo (ambiente, piso, partida) se pondera por metrado. */
const AV_INI='ini';
/** número escrito por una persona: «6.5», «6,5» o «1,473.5» (con coma y punto, la coma es de miles) */
const avNum=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;let s=String(v??'').replace(/\s/g,'');s=s.includes(',')&&s.includes('.')?s.replace(/,/g,''):s.replace(',','.');const n=parseFloat(s);return Number.isFinite(n)?n:0};
/** ejecutado de una fila en una etapa; con `hasta` (fecha) solo lo registrado hasta ese día (el corte inicial siempre cuenta) */
function avAcc(ex,rowId,etId,hasta){const o=ex&&ex[rowId]&&ex[rowId][etId];if(!o)return 0;let s=0;for(const d in o)if(!hasta||d===AV_INI||d<=hasta)s+=+o[d]||0;return s}
const avCell=(ex,rowId,etId,d)=>{const o=ex&&ex[rowId]&&ex[rowId][etId];return o?+o[d]||0:0};
/** avance ponderado de una fila (0 a 1) */
function avRowPct(et,ex,row,hasta){const q=+row.q||0;if(q<=0)return 0;let s=0;for(const e of et)s+=Math.min(avAcc(ex,row.id,e.id,hasta)/q,1)*(+e.peso||0)/100;return Math.min(s,1)}
const avSumQ=rows=>rows.reduce((s,r)=>s+(+r.q||0),0);
/** avance ponderado por metrado de un grupo de filas (0 a 1) */
function avGrpPct(et,ex,rows,hasta){const t=avSumQ(rows);return t?rows.reduce((s,r)=>s+(+r.q||0)*avRowPct(et,ex,r,hasta),0)/t:0}
/** avance de UNA etapa en un grupo de filas (0 a 1), topado en el metrado de cada fila */
function avEtPct(ex,rows,etId){const t=avSumQ(rows);return t?rows.reduce((s,r)=>s+Math.min(avAcc(ex,r.id,etId),+r.q||0),0)/t:0}
/** llegado de un grupo (0 a 1), topado en el metrado de cada fila */
function avLlPct(rows){const t=avSumQ(rows);return t?rows.reduce((s,r)=>s+Math.min(+r.ll||0,+r.q||0),0)/t:0}
/** ¿los pesos de las etapas suman 100? (tolerancia por decimales) */
const avPesosOk=et=>Array.isArray(et)&&et.length>0&&Math.abs(et.reduce((s,e)=>s+(+e.peso||0),0)-100)<0.01;
/** global que mezcla partidas: Σ (avance × peso) ÷ Σ pesos de las partidas con metrado (no se suman unidades distintas) */
function avGlobal(list){let w=0,s=0;for(const x of list){if(!(x.peso>0)||!x.has)continue;w+=x.peso;s+=x.pct*x.peso}return w?s/w:0}
/** plantillas de fábrica (se duplican y se editan) */
const AV_TPL=[{nom:'Mobiliario',und:'und',sum:true,ubi:[],et:[['Instalación',100]]},{nom:'Pintura',und:'m²',sum:false,ubi:['Muro','Cielo raso'],et:[['Empaste',40],['1.ª mano',30],['2.ª mano',30]]},
  {nom:'Enchape',und:'m²',sum:false,ubi:['Muro','Piso'],et:[['Colocación',80],['Fragua',20]]},{nom:'Cubículos',und:'und',sum:true,ubi:[],et:[['Estructura',40],['Paneles',40],['Puertas y accesorios',20]]}];
/** lee un texto CSV o pegado de Excel (coma, punto y coma o tabulación; comillas dobles) → filas de celdas */
function avCsv(txt){txt=String(txt||'').replace(/^﻿/,'');const first=txt.split(/\r?\n/)[0]||'';const sep=first.includes('\t')?'\t':(first.split(';').length>first.split(',').length?';':',');
  const out=[];let row=[],cur='',q=false;for(let i=0;i<txt.length;i++){const c=txt[i];
    if(q){if(c==='"'){if(txt[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}
    else if(c==='"'&&cur==='')q=true;else if(c===sep){row.push(cur);cur=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&txt[i+1]==='\n')i++;row.push(cur);cur='';out.push(row);row=[]}else cur+=c}
  if(cur!==''||row.length){row.push(cur);out.push(row)}return out.map(r=>r.map(x=>x.trim())).filter(r=>r.some(x=>x!==''))}
