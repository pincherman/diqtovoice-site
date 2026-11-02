"""Public hero contract; run after the static Next build on KITT."""
import os
from pathlib import Path
from html.parser import HTMLParser
import unittest

ROOT = Path(os.environ.get('SITE_TEST_ROOT', Path(__file__).resolve().parents[1]))


class Hero(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.depth = 0
        self.links = []
        self.notes = []
        self.note = None
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'section':
            if attrs.get('data-scene') == 'wall' or self.depth:
                self.depth += 1
        if not self.depth:
            return
        if tag == 'a':
            self.links.append(attrs)
        if tag == 'p' and 'hero-note' in (attrs.get('class') or '').split():
            self.note = []

    def handle_data(self, data):
        if self.note is not None:
            self.note.append(data)

    def handle_endtag(self, tag):
        if tag == 'p' and self.note is not None:
            self.notes.append(''.join(self.note))
            self.note = None
        if tag == 'section' and self.depth:
            self.depth -= 1


class LaunchHero(unittest.TestCase):
    def test_one_positive_platform_note_per_locale(self):
        for locale, expected in [
            ('fr', 'Bientôt sur Windows et Mac.'),
            ('en', 'Coming soon to Windows and Mac.'),
        ]:
            with self.subTest(locale=locale):
                hero = Hero((ROOT / 'out' / locale / 'index.html').read_text())
                self.assertEqual(len(hero.notes), 1)
                self.assertTrue(hero.notes[0].startswith(expected), hero.notes)
                self.assertEqual(hero.notes[0].count('Windows'), 1)
                self.assertEqual(hero.notes[0].count('Mac'), 1)
                for app in ['Teams', 'Zoom', 'Google Meet', 'Webex']:
                    self.assertIn(app, hero.notes[0])
                self.assertNotIn('pas encore ouverts', hero.notes[0])
                self.assertNotIn('not open yet', hero.notes[0])

    def test_only_the_primary_launch_link_remains(self):
        for locale in ['fr', 'en']:
            with self.subTest(locale=locale):
                hero = Hero((ROOT / 'out' / locale / 'index.html').read_text())
                self.assertEqual(len(hero.links), 1)
                self.assertEqual(hero.links[0]['href'], '#disponibilite')
                self.assertIn('btn', hero.links[0]['class'].split())


if __name__ == '__main__':
    unittest.main(verbosity=2)
