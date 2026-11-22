#!/usr/bin/env python3
"""Build the demo catalogue from pages saved off lavazza.com.

usage: python3 tools/build_data.py <scratch>           # parse + download originals + write catalogue.json
       node    tools/to_webp.mjs  <scratch>            # originals -> assets/img/products/*.webp
       python3 tools/build_data.py <scratch> data      # write assets/js/data.js

<scratch> holds pages/*.html (saved product pages) and raw.json (see tools/README in NOTES.md).
Product facts (name, description, intensity, roast, notes, blend, machine specs) come from the saved
pages. Prices, stock, segment tags and best-seller flags below are SAMPLE values for the demo.
"""
import sys, os, re, json, html, subprocess, concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRATCH = sys.argv[1]
MODE = sys.argv[2] if len(sys.argv) > 2 else 'fetch'
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15"
BASE = 'https://www.lavazza.com'

# id, source page, display name, category, system, class, environments, sample price (MVR), flags
# class: everyday | premium | signature      env: resort cafe office guesthouse home
SEL = [
 # A Modo Mio capsules (16 per box)
 ('amm-qualita-rossa',  'coffee-capsules-pods__a-modo-mio-qualita-rossa',  'Qualità Rossa',        'capsules', 'amm', 'everyday',  'home guesthouse office', 139, 'best'),
 ('amm-qualita-oro',    'coffee-capsules-pods__a-modo-mio-qualita-oro',    'Qualità Oro',          'capsules', 'amm', 'premium',   'home guesthouse office', 149, ''),
 ('amm-passionale',     'coffee-capsules-pods__a-modo-mio-passionale',     'Passionale',           'capsules', 'amm', 'premium',   'home office',            145, ''),
 ('amm-intenso',        'coffee-capsules-pods__a-modo-mio-intenso',        'Intenso',              'capsules', 'amm', 'everyday',  'home guesthouse office', 139, ''),
 ('amm-delizioso',      'coffee-capsules-pods__a-modo-mio-delizioso',      'Delizioso',            'capsules', 'amm', 'premium',   'home guesthouse',        145, ''),
 ('amm-crema-e-gusto',  'coffee-capsules-pods__a-modo-mio-crema-e-gusto',  'Crema e Gusto',        'capsules', 'amm', 'everyday',  'home guesthouse office', 135, ''),
 ('amm-lungo-dolce',    'coffee-capsules-pods__a-modo-mio-lungo-dolce',    'Lungo Dolce',          'capsules', 'amm', 'premium',   'home office',            145, ''),
 ('amm-divino',         'coffee-capsules-pods__a-modo-mio-divino',         'Divino',               'capsules', 'amm', 'premium',   'home',                   149, ''),
 ('amm-decaf',          'coffee-capsules-pods__a-modo-mio-dek-cremoso',    'Decaf Cremoso',        'capsules', 'amm', 'everyday',  'home guesthouse office', 145, ''),
 # Capsules compatible with Nespresso Original machines (10 per box)
 ('ncc-maestro-ristretto', 'coffee-capsules-pods__nespresso-compatible-espresso-maestro-ristretto', 'Espresso Maestro Ristretto', 'capsules', 'ncc', 'premium', 'resort guesthouse office home', 105, 'best'),
 ('ncc-maestro-classico',  'coffee-capsules-pods__nespresso-compatible-espresso-maestro-classico',  'Espresso Maestro Classico',  'capsules', 'ncc', 'premium', 'resort guesthouse office home', 105, ''),
 ('ncc-maestro-intenso',   'coffee-capsules-pods__nespresso-compatible-espresso-maestro-intenso',   'Espresso Maestro Intenso',   'capsules', 'ncc', 'premium', 'resort office home',            105, ''),
 ('ncc-maestro-lungo',     'coffee-capsules-pods__nespresso-compatible-espresso-maestro-lungo',     'Espresso Maestro Lungo',     'capsules', 'ncc', 'premium', 'resort guesthouse office home', 105, ''),
 ('ncc-qualita-oro',       'coffee-capsules-pods__nespresso-compatible-qualita-oro',                'Qualità Oro',                'capsules', 'ncc', 'premium', 'resort guesthouse home',        99,  ''),
 ('ncc-qualita-rossa',     'coffee-capsules-pods__nespresso-compatible-qualita-rossa',              'Qualità Rossa',              'capsules', 'ncc', 'everyday','guesthouse office home',        95,  ''),
 ('ncc-crema-e-gusto',     'coffee-capsules-pods__nespresso-compatible-crema-e-gusto',              'Crema e Gusto',              'capsules', 'ncc', 'everyday','guesthouse office home',        89,  ''),
 ('ncc-decaf',             'coffee-capsules-pods__nespresso-compatible-decaf',                      'Decaf',                      'capsules', 'ncc', 'everyday','resort guesthouse office home', 99,  ''),
 ('ncc-tales-of-napoli',   'coffee-capsules-pods__tales-of-napoli',                                 'Tales of Napoli',            'capsules', 'ncc', 'signature','resort home',                  119, 'new'),
 ('ncc-tales-of-roma',     'coffee-capsules-pods__tales-of-roma',                                   'Tales of Roma',              'capsules', 'ncc', 'signature','resort home',                  119, 'new'),
 ('ncc-gourmet-caramel',   'coffee-capsules-pods__espresso-gourmet-caramel',                        'Espresso Gourmet Caramel',   'capsules', 'ncc', 'premium', 'home office',                   109, ''),
 ('ncc-gourmet-vanilla',   'coffee-capsules-pods__espresso-gourmet-vanilla-affogato',               'Espresso Gourmet Vanilla Affogato', 'capsules', 'ncc', 'premium', 'home',                   109, ''),
 # Tablì coffee tabs (12 per box)
 ('tabli-qualita-oro',     'tabli-coffee-tabs__qualita-oro',        'Tablì Qualità Oro',       'capsules', 'tabli', 'signature', 'home office', 129, 'new'),
 ('tabli-classico',        'tabli-coffee-tabs__espresso-classico',  'Tablì Espresso Classico', 'capsules', 'tabli', 'signature', 'home office', 125, 'new'),
 ('tabli-intenso',         'tabli-coffee-tabs__espresso-intenso',   'Tablì Espresso Intenso',  'capsules', 'tabli', 'signature', 'home office', 125, 'new'),
 ('tabli-decaf',           'tabli-coffee-tabs__decaf',              'Tablì Decaf',             'capsules', 'tabli', 'signature', 'home',        129, 'new'),
 # Whole beans
 ('beans-qualita-oro',        'coffee-beans__qualita-oro',                 'Qualità Oro',                 'beans', 'beans', 'premium',   'cafe resort home office',  345, 'best'),
 ('beans-qualita-rossa',      'coffee-beans__qualita-rossa',               'Qualità Rossa',               'beans', 'beans', 'everyday',  'cafe guesthouse home office', 525, 'best'),
 ('beans-crema-e-aroma',      'coffee-beans__crema-aroma',                 'Crema e Aroma',               'beans', 'beans', 'everyday',  'cafe resort guesthouse',   560, 'best'),
 ('beans-gran-crema',         'coffee-beans__espresso-barista-gran-crema', 'Espresso Barista Gran Crema', 'beans', 'beans', 'premium',   'cafe resort office',       620, ''),
 ('beans-barista-intenso',    'coffee-beans__espresso-barista-intenso',    'Espresso Barista Intenso',    'beans', 'beans', 'premium',   'cafe resort',              620, ''),
 ('beans-barista-perfetto',   'coffee-beans__espresso-barista-perfetto',   'Espresso Barista Perfetto',   'beans', 'beans', 'premium',   'cafe resort office',       650, ''),
 ('beans-espresso-italiano',  'coffee-beans__espresso-italiano-classico',  'Espresso Italiano Classico',  'beans', 'beans', 'premium',   'cafe resort office home',  590, ''),
 ('beans-crema-e-gusto',      'coffee-beans__crema-e-gusto-classico',      'Crema e Gusto Classico',      'beans', 'beans', 'everyday',  'cafe guesthouse',          520, ''),
 ('beans-caffe-crema',        'coffee-beans__caffe-crema-classico',        'Caffè Crema Classico',        'beans', 'beans', 'everyday',  'cafe guesthouse office',   540, ''),
 ('beans-gran-riserva',       'coffee-beans__qualita-oro-gran-riserva',    'Qualità Oro Gran Riserva',    'beans', 'beans', 'signature', 'resort cafe',              720, ''),
 ('beans-oro-mountain-grown', 'coffee-beans__qualita-oro-mountain-grown',  'Qualità Oro Mountain Grown',  'beans', 'beans', 'signature', 'resort cafe home',         385, ''),
 ('beans-tierra',             'coffee-beans__tierra-organic-planet',       '¡Tierra! For Planet Organic', 'beans', 'beans', 'signature', 'resort cafe home',         395, ''),
 ('beans-tales-of-milano',    'coffee-beans__tales-of-milano',             'Tales of Milano',             'beans', 'beans', 'signature', 'resort home',              240, 'new'),
 ('beans-decaf',              'coffee-beans__decaf-classico',              'Decaf Classico',              'beans', 'beans', 'everyday',  'cafe resort guesthouse home', 330, ''),
 # Ground
 ('ground-qualita-rossa',  'roast-and-ground-coffee__qualita-rossa',                 'Qualità Rossa',               'ground', 'ground', 'everyday',  'home guesthouse office', 129, 'best'),
 ('ground-qualita-oro',    'roast-and-ground-coffee__qualita-oro-perfect-symphony',  'Qualità Oro',                 'ground', 'ground', 'premium',   'home guesthouse office', 149, ''),
 ('ground-crema-e-gusto',  'roast-and-ground-coffee__crema-e-gusto',                 'Crema e Gusto Classico',      'ground', 'ground', 'everyday',  'home guesthouse',        119, ''),
 ('ground-barista-intenso','roast-and-ground-coffee__espresso-barista-intenso',      'Espresso Barista Intenso',    'ground', 'ground', 'premium',   'home guesthouse cafe',   145, ''),
 ('ground-tierra',         'roast-and-ground-coffee__tierra-organic-planet',         '¡Tierra! For Planet Organic', 'ground', 'ground', 'signature', 'home resort',            159, ''),
 ('ground-tales-of-roma',  'roast-and-ground-coffee__eternal-roma',                  'Tales of Roma',               'ground', 'ground', 'signature', 'home resort',            169, 'new'),
 ('ground-decaf',          'roast-and-ground-coffee__decaf.1107',                    'Decaf',                       'ground', 'ground', 'everyday',  'home guesthouse',        139, ''),
 # Machines
 ('m-jolie-evo',       'coffee-machines__jolie-evo.18001396',          'A Modo Mio Jolie Evo',        'machines', 'amm',   'everyday',  'home guesthouse',        2450,  'best'),
 ('m-jolie-evo-plus',  'coffee-machines__a-modo-mio-jolie-plus-evo',   'A Modo Mio Jolie Evo Plus',   'machines', 'amm',   'premium',   'home guesthouse office', 2950,  ''),
 ('m-jolie-milk-evo',  'coffee-machines__a-modo-mio-jolie-milk-evo',   'A Modo Mio Jolie & Milk Evo', 'machines', 'amm',   'premium',   'home guesthouse office', 3950,  'best'),
 ('m-desea',           'coffee-machines__desea',                       'A Modo Mio Deséa',            'machines', 'amm',   'premium',   'home office guesthouse', 5900,  ''),
 ('m-smeg',            'coffee-machines__a-modo-mio-smeg',             'A Modo Mio SMEG',             'machines', 'amm',   'signature', 'home resort',            6900,  ''),
 ('m-voicy',           'coffee-machines__a-modo-mio-voicy',            'A Modo Mio Voicy',            'machines', 'amm',   'signature', 'home office',            6500,  ''),
 ('m-tabli',           'tabli-machines__tabli',                        'Tablì',                       'machines', 'tabli', 'signature', 'home office',            4950,  'new'),
 ('m-assoluta',        'coffee-machines__bean-to-cup-assoluta',        'Assoluta Bean to Cup',        'machines', 'beans', 'signature', 'office guesthouse home resort', 17900, 'new'),
 # Moka pots and makers
 ('mk-carmencita-pro',   'coffee-makers__carmencita-pro',                  'Carmencita Pro Moka Pot',   'makers', 'ground', 'premium',  'home guesthouse', 890, ''),
 ('mk-carmencita-black', 'coffee-makers__carmencita-black',                'Carmencita Black Moka Pot', 'makers', 'ground', 'everyday', 'home guesthouse', 790, ''),
 ('mk-french-press',     'coffee-makers__french-press-cafetiere-by-bodum', 'French Press by Bodum',     'makers', 'ground', 'everyday', 'home guesthouse office', 690, ''),
]

