"""Audit exported bytes without printing or storing the private address."""
import html
import json
import os
from pathlib import Path
import re
import subprocess
import unicodedata
import unittest
from urllib.parse import unquote
from html.parser import HTMLParser
import xml.etree.ElementTree as ET

ROOT = Path(os.environ.get('SITE_TEST_ROOT', Path(__file__).resolve().parents[1]))
OUT = ROOT / 'out'
BASE = '6a19884f586420c3511649476d9a4182e9c6f980'
ORIGIN = 'https://diqtovoice.com'
FAQ = {
    'fr': ('Qui est derrière Diqto Voice ?', 'DIQTO SAS, société française basée à Marseille. Ses informations légales figurent dans les mentions légales.'),
    'en': ('Who is behind Diqto Voice?', 'DIQTO SAS, a French company based in Marseille. Its legal details are in the legal notice.'),
}
CONTACT = {
    'fr': "Pour une demande relative au site, écrivez à DIQTO SAS à l'adresse du siège indiquée dans les mentions légales.",
    'en': 'For a request about this website, write to DIQTO SAS at the registered office address given in the legal notice.',
}


def normalize(value):
    value = unquote(html.unescape(value))
    value = re.sub(r'\\u([a-fA-F0-9]{4})', lambda m: chr(int(m[1], 16)), value)
    value = unicodedata.normalize('NFKD', value).casefold()
    return ' '.join(''.join(c for c in value if not unicodedata.combining(c)).split())


def private_tokens():
    source = (ROOT / 'components/pages/PublicInfo.tsx').read_text()
    match = re.search(r'Siège social et adresse de correspondance : \d+\s+\w+\s+(.+?),\s*(\d{5})\b', source)
    if not match:
        raise RuntimeError('Cannot derive private tokens from the retained legal source')
    return tuple(normalize(v) for v in match.groups())


