"""Apple+T1 checks against the real Next export, without a browser."""
import json
import os
from html.parser import HTMLParser
from pathlib import Path
import unittest
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

from privacy_export_test import Doc, normalize, private_tokens

ROOT = Path(os.environ.get('SITE_TEST_ROOT', Path(__file__).resolve().parents[1]))
OUT = ROOT / 'out'
ORIGIN = 'https://diqtovoice.com'
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


class Elements(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.nodes, self.stack = [], []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        node = {'tag': tag, 'attrs': dict(attrs), 'text': [], 'order': len(self.nodes),
                'parent': self.stack[-1] if self.stack else None}
        self.nodes.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i]['tag'] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        for node in self.stack:
            node['text'].append(data)

    def by_class(self, name):
        return [n for n in self.nodes if name in n['attrs'].get('class', '').split()]

    def by_id(self, name):
        return [n for n in self.nodes if n['attrs'].get('id') == name]


def text(node):
    return ''.join(node['text'])


def home(route):
    return (OUT / route / 'index.html').read_text()


class DesignT1Export(unittest.TestCase):
    def test_01_real_template_and_exact_public_text_on_three_homes(self):
        for route, locale in [('', 'fr'), ('fr', 'fr'), ('en', 'en')]:
            with self.subTest(route=route or '/'):
                source = home(route)
                d = Elements(source)
                fr = locale == 'fr'
                expected = {
                    'hook': 'La barrière de la langue vient de tomber.' if fr else 'The language barrier has just fallen.',
                    'download-msg': 'Bientôt sur Windows et Mac, pour Teams, Zoom, Google Meet et Webex.' if fr else 'Coming soon to Windows and Mac, for Teams, Zoom, Google Meet and Webex.',
                    't-world': 'Vous parlez français. On vous comprend de New York à Tokyo.' if fr else 'Speak from Paris. Be understood from New York to Tokyo.',
                    't-hello': 'Chacun parle sa langue.' if fr else 'Everyone speaks their own language.',
                    't-tarifs': 'Bientôt disponible.' if fr else 'Coming soon.',
                    't-faq': 'Questions fréquentes.' if fr else 'Frequently asked questions.',
                    't-slogan': 'Votre voix n’a plus de frontières.' if fr else 'Your voice has no more borders.',
                }
                for key, value in expected.items():
                    self.assertEqual(len(d.by_id(key)), 1, key)
                    self.assertEqual(text(d.by_id(key)[0]), value, key)
                note = d.by_class('hero-note')[0]
                more = d.by_class('more')
                self.assertEqual(len(more), 1)
                self.assertEqual(text(more[0]), 'Voir comment ça marche' if fr else 'See how it works')
                self.assertEqual(more[0]['attrs']['href'], '#comment')
                self.assertLess(note['order'], more[0]['order'])
                self.assertEqual(d.by_id('comment')[0]['attrs']['aria-labelledby'], 't-nothing')
                self.assertEqual(text(d.by_class('finale-note')[0]), 'Bientôt sur Windows et Mac.' if fr else 'Coming soon to Windows and Mac.')
                self.assertFalse(d.by_class('btn') or d.by_class('biz-cta') or d.by_class('plans'))
                self.assertFalse('data-veil' in source or 'veiled' in source or '{{' in source)
                self.assertEqual([n['attrs'].get('id') for n in d.nodes if n['tag'] == 'button'], ['pause', 'menu-btn'])
                ids = {n['attrs']['id'] for n in d.nodes if 'id' in n['attrs']}
                self.assertEqual(len(ids), sum('id' in n['attrs'] for n in d.nodes))
                for node in d.nodes:
                    href = node['attrs'].get('href', '')
                    if href.startswith('#'):
                        self.assertIn(href[1:], ids)

    def test_02_identical_website_and_real_logo_on_three_exported_homes(self):
        websites = []
        for route in ('', 'fr', 'en'):
            graph = Doc(home(route)).schemas[0]['@graph']
            sites = [n for n in graph if n['@type'] == 'WebSite']
            self.assertEqual(len(sites), 1)
            websites.append(sites[0])
            org = next(n for n in graph if n['@type'] == 'Organization')
            self.assertEqual(org['logo'], ORIGIN + '/favicon.svg')
            self.assertTrue((OUT / urlparse(org['logo']).path.lstrip('/')).is_file())
            self.assertNotRegex(json.dumps(graph), r'"(?:sameAs|offers|price|priceCurrency|numberOfItems|aggregateRating)"')
        self.assertEqual(websites, [websites[0]] * 3)
        self.assertEqual(websites[0]['publisher']['@id'], ORIGIN + '/#organization')
        self.assertEqual(websites[0]['url'], ORIGIN + '/')

    def test_03_head_sitemap_alternates_and_meaningful_dates(self):
        ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9', 'x': 'http://www.w3.org/1999/xhtml'}
        tree = ET.parse(OUT / 'sitemap.xml')
        entries = tree.findall('s:url', ns)
        self.assertEqual(len(entries), 4)
        for entry in entries:
            location = entry.find('s:loc', ns)
            assert location is not None and location.text is not None
            loc = location.text
            route = urlparse(loc).path.strip('/')
            sitemap_links = {e.get('hreflang'): e.get('href') for e in entry.findall('x:link', ns)}
            d = Doc(home(route))
            head_links = {e['hreflang']: e['href'] for e in d.links if e.get('rel') == 'alternate'}
            self.assertEqual(head_links, sitemap_links)
            suffix = 'privacy/' if route.endswith('privacy') else ''
            self.assertEqual(sitemap_links, {'fr': ORIGIN + '/fr/' + suffix, 'en': ORIGIN + '/en/' + suffix, 'x-default': ORIGIN + '/en/' + suffix})
            self.assertEqual([e['href'] for e in d.links if e.get('rel') == 'canonical'], [loc])
            lastmod = entry.find('s:lastmod', ns)
            assert lastmod is not None
            self.assertEqual(lastmod.text, '2026-11-02' if suffix else '2026-11-03')
        root = Doc(home(''))
        self.assertEqual([e['href'] for e in root.links if e.get('rel') == 'canonical'], [ORIGIN + '/fr/'])
        self.assertEqual([e['href'] for e in root.links if e.get('hreflang') == 'x-default'], [ORIGIN + '/en/'])

    def test_04_active_assets_are_local_system_fonts_and_exact_motion(self):
        all_css = []
        for route in ('', 'fr', 'en'):
            d = Doc(home(route))
            stylesheets = [e['href'] for e in d.links if e.get('rel') == 'stylesheet']
            self.assertTrue(stylesheets)
            for href in stylesheets:
                self.assertTrue(href.startswith('/'))
                css = (OUT / href.lstrip('/')).read_text()
                all_css.append(css)
                self.assertNotRegex(css, r'Work\s?Sans|@font-face|\.veiled')
        active_css = '\n'.join(all_css)
        for fragment in ('SF Pro Text', 'Segoe UI Variable Text', '.more', '.finale-note', 'prefers-reduced-transparency', 'prefers-contrast'):
            self.assertIn(fragment, active_css)
        self.assertEqual((OUT / 'motion/home.js').read_bytes(), (ROOT / 'public/motion/home.js').read_bytes())
        self.assertFalse((OUT / 'fonts/WorkSans.ttf').exists())
        self.assertNotIn('Host:', (OUT / 'robots.txt').read_text())
        self.assertEqual((OUT / 'llms.txt').read_bytes(), (ROOT / 'public/llms.txt').read_bytes())

    def test_05_exact_existing_html_routes_and_waiting_pages_noindex(self):
        expected = {'index.html', '404.html', '404/index.html', '_not-found/index.html'}
        for locale in ('fr', 'en'):
            expected.update(f'{locale}/{suffix}index.html' for suffix in ('', 'beta/', 'legal/', 'privacy/', 'roi/', 'security/'))
        expected.update(f'{page}/index.html' for page in ('beta', 'roi', 'security'))
        self.assertEqual({str(p.relative_to(OUT)) for p in OUT.rglob('*.html')}, expected)
        for prefix in ('', 'fr/', 'en/'):
            for page in ('beta', 'roi', 'security'):
                d = Doc(home(prefix + page))
                self.assertTrue(any('noindex' in e.get('content', '') for e in d.meta if e.get('name') == 'robots'))

    def test_06_exactly_eight_legal_artifacts_and_no_private_tokens_in_reports(self):
        tokens = private_tokens()
        hits = []
        for file in OUT.rglob('*'):
            if file.is_file():
                contents = normalize(file.read_bytes().decode('utf8', errors='ignore'))
                if any(token in contents for token in tokens):
                    hits.append(file.relative_to(OUT))
        self.assertEqual(len(hits), 8)
        self.assertTrue(all(len(p.parts) >= 3 and p.parts[0] in ('fr', 'en') and p.parts[1] == 'legal' for p in hits))
        # An optional task-owned reports directory extends, not replaces, the private-byte oracle.
        reports = os.environ.get('SITE_REPORT_ROOT')
        if reports:
            bad = []
            for file in Path(reports).rglob('*'):
                if file.is_file() and any(token in normalize(file.read_bytes().decode('utf8', errors='ignore')) for token in tokens):
                    bad.append(file.name)
            self.assertEqual(bad, [], 'Private token in task report or immutable input')


if __name__ == '__main__':
    unittest.main(verbosity=2)
