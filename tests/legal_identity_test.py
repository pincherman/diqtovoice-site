"""E2 publication candidate: proven company fields, unproved fields omitted.
Never include the registered-office value in a fixture or a failure message.
"""
import os
from pathlib import Path
import re
import subprocess
import unittest
from html.parser import HTMLParser

ROOT = Path(os.environ.get('SITE_TEST_ROOT', Path(__file__).resolve().parents[1]))
BASE = 'aa2033da24c663f212f83c3f57d8b9838971cde3'


class Paragraphs(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.paragraphs, self.current = [], None
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        if tag == 'p':
            self.current = []

    def handle_data(self, data):
        if self.current is not None:
            self.current.append(data)

    def handle_endtag(self, tag):
        if tag == 'p' and self.current is not None:
            self.paragraphs.append(''.join(self.current))
            self.current = None


def paragraphs(locale, page='legal'):
    return Paragraphs((ROOT / 'out' / locale / page / 'index.html').read_text()).paragraphs


class LegalIdentity(unittest.TestCase):
    def test_verified_company_fields_in_both_locales(self):
        expected = {
            'fr': 'Éditeur : DIQTO, société par actions simplifiée unipersonnelle (SASU) au capital de 1 000 €. SIREN : 106 569 619.',
            'en': 'Publisher: DIQTO, a French single-member simplified joint-stock company (SASU), with share capital of EUR 1,000. French company identifier (SIREN): 106 569 619.',
        }
        for locale, value in expected.items():
            self.assertTrue(value in paragraphs(locale), 'Verified publisher fields missing: ' + locale)

    def test_unverified_fields_are_absent_in_both_locales(self):
        for locale in ('fr', 'en'):
            ps = paragraphs(locale)
            labels = ('RCS', 'Téléphone', 'E-mail', 'TVA intracommunautaire', "Téléphone de l’hébergeur") if locale == 'fr' else ('RCS', 'Telephone', 'Email', 'Intra-community VAT number', 'Hosting provider telephone')
            for label in labels:
                self.assertFalse(any(re.match(re.escape(label) + r'\s*:', p) for p in ps), 'Unproved field must be omitted: ' + locale + ':' + label)
            self.assertFalse(any('FR70106569619' in p or 'TVA non applicable' in p or 'VAT not applicable' in p for p in ps), 'Unverified VAT claim must not be emitted')

    def test_registered_office_paragraphs_are_byte_unchanged(self):
        old = subprocess.check_output(['git', 'show', BASE + ':components/pages/PublicInfo.tsx'], cwd=ROOT, text=True)
        new = (ROOT / 'components/pages/PublicInfo.tsx').read_text()
        pattern = r"'(?:Siège social et adresse de correspondance|Registered office and correspondence address)\s*:[^']*'"
        before, after = re.findall(pattern, old), re.findall(pattern, new)
        self.assertTrue(len(before) == len(after) == 2 and before == after, 'Registered-office source changed')

    def test_no_pending_fields_anywhere_in_export(self):
        files = sorted(p for p in (ROOT / 'out').rglob('*') if p.is_file())
        self.assertTrue(files, 'Export missing')
        forbidden = []
        for path in files:
            text = path.read_bytes().decode('utf-8', errors='ignore').casefold()
            if 'à compléter' in text or 'to be completed' in text:
                forbidden.append(str(path.relative_to(ROOT / 'out')))
        self.assertEqual(forbidden, [], 'Pending fields must not appear in any served artifact')

    def test_source_delta_only_omits_unproved_legal_paragraphs(self):
        old = subprocess.check_output(['git', 'show', 'df4b9901953ed7b5b03c3fb7f96fe1fd70aab039:components/pages/PublicInfo.tsx'], cwd=ROOT, text=True)
        expected, removed = re.subn(r", '[^'\n]*\[À COMPLÉTER[^'\n]*'", '', old)
        current = (ROOT / 'components/pages/PublicInfo.tsx').read_text()
        self.assertTrue(removed == 10 and current == expected, 'Only the ten unproved FR/EN paragraphs may change; D1 and all retained text must remain byte-identical')


if __name__ == '__main__':
    unittest.main()
