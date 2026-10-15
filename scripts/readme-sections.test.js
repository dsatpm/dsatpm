'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { splice, renderNow, renderFeatured } = require('./readme-sections');

test('splice replaces only the marked block and is idempotent', () => {
  const src = 'a\n<!-- X_START -->\nold\n<!-- X_END -->\nb';
  const once = splice(src, 'X', 'new');
  assert.strictEqual(once, 'a\n<!-- X_START -->\nnew\n<!-- X_END -->\nb');
  assert.strictEqual(splice(once, 'X', 'new'), once);
});

test('splice throws on missing or reversed markers', () => {
  assert.throws(() => splice('nothing', 'X', 'c'), /markers not found/);
  assert.throws(() => splice('<!-- X_END -->\n<!-- X_START -->', 'X', 'c'), /markers not found/);
});

test('renderNow has date and the three counts', () => {
  const out = renderNow({ owner: 'o', date: '2026-10-15', commits: 3, prs: 2, issues: 1 });
  assert.match(out, /\*\*Last updated:\*\* 2026-10-15/);
  assert.match(out, /Commits \(last 7 days\): 3/);
  assert.match(out, /Pull requests opened \(last 7 days\): 2/);
  assert.match(out, /Issues opened \(last 7 days\): 1/);
});

test('renderFeatured: public gets social card, private gets badge, all link to repo', () => {
  const out = renderFeatured([
    { repo: 'a/pub', title: 'Pub', info: { stars: 5, language: 'JS' } },
    { repo: 'a/priv', title: 'Priv', info: null },
  ]);
  assert.match(out, /href="https:\/\/github\.com\/a\/pub"/);
  assert.match(out, /opengraph\.githubassets\.com\/1\/a\/pub/);
  assert.match(out, /href="https:\/\/github\.com\/a\/priv"/);
  assert.doesNotMatch(out, /opengraph\.githubassets\.com\/1\/a\/priv/);
  assert.match(out, /img\.shields\.io\/badge\/Priv-/);
});

test('renderFeatured escapes titles', () => {
  assert.match(renderFeatured([{ repo: 'a/b', title: 'x"<y', info: null }]), /x&quot;&lt;y/);
});
