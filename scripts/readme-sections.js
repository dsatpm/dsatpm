'use strict';

// Pure helpers for splicing generated content into README.md marker blocks.

function splice(readme, name, content) {
  const start = `<!-- ${name}_START -->`;
  const end = `<!-- ${name}_END -->`;
  const s = readme.indexOf(start);
  const e = readme.indexOf(end);
  if (s === -1 || e === -1 || e < s) {
    throw new Error(`${name} section markers not found in README.md`);
  }
  return `${readme.slice(0, s + start.length)}\n${content}\n${readme.slice(e)}`;
}

function renderNow({ owner, date, commits, prs, issues }) {
  return [
    '',
    `**Last updated:** ${date}`,
    '',
    `- Commits (last 7 days): ${commits}`,
    `- Pull requests opened (last 7 days): ${prs}`,
    `- Issues opened (last 7 days): ${issues}`,
    '',
    `_Auto-generated summary for @${owner}_`,
  ].join('\n');
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// project: { repo: 'owner/name', title, info: null | { stars, language } }
// info is null when the repo is private or unreadable: render a text badge instead
// of a social card, because a private repo's card would be broken for visitors.
function renderFeatured(projects) {
  const cells = projects.map(({ repo, title, info }) => {
    const url = `https://github.com/${repo}`;
    const owner = repo.split('/')[0];
    const art = info
      ? `<img src="https://opengraph.githubassets.com/1/${repo}" alt="${esc(title)}" width="300" />`
      : `<img src="https://img.shields.io/badge/${encodeURIComponent(title).replace(/-/g, '--')}-181717?style=for-the-badge&logo=github&logoColor=white" alt="${esc(title)}" />`;
    const avatar = `<img src="https://github.com/${owner}.png?size=40" alt="${esc(owner)}" width="20" height="20" />`;
    const meta = info
      ? `<br /><sub>${info.language ? `${esc(info.language)} · ` : ''}★ ${info.stars}</sub>`
      : '';
    return `    <td align="center" valign="top" width="33%">\n      <a href="${url}">${art}<br />${avatar} <b>${esc(title)}</b></a>${meta}\n    </td>`;
  });
  return `<table>\n  <tr>\n${cells.join('\n')}\n  </tr>\n</table>`;
}

module.exports = { splice, renderNow, renderFeatured };
