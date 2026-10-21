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
R_CORTE = re.compile(r'^CORTE\s+([A-Z0-9]{1,2})(?:\s*-\s*([A-Z0-9]{1,2}))?(?:\s+-\s+(.+))?$')   # «CORTE 4 - SH SALA DE CONTROL»
R_SEC = re.compile(r'^(?:SECCION|SEC\.?)\s*([A-Z0-9]{1,3})$')
R_DET = re.compile(r"^DET(?:ALLE|\.)?\s*([A-Z]|\d{1,2}(?:\.\d)?|[A-Z]\d{1,2})'?(?:\s*-\s*[A-Z0-9]{1,3})?$")
R_ELEV = re.compile(r'^ELEVACION\s+([A-Z0-9]{1,2})(?:\s*-\s*[A-Z0-9]{1,2})?$')
R_LAM = re.compile(r'L[AÁ]M(?:INA)?\.?\s*([A-Z]{1,3})\s*-?\s*(\d{1,3})')
R_ESC = re.compile(r'^ESCALERA\s+(\d{1,2})$')
R_BUB = re.compile(r'^([A-Z]|\d{1,2})$')

# --- ambientes: rótulo de la planta → lámina de detalle de ese ambiente (oct 2026) ---
R_UNID = re.compile(r'^(\d{1,2})\s*UNID\.?$')          # «1 unid.» debajo del título del ambiente en las láminas de detalle
R_SH = re.compile(r'^(?:SS?\.?\s?HH?\.?|BA[NÑ]O)\s*\.?\s*'   # SH / S.H. / SSHH / BAÑO
                  r'(H|M|V|HOM(?:BRES?)?|MUJ(?:ERES?)?|VAR(?:ONES?)?|DISC(?:APACITADOS?)?|MIXTO)?'
                  r'\.?\s*(\d{1,2})?\.?$')
PISOS = [('SOTANO', 'S'), ('1ER PISO', '1'), ('PRIMER PISO', '1'), ('2DO PISO', '2'), ('SEGUNDO PISO', '2'),
         ('3ER PISO', '3'), ('TERCER PISO', '3'), ('4TO PISO', '4'), ('CUARTO PISO', '4'), ('AZOTEA', 'A')]
GEN = {'H': 'H', 'HOM': 'H', 'HOMBRE': 'H', 'HOMBRES': 'H', 'V': 'H', 'VAR': 'H', 'VARON': 'H', 'VARONES': 'H',
       'M': 'M', 'MUJ': 'M', 'MUJER': 'M', 'MUJERES': 'M', 'DISC': 'D', 'DISCAPACITADO': 'D', 'DISCAPACITADOS': 'D'}
# palabras que no distinguen un ambiente (no sirven para emparejar por nombre)
STOP = {'SH', 'SSHH', 'BANO', 'BANOS', 'DE', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'Y', 'EN', 'PISO', 'PISOS', 'SOTANO',
        'AZOTEA', 'UNID', 'PLANTA', 'CORTE', 'ELEVACION', 'DETALLE', 'DET', 'ESC', 'NIVEL', 'TIPO', 'AREA', 'CTO',
        'CUARTO', 'SALA', 'HALL', 'CIRCULACION', 'DUCTO', 'ESCALERA', 'LOBBY', 'PLAZA', 'CORREDOR', 'ESCLUSA'}

def floors_in(t):
    """pisos nombrados en un texto («1ER PISO, 2DO PISO Y 3ER PISO» → {1,2,3})"""
    return {c for w, c in PISOS if w in t}

def words_of(t):
    return {w for w in re.split(r'[^A-Z0-9]+', t) if len(w) > 2 and w not in STOP and not w.isdigit()}

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
            lines.append({'t': t, 'n': norm(t), 'size': sz, 'gs': sz,
                          'bold': any('Bold' in s['font'] or s['flags'] & 16 for s in sp), 'r': r})
    # hojas exportadas con el dibujo chico dentro (p. ej. AD45): se reescalan los tamaños según el código del rótulo (≈ 57 pt)
    big = max((l['size'] for l in lines), default=0)
    if big < 5: lines = []   # el dibujo ocupa unos milímetros de la hoja (exportación con objetos lejanos): no se puede usar
    elif big < 30:
        f = 57.0 / big
        for l in lines: l['size'] *= f
    W, H = p.rect.width, p.rect.height
    return doc, p, lines, W, H

