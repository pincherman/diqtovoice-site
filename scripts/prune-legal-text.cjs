'use strict';

// Next emits RSC/prefetch text beside exported HTML. Legal pages use normal
// <a> navigation under connect-src 'none'; only their HTML may retain the notice.
const fs = require('node:fs');
const path = require('node:path');

function requireDirectory(directory) {
  const stat = fs.lstatSync(directory);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`Expected a real export directory: ${directory}`);
  }
}

function pruneLegalText(exportDirectory) {
  const root = path.resolve(exportDirectory);
  requireDirectory(root);
  const legalPages = ['fr/legal/index.html', 'en/legal/index.html'];
  const candidates = [];

  // Complete preflight before deleting anything; never traverse symlinks or
  // remove a directory/non-regular file. All non-legal export files stay intact.
  for (const page of legalPages) {
    const directory = path.dirname(path.join(root, page));
    requireDirectory(path.dirname(directory));
    requireDirectory(directory);
    const html = fs.lstatSync(path.join(root, page));
    if (html.isSymbolicLink() || !html.isFile()) {
      throw new Error(`Expected a regular legal HTML page: ${page}`);
    }
    function visit(current) {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        const stat = fs.lstatSync(full);
        if (stat.isSymbolicLink()) {
          throw new Error(`Symlink refused in legal export: ${path.relative(root, full)}`);
        }
        if (stat.isDirectory()) visit(full);
        else if (!stat.isFile()) {
          throw new Error(`Non-regular legal export member: ${path.relative(root, full)}`);
        } else if (entry.name.endsWith('.txt')) candidates.push(full);
      }
    }
    visit(directory);
  }

  candidates.sort();
  for (const file of candidates) fs.unlinkSync(file);
  return {
    removed: candidates.map(file => path.relative(root, file).split(path.sep).join('/')),
    retainedLegalHtml: legalPages,
  };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3) throw new Error('Usage: prune-legal-text.cjs [export-directory]');
    const result = pruneLegalText(process.argv[2] || path.join(__dirname, '..', 'out'));
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(`Legal text pruning failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { pruneLegalText };
