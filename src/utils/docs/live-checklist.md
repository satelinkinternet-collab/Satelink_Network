# Live Operator Checklist

Before declaring the Satelink Node operations engine as publicly available and live, the root operator must verify the network safety configuration to prevent unintentional simulation data bleeding into the production environment.

## 1. Boot Verification
- [ ] Set `SATELINK_MODE=live` inside the `.env` file containing secrets.
- [ ] Ensure terminal outputs the `LIVE mode` critical warning block and **no** environment variables log as missing (e.g. `TREASURY_ADDRESS`, `JWT_SECRET`, `DATABASE_URL`).

## 2. Web API Checks
- [ ] Ensure `GET /api/mode` returns `{ "ok": true, "mode": "live"}`.
- [ ] Ensure `GET /api/runtime-info` returns expected `version` and `commit` fields without exposing secrets.
- [ ] Verify that navigating to or curling `/__test/auth` or `/simulation/status` results in a `403 Forbidden` JSON payload.

## 3. UI Checks
- [ ] Login to the operator or admin dashboard (`/ui/admin`).
- [ ] The global top banner states the environment is "Live" with a red layout structure to enforce visibility.
- [ ] Open the inspector (F12) to verify that Dev Mode debug tools and request ID footers are completely unrendered and inactive.
- [ ] Verify "Seed" or "Simulate" buttons exist but are safely locked with the `Disabled in LIVE mode` tooltip state.
