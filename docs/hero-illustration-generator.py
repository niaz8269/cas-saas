"""Photoreal-style still life for the CAS hero: globe, books, cap, passport, plane,
blurred pagoda + Great Wall backdrop. Pure SVG with lighting/texture filters; render
to a raster with headless Chrome."""

W, H = 1920, 1080
defs = []
body = []
D = defs.append
B = body.append
_id = [0]


def nid(p="i"):
    _id[0] += 1
    return f"{p}{_id[0]}"


def noise(name, freq, octaves, seed, extra="", gray=True, contrast=None):
    prim = f'<feTurbulence type="fractalNoise" baseFrequency="{freq}" numOctaves="{octaves}" seed="{seed}" result="n"/>'
    if gray:
        prim += '<feColorMatrix type="saturate" values="0"/>'
    if contrast:
        s, i = contrast
        prim += f'<feComponentTransfer><feFuncR type="linear" slope="{s}" intercept="{i}"/><feFuncG type="linear" slope="{s}" intercept="{i}"/><feFuncB type="linear" slope="{s}" intercept="{i}"/></feComponentTransfer>'
    D(f'<filter id="{name}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">{prim}{extra}</filter>')


noise("nFine", 0.9, 3, 3, contrast=(1.5, -0.25))
noise("nLeather", 0.45, 4, 7, contrast=(1.7, -0.35))
noise("nWood", "0.006 0.22", 5, 11, contrast=(1.5, -0.3))
noise("nStone", 0.035, 5, 5, contrast=(1.6, -0.3))
noise("nForest", 0.12, 4, 9, contrast=(1.8, -0.4))
noise("nGrain", 0.8, 2, 21, contrast=(1.0, 0.0))
D('<filter id="clouds" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.0035 0.008" numOctaves="6" seed="14"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  2.1 0 0 0 -0.78"/><feGaussianBlur stdDeviation="3"/></filter>')
D('<filter id="land" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.0065 0.0075" numOctaves="6" seed="31"/><feColorMatrix values="0 0 0 0 0.74  0 0 0 0 0.66  0 0 0 0 0.44  13 0 0 0 -6.7"/></filter>')
D('<filter id="landTint" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" seed="8"/><feColorMatrix values="0.5 0 0 0 0.35  0 0.5 0 0 0.45  0 0 0.3 0 0.2  0 0 0 0 1"/></filter>')
D('<filter id="rough" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="4" seed="5" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="26" xChannelSelector="R" yChannelSelector="G"/></filter>')
for n, s in (("b1", 1.2), ("b2", 2.4), ("b3", 4), ("b4", 7), ("b6", 11)):
    D(f'<filter id="{n}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="{s}"/></filter>')
D('<filter id="shadowBig" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="22"/></filter>')
D('<filter id="shadowSm" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="9"/></filter>')

