#!/usr/bin/env sh
# Regenerate the RTK Query client to a temp file and diff it against the committed one.
# Never overwrites src/services/api.ts. Deliberately NOT part of `build` (see .githooks/pre-push).
# The temp file sits beside api.ts so its relative imports are identical; it is removed on exit.
CHECK=src/services/api.gen.check.ts
trap 'rm -f "$CHECK"' EXIT
npx @rtk-query/codegen-openapi openapi/rtk-query.check.config.cjs >/dev/null || exit 1
if diff -u src/services/api.ts "$CHECK" | head -40 >/tmp/rs-admin-api-diff.$$ && [ ! -s /tmp/rs-admin-api-diff.$$ ]; then
  rm -f /tmp/rs-admin-api-diff.$$
  echo "check:api-types OK - src/services/api.ts matches openapi/swagger.json"
else
  cat /tmp/rs-admin-api-diff.$$; rm -f /tmp/rs-admin-api-diff.$$
  echo
  echo "check:api-types FAILED: src/services/api.ts is out of step with openapi/swagger.json."
  echo "Run: npm run generate   (then commit src/services/api.ts)"
  echo "Why: a stale client silently calls an old API shape - this is how the original spec drift happened."
  exit 1
fi
