#!/usr/bin/env bash
# sync-portals.sh
#
# Pulls the latest client/ files from each source portal repo into the shell,
# preserving the shell's bridge hooks (useDemoState, usePatientCase, etc.)
# that override the Supabase versions with the shared Zustand store.
#
# Usage:
#   ./scripts/sync-portals.sh          # sync all portals
#   ./scripts/sync-portals.sh crm      # sync only CRM
#   ./scripts/sync-portals.sh patient  # sync only Patient
#
# Prerequisites:
#   - Each source repo is cloned as a sibling of arx-demo-shell in ~/Projects/
#   - rsync is installed (ships with macOS)

set -euo pipefail

SHELL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECTS_DIR="$(dirname "$SHELL_DIR")"

# ── Portal registry ───────────────────────────────────────────────────────────
# Format: "portal_id|source_repo_folder|bridge_hooks_to_preserve"

PORTALS=(
  "crm|arx-prototype-crm|hooks/useDemoState.ts hooks/usePatientCase.ts hooks/useEnrollPatient.ts hooks/useRunEBenefits.ts"
  "patient|arx-prototype-bi-jascayd|hooks/useDemoState.ts"
  "analytics|arx-connect-analytics|hooks/useDemoState.ts"
  "field|arx-prototype-field|hooks/useDemoState.ts"
  "provider|arx-prototype-provider|hooks/useDemoState.ts"
)

# ── Helpers ───────────────────────────────────────────────────────────────────

green()  { printf '\033[0;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }
red()    { printf '\033[0;31m%s\033[0m\n' "$*"; }

sync_portal() {
  local id="$1"
  local repo="$2"
  local bridge_hooks="$3"

  local source_dir="$PROJECTS_DIR/$repo"
  local dest_dir="$SHELL_DIR/client/portals/$id"

  # Skip if source repo doesn't exist yet
  if [[ ! -d "$source_dir" ]]; then
    yellow "  ⚠  $repo not found at $source_dir — skipping"
    return 0
  fi

  green "▸ Syncing $id from $repo"

  # Pull latest on main branch in source repo
  echo "  Pulling latest from origin/main..."
  git -C "$source_dir" pull --ff-only origin main 2>&1 | sed 's/^/  /'

  # Back up bridge hooks before rsync overwrites them
  local tmpdir
  tmpdir=$(mktemp -d)
  for hook in $bridge_hooks; do
    local hook_path="$dest_dir/$hook"
    if [[ -f "$hook_path" ]]; then
      mkdir -p "$tmpdir/$(dirname "$hook")"
      cp "$hook_path" "$tmpdir/$hook"
    fi
  done

  # Sync source client/ → dest portal dir
  # --delete removes files that no longer exist in source
  # --exclude keeps index.tsx (the shell wrapper, not the source entry point)
  rsync -a --delete \
    --exclude="index.tsx" \
    "$source_dir/client/" \
    "$dest_dir/"

  # Restore bridge hooks
  for hook in $bridge_hooks; do
    if [[ -f "$tmpdir/$hook" ]]; then
      cp "$tmpdir/$hook" "$dest_dir/$hook"
      echo "  Preserved bridge hook: $hook"
    fi
  done

  rm -rf "$tmpdir"
  green "  ✓ $id synced"
}

# ── Main ──────────────────────────────────────────────────────────────────────

FILTER="${1:-}"  # optional: sync only one portal

cd "$SHELL_DIR"

echo ""
echo "=== arx-demo-shell portal sync ==="
echo ""

for entry in "${PORTALS[@]}"; do
  IFS='|' read -r id repo hooks <<< "$entry"
  if [[ -z "$FILTER" || "$FILTER" == "$id" ]]; then
    sync_portal "$id" "$repo" "$hooks"
    echo ""
  fi
done

# Stage and commit any changes
if git diff --quiet HEAD && git diff --cached --quiet; then
  yellow "Nothing changed — all portals already up to date."
else
  echo "Committing changes..."
  git add client/portals/
  git commit -m "chore: sync portal updates from source repos"
  green "✓ Committed. Run 'git push' to push to GitHub."
fi

echo ""
echo "Done."
