// Conversor IFC → .frag en el navegador (That Open Fragments + web-ifc). Lo carga visor3d.js a pedido.
import { IfcImporter } from '@thatopen/fragments';
export async function convert(file, onProgress, base) {
  const imp = new IfcImporter();
  imp.wasm = { absolute: true, path: base };
  const bytes = new Uint8Array(await file.arrayBuffer());
  return imp.process({ bytes, progressCallback: p => onProgress && onProgress(p) });
}
