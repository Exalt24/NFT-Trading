import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

// Proves the Prisma tests can fail. First the untouched code must pass, then each mutation below breaks one guard in the
// source, the database tests must go red, and the file is put back. Run with: npm run test:db:mutation (needs PostgreSQL).

interface Mutation {
  name: string;
  file: string;
  find: string;
  replace: string;
}

const mutations: Mutation[] = [
  {
    name: 'owner lookup stops ignoring letter case',
    file: 'src/services/NFTService.ts',
    find: 'where: { owner: ci(owner) },',
    replace: 'where: { owner },',
  },
  {
    name: 'updateNFTOwner uses update(), which throws for an unknown token',
    file: 'src/services/NFTService.ts',
    find: 'await prisma.nft.updateMany({\n        where: { tokenId },\n        data: { owner: newOwner },',
    replace: 'await prisma.nft.update({\n        where: { tokenId },\n        data: { owner: newOwner },',
  },
  {
    name: 'a repeated mint overwrites minted_at',
    file: 'src/services/NFTService.ts',
    find: '          owner = EXCLUDED.owner,\n',
    replace: '          owner = EXCLUDED.owner,\n          minted_at = EXCLUDED.minted_at,\n',
  },
  {
    name: 're-listing a cancelled token no longer re-activates it',
    file: 'src/services/MarketplaceService.ts',
    find: '          active = true,\n',
    replace: '',
  },
  {
    name: 'a sale no longer closes the listing',
    file: 'src/services/MarketplaceService.ts',
    find: "data: { active: false },\n        }),\n      ]);",
    replace: "data: { active: true },\n        }),\n      ]);",
  },
  {
    name: 'top traders sorted by the text-cast column instead of the number',
    file: 'src/services/AnalyticsService.ts',
    find: 'ORDER BY SUM(price) DESC',
    replace: 'ORDER BY total_volume DESC',
  },
  {
    name: 'the volume window ignores the day count',
    file: 'src/services/AnalyticsService.ts',
    find: 'make_interval(days => ${days}::integer)',
    replace: 'make_interval(days => 1000000)',
  },
  {
    name: 'the first read of a new contract inserts without ON CONFLICT (a race now throws)',
    file: 'src/services/syncStatusStore.ts',
    find: '\n    ON CONFLICT (contract_address) DO NOTHING',
    replace: '',
  },
  {
    name: 'schema.prisma drops the UNIQUE on sync_status.contract_address',
    file: 'prisma/schema.prisma',
    find: 'String    @unique @map("contract_address")',
    replace: 'String    @map("contract_address")',
  },
];

function runTests(): { ok: boolean; failed: string[]; summary: string } {
  const result = spawnSync('npx tsx --test --test-concurrency=1 tests/db/*.test.ts', { shell: true, encoding: 'utf8' });
  const output = (result.stdout ?? '') + (result.stderr ?? '');
  const failed = [...new Set(output.split('\n').filter(line => line.startsWith('✖') && !line.startsWith('✖ failing tests')).map(line => line.replace(/ \([\d.]+ms\)$/, '').slice(2).trim()))];
  const counts = ['tests', 'pass', 'fail'].map(k => `${k} ${output.match(new RegExp(`ℹ ${k} (\\d+)`))?.[1] ?? '?'}`).join(', ');
  return { ok: result.status === 0, failed, summary: counts };
}

const baseline = runTests();
console.log(`Control, untouched code: ${baseline.summary} -> ${baseline.ok ? 'green' : 'RED'}`);
if (!baseline.ok) {
  console.error('The untouched code must pass before a mutation result means anything.');
  process.exit(1);
}

let survivors = 0;
for (const mutation of mutations) {
  const original = readFileSync(mutation.file, 'utf8');
  const normalized = original.replace(/\r\n/g, '\n');
  const occurrences = normalized.split(mutation.find).length - 1;
  if (occurrences !== 1) {
    console.error(`MUTATION NOT APPLICABLE: "${mutation.name}" found ${occurrences} matches in ${mutation.file}`);
    process.exit(1);
  }
  try {
    writeFileSync(mutation.file, normalized.replace(mutation.find, () => mutation.replace));
    const outcome = runTests();
    const killed = !outcome.ok && outcome.failed.length > 0;
    if (!killed) survivors++;
    console.log(`${killed ? 'KILLED  ' : 'SURVIVED'} ${mutation.name}: ${outcome.summary}`);
    for (const name of outcome.failed) console.log(`           red: ${name}`);
  } finally {
    writeFileSync(mutation.file, original);
  }
}

const after = runTests();
console.log(`Control, files restored: ${after.summary} -> ${after.ok ? 'green' : 'RED'}`);
console.log(`${mutations.length - survivors} of ${mutations.length} mutations were caught.`);
process.exit(survivors === 0 && after.ok ? 0 : 1);
