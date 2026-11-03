import hashlib
import importlib.util
import json
import os
import pathlib
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('frozen', pathlib.Path(__file__).with_name('frozen-export.py'))
assert SPEC is not None and SPEC.loader is not None
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)
SOURCE = 'b' * 40


class FrozenExport(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(dir=os.environ['TMPDIR'])
        self.addCleanup(self.tmp.cleanup)
        self.base = pathlib.Path(self.tmp.name)
        self.root = self.base / 'site'
        self.root.mkdir()
        (self.root / '.nojekyll').write_bytes(b'')
        (self.root / 'index.html').write_bytes(b'<html>reviewed</html>\n')
        self.files = {p.name: M.sha(p.read_bytes()) for p in self.root.iterdir()}
        self.manifest = self.base / 'manifest.json'
        self.manifest.write_text(json.dumps({'sourceSha': SOURCE, 'files': self.files}))
        self.digest = M.sha(self.manifest.read_bytes())

    def verify(self, digest=None, source=SOURCE, count=2):
        return M.verified(self.root, self.manifest, digest or self.digest, source, count)

    def test_exact_positive(self):
        self.assertEqual(set(self.verify()[1]), set(self.files))

    def test_changed_member_rejected(self):
        (self.root / 'index.html').write_bytes(b'not reviewed')
        with self.assertRaisesRegex(ValueError, 'SHA-256 mismatch'):
            self.verify()

    def test_missing_member_rejected(self):
        (self.root / 'index.html').unlink()
        with self.assertRaisesRegex(ValueError, 'inventory mismatch'):
            self.verify()

    def test_extra_member_rejected(self):
        (self.root / 'extra').write_bytes(b'extra')
        with self.assertRaisesRegex(ValueError, 'inventory mismatch'):
            self.verify()

    def test_wrong_manifest_pin(self):
        with self.assertRaisesRegex(ValueError, 'Manifest SHA-256 mismatch'):
            self.verify(digest='0' * 64)

    def test_wrong_source_or_count(self):
        with self.assertRaises(ValueError):
            self.verify(source='c' * 40)
        with self.assertRaises(ValueError):
            self.verify(count=1)

    def test_untrusted_path(self):
        doc = {'sourceSha': SOURCE, 'files': {'../index.html': '0' * 64, '.nojekyll': M.sha(b'')}}
        self.manifest.write_text(json.dumps(doc))
        self.digest = M.sha(self.manifest.read_bytes())
        with self.assertRaisesRegex(ValueError, 'Invalid export member path'):
            self.verify()

    def test_link_rejected_synthetic_stat_only(self):
        with patch.object(pathlib.Path, 'is_symlink', return_value=True):
            with self.assertRaisesRegex(ValueError, 'Invalid export root'):
                self.verify()

    def test_real_git_snapshot_roundtrip(self):
        repo = self.base / 'repo'
        subprocess.run(['git', 'init', '-q', str(repo)], check=True)
        for name, value in [('user.name', 'Fixture'), ('user.email', 'fixture@example.invalid')]:
            subprocess.run(['git', '-C', str(repo), 'config', name, value], check=True)
        raw, files = self.verify()
        commit = M.snapshot(repo, raw, files, SOURCE)
        for name, data in {**{'site/' + k: v for k, v in files.items()}, 'manifest.json': raw}.items():
            self.assertEqual(subprocess.check_output(['git', '-C', str(repo), 'show', commit + ':' + name]), data)

    def test_workflow_no_build_push_or_notification(self):
        text = pathlib.Path(__file__).parents[1].joinpath('.github/workflows/deploy-pages.yml').read_text()
        for forbidden in ('  push:', 'npm ', 'setup-node', 'submit-indexnow.py'):
            self.assertNotIn(forbidden, text)
        self.assertLess(text.index('python3 scripts/frozen-export.py'), text.index('uses: actions/upload-pages-artifact'))
        self.assertIn('needs: upload', text)


if __name__ == '__main__':
    unittest.main()
