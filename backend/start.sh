#!/usr/bin/env bash
# Start all MyGym microservices
set -e
cd "$(dirname "$0")"

echo "Starting MyGym microservices..."

node auth-service/src/index.js &
node member-service/src/index.js &
node plan-service/src/index.js &
node trainer-service/src/index.js &
node notification-service/src/index.js &
node api-gateway/src/index.js &

echo ""
echo "All services started:"
echo "  API Gateway        → http://localhost:3000"
echo "  Auth Service       → http://localhost:3001"
echo "  Member Service     → http://localhost:3002"
echo "  Plan Service       → http://localhost:3003"
echo "  Trainer Service    → http://localhost:3004"
echo "  Notification Svc   → http://localhost:3005"
echo ""
echo "Admin credentials: admin@yourdomain.com / Admin!2345Secure"
echo "Press Ctrl+C to stop all services."

wait
