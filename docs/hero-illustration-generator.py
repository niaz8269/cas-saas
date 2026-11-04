import math

W, H = 1920, 1080
o = []
a = o.append

NAVY = "#14357C"
NAVY_D = "#0F2A63"
RED = "#D81F26"
RED_L = "#E4474D"
GOLD = "#C9A24A"
GOLD_D = "#A8832F"
CREAM = "#F5EFE0"

a(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Globe with books, graduation cap, passport, plane and a pagoda">')
a('''<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfdcf0"/><stop offset="0.55" stop-color="#e6edf8"/><stop offset="1" stop-color="#f6f8fc"/></linearGradient>
<radialGradient id="globe" cx="0.36" cy="0.32" r="0.85"><stop offset="0" stop-color="#3f86d0"/><stop offset="0.55" stop-color="#1f56a0"/><stop offset="1" stop-color="#0f2a63"/></radialGradient>
<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f8fc" stop-opacity="0"/><stop offset="1" stop-color="#f6f8fc" stop-opacity="0.85"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3c46f"/><stop offset="1" stop-color="#a8832f"/></linearGradient>
<clipPath id="gclip"><circle cx="900" cy="470" r="290"/></clipPath>
<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#0f2a63" flood-opacity="0.28"/></filter>
</defs>''')

a(f'<rect width="{W}" height="{H}" fill="url(#sky)"/>')

# sun glow
a('<circle cx="430" cy="300" r="260" fill="#ffffff" opacity="0.35" filter="url(#soft)"/>')


def cloud(cx, cy, s=1.0, op=0.92):
    parts = [(-70, 10, 48), (-25, -14, 62), (30, -4, 56), (78, 12, 42), (0, 24, 64)]
    g = [f'<g opacity="{op}" fill="#ffffff">']
    for dx, dy, r in parts:
        g.append(f'<circle cx="{cx + dx * s:.1f}" cy="{cy + dy * s:.1f}" r="{r * s:.1f}"/>')
    g.append("</g>")
    return "".join(g)


a(cloud(250, 190, 1.1, 0.8))
a(cloud(1500, 150, 1.4, 0.75))
a(cloud(1780, 330, 0.9, 0.7))
a(cloud(120, 560, 1.2, 0.6))

# far mountains
a('<path d="M0 700 C160 620 300 690 470 640 C650 585 820 690 1040 630 C1230 585 1420 660 1640 610 C1760 585 1850 620 1920 595 L1920 1080 L0 1080Z" fill="#c7d4e8"/>')
a('<path d="M0 770 C180 700 360 760 560 715 C760 670 960 760 1180 705 C1380 660 1600 730 1920 680 L1920 1080 L0 1080Z" fill="#b2c3dd"/>')
a('<rect x="0" y="640" width="1920" height="260" fill="url(#mist)"/>')

# great wall along the ridge (right)
wall = [(1010, 905), (1160, 840), (1290, 858), (1400, 790), (1560, 760), (1740, 700), (1920, 660)]
pts = " ".join(f"{x},{y}" for x, y in wall)
a(f'<polyline points="{pts}" fill="none" stroke="#7d8fb0" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>')
a(f'<polyline points="{pts}" fill="none" stroke="#a9b8d3" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" transform="translate(0,-4)"/>')
a(f'<polyline points="{pts}" fill="none" stroke="#7d8fb0" stroke-width="9" stroke-dasharray="16 14" transform="translate(0,-22)"/>')
for x, y in [(1160, 840), (1400, 790), (1740, 700)]:
    a(f'<g><rect x="{x - 26}" y="{y - 62}" width="52" height="58" fill="#6f81a3"/><rect x="{x - 32}" y="{y - 74}" width="64" height="14" fill="#5d6f92"/><rect x="{x - 12}" y="{y - 46}" width="24" height="18" fill="#3f4f73"/></g>')

# foreground hills
a('<path d="M0 880 C220 820 420 870 640 850 C900 826 1100 900 1360 870 C1600 842 1780 880 1920 850 L1920 1080 L0 1080Z" fill="#9db0d0"/>')
a('<path d="M0 960 C260 920 520 965 800 945 C1120 922 1420 975 1700 950 C1800 942 1870 950 1920 945 L1920 1080 L0 1080Z" fill="#8aa0c6"/>')

# red trees
trees = [(1330, 880, 46), (1385, 860, 36), (1750, 840, 50), (1830, 868, 38), (1280, 905, 34), (1690, 880, 34), (1450, 900, 30)]
for x, y, r in trees:
    a(f'<rect x="{x - 4}" y="{y}" width="8" height="{r * 0.9:.0f}" fill="#5d3a46"/>')
    a(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{RED_L}"/><circle cx="{x - r * 0.3:.0f}" cy="{y - r * 0.25:.0f}" r="{r * 0.62:.0f}" fill="#ee6368" opacity="0.8"/>')

# pagoda
px, base = 1560, 905
tiers = 7
a('<g filter="url(#shadow)">')
a(f'<rect x="{px - 150}" y="{base - 22}" width="300" height="26" rx="4" fill="#6f7fa0"/>')
a(f'<rect x="{px - 120}" y="{base - 40}" width="240" height="22" rx="3" fill="#8393b3"/>')
for i in range(tiers):
    w = 250 - i * 24
    yb = base - 40 - i * 78
    body_w = w * 0.6
    a(f'<rect x="{px - body_w / 2:.1f}" y="{yb - 44}" width="{body_w:.1f}" height="46" fill="{CREAM}"/>')
    a(f'<rect x="{px - body_w / 2:.1f}" y="{yb - 44}" width="{body_w:.1f}" height="8" fill="{RED}"/>')
    for k in (-0.5, 0, 0.5):
        a(f'<rect x="{px + k * body_w * 0.8 - 5:.1f}" y="{yb - 34}" width="10" height="36" fill="{RED}"/>')
    x1, x2 = px - w / 2 - 22, px + w / 2 + 22
    a(f'<path d="M{x1:.1f} {yb - 40} Q{x1 + 26:.1f} {yb - 44} {px - w / 2 + 26:.1f} {yb - 76} L{px + w / 2 - 26:.1f} {yb - 76} Q{x2 - 26:.1f} {yb - 44} {x2:.1f} {yb - 40} Z" fill="{NAVY}"/>')
    a(f'<path d="M{x1:.1f} {yb - 40} Q{x1 + 26:.1f} {yb - 44} {px - w / 2 + 26:.1f} {yb - 76} L{px - w / 2 + 40:.1f} {yb - 76} L{x1 + 14:.1f} {yb - 40}Z" fill="{NAVY_D}" opacity="0.5"/>')
    a(f'<rect x="{x1:.1f}" y="{yb - 41}" width="{x2 - x1:.1f}" height="4" fill="{GOLD}"/>')
top = base - 40 - tiers * 78
a(f'<rect x="{px - 4}" y="{top - 50}" width="8" height="54" fill="{GOLD_D}"/>')
a(f'<circle cx="{px}" cy="{top - 56}" r="9" fill="url(#gold)"/>')
a('</g>')

# globe stand + ring behind
a(f'<ellipse cx="900" cy="888" rx="170" ry="30" fill="{GOLD_D}"/><ellipse cx="900" cy="880" rx="170" ry="28" fill="url(#gold)"/>')
a('<rect x="886" y="760" width="28" height="122" fill="url(#gold)"/>')
a('<path d="M 612 640 A 340 340 0 0 0 1170 320" fill="none" stroke="url(#gold)" stroke-width="16" stroke-linecap="round"/>')

# globe
a('<g filter="url(#shadow)"><circle cx="900" cy="470" r="290" fill="url(#globe)"/></g>')
a('<g clip-path="url(#gclip)">')
for k in (-200, -100, 0, 100, 200):
    a(f'<ellipse cx="900" cy="{470 + k}" rx="290" ry="{abs(60 - abs(k) * 0.1) + 18}" fill="none" stroke="#ffffff" stroke-opacity="0.13" stroke-width="2"/>')
for k in (60, 130, 210, 290):
    a(f'<ellipse cx="900" cy="470" rx="{k}" ry="290" fill="none" stroke="#ffffff" stroke-opacity="0.13" stroke-width="2"/>')
cont = [
    "M760 330 C800 290 880 300 910 330 C950 360 930 410 880 420 C830 430 790 410 760 380Z",
    "M960 430 C1030 400 1120 430 1130 500 C1138 560 1080 600 1020 580 C970 560 940 500 960 430Z",
    "M700 520 C740 500 790 520 800 570 C808 620 770 660 730 640 C690 620 670 560 700 520Z",
    "M1010 310 C1050 295 1100 310 1110 345 C1116 375 1080 385 1045 372 C1015 360 1000 335 1010 310Z",
]
for d in cont:
    a(f'<path d="{d}" fill="#4f92d8" opacity="0.85"/>')
a('<path d="M640 470 A 290 290 0 0 1 900 190 A 330 330 0 0 0 640 470Z" fill="#ffffff" opacity="0.14"/>')
a('</g>')
# location pin
a(f'<g transform="translate(1048 380)"><ellipse cx="0" cy="30" rx="16" ry="5" fill="#0f2a63" opacity="0.35"/><path d="M0 28 C-20 2 -26 -10 -26 -22 A26 26 0 1 1 26 -22 C26 -10 20 2 0 28Z" fill="{RED}"/><circle cx="0" cy="-22" r="10" fill="#fff"/></g>')

# books + cap (left)
a('<g filter="url(#shadow)">')
a(f'<rect x="120" y="880" width="400" height="58" rx="5" fill="{NAVY}"/><rect x="132" y="896" width="376" height="26" fill="{CREAM}"/><rect x="120" y="880" width="18" height="58" fill="{NAVY_D}"/>')
a(f'<rect x="146" y="824" width="352" height="56" rx="5" fill="{RED}"/><rect x="158" y="840" width="328" height="24" fill="{CREAM}"/><rect x="146" y="824" width="18" height="56" fill="#a9161c"/>')
a(f'<rect x="170" y="772" width="316" height="52" rx="5" fill="#2a4f9a"/><rect x="182" y="786" width="292" height="24" fill="{CREAM}"/><rect x="170" y="772" width="18" height="52" fill="{NAVY}"/>')
a(f'<path d="M250 742 L250 772 Q328 800 406 772 L406 742 Z" fill="#1a2a55"/>')
a(f'<polygon points="170,722 328,672 486,722 328,772" fill="#14204a"/><polygon points="170,722 328,672 486,722 328,700" fill="#22336e" opacity="0.9"/>')
a(f'<circle cx="328" cy="722" r="7" fill="{GOLD}"/><path d="M328 722 L470 730 L470 790" fill="none" stroke="{GOLD}" stroke-width="4" stroke-linecap="round"/><rect x="462" y="786" width="16" height="34" rx="6" fill="{GOLD}"/>')
a('</g>')
# passport
a('<g transform="rotate(-9 575 880)" filter="url(#shadow)">')
a(f'<rect x="520" y="790" width="150" height="200" rx="9" fill="#1d3f8c"/><rect x="520" y="790" width="14" height="200" rx="4" fill="{NAVY_D}"/>')
a(f'<circle cx="598" cy="860" r="34" fill="none" stroke="{GOLD}" stroke-width="5"/><circle cx="598" cy="860" r="14" fill="{GOLD}"/>')
a(f'<rect x="556" y="918" width="84" height="8" rx="3" fill="{GOLD}"/><rect x="570" y="936" width="56" height="8" rx="3" fill="{GOLD}" opacity="0.8"/>')
a('</g>')

# airplane
a('<g transform="translate(1330 210) rotate(-8) scale(0.82)" filter="url(#shadow)">')
a(f'<path d="M-150 10 C-100 -26 100 -30 170 -6 C190 0 190 14 170 20 C100 40 -100 40 -150 10Z" fill="#ffffff"/>')
a(f'<path d="M-150 10 C-130 -8 -112 -16 -96 -22 L-96 30 C-112 26 -132 20 -150 10Z" fill="#dfe7f3"/>')
a(f'<path d="M-130 -10 L-190 -86 L-150 -86 L-84 -8Z" fill="{RED}"/>')
a(f'<path d="M-20 14 L-110 118 L-60 118 L60 20Z" fill="#cfdaec"/><path d="M-10 -12 L-84 -100 L-40 -100 L70 -14Z" fill="#e8eef8"/>')
a(f'<path d="M150 -6 C168 -4 178 2 180 8 L150 12Z" fill="{NAVY}"/>')
for i in range(12):
    a(f'<circle cx="{-70 + i * 17}" cy="-2" r="3.6" fill="{NAVY}" opacity="0.65"/>')
a('</g>')
a('<path d="M1160 262 C 1120 285 1090 270 1050 300" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 14" opacity="0.9"/>')

# paper plane
a('<g transform="translate(400 250) rotate(-12)" filter="url(#shadow)">')
a('<polygon points="-70,10 90,-40 20,50" fill="#ffffff"/><polygon points="-70,10 20,50 -10,20" fill="#c9d6ea"/><polygon points="20,50 90,-40 0,28" fill="#e6edf8"/>')
a('</g>')
a('<path d="M330 292 C 260 330 190 300 110 360 C 60 398 40 440 20 470" fill="none" stroke="#14357C" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 14" opacity="0.55"/>')

# foreground clouds
a(cloud(980, 1030, 2.0, 0.95))
a(cloud(260, 1050, 1.7, 0.95))
a(cloud(1700, 1040, 1.9, 0.95))
a('</svg>')

open("hero-bg.svg", "w", encoding="utf-8").write("".join(o))
print("ok", sum(len(x) for x in o))