def drawing_zone(p, tl, W, H, cache, up=15):
    """el dibujo encima del título: componentes conexos de la hoja rasterizada. La resolución sigue al tamaño del título
    (≈ 18 dpi con títulos de 18 pt; más fina en láminas de dibujos chicos, p. ej. baños con títulos de 6 pt, para no unirlos)"""
    title = tl['r']; sc = round(0.25 * max(1.0, min(4.0, 18.0 / max(tl.get('gs', 18), 1))), 3)
    key = 'lab%.3f' % sc
    if key not in cache:
        pix = p.get_pixmap(matrix=fitz.Matrix(sc, sc), colorspace=fitz.csGRAY, alpha=False)
        a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width)
        ink = ndimage.binary_dilation(a < 215, iterations=3)
        lab, n = ndimage.label(ink)
        cache[key] = (lab, ndimage.find_objects(lab), ink.shape)
    lab, objs, (h, w) = cache[key]
    tx0, ty0, tx1, ty1 = [int(v * sc) for v in (title.x0, title.y0, title.x1, title.y1)]
    band = lab[max(0, ty0 - up):max(1, ty0 + 1), max(0, tx0 - 4):min(w, tx1 + 30)]
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

def blocks_of(lines, sel, gap=1.6):
    """junta en un bloque las líneas de `sel` que van una debajo de otra, en la misma columna y del mismo tamaño
    (los rótulos de las plantas vienen partidos: «SALA DE» / «CONTROL Y» / «MONITOREO»)"""
    L = sorted(sel, key=lambda l: (round(l['r'].y0, 1), l['r'].x0))
    B, used = [], set()
    for l in L:
        if id(l) in used: continue
        used.add(id(l)); grp = [l]
        while True:
            last = grp[-1]; h = max(last['r'].height, 1)
            nxt = [o for o in L if id(o) not in used and abs(o['size'] - last['size']) < 0.2 * last['size']
                   and 0 <= o['r'].y0 - last['r'].y1 < gap * h
                   and abs((o['r'].x0 + o['r'].x1) / 2 - (last['r'].x0 + last['r'].x1) / 2) < 0.75 * max(last['r'].width, o['r'].width)]
            if not nxt: break
            nxt.sort(key=lambda o: o['r'].y0); used.add(id(nxt[0])); grp.append(nxt[0])
        r = grp[0]['r'].__class__(min(g['r'].x0 for g in grp), min(g['r'].y0 for g in grp),
                                 max(g['r'].x1 for g in grp), max(g['r'].y1 for g in grp))
        B.append({'t': ' '.join(g['t'] for g in grp), 'n': norm(' '.join(g['t'] for g in grp)),
                  'size': grp[0]['size'], 'gs': grp[0].get('gs', grp[0]['size']), 'r': r, 'top': grp[0], 'ls': grp})
    return B

def amb_zone(s, tl):
    """zona del ambiente en su lámina de detalle: el dibujo (la planta del baño) que está sobre el título.
    Si el dibujo toca el marco de la lámina, su componente conexo abarca la hoja entera y `drawing_zone` lo descarta:
    queda solo el propio rótulo. `amb_zones_fix` lo detecta y lo arregla (o propone la lámina entera)."""
    best = None
    for up in (15, 45):
        z, ok = drawing_zone(s['p'], tl, s['W'], s['H'], s['cache'], up=up)
        if not ok: continue
        if best is None or z[1] < best[0][1]: best = (z, ok)
        if zone_ok(z, tl): return z, ok
    return best if best else drawing_zone(s['p'], tl, s['W'], s['H'], s['cache'])

def zone_ok(z, tl):
    """la zona abarca el dibujo (sube bastante por encima del título), no solo el rótulo"""
    return tl['r'].y0 - z[1] >= 1.5 * max(tl['r'].height, 1)

