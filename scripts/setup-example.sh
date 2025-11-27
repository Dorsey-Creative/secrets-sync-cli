#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EXAMPLE_DIR="$PROJECT_ROOT/example/config/env"

echo "🔧 Setting up example directory..."

# Create directory structure
mkdir -p "$EXAMPLE_DIR"

# Create .env (production)
cat > "$EXAMPLE_DIR/.env" << 'EOF'
# Production Environment (Canonical Source)
# This is FAKE data for local testing only

API_KEY=test_api_key_abc123xyz
DATABASE_URL=postgres://testuser:testpass@localhost:5432/testdb
JWT_SECRET=fake_jwt_secret_for_testing_only
STRIPE_KEY=sk_test_fake_stripe_key_12345
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
GITHUB_TOKEN=ghp_fake_token_for_testing_purposes_only
EOF

# Create .env.staging
cat > "$EXAMPLE_DIR/.env.staging" << 'EOF'
# Staging Environment
# This is FAKE data for local testing only

API_KEY=staging_api_key_def456uvw
DATABASE_URL=postgres://staginguser:stagingpass@staging.example.com:5432/stagingdb
JWT_SECRET=fake_staging_jwt_secret
STAGING_ONLY_VAR=staging_specific_value
EOF

# Create .env.development
cat > "$EXAMPLE_DIR/.env.development" << 'EOF'
# Development Environment
# This is FAKE data for local testing only

API_KEY=dev_api_key_ghi789rst
DATABASE_URL=postgres://devuser:devpass@localhost:5432/devdb
JWT_SECRET=fake_dev_jwt_secret
DEBUG=true
DEV_ONLY_VAR=development_specific_value
EOF

echo "✅ Example directory created at: $EXAMPLE_DIR"
echo ""
echo "Test it with:"
echo "  bun run dev -- --dir example/config/env --dry-run"
