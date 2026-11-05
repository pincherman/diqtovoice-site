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


PURPOSE_FR = 'Diqto Voice est une application de traduction vocale pour vos réunions : vous parlez votre langue, et vous entendez votre interlocuteur dans la vôtre.'
PURPOSE_EN = 'Diqto Voice is a voice translation application designed to let you speak your language and hear the other person in your language during meetings.'


def robot_groups(source):
    """Read the one-user-agent groups emitted by this site's Next metadata route."""
    groups, current = {}, None
    for line in source.splitlines():
        key, sep, value = line.partition('#')[0].partition(':')
        if not sep:
            continue
        key, value = key.strip().lower(), value.strip()
        if key == 'user-agent':
            if value in groups:
                raise ValueError('Duplicate crawler group')
            current = groups[value] = {'allow': [], 'disallow': []}
        elif key in ('allow', 'disallow') and current is not None:
            current[key].append(value)
    return groups


def can_crawl(groups, agent, path):
    """Most-specific matching for the generated literal + wildcard REP subset.

    Unlike urllib.robotparser's first-match rules, a narrower Disallow must win
    over Allow: /. Specific agent groups replace the wildcard group's rules.
    This is an offline policy check, not evidence that a live bot obeys it.
    """
    names = [name for name in groups if name != '*' and name.lower() in agent.lower()]
    selected = max(names, key=len) if names else '*'
    matches = []
    for directive, rules in groups.get(selected, {}).items():
        for rule in rules:
            if not rule:
                continue
            terminal = rule.endswith('$')
            pattern = rule[:-1] if terminal else rule
            expression = re.escape(pattern).replace(r'\*', '.*')
            if re.match(expression + (r'\Z' if terminal else ''), path):
                specificity = len(pattern.replace('*', '').encode('utf-8'))
                matches.append((specificity, directive == 'allow'))
    return max(matches, default=(0, True))[1]


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
                if str(rel) not in ('fr/legal/index.html', 'en/legal/index.html'):
                    forbidden.append(str(rel))
        self.assertEqual(forbidden, [], 'Private token outside the two legal HTML files')
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
                purpose_question = 'À quoi sert Diqto Voice ?' if locale == 'fr' else 'What is Diqto Voice?'
                purpose = PURPOSE_FR if locale == 'fr' else PURPOSE_EN
                entity = next(v for v in faq['mainEntity'] if v['name'] == purpose_question)
                self.assertTrue(entity['acceptedAnswer']['text'] == purpose, 'Purpose FAQ answer mismatch')
                self.assertTrue(purpose_question + purpose in d.details, 'Visible purpose FAQ mismatch')
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
                expected = 'noindex, noarchive, nosnippet' if page == 'legal' else 'index, follow'
                self.assertEqual(robots, [expected])

    def test_07_unmodified_legal_fields_and_footer_links_preserved(self):
        baseline = subprocess.check_output(['git', 'show', f'{BASE}:components/pages/PublicInfo.tsx'], cwd=ROOT, text=True)
        current = (ROOT / 'components/pages/PublicInfo.tsx').read_text()
        # E2 explicitly authorizes publisher completion, not changes to the
        # office, director, provider identity or closed-sales notice.
        labels = ('Siège social et adresse de correspondance', 'Registered office and correspondence address', 'Directeur de la publication', 'Publication director', 'Hébergeur', 'Hosting provider', 'Ce site présente Diqto Voice', 'This website introduces Diqto Voice')
        for label in labels:
            suffix = r"\." if label.startswith(('Ce site', 'This website')) else r"\s*:"
            pattern = r"'" + re.escape(label) + suffix + r"(?:\\.|[^'\\])*'"
            before, after = re.findall(pattern, baseline), re.findall(pattern, current)
            self.assertTrue(len(before) == len(after) == 1 and before == after, 'Retained legal paragraph changed: ' + label)
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


    def test_10_ai_robots_exact_legal_exclusions(self):
        groups = robot_groups((OUT / 'robots.txt').read_text())
        agents = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot',
                  'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended']
        for agent in agents:
            with self.subTest(agent=agent):
                self.assertIn(agent, groups)
                self.assertEqual(groups[agent]['allow'], ['/'])
                self.assertEqual(sorted(groups[agent]['disallow']), ['/en/legal/', '/fr/legal/'])
        for agent in ('*', 'Googlebot', 'Bingbot'):
            self.assertIn(agent, groups)
            disallow = ['/fr/legal/', '/en/legal/'] if agent == '*' else ['/fr/legal/*.txt', '/en/legal/*.txt']
            self.assertEqual(groups[agent], {'allow': ['/'], 'disallow': disallow})
        self.assertEqual(set(groups), set(agents + ['*', 'Googlebot', 'Bingbot']))

    def test_11_search_robots_keep_legal_readable(self):
        groups = robot_groups((OUT / 'robots.txt').read_text())
        for agent in ['*', 'Googlebot', 'Bingbot', 'CCBot', 'GPTBot', 'ClaudeBot',
                      'Claude-User', 'Amazonbot', 'meta-externalagent', 'UnlistedBot']:
            for locale in ('fr', 'en'):
                for suffix, expected in [('legal/', agent in ('Googlebot', 'Bingbot')),
                                         ('legal/index.txt', False), ('legal/__next._full.txt', False),
                                         ('', True), ('privacy/', True)]:
                    path = f'/{locale}/{suffix}'
                    with self.subTest(agent=agent, path=path):
                        self.assertEqual(can_crawl(groups, agent, path), expected)

    def test_12_no_legal_text_copies(self):
        for locale in ('fr', 'en'):
            copies = sorted(str(p.relative_to(OUT)) for p in (OUT / locale / 'legal').rglob('*.txt') if p.is_file())
            self.assertEqual(copies, [], 'Next text copies remain under a legal route')

    def test_13_csp_still_forbids_connections(self):
        for route, page in [('', ''), ('fr', ''), ('en', ''), ('fr', 'legal'), ('en', 'legal')]:
            policies = [m['content'] for m in doc(route, page).meta
                        if m.get('http-equiv', '').lower() == 'content-security-policy']
            self.assertEqual(len(policies), 1)
            self.assertTrue("connect-src 'none'" in policies[0], 'CSP connection restriction lost')


class RobotsMatcherControls(unittest.TestCase):
    def test_narrow_disallow_wins_even_after_allow_slash(self):
        groups = robot_groups('User-agent: *\nAllow: /\nDisallow: /fr/legal/\n')
        self.assertFalse(can_crawl(groups, 'CCBot', '/fr/legal/'))
        self.assertTrue(can_crawl(groups, 'CCBot', '/fr/'))

    def test_specific_group_replaces_wildcard_and_blocks_text(self):
        groups = robot_groups('User-agent: *\nDisallow: /fr/legal/\n\nUser-agent: Googlebot\nAllow: /\nDisallow: /fr/legal/*.txt\n')
        self.assertTrue(can_crawl(groups, 'googlebot', '/fr/legal/'))
        self.assertFalse(can_crawl(groups, 'googlebot', '/fr/legal/__next.!french.legal.__PAGE__.txt'))

    def test_allow_tie_and_terminal_marker(self):
        groups = robot_groups('User-agent: *\nDisallow: /x\nAllow: /x\nDisallow: /y$\n')
        self.assertTrue(can_crawl(groups, 'OtherBot', '/x'))
        self.assertFalse(can_crawl(groups, 'OtherBot', '/y'))
        self.assertTrue(can_crawl(groups, 'OtherBot', '/yes'))


if __name__ == '__main__':
    unittest.main(verbosity=2)
