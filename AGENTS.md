# AGENTS.md

## Boundaries
- Work inside this repo only. Do not read, modify, or explore files outside this folder.
- If you need context from another repo, ask the user instead of exploring it.

## API spec
- `openapi/swagger.json` is a **copy** of `rs-backend/src/swagger/swagger.json`, which is generated there.
  Never hand-edit it. Refresh it by copying from the backend, then `npm run openapi:generate`.
- Regenerating the client without `tag: true` in the codegen config silently kills cache invalidation;
  check `grep -c providesTags` / `invalidatesTags` stay > 0.

## Gates
`npm run lint` → `npm run typecheck` → `npm test` → `npm run build`

## Workflow
Branch + PR only. Never push to `main` (it deploys dev).

## Context files
Only one context file loads per session, first match wins: `.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules`.
With this file present, `.claude/CLAUDE.md` is no longer loaded, so keep rules here.