SYSTEM = {
 'amm':    'A Modo Mio',
 'ncc':    'Nespresso Original compatible',
 'tabli':  'Tablì',
 'beans':  'Whole beans',
 'ground': 'Ground coffee',
}
PACK_LABEL = {'amm': '16 capsules', 'ncc': '10 capsules', 'tabli': '12 tabs'}

# what each machine can do, on top of what its spec sheet says
EXTRA_FUNCS = {
 'm-desea':    ['milk', 'programmable'],
 'm-assoluta': ['grinder', 'milk', 'app', 'programmable'],
 'm-jolie-evo-plus': ['programmable', 'lungo'],
 'm-jolie-evo': [],
 'm-tabli': ['programmable', 'lungo'],
 'm-smeg': ['lungo'],
 'm-voicy': ['lungo'],
 'm-jolie-milk-evo': ['lungo'],
}
SAMPLE_STOCK = {'capsules': 140, 'beans': 60, 'ground': 80, 'machines': 9, 'makers': 14}


def clean(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s or ''))).strip()


def tidy(s):
    """Plain sentence text: no stray spaces before punctuation, no shouting."""
    s = clean(s).replace(' ,', ',').replace(' .', '.').replace('floreal', 'floral').replace(',for', ', for')
    return s


def sentence_case(s):
    s = tidy(s)
    if s.isupper() or sum(c.isupper() for c in s) > len(s) * 0.6:
        s = s.capitalize()
        for w in ('Italian', 'Lavazza', 'Alexa', 'Voicy', 'Smeg'):
            s = re.sub(r'\b' + w.lower() + r'\b', w if w != 'Smeg' else 'SMEG', s)
    return s


