#!/usr/bin/env python3
"""Propuestas de vínculos entre láminas (docs/ia/planos.md › Vínculos › Propuestas).

Lee los PDF de una especialidad (exportados de AutoCAD, con texto) y arma el JSON `lps911-vinculos` que se carga en
Planos › Cargar planos › Propuestas de vínculos. Nada se crea solo: cada propuesta la acepta o descarta una persona.

Qué detecta:
  - burbujas de corte (letra o número en círculo, fuente normal; los ejes van en negrita)  → título «CORTE X-X»
  - llamadas «SECCIÓN n», «SEC. Z», «DET. n» (texto chico)                             → título del mismo nombre (texto grande)
  - «VER … LAM AD-11»                                                                     → la lámina entera
  - «ESCALERA n» en plantas                                                               → lámina de detalle de esa escalera
El destino se elige: misma lámina > única lámina con ese título > la más cercana por número del mismo prefijo (AD/AG).
La zona del destino es el dibujo que está sobre el título (componentes conexos de la hoja rasterizada).

Uso:  python3 -I scripts/vinculos/proponer.py <carpeta con PDF> <salida.json> [--esp ARQ] [--informe informe.csv]
Requiere: pymupdf, numpy, scipy.
"""
import sys, os, re, json, glob, csv, unicodedata, argparse
import pymupdf as fitz
import numpy as np
from scipy import ndimage

def norm(s):
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', s.upper()).strip()

def fixname(n):
    """los .zip de Windows traen «#U00d3» en vez de «Ó»"""
    return re.sub(r'#U([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), n)

TITLE_MIN = 13.5
R_CORTE = re.compile(r'^CORTE\s+([A-Z0-9]{1,2})(?:\s*-\s*([A-Z0-9]{1,2}))?$')
R_SEC = re.compile(r'^(?:SECCION|SEC\.?)\s*([A-Z0-9]{1,3})$')
R_DET = re.compile(r"^DET(?:ALLE|\.)?\s*([A-Z]|\d{1,2}(?:\.\d)?|[A-Z]\d{1,2})'?(?:\s*-\s*[A-Z0-9]{1,3})?$")
R_ELEV = re.compile(r'^ELEVACION\s+([A-Z0-9]{1,2})(?:\s*-\s*[A-Z0-9]{1,2})?$')
R_LAM = re.compile(r'L[AÁ]M(?:INA)?\.?\s*([A-Z]{1,3})\s*-?\s*(\d{1,3})')
R_ESC = re.compile(r'^ESCALERA\s+(\d{1,2})$')
R_BUB = re.compile(r'^([A-Z]|\d{1,2})$')

def key_of(t):
    t = norm(t)
    m = R_CORTE.match(t)
    if m and (not m.group(2) or m.group(2) == m.group(1)): return 'CORTE:' + m.group(1), 'Corte ' + m.group(1)
    m = R_SEC.match(t)
    if m: return 'SEC:' + m.group(1), 'Sección ' + m.group(1)
    m = R_DET.match(t)
    if m: return 'DET:' + m.group(1), 'Det. ' + m.group(1)
    m = R_ELEV.match(t)
    if m: return 'ELEV:' + m.group(1), 'Elevación ' + m.group(1)
    return None, None

def arrow_score(p, r, size, cache):
    """marca de corte: junto a la letra hay una flecha (triángulo relleno o achurado). Se mide la tinta en un anillo alrededor,
    por sectores de 90°: los ejes (círculo con una línea) dan < 0,12; las flechas de corte > 0,3. La hoja se dibuja una vez."""
    zoom = 3.0
    if 'hi' not in cache:
        pix = p.get_pixmap(matrix=fitz.Matrix(zoom, zoom), colorspace=fitz.csGRAY, alpha=False)
        cache['hi'] = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width)
    A = cache['hi']
    cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2; R0 = size * 0.58; S = R0 * 2.2
    x0, y0 = max(0, int((cx - S) * zoom)), max(0, int((cy - S) * zoom)); x1, y1 = int((cx + S) * zoom), int((cy + S) * zoom)
    a = A[y0:y1, x0:x1] < 235
    if not a.size: return 0
    h, w = a.shape; yy, xx = np.mgrid[0:h, 0:w]; dx = (xx + x0) / zoom - cx; dy = (yy + y0) / zoom - cy
    d = np.hypot(dx, dy); ang = np.arctan2(dy, dx); ring = (d > R0 * 1.2) & (d < R0 * 1.6); best = 0
    for k in range(8):
        c = -np.pi + k * np.pi / 4; m = ring & (np.abs(np.angle(np.exp(1j * (ang - c)))) < np.pi / 4)
        if m.sum(): best = max(best, float(a[m].mean()))
    return best

