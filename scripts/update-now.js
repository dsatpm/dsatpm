#!/usr/bin/env node

const fs = require("fs");
const https = require("https");

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

if (!token) {
  console.error(
    "Error: GITHUB_TOKEN or GH_TOKEN environment variable is required.",
  );
  process.exit(1);
}

const path = "./README.md";

function graphql(query, variables) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });

    const options = {
      hostname: "api.github.com",
      path: "/graphql",
      method: "POST",
      headers: {
        "User-Agent": "update-now-script",
        "Content-Type": "application/json",
        Authorization: `bearer ${token}`,
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          if (json.errors) {
            return reject(new Error(JSON.stringify(json.errors, null, 2)));
          }
          resolve(json.data);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const now = new Date();
    const updatedDate = now.toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const query = `
      query($from: DateTime!, $to: DateTime!) {
        viewer {
          login
          contributionsCollection(from: $from, to: $to) {
            totalCommitContributions
            pullRequestContributions(first: 1) {
              totalCount
            }
            issueContributions(first: 1) {
              totalCount
            }
          }
        }
      }
    `;

    const variables = {
      from: sevenDaysAgo.toISOString(),
      to: now.toISOString(),
    };

    const data = await graphql(query, variables);
    const viewer = data.viewer;
    const contributions = viewer.contributionsCollection;

    const totalCommits = contributions.totalCommitContributions;
    const prCount = contributions.pullRequestContributions.totalCount;
    const issueCount = contributions.issueContributions.totalCount;

    const lines = [];
    lines.push(`**Last updated:** ${updatedDate}`);
    lines.push("");
    lines.push(`- Commits (last 7 days): ${totalCommits}`);
    lines.push(`- Pull requests opened (last 7 days): ${prCount}`);
    lines.push(`- Issues opened (last 7 days): ${issueCount}`);
    lines.push("");
    lines.push(`_Auto-generated summary for @${viewer.login}_`);

    const newSection = lines.join("\n");

    const startMarker = "<!-- NOW_SECTION_START -->";
    const endMarker = "<!-- NOW_SECTION_END -->";

    const readme = fs.readFileSync(path, "utf8");
    const startIndex = readme.indexOf(startMarker);
    const endIndex = readme.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      console.error("Error: NOW section markers not found in README.md");
      process.exit(1);
    }

    const before = readme.slice(0, startIndex + startMarker.length);
    const after = readme.slice(endIndex);

    const updatedReadme = `${before}\n\n${newSection}\n${after}`;

    fs.writeFileSync(path, updatedReadme);
    console.log("Successfully updated NOW section in README.md");
  } catch (err) {
    console.error("Failed to update NOW section:", err.message || err);
    process.exit(1);
  }
})();
