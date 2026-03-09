#!/bin/bash
# Explicitly load MoonPay secret for verification
export MOONPAY_WEBHOOK_SECRET=$(grep MOONPAY_WEBHOOK_SECRET .env.sandbox | cut -d '=' -f2)
export TREASURY_ROUTER=$(grep TREASURY_ROUTER .env.sandbox | cut -d '=' -f2)
export TREASURY_MANAGED=$(grep TREASURY_MANAGED .env.sandbox | cut -d '=' -f2)
export ADMIN_API_KEY=$(grep ADMIN_API_KEY .env.sandbox | cut -d '=' -f2)

node scripts/migrate.js
exec node server.js