GENW = {'HOMBRE': 'H', 'HOMBRES': 'H', 'VARONES': 'H', 'MUJER': 'M', 'MUJERES': 'M', 'DISCAPACITADOS': 'D', 'DISC': 'D'}

def owned_labels(s, a, T):
    """rótulos que están dentro del dibujo de este ambiente: en estas láminas cada dibujo lleva su título debajo,
    así que un texto pertenece al dibujo cuyo título es el primero que aparece debajo de él, en su misma columna."""
    out = []
    for l in s['lines']:
        if l.get('title') or l['size'] < 4: continue
        W = {w for w in re.split(r'[^A-Z]+', l['n']) if len(w) > 2}
        if not (W & a['words']) and not ({GENW[w] for w in W if w in GENW} & a['gens']): continue
        if l['r'].y1 >= a['tl']['r'].y0: continue
        below = [t for t in T if t['r'].y0 > l['r'].y1 and t['r'].x0 < l['r'].x1 + 20 and t['r'].x1 > l['r'].x0 - 20]
        if not below: continue
        if min(below, key=lambda t: t['r'].y0) in a['tls']: out.append(l)
    return out

def has_label(z, L):
    return any(l['r'].x0 >= z[0] - 2 and l['r'].x1 <= z[2] + 2 and l['r'].y0 >= z[1] - 2 and l['r'].y1 <= z[3] + 2 for l in L)