D('<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fa8d6"/><stop offset="0.45" stop-color="#b9d0e8"/><stop offset="0.8" stop-color="#e6eef4"/><stop offset="1" stop-color="#f3efe4"/></linearGradient>')
D('<radialGradient id="sun" cx="0.2" cy="0.22" r="0.55"><stop offset="0" stop-color="#fff6dc" stop-opacity="0.95"/><stop offset="0.35" stop-color="#ffeec2" stop-opacity="0.35"/><stop offset="1" stop-color="#ffeec2" stop-opacity="0"/></radialGradient>')
D('<linearGradient id="mA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a7bdd6"/><stop offset="1" stop-color="#c9d7e2"/></linearGradient>')
D('<linearGradient id="mB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fa3a8"/><stop offset="1" stop-color="#b5cbd0"/></linearGradient>')
D('<linearGradient id="mC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#58856f"/><stop offset="1" stop-color="#8fb09f"/></linearGradient>')
D('<linearGradient id="mD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f6d54"/><stop offset="1" stop-color="#6a9378"/></linearGradient>')
D('<linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef3f2" stop-opacity="0"/><stop offset="1" stop-color="#eef3f2" stop-opacity="0.75"/></linearGradient>')
D('<linearGradient id="deskG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a6140"/><stop offset="0.35" stop-color="#6d4a30"/><stop offset="1" stop-color="#2c1b10"/></linearGradient>')
D('<linearGradient id="deskSheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.35" stop-color="#ffe9c4" stop-opacity="0.22"/><stop offset="0.7" stop-color="#fff" stop-opacity="0"/></linearGradient>')
D('<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e2a0"/><stop offset="0.35" stop-color="#c79b3d"/><stop offset="0.6" stop-color="#8c6420"/><stop offset="0.85" stop-color="#d9b25a"/><stop offset="1" stop-color="#8c6420"/></linearGradient>')
D('<linearGradient id="goldV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a5719"/><stop offset="0.3" stop-color="#f1d98d"/><stop offset="0.55" stop-color="#c79b3d"/><stop offset="1" stop-color="#6b4912"/></linearGradient>')
D('<radialGradient id="ocean" cx="0.34" cy="0.3" r="0.9"><stop offset="0" stop-color="#3f86c2"/><stop offset="0.5" stop-color="#1b5590"/><stop offset="1" stop-color="#08254a"/></radialGradient>')
D('<radialGradient id="terminator" cx="0.3" cy="0.25" r="0.95"><stop offset="0.45" stop-color="#050f26" stop-opacity="0"/><stop offset="0.8" stop-color="#050f26" stop-opacity="0.5"/><stop offset="1" stop-color="#030a1a" stop-opacity="0.85"/></radialGradient>')
D('<radialGradient id="spec" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="0.4" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>')
D('<radialGradient id="rim" cx="0.5" cy="0.5" r="0.5"><stop offset="0.9" stop-color="#8fc5ff" stop-opacity="0"/><stop offset="0.97" stop-color="#8fc5ff" stop-opacity="0.5"/><stop offset="1" stop-color="#8fc5ff" stop-opacity="0"/></radialGradient>')
D('<radialGradient id="vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#0b1220" stop-opacity="0.55"/></radialGradient>')
D('<linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#d5dde8"/><stop offset="1" stop-color="#8f9db3"/></linearGradient>')
D('<linearGradient id="fabric" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2b3d78"/><stop offset="1" stop-color="#0d1736"/></linearGradient>')
D('<pattern id="weave" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="none"/><path d="M0 1 H6 M0 4 H6" stroke="#000" stroke-opacity="0.18" stroke-width="1"/><path d="M1 0 V6 M4 0 V6" stroke="#fff" stroke-opacity="0.07" stroke-width="1"/></pattern>')
D('<pattern id="pages" width="6" height="4" patternUnits="userSpaceOnUse"><rect width="6" height="4" fill="#f1e7cf"/><path d="M0 1 H6" stroke="#b9a981" stroke-opacity="0.55" stroke-width="0.8"/></pattern>')
D('<clipPath id="gclip"><circle cx="900" cy="470" r="290"/></clipPath>')
D('<mask id="cloudMask"><rect width="1920" height="720" fill="url(#cmg)"/></mask>')
D('<linearGradient id="cmg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="0.7" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>')


def textured(shape, fill, tex, op=0.5, blend="multiply", extra=""):
    """shape: element string with {a} placeholder for attributes. Fill + clipped texture."""
    cid = nid("c")
    D(f'<clipPath id="{cid}">{shape.format(a="")}</clipPath>')
    B(shape.format(a=f'fill="{fill}" {extra}'))
    B(f'<g clip-path="url(#{cid})"><rect width="{W}" height="{H}" filter="url(#{tex})" style="mix-blend-mode:{blend}" opacity="{op}"/></g>')


# ---------------------------------------------------------------- backdrop
B(f'<rect width="{W}" height="{H}" fill="url(#sky)"/>')
B(f'<rect width="{W}" height="{H}" fill="url(#sun)"/>')
B(f'<g mask="url(#cloudMask)" opacity="0.9"><rect width="{W}" height="720" filter="url(#clouds)"/></g>')

