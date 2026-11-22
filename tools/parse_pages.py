import re, html, json, glob, os
def clean(s): return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s or ''))).strip()
def one(p, t, f=re.S):
    m = re.search(p, t, f); return clean(m.group(1)) if m else ''
out = []
for f in sorted(glob.glob('pages/*.html')):
    t = open(f, encoding='utf-8', errors='ignore').read()
    slug = os.path.basename(f)[:-5]
    ld = None
    for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', t, flags=re.S):
        try:
            j = json.loads(m)
            if j.get('@type') == 'Product': ld = j
        except Exception: pass
    d = dict(slug=slug, template=one(r'<meta name="template" content="(.*?)"', t))
    d['name'] = (ld or {}).get('name') or one(r'<h1[^>]*>(.*?)</h1>', t)
    d['image'] = (ld or {}).get('image', '')
    d['desc'] = clean((ld or {}).get('description', '')) or one(r'<meta name="description" content="(.*?)"', t)
    d['meta'] = one(r'<meta name="description" content="(.*?)"', t)
    d['cat'] = one(r'data-category="(.*?)"', t)
    d['pack'] = one(r'data-packsize="(.*?)"', t)
    d['intensity'] = one(r'lvz-product-hero__intensity--accent">(.*?)</span>', t)
    d['kicker'] = one(r'lvz-product-hero__(?:category|subtitle|label|type)[^"]*">(.*?)</div>', t)
    d['sizes'] = sorted(set(re.findall(r'data-size="(.*?)"', t)))
    d['profile'] = one(r'Profile and Roasting\s*</span>\s*<h2 class="lvz-product-details__title">(.*?)</h2>', t)
    d['profileDesc'] = one(r'Profile and Roasting\s*</span>\s*<h2[^>]*>.*?</h2>\s*<p class="lvz-product-details__description">(.*?)</p>', t)
    d['notes'] = one(r'Aromatic Notes\s*</h4>.*?lvz-product-details__info-label">(.*?)</span>', t)
    d['roast'] = one(r'>\s*Roast\s*</h4>.*?lvz-product-details__info-label">(.*?)</span>', t)
    d['composition'] = one(r'Composition\s*</h4>\s*<p[^>]*>(.*?)</p>', t)
    d['origin'] = one(r'Origin\s*</h4>\s*<p[^>]*>(.*?)</p>', t)
    d['details'] = {clean(a): clean(b) for a, b in re.findall(r'heading-info--detail">(.*?)</h4>\s*<p[^>]*>(.*?)</p>', t, flags=re.S)}
    d['heroBg'] = one(r'class="lvz-product-hero[^"]*"\s*style="background-image:url\(\'(.*?)\'\)', t).replace('\\2f ', '/').replace('\\2f', '/')
    d['imgs'] = sorted(set(re.findall(r'(/content/dam/[^"\'\s)]+(?:hero-product-banner|main-asset|gallery|carousel)[^"\'\s)]*\.(?:png|jpg|jpeg|webp))', t)))[:12]
    out.append(d)
json.dump(out, open('raw.json', 'w'), indent=1, ensure_ascii=False)
for d in out:
    print(f"{d['slug'][:58]:58} | {d['template'][:14]:14} | {d['name'][:38]:38} | {d['cat'][:18]:18} | {d['pack']:10} | {d['intensity']:6} | {d['roast'][:8]:8} | {d['notes'][:30]:30} | {d['composition'][:28]}")
