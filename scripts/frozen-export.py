#!/usr/bin/env python3
"""Verify reviewed bytes; optionally freeze them as a data-only Git commit. No network/build."""
import argparse
import hashlib
import json
import pathlib
import re
import subprocess


def sha(data):
    return hashlib.sha256(data).hexdigest()


def require(ok, reason):
    if not ok:
        raise ValueError(reason)


def verified(root, manifest, digest, source, count):
    require(re.fullmatch(r'[a-f0-9]{64}', digest), 'Invalid manifest SHA-256')
    require(re.fullmatch(r'[a-f0-9]{40}', source), 'Invalid source SHA')
    require(count > 0, 'Invalid file count')
    raw = manifest.read_bytes()
    require(sha(raw) == digest, 'Manifest SHA-256 mismatch')
    doc = json.loads(raw)
    require(set(doc) == {'sourceSha', 'files'}, 'Invalid manifest schema')
    require(doc['sourceSha'] == source, 'Source identity mismatch')
    files = doc['files']
    require(isinstance(files, dict) and len(files) == count, 'File count mismatch')
    for name, checksum in files.items():
        parts = pathlib.PurePosixPath(name).parts
        require(name and not name.startswith('/') and '\\' not in name
                and all(p not in ('', '.', '..', '.git') for p in parts)
                and '/'.join(parts) == name and not any(ord(c) < 32 for c in name),
                'Invalid export member path')
        require(isinstance(checksum, str) and re.fullmatch(r'[a-f0-9]{64}', checksum),
                'Invalid member SHA-256')
    require(root.is_dir() and not root.is_symlink(), 'Invalid export root')
    actual = {}
    for path in root.rglob('*'):
        require(not path.is_symlink(), 'Export links forbidden')
        if path.is_dir():
            continue
        require(path.is_file(), 'Non-regular export member')
        actual[path.relative_to(root).as_posix()] = path
    require(set(actual) == set(files), 'Export member inventory mismatch')
    data = {name: path.read_bytes() for name, path in sorted(actual.items())}
    require(all(sha(body) == files[name] for name, body in data.items()),
            'Export member SHA-256 mismatch')
    return raw, data


def snapshot(repo, raw, files, source):
    def git(*args, data=None):
        return subprocess.check_output(['git', '-C', str(repo), *args], input=data).decode().strip()

    def blob(data):
        return git('hash-object', '-w', '--stdin', data=data)

    def tree(entries):
        # mktree sorts entries using Git's tree ordering, not path string ordering.
        return git('mktree', '-z', data=b''.join(
            f'{mode} {kind} {oid}\t{name}'.encode() + b'\0'
            for name, (mode, kind, oid) in entries.items()))

    nested = {}
    for name, body in files.items():
        node = nested
        parts = name.split('/')
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = blob(body)

    def walk(node):
        return tree({name: ('040000', 'tree', walk(value)) if isinstance(value, dict)
                     else ('100644', 'blob', value) for name, value in node.items()})

    root = tree({'site': ('040000', 'tree', walk(nested)),
                 'manifest.json': ('100644', 'blob', blob(raw))})
    return git('commit-tree', root, data=f'Frozen export {source} [skip ci]\n'.encode())


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('root', type=pathlib.Path)
    p.add_argument('manifest', type=pathlib.Path)
    p.add_argument('manifest_sha256')
    p.add_argument('source_sha')
    p.add_argument('file_count', type=int)
    p.add_argument('--snapshot-repo', type=pathlib.Path)
    a = p.parse_args()
    raw, files = verified(a.root, a.manifest, a.manifest_sha256, a.source_sha, a.file_count)
    result = {'sourceSha': a.source_sha, 'manifestSha256': sha(raw), 'verifiedFiles': len(files)}
    if a.snapshot_repo:
        result['payloadSha'] = snapshot(a.snapshot_repo, raw, files, a.source_sha)
    print(json.dumps(result, sort_keys=True))


if __name__ == '__main__':
    main()
