const fs = require('fs');
const path = require('path');

const pages = [
  "web/src/app/page.tsx",
  "web/src/app/login/page.tsx",
  "web/src/app/health-ui/page.tsx",
  "web/src/app/about/page.tsx",
  "web/src/app/beta/join/page.tsx",
  "web/src/app/403/page.tsx",
  "web/src/app/admin/page.tsx",
  "web/src/app/admin/nodes/page.tsx",
  "web/src/app/admin/users/page.tsx",
  "web/src/app/admin/ledger/page.tsx",
  "web/src/app/admin/withdrawals/page.tsx",
  "web/src/app/admin/logs/page.tsx",
  "web/src/app/admin/command-center/page.tsx",
  "web/src/app/admin/ops/errors/page.tsx",
  "web/src/app/admin/ops/traces/page.tsx",
  "web/src/app/admin/ops/slow-queries/page.tsx",
  "web/src/app/admin/diagnostics/self-tests/page.tsx",
  "web/src/app/admin/diagnostics/incidents/page.tsx",
  "web/src/app/admin/settings/page.tsx",
  "web/src/app/admin/security/page.tsx",
  "web/src/app/admin/rewards/page.tsx",
  "web/src/app/admin/rewards/simulated/page.tsx",
  "web/src/app/admin/revenue/page.tsx",
  "web/src/app/admin/growth/referrals/page.tsx",
  "web/src/app/admin/growth/retention/page.tsx",
  "web/src/app/node/page.tsx",
  "web/src/app/node/earnings/page.tsx",
  "web/src/app/node/claim/page.tsx",
  "web/src/app/builder/page.tsx",
  "web/src/app/builder/docs/page.tsx",
  "web/src/app/builder/projects/page.tsx",
  "web/src/app/builder/keys/page.tsx",
  "web/src/app/distributor/page.tsx",
  "web/src/app/distributor/referrals/page.tsx",
  "web/src/app/enterprise/page.tsx",
  "web/src/app/account/page.tsx"
];

for (const p of pages) {
  if (!fs.existsSync(p)) continue;
  let content = fs.readFileSync(p, 'utf8');
  let changed = false;
  
  if (content.match(/fetch\(|axios\.|admin_token|localhost:8080/)) {
    console.log("NEEDS FIX:", p);
  }
}