class Doc(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.meta, self.links, self.anchors, self.text, self.schemas = [], [], [], [], []
        self.stack, self.details, self.paragraphs, self.paragraph_links = [], [], [], []
        self.script_type = None
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == 'meta': self.meta.append(d)
        if tag == 'link': self.links.append(d)
        if tag == 'a':
            self.anchors.append(d)
            for _, _, anchors in self.stack: anchors.append(d)
        if tag in ('details', 'p'): self.stack.append([tag, [], []])
        if tag == 'script': self.script_type = d.get('type', 'script')

    def handle_endtag(self, tag):
        if tag == 'script': self.script_type = None
        if tag in ('details', 'p') and self.stack and self.stack[-1][0] == tag:
            _, chunks, anchors = self.stack.pop()
            (self.details if tag == 'details' else self.paragraphs).append(''.join(chunks))
            if tag == 'p': self.paragraph_links.append((''.join(chunks), anchors))

    def handle_data(self, data):
        if self.script_type == 'application/ld+json': self.schemas.append(json.loads(data))
        if self.script_type is None:
            self.text.append(data)
            for _, chunks, _ in self.stack: chunks.append(data)


def doc(locale, page=''):
    return Doc((OUT / locale / page / 'index.html').read_text())


class Privacy(unittest.TestCase):
    def test_01_every_exported_file_confines_street_and_postcode(self):
        tokens = private_tokens()
        files = sorted(p for p in OUT.rglob('*') if p.is_file())
        self.assertTrue(files, 'Export missing')
        hits, forbidden = {}, []
        for p in files:
            rel = p.relative_to(OUT)
            text = normalize(p.read_bytes().decode('utf-8', errors='ignore'))
            kinds = [label for label, token in zip(('street', 'postcode'), tokens) if token in text]
            if kinds:
                hits[str(rel)] = kinds
                if not (len(rel.parts) >= 3 and rel.parts[0] in ('fr', 'en') and rel.parts[1] == 'legal'):
                    forbidden.append(str(rel))
        self.assertEqual(forbidden, [], 'Private token outside the two legal route namespaces')
        for locale in ('fr', 'en'):
            self.assertEqual(hits.get(f'{locale}/legal/index.html'), ['street', 'postcode'])
        print(json.dumps({'files_scanned': len(files), 'allowed_legal_artifacts': hits, 'forbidden_files': forbidden}, ensure_ascii=False))

    def test_02_faq_visible_and_jsonld_exact_for_all_homes(self):
        for route, locale in (('', 'fr'), ('fr', 'fr'), ('en', 'en')):
            with self.subTest(route=route or '/'):
                d = doc(route)
                question, answer = FAQ[locale]
                self.assertTrue(question + answer in d.details, 'Visible publisher FAQ mismatch')
                graph = d.schemas[0]['@graph']
                faq = next(v for v in graph if v['@type'] == 'FAQPage')
                entity = next(v for v in faq['mainEntity'] if v['name'] == question)
                self.assertTrue(entity['acceptedAnswer']['text'] == answer, 'FAQ answer mismatch')
                for entity in faq['mainEntity']:
                    self.assertTrue(entity['name'] + entity['acceptedAnswer']['text'] in d.details, 'Visible and structured FAQ differ')

    def test_03_organization_only_locality_and_country(self):
        for route in ('', 'fr', 'en'):
            org = next(v for v in doc(route).schemas[0]['@graph'] if v['@type'] == 'Organization')
            self.assertEqual(set(org['address']), {'@type', 'addressLocality', 'addressCountry'})
            self.assertEqual(org['address']['addressLocality'], 'Marseille')
            self.assertEqual(org['address']['addressCountry'], 'FR')

    def test_04_llms_publisher_exact(self):
        text = (OUT / 'llms.txt').read_text()
        self.assertTrue('DIQTO SAS, SIREN 106 569 619, Marseille, France.' in text.splitlines(), 'Publisher line mismatch')

    def test_05_privacy_contact_exact_with_localized_link(self):
        for locale in ('fr', 'en'):
            d = doc(locale, 'privacy')
            self.assertTrue(any(p.startswith(CONTACT[locale]) for p in d.paragraphs), 'Contact sentence mismatch')
            self.assertTrue(any(p.startswith(CONTACT[locale]) and any(a.get('href') == f'/{locale}/legal/' for a in anchors) for p, anchors in d.paragraph_links), 'Inline legal link missing')
            self.assertTrue(any('GitHub' in p and 'IP' in p for p in d.paragraphs), 'Hosting notice lost')
            self.assertTrue(any('CNIL' in p for p in d.paragraphs), 'Rights paragraph lost')

    def test_06_legal_noindex_other_public_pages_indexable(self):
        for locale in ('fr', 'en'):
            for page in ('', 'privacy', 'legal'):
                robots = [m.get('content') for m in doc(locale, page).meta if m.get('name') == 'robots']
                self.assertEqual(robots, ['noindex, follow' if page == 'legal' else 'index, follow'])

    def test_07_legal_text_unchanged_and_footer_links_preserved(self):
        baseline = subprocess.check_output(['git', 'show', f'{BASE}:components/pages/PublicInfo.tsx'], cwd=ROOT, text=True)
        current = (ROOT / 'components/pages/PublicInfo.tsx').read_text()
        extract = lambda s: [line for line in s.splitlines() if line.strip().startswith('legal:')]
        self.assertTrue(extract(current) == extract(baseline), 'Legal paragraphs changed')
        for locale in ('fr', 'en'):
            self.assertTrue(any(a.get('href') == f'/{locale}/legal/' for a in doc(locale).anchors))

    def test_08_sitemap_excludes_legal_including_alternates(self):
        tree = ET.parse(OUT / 'sitemap.xml')
        ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        actual = {e.text for e in tree.findall('s:url/s:loc', ns)}
        expected = {ORIGIN + '/' + locale + '/' + page for locale in ('fr', 'en') for page in ('', 'privacy/')}
        self.assertEqual(actual, expected)
        self.assertTrue('/legal/' not in (OUT / 'sitemap.xml').read_text())

    def test_09_drafts_and_facts_have_no_private_tokens(self):
        tokens = private_tokens()
        paths = sorted((ROOT / 'content').rglob('*'))
        bad = [str(p.relative_to(ROOT)) for p in paths if p.is_file() and any(t in normalize(p.read_text(errors='ignore')) for t in tokens)]
        self.assertEqual(bad, [], 'Private address in content inputs')


if __name__ == '__main__':
    unittest.main(verbosity=2)
