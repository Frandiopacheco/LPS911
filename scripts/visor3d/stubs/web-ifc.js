// Sustituto liviano de web-ifc SOLO para visor3d.js. That Open Components lo importa por dentro (IfcLoader, IDS…), pero el visor no usa
// esas partes: la conversión de IFC va en ifc-import.js, que sí lleva el web-ifc real (el mismo 0.0.77 que espera Fragments 3.4.8).
export const IFCCLASSIFICATION = 0, IFCCLASSIFICATIONREFERENCE = 0, LogLevel = {};
export class IfcAPI { constructor() { throw new Error('web-ifc no va en visor3d.js: la conversión de IFC está en ifc-import.js') } }