def code_of(fn):
    m = re.match(r'([A-Z]{1,3})[-_ ]?(\d{1,3})', os.path.basename(fn).upper())
    return (m.group(1), int(m.group(2)), m.group(1) + m.group(2).zfill(2)) if m else (None, None, None)

def sheet_data(path):
    doc = fitz.open(path); p = doc[0]
    rot = p.rotation_matrix  # coordenadas de texto → vista (como pdf.js con escala 1)
    lines = []
    for b in p.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            sp = [s for s in l['spans'] if s['text'].strip()]
            if not sp: continue
            t = ' '.join(s['text'].strip() for s in sp)
            r = fitz.Rect(l['bbox']) * rot
            sz = max(s['size'] for s in sp)
            if sz < 2: sz = (l['bbox'][3] - l['bbox'][1]) / 1.15  # texto escalado por la matriz (p. ej. AD45): tamaño por su caja
            lines.append({'t': t, 'n': norm(t), 'size': sz,
                          'bold': any('Bold' in s['font'] or s['flags'] & 16 for s in sp), 'r': r})
    # hojas exportadas con el dibujo chico dentro (p. ej. AD45): se reescalan los tamaños según el código del rótulo (≈ 57 pt)
    big = max((l['size'] for l in lines), default=0)
    if big < 5: lines = []   # el dibujo ocupa unos milímetros de la hoja (exportación con objetos lejanos): no se puede usar
    elif big < 30:
        f = 57.0 / big
        for l in lines: l['size'] *= f
    W, H = p.rect.width, p.rect.height
    return doc, p, lines, W, H

