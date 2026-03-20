PAGES=(
  "public:page:/"
  "public:login/page:/login"
  "public:health-ui/page:/health"
  "public:about/page:/about"
  "public:beta/join/page:/beta/join"
  "public:403/page:/403"
  "admin-api:admin/page:/"
  "admin-api:admin/nodes/page:/nodes"
  "admin-api:admin/users/page:/users"
  "admin-api:admin/ledger/page:/ledger"
  "admin-api:admin/withdrawals/page:/withdrawals"
  "admin-api:admin/logs/page:/logs"
  "admin-api:admin/command-center/page:/command-center"
  "admin-api:admin/ops/errors/page:/ops/errors"
  "admin-api:admin/ops/traces/page:/ops/traces"
  "admin-api:admin/ops/slow-queries/page:/ops/slow-queries"
  "admin-api:admin/diagnostics/self-tests/page:/diagnostics/self-tests"
  "admin-api:admin/diagnostics/incidents/page:/diagnostics/incidents"
  "admin-api:admin/settings/page:/settings"
  "admin-api:admin/security/page:/security"
  "admin-api:admin/rewards/page:/rewards"
  "admin-api:admin/rewards/simulated/page:/rewards/simulated"
  "admin-api:admin/revenue/page:/revenue"
  "admin-api:admin/growth/referrals/page:/growth/referrals"
  "admin-api:admin/growth/retention/page:/growth/retention"
  "node-api:node/page:/"
  "node-api:node/earnings/page:/earnings"
  "node-api:node/claim/page:/claim"
  "builder-api:builder/page:/"
  "builder-api:builder/docs/page:/docs"
  "builder-api:builder/projects/page:/projects"
  "builder-api:builder/keys/page:/keys"
  "dist-api:distributor/page:/"
  "dist-api:distributor/referrals/page:/referrals"
  "ent-api:enterprise/page:/"
  "me:account/page:/"
)

EXISTING=0
CREATED=0

for item in "${PAGES[@]}"; do
  PREFIX="${item%%:*}"
  REST="${item#*:}"
  FILEPATH="${REST%%:*}"
  ENDPOINT="${REST#*:}"
  
  FULL_PATH="web/src/app/$FILEPATH.tsx"
  
  if [ -f "$FULL_PATH" ]; then
    EXISTING=$((EXISTING+1))
    echo "EXISTS: $FULL_PATH"
  else
    CREATED=$((CREATED+1))
    echo "MISSING: $FULL_PATH ($PREFIX -> $ENDPOINT)"
    
    mkdir -p "$(dirname "$FULL_PATH")"
    
    # Generate generic page
    API_URL="/$PREFIX$ENDPOINT"
    TITLE="$(basename "$(dirname "$FULL_PATH")") dashboard"
    
    cat > "$FULL_PATH" << PAGE_EOF
'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function PageName() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('$API_URL')
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-zinc-400">Loading...</div>;
  if (error) return <div className="p-8 text-red-400">Error: {error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-100 mb-4">$TITLE</h1>
      <pre className="bg-zinc-900 p-4 rounded text-xs text-zinc-300 overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
PAGE_EOF

  fi
done

echo "EXISTING: $EXISTING"
echo "CREATED: $CREATED"
