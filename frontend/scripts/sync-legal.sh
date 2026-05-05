#!/usr/bin/env bash
# Regenerate /app/frontend/constants/legal.ts from the authoritative markdown
# in /app/trust-center/. Run this any time you edit privacy.md or terms.md.
#
# Usage:  bash /app/frontend/scripts/sync-legal.sh

set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/trust-center"
DEST_ASSETS="$ROOT/frontend/assets/legal"
DEST_CONST="$ROOT/frontend/constants/legal.ts"

mkdir -p "$DEST_ASSETS"
cp "$SRC/privacy.md" "$DEST_ASSETS/privacy.md"
cp "$SRC/terms.md" "$DEST_ASSETS/terms.md"

cd "$ROOT/frontend"
python3 - <<'PY'
with open('assets/legal/privacy.md','r') as f: p = f.read()
with open('assets/legal/terms.md','r')   as f: t = f.read()

def esc(s: str) -> str:
    return s.replace('\\', '\\\\').replace('`', '\\`').replace('$', '\\$')

out  = '// AUTO-GENERATED from /app/trust-center/ — regenerate with scripts/sync-legal.sh\n'
out += '// Bundled fallback used when the live Trust Center URL is unreachable.\n\n'
out += 'export const BUNDLED_PRIVACY_MD = `' + esc(p) + '`;\n\n'
out += 'export const BUNDLED_TERMS_MD = `'  + esc(t) + '`;\n'

with open('constants/legal.ts', 'w') as f:
    f.write(out)
print('✔ constants/legal.ts regenerated')
PY

echo "✔ assets/legal/*.md synced from /app/trust-center/"
