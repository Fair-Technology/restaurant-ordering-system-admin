#!/usr/bin/env bash
# Delete local branches already fully merged into main.
# Safe by design: only branches listed by `git branch --merged main`, only `git branch -d`
# (never -D), never main/master or the branch checked out in this worktree.
# A branch's linked worktree is removed first with `git worktree remove` (no --force,
# so a worktree with uncommitted changes is kept and its branch is skipped).
# Usage: scripts/cleanup-merged-branches.sh [--dry-run]
set -u

dry=0
[ "${1:-}" = "--dry-run" ] && dry=1

git rev-parse --verify -q refs/heads/main >/dev/null || { echo "no local main branch; nothing done"; exit 0; }
current=$(git symbolic-ref -q --short HEAD || true)
top=$(git rev-parse --show-toplevel)
found=0

while IFS= read -r b; do
  b=${b#[*+ ]}; b=${b# }
  [ -z "$b" ] && continue
  case "$b" in main|master) continue ;; esac
  [ "$b" = "$current" ] && continue
  found=1

  # worktree path for this branch, if any
  wt=$(git worktree list --porcelain | awk -v ref="refs/heads/$b" '
    /^worktree /{p=substr($0,10)} $0=="branch " ref {print p; exit}')
  if [ -n "$wt" ] && [ "$wt" != "$top" ]; then
    if [ $dry -eq 1 ]; then echo "[dry-run] would remove worktree $wt"
    elif ! git worktree remove "$wt"; then echo "skip $b: could not remove worktree $wt (dirty?)"; continue
    else echo "removed worktree $wt"; fi
  elif [ -n "$wt" ]; then
    continue  # checked out in the primary worktree
  fi

  if [ $dry -eq 1 ]; then echo "[dry-run] would delete branch $b"
  else git branch -d "$b" || echo "skip $b: git refused to delete"; fi
done < <(git branch --merged main)

[ $found -eq 0 ] && echo "nothing to clean up"
exit 0