# distant bokeh in the haze
import random
random.seed(4)
for _ in range(16):
    x, y, r = random.randint(40, 1880), random.randint(520, 700), random.randint(10, 26)
    B(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff9e8" opacity="{random.uniform(0.07, 0.16):.2f}" filter="url(#b1)"/>')

# mountains (atmospheric perspective + defocus)
B('<g filter="url(#b3)"><path d="M0 640 C160 560 300 625 470 585 C650 540 820 635 1040 585 C1230 545 1420 615 1640 570 C1760 548 1850 580 1920 556 L1920 900 L0 900Z" fill="url(#mA)"/></g>')
B('<g filter="url(#b3)"><path d="M0 700 C180 630 360 690 560 645 C760 600 960 690 1180 640 C1380 595 1600 665 1920 620 L1920 900 L0 900Z" fill="url(#mB)"/></g>')
B('<g filter="url(#b2)"><path d="M0 770 C220 700 420 755 650 715 C860 678 1060 755 1290 712 C1500 676 1700 735 1920 690 L1920 900 L0 900Z" fill="url(#mC)"/><g clip-path="url(#mcC)"><rect width="1920" height="1080" filter="url(#nForest)" style="mix-blend-mode:multiply" opacity="0.45"/></g></g>')
D('<clipPath id="mcC"><path d="M0 770 C220 700 420 755 650 715 C860 678 1060 755 1290 712 C1500 676 1700 735 1920 690 L1920 900 L0 900Z"/></clipPath>')
B('<rect x="0" y="560" width="1920" height="300" fill="url(#haze)"/>')

# Great Wall on the ridge (blurred)
wall = [(980, 780), (1130, 725), (1260, 745), (1370, 690), (1540, 662), (1720, 610), (1920, 580)]
pts = " ".join(f"{x},{y}" for x, y in wall)
B('<g filter="url(#b3)">')
B(f'<polyline points="{pts}" fill="none" stroke="#8e8576" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>')
B(f'<polyline points="{pts}" fill="none" stroke="#b9ad98" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" transform="translate(0,-4)"/>')
B(f'<polyline points="{pts}" fill="none" stroke="#8e8576" stroke-width="7" stroke-dasharray="12 10" transform="translate(0,-17)"/>')
for x, y in [(1130, 725), (1370, 690), (1720, 610)]:
    B(f'<rect x="{x - 22}" y="{y - 52}" width="44" height="50" fill="#9a8f7e"/><rect x="{x - 28}" y="{y - 62}" width="56" height="12" fill="#7d7364"/><rect x="{x - 9}" y="{y - 38}" width="18" height="14" fill="#4a4338"/>')
B('</g>')
B('<rect x="0" y="600" width="1920" height="260" fill="url(#haze)" opacity="0.6"/>')

# pagoda (blurred, warm, atmospheric)
px, base = 1620, 800
B('<g filter="url(#b4)" opacity="0.92">')
B(f'<rect x="{px - 120}" y="{base - 16}" width="240" height="20" fill="#7c7466"/>')
for i in range(7):
    w = 190 - i * 18
    yb = base - 14 - i * 60
    bw = w * 0.6
    B(f'<rect x="{px - bw / 2:.1f}" y="{yb - 34}" width="{bw:.1f}" height="36" fill="#d9c9a6"/>')
    for k in (-0.5, 0, 0.5):
        B(f'<rect x="{px + k * bw * 0.8 - 4:.1f}" y="{yb - 28}" width="8" height="28" fill="#a3322f"/>')
    x1, x2 = px - w / 2 - 18, px + w / 2 + 18
    B(f'<path d="M{x1:.1f} {yb - 32} Q{x1 + 20:.1f} {yb - 36} {px - w / 2 + 20:.1f} {yb - 60} L{px + w / 2 - 20:.1f} {yb - 60} Q{x2 - 20:.1f} {yb - 36} {x2:.1f} {yb - 32} Z" fill="#3a3f52"/>')
    B(f'<rect x="{x1:.1f}" y="{yb - 33}" width="{x2 - x1:.1f}" height="3" fill="#b88f3c"/>')
B(f'<rect x="{px - 3}" y="{base - 14 - 7 * 60 - 36}" width="6" height="40" fill="#8c6420"/>')
B('</g>')


# foreground hills + trees (soft)
B('<g filter="url(#b3)"><path d="M0 830 C220 790 420 825 640 810 C900 792 1100 840 1360 820 C1600 800 1780 830 1920 806 L1920 900 L0 900Z" fill="url(#mD)"/></g>')

# ---------------------------------------------------------------- desk
B(f'<rect x="0" y="838" width="{W}" height="{H - 838}" fill="url(#deskG)"/>')
B(f'<g clip-path="url(#deskClip)"><rect width="{W}" height="{H}" filter="url(#nWood)" style="mix-blend-mode:multiply" opacity="0.55"/></g>')
D(f'<clipPath id="deskClip"><rect x="0" y="838" width="{W}" height="{H - 838}"/></clipPath>')
B(f'<rect x="0" y="838" width="{W}" height="{H - 838}" fill="url(#deskSheen)"/>')
B(f'<rect x="0" y="834" width="{W}" height="9" fill="#2a1a0e" opacity="0.55"/>')
B(f'<rect x="0" y="838" width="{W}" height="3" fill="#d6a874" opacity="0.5"/>')

# contact shadows on the desk
B('<ellipse cx="940" cy="880" rx="260" ry="34" fill="#150b04" opacity="0.62" filter="url(#shadowBig)"/>')
B('<ellipse cx="330" cy="955" rx="290" ry="30" fill="#150b04" opacity="0.6" filter="url(#shadowBig)"/>')
B('<ellipse cx="620" cy="1000" rx="110" ry="18" fill="#150b04" opacity="0.55" filter="url(#shadowSm)"/>')

# ---------------------------------------------------------------- globe on stand
# base + stem
B('<ellipse cx="900" cy="872" rx="176" ry="32" fill="#2b1c0a"/>')
B('<ellipse cx="900" cy="864" rx="176" ry="30" fill="url(#gold)"/>')
B('<ellipse cx="900" cy="858" rx="150" ry="22" fill="#fff" opacity="0.14"/>')
B('<rect x="884" y="752" width="32" height="118" fill="url(#goldV)"/>')
B('<rect x="884" y="752" width="32" height="118" fill="#000" opacity="0.08"/>')
# meridian ring
B('<path d="M 606 650 A 342 342 0 0 0 1176 318" fill="none" stroke="#3a2608" stroke-width="22" stroke-linecap="round" opacity="0.5" transform="translate(5 7)"/>')
B('<path d="M 606 650 A 342 342 0 0 0 1176 318" fill="none" stroke="url(#gold)" stroke-width="18" stroke-linecap="round"/>')
B('<path d="M 612 640 A 336 336 0 0 0 1168 322" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.5"/>')

# globe body
B('<circle cx="900" cy="470" r="290" fill="url(#ocean)"/>')
B('<g clip-path="url(#gclip)">')
# procedural continents with soft coastlines (vintage-globe look)
B('<rect x="590" y="180" width="620" height="580" filter="url(#land)" opacity="0.92"/>')
B('<rect x="590" y="180" width="620" height="580" filter="url(#landTint)" style="mix-blend-mode:multiply" opacity="0.28"/>')
B('<rect x="590" y="180" width="620" height="580" filter="url(#nFine)" style="mix-blend-mode:multiply" opacity="0.10"/>')
B('<rect x="590" y="180" width="620" height="580" filter="url(#clouds)" opacity="0.14" style="mix-blend-mode:screen"/>')
# grid lines, subtle
for k in (-180, -90, 0, 90, 180):
    B(f'<ellipse cx="900" cy="{470 + k}" rx="290" ry="{abs(56 - abs(k) * 0.1) + 16}" fill="none" stroke="#fff" stroke-opacity="0.10" stroke-width="1.5"/>')
for k in (70, 140, 215, 290):
    B(f'<ellipse cx="900" cy="470" rx="{k}" ry="290" fill="none" stroke="#fff" stroke-opacity="0.10" stroke-width="1.5"/>')
B('<circle cx="900" cy="470" r="290" fill="url(#terminator)"/>')
B('<circle cx="900" cy="470" r="290" fill="url(#rim)"/>')
B('<ellipse cx="770" cy="330" rx="110" ry="70" fill="url(#spec)" transform="rotate(-35 770 330)"/>')
B('</g>')
B('<circle cx="900" cy="470" r="290" fill="none" stroke="#9fd0ff" stroke-opacity="0.25" stroke-width="3"/>')
# pin
B('<g transform="translate(1048 388)"><ellipse cx="0" cy="30" rx="18" ry="6" fill="#020a1a" opacity="0.5"/><path d="M0 28 C-20 2 -26 -10 -26 -22 A26 26 0 1 1 26 -22 C26 -10 20 2 0 28Z" fill="#c8202a"/><path d="M-14 -34 A18 18 0 0 1 8 -44" stroke="#fff" stroke-opacity="0.5" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="0" cy="-22" r="9" fill="#f4efe6"/></g>')

# ---------------------------------------------------------------- books + cap
def book(x, y, w, h, color, dark):
    sh = '<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" {{a}}/>'.format(x=x, y=y, w=w, h=h)
    textured(sh, color, "nLeather", 0.5)
    B(f'<rect x="{x + 12}" y="{y + 12}" width="{w - 24}" height="{h - 24}" fill="url(#pages)"/>')
    B(f'<rect x="{x + 12}" y="{y + 12}" width="{w - 24}" height="{h - 24}" fill="#000" opacity="0.10"/>')
    B(f'<rect x="{x}" y="{y}" width="16" height="{h}" rx="4" fill="{dark}"/>')
    B(f'<rect x="{x}" y="{y}" width="{w}" height="5" rx="2" fill="#fff" opacity="0.22"/>')
    B(f'<rect x="{x}" y="{y + h - 6}" width="{w}" height="6" fill="#000" opacity="0.28"/>')
    B(f'<rect x="{x + 26}" y="{y + 4}" width="{w - 52}" height="2.5" fill="url(#gold)"/>')


book(116, 886, 408, 62, "#142f6b", "#0b1d45")
book(142, 828, 358, 58, "#9b1b22", "#6e1016")
book(168, 774, 318, 54, "#244b94", "#142f6b")
# cap
B('<path d="M248 742 L248 776 Q327 806 406 776 L406 742 Z" fill="url(#fabric)"/>')
B('<path d="M248 742 L248 776 Q327 806 406 776 L406 742 Z" fill="url(#weave)"/>')
board = "170,722 327,672 484,722 327,772"
B(f'<polygon points="{board}" fill="#0f1a3d"/>')
B(f'<polygon points="{board}" fill="url(#weave)"/>')
B('<polygon points="170,722 327,672 484,722 327,700" fill="#33478a" opacity="0.55"/>')
B('<polygon points="170,722 327,772 484,722 484,728 327,780 170,728" fill="#000" opacity="0.35"/>')
B('<circle cx="327" cy="722" r="8" fill="url(#gold)"/>')
B('<path d="M327 722 L468 730 L468 790" fill="none" stroke="url(#gold)" stroke-width="4.5" stroke-linecap="round"/>')
B('<rect x="459" y="786" width="18" height="38" rx="7" fill="url(#gold)"/>')
for i in range(5):
    B(f'<path d="M{462 + i * 3} 806 V826" stroke="#6b4912" stroke-width="1" opacity="0.6"/>')

# passport
B('<g transform="rotate(-9 575 880)">')
B('<rect x="526" y="796" width="150" height="200" rx="9" fill="#000" opacity="0.4" filter="url(#shadowSm)" transform="translate(8 10)"/>')
rect = '<rect x="520" y="790" width="150" height="200" rx="9" {a}/>'
textured(rect, "#173a86", "nLeather", 0.55)
B('<rect x="520" y="790" width="14" height="200" rx="5" fill="#0b1f4d"/>')
B('<rect x="520" y="790" width="150" height="8" rx="4" fill="#fff" opacity="0.18"/>')
B('<circle cx="598" cy="858" r="34" fill="none" stroke="url(#gold)" stroke-width="5"/><circle cx="598" cy="858" r="23" fill="none" stroke="url(#gold)" stroke-width="2"/><circle cx="598" cy="858" r="10" fill="url(#gold)"/>')
B('<rect x="556" y="916" width="84" height="7" rx="3" fill="url(#gold)"/><rect x="570" y="934" width="56" height="7" rx="3" fill="url(#gold)" opacity="0.85"/>')
B('</g>')

# ---------------------------------------------------------------- airplane + contrail
B('<path d="M1110 305 C 1000 330 880 322 760 352" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.55" filter="url(#b2)"/>')
B('<g transform="translate(1330 215) rotate(-8) scale(0.82)" filter="url(#b1)">')
B('<path d="M-150 10 C-100 -26 100 -30 170 -6 C190 0 190 14 170 20 C100 40 -100 40 -150 10Z" fill="url(#metal)"/>')
B('<path d="M-150 10 C-100 -26 100 -30 170 -6 L170 2 C100 -16 -100 -14 -150 10Z" fill="#fff" opacity="0.55"/>')
B('<path d="M-132 -8 L-178 -78 L-146 -78 L-90 -6Z" fill="#e9eef6"/><path d="M-178 -78 L-146 -78 L-152 -66 L-172 -66Z" fill="#c42a30"/>')
B('<path d="M-20 14 L-110 118 L-60 118 L60 20Z" fill="#aab6c9"/><path d="M-10 -12 L-84 -100 L-40 -100 L70 -14Z" fill="#dbe3ef"/>')
B('<ellipse cx="-30" cy="62" rx="26" ry="12" fill="#6e7a90"/>')
B('<path d="M150 -6 C168 -4 178 2 180 8 L150 12Z" fill="#1c2c55"/>')
for i in range(12):
    B(f'<circle cx="{-70 + i * 17}" cy="-2" r="3.4" fill="#1c2c55" opacity="0.7"/>')
B('</g>')

# ---------------------------------------------------------------- grade
B(f'<rect width="{W}" height="{H}" fill="url(#sun)" style="mix-blend-mode:soft-light" opacity="0.9"/>')
B(f'<rect width="{W}" height="{H}" fill="#ffd9a0" opacity="0.07" style="mix-blend-mode:soft-light"/>')
B(f'<rect width="{W}" height="{H}" fill="url(#vig)"/>')
B(f'<rect width="{W}" height="{H}" filter="url(#nGrain)" style="mix-blend-mode:overlay" opacity="0.22"/>')

svg = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" preserveAspectRatio="xMidYMid slice">'
    f'<defs>{"".join(defs)}</defs>{"".join(body)}</svg>'
)
open("hero-real.svg", "w", encoding="utf-8").write(svg)
print("ok", len(svg))
