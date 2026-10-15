'use strict';

const fs = require('fs');
const { splice, renderNow, renderFeatured } = require('./readme-sections');

const README = './README.md';

// Order is the display order. Edit here to change featured projects.
const FEATURED = [
  { repo: 'HTPdevs/birthmark', title: 'Birthmark' },
  { repo: 'HTPdevs/htpfinder', title: 'HTPfinder' },
  { repo: 'dsatpm/merch-table', title: 'Merch Table' },
];

async function withRetry(core, fn, label) {
  const max = 3;
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      return await fn();
    } catch (err) {
      core.warning(`${label} failed (attempt ${attempt}/${max}): ${err.message}`);
      if (attempt === max) throw err;
      await new Promise((r) => setTimeout(r, attempt * 5000));
    }
  }
}

module.exports = async ({ github, context, core }) => {
  const owner = context.repo.owner;
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  let readme = fs.readFileSync(README, 'utf8');

  // "Now": all-or-nothing so a half-failed search never writes wrong zeros.
  try {
    const count = async (label, q, fn) =>
      (await withRetry(core, () => fn({ q, per_page: 1 }), label)).data.total_count;
    const commits = await count('Commit search', `author:${owner} author-date:>=${since}`, github.rest.search.commits);
    const prs = await count('PR search', `type:pr author:${owner} created:>=${since}`, github.rest.search.issuesAndPullRequests);
    const issues = await count('Issue search', `type:issue author:${owner} created:>=${since}`, github.rest.search.issuesAndPullRequests);
    readme = splice(readme, 'NOW_SECTION', renderNow({ owner, date, commits, prs, issues }));
  } catch (err) {
    core.warning(`Skipping "Now" update: ${err.message}`);
  }

  // Featured: private/unreadable repos degrade to a text badge, never fail the run.
  try {
    const projects = await Promise.all(
      FEATURED.map(async (p) => {
        const [o, r] = p.repo.split('/');
        try {
          const { data } = await github.rest.repos.get({ owner: o, repo: r });
          if (data.private) return { ...p, info: null };
          return { ...p, info: { stars: data.stargazers_count, language: data.language } };
        } catch (err) {
          core.warning(`Featured ${p.repo} unreadable (${err.status || err.message}); using badge`);
          return { ...p, info: null };
        }
      })
    );
    readme = splice(readme, 'FEATURED_PROJECTS', renderFeatured(projects));
  } catch (err) {
    core.warning(`Skipping featured update: ${err.message}`);
  }

  fs.writeFileSync(README, readme);
};
