"use strict";
/* LPS 911 · Arranque: conecta Firebase y abre la sesión. Va al final para que todo lo anterior ya exista..
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */
(function boot(){
  const cfg=window.FIREBASE_CONFIG;
  if(!window.firebase){fatal('No se pudo cargar Firebase. Revisa tu conexión a internet y recarga la página.');return}
  if(!cfg||!cfg.apiKey||/PEGA|TU_/i.test(cfg.apiKey)){fatal('Falta configurar Firebase: completa el archivo firebase-config.js (paso 2 de la guía).');return}
  firebase.initializeApp(cfg);auth=firebase.auth();const fdb=firebase.firestore();FDB=fdb;
  if(window.FIREBASE_EMULATOR){fdb.useEmulator('127.0.0.1',8080);auth.useEmulator('http://127.0.0.1:9099',{disableWarnings:true})}
  /* Dentro del marco de «📱 Vista celular» la app va sin caché compartida: con la caché de varias pestañas el marco quedaba
     como pestaña secundaria esperando a la ventana principal y se quedaba en «Conectando…» en la copia publicada. */
  if(window.top===window)fdb.enablePersistence({synchronizeTabs:true}).catch(()=>{});
  if(cfg.databaseURL&&/^https:\/\//.test(cfg.databaseURL)&&firebase.database){try{rtdb=firebase.database()}catch(e){rtdb=null}}
  setupLogin();
  auth.onAuthStateChanged(u=>{if(u)startSession(u,fdb);else{stopSession();showLogin(pendingMsg);pendingMsg=''}});
})();