def drawing_zone(p, title, W, H, cache):
    """el dibujo encima del título: componentes conexos de la hoja a ~18 dpi"""
    if 'lab' not in cache:
        sc = 0.25
        pix = p.get_pixmap(matrix=fitz.Matrix(sc, sc), colorspace=fitz.csGRAY, alpha=False)
        a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width)
        ink = a < 215
        ink = ndimage.binary_dilation(ink, iterations=3)
        lab, n = ndimage.label(ink)
        cache.update(lab=lab, sc=sc, objs=ndimage.find_objects(lab), shape=ink.shape)
    lab, sc, objs, (h, w) = cache['lab'], cache['sc'], cache['objs'], cache['shape']
    tx0, ty0, tx1, ty1 = [int(v * sc) for v in (title.x0, title.y0, title.x1, title.y1)]
    band = lab[max(0, ty0 - 15):max(1, ty0 + 1), max(0, tx0 - 4):min(w, tx1 + 30)]
    ids = set(np.unique(band)) - {0}
    box = None
    for i in ids:
        sl = objs[i - 1]
        bh, bw = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if bw * bh > 0.35 * w * h or bw > 0.9 * w or bh > 0.9 * h: continue  # el marco u otra cosa enorme
        r = (sl[1].start, sl[0].start, sl[1].stop, sl[0].stop)
        box = r if box is None else (min(box[0], r[0]), min(box[1], r[1]), max(box[2], r[2]), max(box[3], r[3]))
    if box is None or (box[2] - box[0]) * (box[3] - box[1]) < 400:
        return [title.x0 - 120, title.y0 - 500, title.x1 + 500, title.y1 + 30], False
    z = [box[0] / sc, box[1] / sc, box[2] / sc, max(box[3] / sc, title.y1 + 10)]
    return [max(0, z[0]), max(0, z[1]), min(W, z[2]), min(H, z[3])], True

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('carpeta'); ap.add_argument('salida'); ap.add_argument('--esp', default='ARQ'); ap.add_argument('--informe')
    A = ap.parse_args()
    files = sorted(glob.glob(os.path.join(A.carpeta, '*.pdf')))
    S = {}
    for f in files:
        pre, num, cod = code_of(f)
        if not cod: print('sin código:', f, file=sys.stderr); continue
        doc, p, lines, W, H = sheet_data(f)
        if not lines: print('sin texto utilizable (¿dibujo diminuto en la hoja?):', os.path.basename(f), file=sys.stderr)
        S[cod] = dict(f=f, pre=pre, num=num, cod=cod, archivo=fixname(os.path.basename(f))[:-4], tit=norm(os.path.basename(f)),
                      fam=re.sub(r'\s*(REV\s*\d+|-MODEL|\.PDF)', '', norm(fixname(os.path.basename(f))).split('_', 1)[-1].split('-', 1)[-1] if '_' in os.path.basename(f) else ''),
                      doc=doc, p=p, lines=lines, W=W, H=H, cache={})
    # títulos (destinos)
    T = {}
    def is_title(s, l):
        if l['size'] >= 17: return True
        if l['size'] < 11: return False
        r = l['r']  # título de detalle: debajo lleva la escala («ESC:1/2.5», «ESC. 1/20»)
        return any(x['n'].startswith('ESC') and 0 <= x['r'].y0 - r.y1 < 3 * r.height and x['r'].x0 < r.x1 + r.height and x['r'].x1 > r.x0 - r.height for x in s['lines'])
    for s in S.values():
        for l in s['lines']:
            l['title'] = is_title(s, l)
            if not l['title']: continue
            k, lbl = key_of(l['t'])
            if k: T.setdefault(k, []).append((s['cod'], l))
    # escaleras: qué lámina de detalle tiene cada escalera
    ESC = {}
    for s in S.values():
        if 'ESCALERA' not in s['tit']: continue
        for l in s['lines']:
            m = R_ESC.match(l['n'])
            if m: ESC.setdefault(m.group(1), set()).add(s['cod'])

    def pick(k, s, bubble=False):
        """destino de una llamada: misma lámina > lámina de cortes (desde plantas) > secciones de AG en AD > la más cercana por número"""
        C = T.get(k, [])
        if not C: return None
        same = [c for c in C if c[0] == s['cod']]
        if same: return same, 0.9, 'en la misma lámina'
        sheets = sorted(set(c[0] for c in C))
        plan = 'PLANTA' in s['tit']
        if bubble and plan:
            fam = [c for c in sheets if S[c]['tit'].split('_', 1)[-1].startswith('CORTES')]
            if len(fam) == 1: return [c for c in C if c[0] == fam[0]], 0.9, 'título en ' + fam[0]
        # las secciones constructivas que llaman los cortes y plantas generales (AG) están en otra serie (AD)
        if k.startswith('SEC:') and s['pre'] == 'AG' and len(sheets) == 1:
            return [c for c in C if c[0] == sheets[0]], 0.85, 'título en ' + sheets[0]
        # una lámina con sus propios detalles titulados solo remite a detalles de otra lámina de su misma serie
        if k.startswith('DET:') and any(l.get('title') and key_of(l['t'])[0] and key_of(l['t'])[0].startswith('DET:') for l in s['lines']) \
                and not any(S[c]['fam'] == s['fam'] for c in sheets): return None
        maxd = 2 if bubble or k.startswith('ELEV:') else 3 if k.startswith('DET:') else 6
        fam = lambda c: S[c]['fam'] == s['fam'] and abs(S[c]['num'] - s['num']) <= 8   # misma serie (p. ej. SECCIONES CONSTRUCTIVAS)
        near = [c for c in sheets if S[c]['pre'] == s['pre'] and (abs(S[c]['num'] - s['num']) <= maxd or fam(c))]
        if not near: return None
        d = min(abs(S[c]['num'] - s['num']) for c in near)
        best = [c for c in near if abs(S[c]['num'] - s['num']) == d]
        if len(best) > 1: return None
        b0 = best[0]
        c = 0.8 if len(sheets) == 1 and d <= 2 else 0.7 if d <= 1 else 0.55
        return [x for x in C if x[0] == b0], c, f'título en {b0}' + (f' (la más cercana de {len(sheets)} con ese título)' if len(sheets) > 1 else '')

    out, rows = [], []
    for s in S.values():
        L = []
        def add(r, to, ar, t, c, m):
            L.append({'r': [round(v, 1) for v in r], 'a': to, **({'ar': [round(v, 1) for v in ar]} if ar else {}), 't': t, 'c': c, 'm': m})
            rows.append([s['cod'], t, to, c, m])
        for l in s['lines']:
            r = l['r']
            # burbuja de corte
            mb = R_BUB.match(l['n'])
            if mb and not l['bold'] and 9 < l['size'] < 17 and ('PLANTA' in s['tit'] or arrow_score(s['p'], r, l['size'], s['cache']) >= 0.3):
                k = 'CORTE:' + mb.group(1)
                res = pick(k, s, bubble=True)
                if res:
                    C, c, why = res; dc, tl = C[0]
                    cx, cy, R = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, l['size'] * 1.3
                    zone, ok = drawing_zone(S[dc]['p'], tl['r'], S[dc]['W'], S[dc]['H'], S[dc]['cache'])
                    add([cx - R, cy - R, cx + R, cy + R], dc, zone, 'Corte ' + mb.group(1), round(c * (1 if ok else 0.9), 2), 'burbuja de corte → ' + why)
                continue
            if not l['title']:
                k, lbl = key_of(l['t'])
                if k and not k.startswith('CORTE:'):
                    res = pick(k, s)
                    if res:
                        C, c, why = res; dc, tl = C[0]
                        if len(C) > 1 and dc == s['cod']:  # mismo título repetido en la lámina: no se adivina
                            c = min(c, 0.5)
                        zone, ok = drawing_zone(S[dc]['p'], tl['r'], S[dc]['W'], S[dc]['H'], S[dc]['cache'])
                        pad = 6
                        add([r.x0 - pad, r.y0 - pad, r.x1 + pad, r.y1 + pad], dc, zone, lbl, round(c * (1 if ok else 0.9), 2), 'llamada ' + l['t'] + ' → ' + why)
                    continue
            ml = R_LAM.search(l['n'])
            if ml:
                to = ml.group(1) + ml.group(2).zfill(2)
                if to in S and to != s['cod']:
                    add([r.x0 - 4, r.y0 - 4, r.x1 + 4, r.y1 + 4], to, None, 'Lám. ' + to, 0.95, 'texto «' + l['t'][:60] + '»')
                continue
            me = R_ESC.match(l['n'])
            if me and 'ESCALERA' not in s['tit'] and me.group(1) in ESC:
                to = sorted(ESC[me.group(1)], key=lambda c: S[c]['num'])[0]
                add([r.x0 - 6, r.y0 - 6, r.x1 + 6, r.y1 + 6], to, None, 'Escalera ' + me.group(1), 0.7, f'rótulo ESCALERA {me.group(1)} → detalle en {to}')
        s['cache'].pop('hi', None)
        if L:
            out.append({'archivo': s['archivo'], 'cod': s['cod'], 'esp': A.esp, 'pt': [round(s['W'], 1), round(s['H'], 1)], 'vinculos': L})
    J = {'formato': 'lps911-vinculos', 'v': 1, 'origen': 'Claude', 'esp': A.esp, 'laminas': out}
    with open(A.salida, 'w', encoding='utf-8') as fh: json.dump(J, fh, ensure_ascii=False, indent=1)
    if A.informe:
        with open(A.informe, 'w', newline='', encoding='utf-8-sig') as fh:
            w = csv.writer(fh); w.writerow(['lamina_origen', 'llamada', 'lamina_destino', 'confianza', 'motivo']); w.writerows(rows)
    print(f'{sum(len(x["vinculos"]) for x in out)} propuestas en {len(out)} láminas', file=sys.stderr)

if __name__ == '__main__':
    main()
