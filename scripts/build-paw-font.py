"""Build "Malilion Paw" — the 碼力獅 cute display face.

Starts from Fredoka (SIL OFL 1.1, rounded and friendly) and swaps every round
dot — the tittles on i/j and the dots in . : ; ! ? … — for a little paw print.
Also adds a standalone paw glyph at U+E000.

    python3 scripts/build-paw-font.py

Needs fonttools + brotli (`pip install fonttools brotli`). Writes the woff2
files to src/fonts/. The Fredoka source is downloaded once into scripts/.cache.
"""

import math
import urllib.request
from pathlib import Path

from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / 'scripts' / '.cache'
OUT = ROOT / 'src' / 'fonts'
SOURCE_URL = 'https://github.com/google/fonts/raw/main/ofl/fredoka/Fredoka%5Bwdth,wght%5D.ttf'

FAMILY = 'Malilion Paw'
WEIGHTS = {500: 'Medium', 700: 'Bold'}
DOTTED = ['i', 'j', 'period', 'colon', 'semicolon', 'exclam', 'question', 'ellipsis',
          'exclamdown', 'questiondown', 'periodcentered']
PAW_CODEPOINT = 0xE000
# Paw width relative to the dot it replaces — a touch bigger so the toes read.
PAW_SCALE = 1.45


def ellipse(pen, cx, cy, rx, ry, tilt=0.0, segments=8):
    """A closed all-off-curve TrueType ellipse, clockwise (outer contour)."""
    k = 1 / math.cos(math.pi / segments)
    cos_t, sin_t = math.cos(tilt), math.sin(tilt)
    points = []
    for i in range(segments):
        a = -2 * math.pi * i / segments
        x, y = rx * k * math.cos(a), ry * k * math.sin(a)
        points.append((round(cx + x * cos_t - y * sin_t), round(cy + x * sin_t + y * cos_t)))
    pen.qCurveTo(*points, None)
    pen.closePath()


def draw_paw(pen, cx, cy, size):
    """Paw print centred on (cx, cy); `size` is its overall width."""
    s = size
    # Main pad: slightly wider than tall, sitting low.
    ellipse(pen, cx, cy - 0.19 * s, 0.29 * s, 0.23 * s)
    # Four toe beans fanned over the top, outer ones tilted outward.
    for x, y, tilt in ((-0.37, 0.10, 0.35), (-0.13, 0.28, 0.1), (0.13, 0.28, -0.1), (0.37, 0.10, -0.35)):
        ellipse(pen, cx + x * s, cy + y * s, 0.105 * s, 0.135 * s, math.pi / 2 + tilt, segments=8)


def contours_of(glyph_set, name):
    rec = DecomposingRecordingPen(glyph_set)
    glyph_set[name].draw(rec)
    contours, current = [], []
    for op, args in rec.value:
        current.append((op, args))
        if op in ('closePath', 'endPath'):
            contours.append(current)
            current = []
    return contours


def bounds(contour):
    pts = [pt for _, args in contour for pt in args if pt is not None]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def is_dot(box):
    w, h = box[2] - box[0], box[3] - box[1]
    return w < 200 and h < 200 and abs(w - h) < 25


def replay(pen, contour, dx):
    for op, args in contour:
        moved = tuple(None if p is None else (p[0] + dx, p[1]) for p in args)
        getattr(pen, op)(*moved)


def pawify(font):
    glyph_set = font.getGlyphSet()
    glyf, hmtx = font['glyf'], font['hmtx']
    new_glyphs = {}
    for name in DOTTED:
        if name not in glyph_set:
            continue
        contours = contours_of(glyph_set, name)
        boxes = [bounds(c) for c in contours]
        dots = sorted((i for i, b in enumerate(boxes) if is_dot(b)), key=lambda i: boxes[i][0])
        if not dots:
            continue
        dot_w = boxes[dots[0]][2] - boxes[dots[0]][0]
        grow = round(dot_w * (PAW_SCALE - 1))

        # Group dots into columns (a colon's two dots share one), left to right.
        columns = []
        for i in dots:
            if columns and boxes[i][0] < boxes[columns[-1][0]][2]:
                columns[-1].append(i)
            else:
                columns.append([i])

        def shift_for(box):
            # Each column widens by `grow`: pieces sitting over/under a column move
            # with its centre, pieces to the right of it move by its full growth.
            for k, col in enumerate(columns):
                cx0, cx1 = boxes[col[0]][0], boxes[col[0]][2]
                if box[0] < cx1 and box[2] > cx0:
                    return grow * k + grow / 2
            return grow * sum(1 for col in columns if boxes[col[0]][2] <= box[0])

        pen = TTGlyphPen(None)
        for i, contour in enumerate(contours):
            if i in dots:
                x0, y0, x1, y1 = boxes[i]
                draw_paw(pen, (x0 + x1) / 2 + shift_for(boxes[i]), (y0 + y1) / 2, dot_w * PAW_SCALE)
            else:
                replay(pen, contour, round(shift_for(boxes[i])))
        new_glyphs[name] = (pen.glyph(), hmtx[name][0] + grow * len(columns))

    for name, (glyph, advance) in new_glyphs.items():
        glyf[name] = glyph
        glyph.recalcBounds(glyf)
        hmtx[name] = (advance, glyph.xMin if glyph.numberOfContours else 0)

    # Standalone paw at U+E000, cap-height tall.
    pen = TTGlyphPen(None)
    draw_paw(pen, 400, 330, 760)
    paw = pen.glyph()
    font.setGlyphOrder(font.getGlyphOrder() + ['paw'])
    glyf['paw'] = paw
    paw.recalcBounds(glyf)
    hmtx['paw'] = (800, paw.xMin)
    for table in font['cmap'].tables:
        if table.isUnicode():
            table.cmap[PAW_CODEPOINT] = 'paw'
    font['maxp'].numGlyphs = len(font.getGlyphOrder())


def rename(font, weight, style):
    name = font['name']
    for rec in list(name.names):
        if rec.nameID in (1, 2, 3, 4, 6, 16, 17, 25):
            name.removeNames(nameID=rec.nameID)
    ps = f"MalilionPaw-{style}"
    for nid, value in {
        1: FAMILY, 2: 'Regular', 3: f'{ps};malilion', 4: f'{FAMILY} {style}',
        6: ps, 16: FAMILY, 17: style,
    }.items():
        name.setName(value, nid, 3, 1, 0x409)
    old = name.getDebugName(0) or ''
    name.setName(old + ' Malilion Paw modifications (c) Malilion.', 0, 3, 1, 0x409)
    font['OS/2'].usWeightClass = weight


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    source = CACHE / 'Fredoka.ttf'
    if not source.exists():
        urllib.request.urlretrieve(SOURCE_URL, source)

    for weight, style in WEIGHTS.items():
        font = instancer.instantiateVariableFont(TTFont(source), {'wght': weight, 'wdth': 100})
        pawify(font)
        rename(font, weight, style)

        options = Options()
        options.flavor = 'woff2'
        options.layout_features = ['*']
        options.name_IDs = ['*']
        options.notdef_outline = True
        subsetter = Subsetter(options)
        # Basic Latin, Latin-1, general punctuation, the € sign and the paw.
        subsetter.populate(unicodes=[*range(0x20, 0x7F), *range(0xA0, 0x100),
                                     *range(0x2010, 0x2027), 0x20AC, PAW_CODEPOINT])
        subsetter.subset(font)
        font.flavor = 'woff2'
        out = OUT / f'malilion-paw-{weight}.woff2'
        font.save(out)
        print(f'{out.relative_to(ROOT)}  {out.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