def amb_zones_fix(A, S):
    """revisa la zona de cada ambiente. Es buena si abarca el dibujo y contiene algún rótulo del propio dibujo
    («SH MUJERES» dentro de la planta). Si no, se usa el tamaño típico de los demás ambientes de esa lámina
    (todos los baños de una lámina van a la misma escala) y, si tampoco se puede, se propone la lámina entera."""
    for cod in {a['cod'] for a in A}:
        s = S[cod]; G = [a for a in A if a['cod'] == cod]
        T = [l for l in s['lines'] if l.get('title')]
        good = []
        for a in G:
            a['lbls'] = owned_labels(s, a, T)
            if a['zok'] and zone_ok(a['zone'], a['tl']) and has_label(a['zone'], a['lbls']): good.append(a)
        med = lambda v: sorted(v)[len(v) // 2]
        if good:
            bw = med([a['zone'][2] - a['zone'][0] for a in good]); bh = med([a['zone'][3] - a['zone'][1] for a in good])
        for a in G:
            if a in good: continue
            z = None
            if good:
                r = a['tl']['r']; cx = (r.x0 + r.x1) / 2
                z = [max(0, cx - bw / 2), max(0, r.y1 + 10 - bh), min(s['W'], cx + bw / 2), min(s['H'], r.y1 + 10)]
                if a['lbls'] and not has_label(z, a['lbls']): z = None
            if z is None or (z[2] - z[0]) * (z[3] - z[1]) > 0.45 * s['W'] * s['H']:
                a['zone'], a['zok'], a['zfix'] = None, False, True    # sin zona confiable: la lámina entera
            else:
                a['zone'], a['zok'], a['zfix'] = z, True, True

def amb_index(S):
    """ambientes dibujados en las láminas de detalle: el título que lleva «N unid.» debajo. De
    «SH HOMBRE MUJERES Y DISCAPACITADOS 1 - 1ER PISO, 2DO PISO Y 3ER PISO» saca pisos {1,2,3}, grupo 1 y géneros {H,M,D}."""
    A = []
    for s in S.values():
        if 'PLANTA' in s['tit']: continue
        for u in s['lines']:
            if not R_UNID.match(u['n']): continue
            sl = max(30.0, 3 * u['r'].height)   # el «1 unid.» va corrido respecto al título: basta que se solapen en x
            up = [l for l in s['lines'] if l is not u and l.get('title') and l['size'] >= 11
                  and not key_of(l['t'])[0] and l['r'].x0 < u['r'].x1 + sl and l['r'].x1 > u['r'].x0 - sl
                  and 0 < u['r'].y0 - l['r'].y0 < 5 * max(u['r'].height, 1)]
            if not up: continue
            up.sort(key=lambda l: l['r'].y0)
            name = norm(' '.join(l['t'] for l in up))
            # por ahora solo baños (y los camerinos/vestuarios, que van en las mismas láminas de detalle)
            if not re.search(r'\bS\.?S?\.?HH?\.?\b|\bBA[NÑ]O|\bCAMERIN|\bVESTUARIO', name): continue
            head = re.split(r'\s+-\s+|\s-\s|,', name)[0]
            mg = re.search(r'\b(\d{1,2})\s*$', head)
            gens = {GEN[w] for w in re.split(r'[^A-Z]+', name) if w in GEN}
            A.append({'cod': s['cod'], 'name': name, 'head': head, 'pis': floors_in(name), 'num': mg.group(1) if mg else None,
                      'sh': bool(re.search(r'\bS\.?S?\.?HH?\.?\b|\bBA[NÑ]O', name)),
                      'gens': gens, 'words': words_of(head), 'tl': up[0], 'tls': up, 'n': int(R_UNID.match(u['n']).group(1))})
    for a in A:
        a['zone'], a['zok'] = amb_zone(S[a['cod']], a['tl'])
    amb_zones_fix(A, S)
    return A

def amb_match(lbl, pis, A):
    """a qué ambiente de detalle remite un rótulo de la planta. Devuelve (ambiente, confianza, motivo) o None."""
    C = [a for a in A if not a['pis'] or not pis or (pis & a['pis'])]
    if not C: return None
    m = R_SH.match(lbl)
    if m:   # «SH H. 1», «SH M. 2», «SH DISC.»
        g = GEN.get((m.group(1) or '').rstrip('.'), None); num = m.group(2)
        H = [a for a in C if (not g or g in a['gens']) and (not num or a['num'] == num)]
        if len(H) > 1 and any(a['sh'] for a in H): H = [a for a in H if a['sh']]   # «SH H» es un baño, no el camerino de al lado
        if len(H) > 1 and not num:   # «SH H.» sin número no es el grupo «SH H. 1»: gana el ambiente sin número de grupo
            H2 = [a for a in H if not a['num']]
            if len(H2) == 1: return H2[0], 0.7, f"baño sin número de grupo en «{H2[0]['name'][:46]}»"
        if len(H) == 1:
            return H[0], (0.85 if num and g else 0.75), f"baño {('grupo ' + num + ' ') if num else ''}en «{H[0]['name'][:46]}»"
        return None
    W = words_of(lbl)   # rótulo con nombre propio: «LACTARIO», «GARITA 2», «SALA DE CONTROL Y MONITOREO»
    if not W: return None
    H = [a for a in C if W <= a['words']]
    nm = re.search(r'\b(\d{1,2})\b', lbl)   # «GARITA 1» y «GARITA 2» se distinguen por el número
    if nm: H = [a for a in H if re.search(r'\b' + nm.group(1) + r'\b', a['head'])]
    if len(H) != 1: return None
    return H[0], 0.8, f"el baño de «{H[0]['name'][:46]}»"

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
    # ambientes con lámina de detalle propia (hoy: baños)
    AMB = amb_index(S)

    def best_of(C, s, r):
        """varios títulos iguales en la lámina («CORTE 4 - SH LACTARIO», «CORTE 4 - SH SALA DE CONTROL»): gana el que comparte
        palabras con el nombre del dibujo junto a la llamada (el texto con varias palabras más cercano); si no, el más cercano"""
        if len(C) < 2: return C
        cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
        ctx = [l for l in s['lines'] if len(l['n'].split()) >= 2 and not key_of(l['t'])[0] and l['size'] >= 5]
        ctx.sort(key=lambda l: (l['r'].x0 + l['r'].x1 - 2 * cx) ** 2 + (l['r'].y0 + l['r'].y1 - 2 * cy) ** 2)
        words = set(w for l in ctx[:2] for w in l['n'].split() if len(w) > 2) - {'PISO', 'NIVEL', 'ESC.', 'UNID.'}
        def sc(c):
            tw = set(w for w in c[1]['n'].split() if len(w) > 2) - {'CORTE'}
            d = ((c[1]['r'].x0 - cx) ** 2 + (c[1]['r'].y0 - cy) ** 2) ** 0.5
            return (-len(tw & words), d)
        return sorted(C, key=sc)

    def pick(k, s, bubble=False):
        """destino de una llamada: misma lámina > lámina de cortes (desde plantas) > secciones de AG en AD > la más cercana por número"""
        C = T.get(k, [])
        if not C: return None
        same = [c for c in C if c[0] == s['cod']]
        if same: return same, (0.9 if len(same) == 1 else 0.75), 'en la misma lámina'
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
        # marcas dobles (rombo con dos números, p. ej. 4|3 en los baños): dos letras/números sueltos pegados son una marca de corte
        cand = [l for l in s['lines'] if R_BUB.match(l['n']) and not l['bold'] and 9 < l['size'] < 17]
        cen = lambda l: ((l['r'].x0 + l['r'].x1) / 2, (l['r'].y0 + l['r'].y1) / 2)
        for l in cand:
            a = cen(l); l['pair'] = any(o is not l and abs(o['gs'] - l['gs']) < 0.25 * l['gs'] and ((cen(o)[0] - a[0]) ** 2 + (cen(o)[1] - a[1]) ** 2) ** 0.5 < 2.6 * l['gs'] for o in cand)
        def add(r, to, ar, t, c, m):
            L.append({'r': [round(v, 1) for v in r], 'a': to, **({'ar': [round(v, 1) for v in ar]} if ar else {}), 't': t, 'c': c, 'm': m})
            rows.append([s['cod'], t, to, c, m])
        # rótulo de ambiente en una planta → su lámina de detalle (hoy: baños). El rótulo puede venir partido en varias líneas.
        if 'PLANTA' in s['tit'] and AMB:
            pis = floors_in(s['tit'].replace('_', ' '))
            lbl = [l for l in s['lines'] if not l.get('title') and 4 < l['size'] < 13 and len(l['n']) > 1
                   and re.match(r'^[A-Z0-9][A-Z0-9 .\'/-]*$', l['n']) and not re.match(r'^[\d .,\'/-]+$', l['n'])]
            for b in blocks_of(s['lines'], lbl):
                res = amb_match(b['n'], pis, AMB)
                if not res: continue
                a, c, why = res
                if a['cod'] == s['cod']: continue
                pad = max(2.0, 0.35 * b['r'].height)
                cz = 1 if a['zok'] and not a.get('zfix') else 0.9
                add([b['r'].x0 - pad, b['r'].y0 - pad, b['r'].x1 + pad, b['r'].y1 + pad], a['cod'], a['zone'],
                    b['t'][:40], round(c * cz, 2), 'rótulo ' + b['t'][:28] + ' → ' + why + (' (zona aproximada)' if a.get('zfix') else ''))
        for l in s['lines']:
            r = l['r']
            # burbuja de corte
            mb = R_BUB.match(l['n'])
            if mb and not l['bold'] and 9 < l['size'] < 17 and ('PLANTA' in s['tit'] or l.get('pair') or arrow_score(s['p'], r, l['gs'], s['cache']) >= 0.3):
                k = 'CORTE:' + mb.group(1)
                res = pick(k, s, bubble=True)
                if res:
                    C, c, why = res; C = best_of(C, s, r) if C[0][0] == s['cod'] else C; dc, tl = C[0]
                    cx, cy, R = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, l['gs'] * 1.3   # tamaño real en la hoja (no el reescalado)
                    zone, ok = drawing_zone(S[dc]['p'], tl, S[dc]['W'], S[dc]['H'], S[dc]['cache'])
                    add([cx - R, cy - R, cx + R, cy + R], dc, zone, 'Corte ' + mb.group(1), round(c * (1 if ok else 0.9), 2), 'burbuja de corte → ' + why + ' «' + tl['t'][:40] + '»')
                continue
            if not l['title']:
                k, lbl = key_of(l['t'])
                if k and not k.startswith('CORTE:'):
                    res = pick(k, s)
                    if res:
                        C, c, why = res; C = best_of(C, s, r) if C[0][0] == s['cod'] else C; dc, tl = C[0]
                        zone, ok = drawing_zone(S[dc]['p'], tl, S[dc]['W'], S[dc]['H'], S[dc]['cache'])
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
