"""Exercise the real notifier offline; never contact a provider."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = sorted('https://diqtovoice.com' + p for p in (
    '/', '/fr/', '/en/', '/fr/legal/', '/en/legal/',
    '/fr/privacy/', '/en/privacy/', '/llms.txt',
))
spec = importlib.util.spec_from_file_location('submit_indexnow', ROOT / 'scripts/submit-indexnow.py')
assert spec is not None and spec.loader is not None
notifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(notifier)


def no_network(event, args):
    if event in ('socket.connect', 'socket.getaddrinfo'):
        raise AssertionError('Real network forbidden in notifier tests')


sys.addaudithook(no_network)


class Response:
    def __init__(self, body=b'', status=200):
        self.body, self.status = body, status
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def read(self): return self.body


class IndexNowPrivacy(unittest.TestCase):
    def execute(self, status=202, mismatch=False):
        posts = []
        def transport(request, timeout):
            if isinstance(request, str):
                key = request.rsplit('/', 1)[1].removesuffix('.txt')
                return Response(b'mismatch' if mismatch else key.encode())
            self.assertEqual(request.full_url, 'https://api.indexnow.org/indexnow')
            self.assertEqual(request.get_method(), 'POST')
            posts.append(json.loads(request.data))
            return Response(status=status)
        captured = io.StringIO()
        with patch.object(notifier.urllib.request, 'urlopen', transport), patch.object(notifier.time, 'sleep'), contextlib.redirect_stdout(captured):
            if mismatch:
                with self.assertRaisesRegex(RuntimeError, 'Public ownership key does not match'):
                    notifier.main()
            else:
                notifier.main()
        return posts, captured.getvalue()

    def test_exact_eight_urls_including_removed_legal_and_llms(self):
        for status in (200, 202):
            with self.subTest(status=status):
                posts, text = self.execute(status=status)
                self.assertEqual(len(posts), 1)
                self.assertEqual(posts[0]['urlList'], EXPECTED)
                receipt = json.loads(text)
                self.assertEqual(receipt['submitted_count'], 8)
                self.assertEqual(receipt['indexed'], 'not_proven')

    def test_mismatched_ownership_refuses_before_any_post(self):
        posts, _ = self.execute(mismatch=True)
        self.assertEqual(posts, [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