def fix_url(u):
    u = u.replace('%2540', '%40')
    if u.startswith('/'):
        u = BASE + u
    return u


def curl(u, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 3000:
        return True
    r = subprocess.run(['curl', '-sL', '-A', UA, '--max-time', '60', '-o', dest, '-w', '%{http_code} %{content_type}', u],
                       capture_output=True, text=True)
    ok = r.stdout.startswith('200') and 'image' in r.stdout
    if not ok and os.path.exists(dest):
        os.rename(dest, dest + '.bad')
    return ok


def parse_machine(t):
    feats = [(sentence_case(a), tidy(b)) for a, b in re.findall(
        r'content-title"[^>]*>(.*?)</h4>\s*<p class="lvz-key-features-custom__content-description"[^>]*>(.*?)</p>', t, flags=re.S)]
    feat_imgs = re.findall(r'<img loading="lazy" class="lvz-key-features-custom__image" src="(.*?)"', t)
    specs = [(clean(a), clean(b)) for a, b in re.findall(r'<td role="gridcell">(.*?)</td>\s*<td role="gridcell">(.*?)</td>', t, flags=re.S)]
    seen, out = set(), []
    for k, v in specs:
        if k in seen or not v:
            continue
        seen.add(k)
        out.append((k, v))
    return feats, feat_imgs, out


def build():
    raw = {x['slug']: x for x in json.load(open(os.path.join(SCRATCH, 'raw.json')))}
    os.makedirs(os.path.join(SCRATCH, 'img'), exist_ok=True)
    cat, jobs = [], []
    for pid, slug, name, category, system, cls, env, price, flags in SEL:
        r = raw[slug]
        t = open(os.path.join(SCRATCH, 'pages', slug + '.html'), encoding='utf-8', errors='ignore').read()
        p = dict(id=pid, name=name, category=category, system=system, cls=cls, env=env.split(), price=price,
                 best='best' in flags, isNew='new' in flags, stock=SAMPLE_STOCK[category],
                 desc=tidy(r['desc']), source=BASE + '/en/' + slug.replace('__', '/'))
        if category in ('capsules', 'beans', 'ground'):
            p['pack'] = PACK_LABEL.get(system) or r['pack'].replace('Kg', 'kg')
            if r['intensity']:
                a, b = r['intensity'].split('/')
                p['intensity'], p['scale'] = int(a), int(b)
            p['roast'] = r['roast']
            p['notes'] = [n.strip() for n in r['notes'].split(',') if n.strip()]
            p['blend'] = r['composition']
            p['profile'] = tidy(r['profile'])
            p['profileDesc'] = tidy(r['profileDesc'])
            p['decaf'] = 'decaf' in pid
        if category == 'machines':
            feats, feat_imgs, specs = parse_machine(t)
            p['features'] = [dict(t=a, d=b) for a, b in feats[:4]]
            sd = dict(specs)
            keep = ['Width', 'Depth', 'Height', 'Weight', 'Water Tank Capacity', 'Heat-up time', 'Automatic Shut-off',
                    'Used caps drawer capacity', 'Recipes', 'Coffee Preset', 'Mobile app connectivity', 'Vocal assistant',
                    'Power consuption', 'Voltage']
            label = {'Power consuption': 'Power', 'Used caps drawer capacity': 'Used capsule drawer', 'Coffee Preset': 'Programmable doses',
                     'Mobile app connectivity': 'App connected', 'Vocal assistant': 'Voice assistant', 'Water Tank Capacity': 'Water tank',
                     'Automatic Shut-off': 'Auto shut-off'}
            p['specs'] = [[label.get(k, k), sd[k]] for k in keep if sd.get(k)]
            f = ['espresso']
            rec = sd.get('Recipes', '').lower()
            if 'long' in rec: f.append('lungo')
            if 'milk' in rec: f.append('milk')
            if sd.get('Coffee Preset') == 'Yes': f.append('programmable')
            if sd.get('Mobile app connectivity') == 'Yes': f.append('app')
            if sd.get('Vocal assistant') == 'Yes': f.append('voice')
            if sd.get('Automatic Shut-off'): f.append('autoOff')
            w = re.match(r'(\d+)', sd.get('Width', '999'))
            if w and int(w.group(1)) <= 140: f.append('compact')
            for x in EXTRA_FUNCS.get(pid, []):
                if x not in f: f.append(x)
            p['funcs'] = f
            p['tank'] = sd.get('Water Tank Capacity', '')
            p['heat'] = sd.get('Heat-up time', '')
            p['size'] = ' x '.join(re.sub(r'\s*mm', '', sd[k]) for k in ('Width', 'Depth', 'Height') if sd.get(k)) + ' mm' if sd.get('Width') else ''
            gal = [i for i in r['imgs'] if 'carousel' in i.lower()][:4]
            for n, g in enumerate(gal):
                jobs.append((fix_url(g), os.path.join(SCRATCH, 'img', f'{pid}--g{n}' + os.path.splitext(g)[1])))
            for n, g in enumerate(feat_imgs[:4]):
                jobs.append((fix_url(g), os.path.join(SCRATCH, 'img', f'{pid}--f{n}' + os.path.splitext(g)[1])))
            p['gallery'] = len(gal)
        # packshot: desktop variant first, then the mobile one named in the page's product data
        m = fix_url(r['image'])
        base = m.split('/')[-1]
        want = re.sub(r'(^|-)m-', r'\1d-', base, count=1).lower()
        pngs = [fix_url(u) for u in sorted(set(re.findall(r'(/content/dam/[^"\'\s)]+\.png)', t)))]
        d = [u for u in pngs if u.split('/')[-1].lower() == want and u != m]
        p['_img'] = d[:1] + [m]
        if r.get('heroBg'):
            jobs.append((fix_url(r['heroBg'].replace(' ', '%20')), os.path.join(SCRATCH, 'img', f'{pid}--bg.jpg')))
        cat.append(p)

    def packshot(p):
        for u in p['_img']:
            dest = os.path.join(SCRATCH, 'img', p['id'] + os.path.splitext(u.split('?')[0])[1])
            if curl(u, dest):
                return p['id'], dest
        return p['id'], None

    with cf.ThreadPoolExecutor(4) as ex:
        shots = dict(ex.map(packshot, cat))
        list(ex.map(lambda j: curl(*j), jobs))
    missing = [k for k, v in shots.items() if not v]
    for p in cat:
        p.pop('_img')
    json.dump(cat, open(os.path.join(SCRATCH, 'catalogue.json'), 'w'), indent=1, ensure_ascii=False)
    print(len(cat), 'products;', 'missing packshots:', missing or 'none')


def write_data():
    cat = json.load(open(os.path.join(SCRATCH, 'catalogue.json')))
    img_dir = os.path.join(ROOT, 'assets', 'img', 'products')
    have = set(os.listdir(img_dir))
    for p in cat:
        assert p['id'] + '.webp' in have, 'no image for ' + p['id']
        if p['category'] == 'machines':
            p['gallery'] = [f"{p['id']}--g{n}.webp" for n in range(p['gallery']) if f"{p['id']}--g{n}.webp" in have]
    head = ("/* Demo catalogue. Generated by tools/build_data.py, do not edit by hand.\n"
            "   Product facts are from lavazza.com. Prices, stock and segment tags are SAMPLE values. */\n")
    body = 'window.LV_CATALOGUE = ' + json.dumps(cat, indent=1, ensure_ascii=False) + ';\n'
    body += 'window.LV_SYSTEMS = ' + json.dumps(SYSTEM, ensure_ascii=False) + ';\n'
    open(os.path.join(ROOT, 'assets', 'js', 'data.js'), 'w').write(head + body)
    print('wrote data.js with', len(cat), 'products')


if __name__ == '__main__':
    write_data() if MODE == 'data' else build()
