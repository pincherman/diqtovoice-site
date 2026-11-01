import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const wall = JSON.parse(await readFile('content/home/wall.json', 'utf8'));
const families = ['PARDON', 'COMPRENDS', 'REPETER', 'LENTEMENT'];
assert.equal(wall.languages.length, 13);
assert.equal(new Set(wall.languages).size, 13);
assert.deepEqual(Object.keys(wall.reviews), wall.languages);
for (const key of families) {
  assert.equal(wall[key].length, 13, key);
  assert(wall[key].every(text => typeof text === 'string' && text.trim()), key);
}
for (const locale of ['fr', 'en']) {
  const home = JSON.parse(await readFile(`content/home/${locale}.json`, 'utf8'));
  assert.deepEqual(home.motion.LANGS.map(row => row[0]), wall.languages);
  assert.deepEqual(home.motion.LANGS.map(row => row[2]), wall.PARDON);
}
const expected = wall.languages.flatMap((_, i) => families.map(key => wall[key][i]));
assert.equal(expected.length, 52);
const motion = await readFile('public/motion/home.js', 'utf8');
const expressions = [...motion.matchAll(/const WORDS = ([^;]+);/g)];
assert.equal(expressions.length, 1, 'Unique product wall word expression');
const fr = JSON.parse(await readFile('content/home/fr.json', 'utf8'));
const actual = runInNewContext(expressions[0][1], { LANGS: fr.motion.LANGS, WALL: wall });
assert.deepEqual(Array.from(actual), expected, 'Actual product word order must alternate four families per language');
console.log('PASS wall: 52 exact Claude phrases, 13 languages, shared FR/EN order and actual product alternation; linguistic reviews remain pending');
