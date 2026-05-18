# Plan

## Checklist

- [x] Inspect current `/api/ai/chat` route, frontend call sites, README, and Wrangler config.
- [x] Probe CPA v1 with the existing server-side key without printing the key.
- [x] Update the Yomi AI route to use fixed CPA v1 upstream.
- [x] Update README current-state and risk notes.
- [x] Record reusable migration lessons for future projects.
- [x] Run static/build verification.
- [x] Deploy or otherwise verify the production API path, depending on available credentials.

## Verification

- `git diff --check`: passed.
- Direct CPA v1 probe: HTTP 200 with current server-side key and primary model.
- `npm run typecheck`: passed.
- `npm run lint`: passed with 87 existing warnings and 0 errors.
- `npm run test:ai-chat-formatting`: passed.
- `npm run build`: passed.
- `npm run pages:build`: passed.
- `wrangler pages secret put YOMI_CPA_API_KEY --project-name yomi`: passed.
- `wrangler pages deploy .vercel/output/static --project-name yomi --branch main`: passed.
- Latest direct Pages deployment API returned HTTP 200 and exactly `YOMI_CPA_OK`.
- `https://yomi.saaaai.com/api/ai/chat`: returned HTTP 200 and exactly `YOMI_CPA_OK`.

## Current Findings

- Frontend AI teacher, word explanation, and grammar explanation already call `/api/ai/chat`.
- The server route already speaks OpenAI-compatible `/chat/completions` streaming.
- The legacy risk is the server-side upstream selection:
  - default base URL: `http://127.0.0.1:8317/v1`
  - optional `CLIPROXY_API_BASE_URL`, previously used for `https://vps.saaaai.com/yomi-cliproxy/v1`
- CPA v1 returned HTTP 200 for the current key and `qwen/qwen3.5-122b-a10b`.
