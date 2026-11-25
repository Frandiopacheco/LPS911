"use strict";
/* LPS 911 · Módulo Avance: cálculo del avance físico (docs/ia/avance.md). Funciones puras, sin pantalla ni base de datos.
   Planilla única (25-11-2026, decidido con el dueño): una partida es una lista de filas {id, und, q (metrado), et?}.
   - `et` = etapas de ESA fila [{id, n, w (peso)}]; sin etapas la fila se llena directo y su única «etapa» es '_'.
   - `ex` es lo ejecutado, siempre en CANTIDAD: {filaId:{etapaId|'_':{fecha|'ini':cantidad}}} ('ini' = corte inicial).
   - avance de una fila = Σ etapas (mín(ejecutado ÷ metrado, 1) × peso) ÷ Σ pesos; el % es solo otra forma de ver la cantidad.
   - un grupo (ambiente, sector, piso, partida) se pondera por metrado si todas sus filas tienen la misma unidad; si las mezcla,
     es el promedio simple de sus filas (no se suman unidades distintas). */
const AV_INI='ini',AV_E0='_';
/** número escrito por una persona: «6.5», «6,5», «50 %» o «1,473.5» (con coma y punto, la coma es de miles) */
const avNum=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;let s=String(v??'').replace(/[\s%]/g,'');s=s.includes(',')&&s.includes('.')?s.replace(/,/g,''):s.replace(',','.');const n=parseFloat(s);return Number.isFinite(n)?n:0};
/** ejecutado de una fila en una etapa; con `hasta` (fecha) solo lo registrado hasta ese día (el corte inicial siempre cuenta) */
function avAcc(ex,rowId,etId,hasta){const o=ex&&ex[rowId]&&ex[rowId][etId];if(!o)return 0;let s=0;for(const d in o)if(!hasta||d===AV_INI||d<=hasta)s+=+o[d]||0;return s}
const avCell=(ex,rowId,etId,d)=>{const o=ex&&ex[rowId]&&ex[rowId][etId];return o?+o[d]||0:0};
/** etapas de una fila: las suyas o la única implícita */
const avEtOf=row=>Array.isArray(row.et)&&row.et.length?row.et:[{id:AV_E0,n:'',w:1}];
const avHasEt=row=>Array.isArray(row.et)&&row.et.length>0;
const avSumW=row=>avEtOf(row).reduce((s,e)=>s+(+e.w>0?+e.w:0),0)||1;
/** avance de una fila (0 a 1) */
function avRowPct(ex,row,hasta){const q=+row.q||0;if(q<=0)return 0;let s=0;for(const e of avEtOf(row))s+=(+e.w>0?+e.w:0)*Math.min(avAcc(ex,row.id,e.id,hasta)/q,1);return Math.min(s/avSumW(row),1)}
/** lo que aportó un día al avance de la fila (fracción del metrado; puede pasar de lo que falta si se supera el metrado) */
function avRowDay(ex,row,d){const q=+row.q||0;if(q<=0)return 0;let s=0;for(const e of avEtOf(row))s+=(+e.w>0?+e.w:0)*avCell(ex,row.id,e.id,d);return s/avSumW(row)/q}
const avSumQ=rows=>rows.reduce((s,r)=>s+(+r.q||0),0);
const avSame=rows=>!rows.length||rows.every(r=>r.und===rows[0].und);
/** avance de un grupo de filas (0 a 1) */
function avGrpPct(ex,rows,hasta){if(!rows.length)return 0;if(avSame(rows)){const t=avSumQ(rows);return t?rows.reduce((s,r)=>s+(+r.q||0)*avRowPct(ex,r,hasta),0)/t:0}const M=rows.filter(r=>+r.q>0);/* las filas «por metrar» (sin metrado) no cuentan */return M.length?M.reduce((s,r)=>s+avRowPct(ex,r,hasta),0)/M.length:0}
/** lo que aportó un día al avance del grupo (fracción) */
function avGrpDay(ex,rows,d){if(!rows.length)return 0;if(avSame(rows)){const t=avSumQ(rows);return t?rows.reduce((s,r)=>s+(+r.q||0)*avRowDay(ex,r,d),0)/t:0}const M=rows.filter(r=>+r.q>0);return M.length?M.reduce((s,r)=>s+avRowDay(ex,r,d),0)/M.length:0}
/** cambia el peso de una etapa a `pct` (0–100) y reparte el resto entre las demás en la proporción que tenían → etapas nuevas con pesos que suman 100 */
function avSetW(et,id,pct){const L=et.map(e=>({...e,w:+e.w>0?+e.w:0})),e=L.find(x=>x.id===id);if(!e||L.length<2||!(pct>0)||pct>=100)return L;const ot=L.filter(x=>x!==e),so=ot.reduce((s,x)=>s+x.w,0);
  ot.forEach(x=>x.w=Math.round((so?x.w/so:1/ot.length)*(100-pct)*100)/100);e.w=Math.round(pct*100)/100;return L}
/** lee un texto CSV o pegado de Excel (coma, punto y coma o tabulación; comillas dobles) → filas de celdas */
function avCsv(txt){txt=String(txt||'').replace(/^﻿/,'');const first=txt.split(/\r?\n/)[0]||'';const sep=first.includes('\t')?'\t':(first.split(';').length>first.split(',').length?';':',');
  const out=[];let row=[],cur='',q=false;for(let i=0;i<txt.length;i++){const c=txt[i];
    if(q){if(c==='"'){if(txt[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}
    else if(c==='"'&&cur==='')q=true;else if(c===sep){row.push(cur);cur=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&txt[i+1]==='\n')i++;row.push(cur);cur='';out.push(row);row=[]}else cur+=c}
  if(cur!==''||row.length){row.push(cur);out.push(row)}return out.map(r=>r.map(x=>x.trim())).filter(r=>r.some(x=>x!==''))}
