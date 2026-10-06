import { readFileSync } from 'node:fs';

const reportPath = process.argv[2] || '.local/npm-audit.json';
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const vulnerabilities = report.vulnerabilities || {};
const prismaPackages = new Set(['@prisma/config', 'deepmerge-ts', 'mysql2', 'prisma']);
const allowedAdvisories = new Set([1145093, 1153173, 1158532]);
const unexpected = [];

for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  const objectAdvisories = (vulnerability.via || []).filter(
    (entry) => typeof entry === 'object' && entry !== null,
  );
  const hasUnexpectedSource = objectAdvisories.some(
    (entry) => !allowedAdvisories.has(Number(entry.source)),
  );
  if (!prismaPackages.has(name) || hasUnexpectedSource) unexpected.push(name);
}

if (unexpected.length > 0) {
  console.error(`Unexpected npm audit vulnerabilities: ${[...new Set(unexpected)].join(', ')}`);
  process.exit(1);
}

const high = report.metadata?.vulnerabilities?.high || 0;
const critical = report.metadata?.vulnerabilities?.critical || 0;
if (high || critical) {
  console.warn(
    `npm audit reports ${high} high and ${critical} critical issue(s); the current high findings are Prisma CLI upstream advisories.`,
  );
}
