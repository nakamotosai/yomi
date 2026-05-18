# Yomi CPA v1 AI Chain Migration

Date: 2026-05-18

## Objective

Move Yomi's AI teacher and AI explanation backend from the retired Yomi-specific cliproxy path to the shared CPA v1 endpoint:

`https://vps.saaaai.com/cpa/v1`

## Scope

- Preserve the browser-facing Yomi contract: frontend components keep calling `/api/ai/chat`.
- Change only the server-side upstream used by `src/app/api/ai/chat/route.ts`.
- Keep the approved model chain unless a later user request changes it:
  - `qwen/qwen3.5-122b-a10b`
  - `openai/gpt-oss-120b`
  - `google/gemma-4-31b-it`
- Keep existing streaming text behavior, R2/D1 cache behavior, and local per-model usage limiting.
- Retire dependency on `https://vps.saaaai.com/yomi-cliproxy/v1` and the route-level `CLIPROXY_API_BASE_URL` override.
- Keep API keys server-side only.

## Constraints

- No `NEXT_PUBLIC_*` AI secrets.
- Do not change unrelated Yomi UI, formatting, OCR, EPUB, TTS, dictionary, or reading flows.
- Do not expose secret values in logs, docs, commits, or final report.
- For local compatibility, the existing `CLIPROXY_API_KEY` may remain accepted as a legacy secret name, but the upstream base URL is fixed to CPA v1.

## Acceptance

- Active source and README no longer require `CLIPROXY_API_BASE_URL` or `yomi-cliproxy`.
- CPA v1 accepts the current server-side key for the primary model.
- `npm run typecheck` passes.
- `npm run lint` passes within the existing warning budget.
- `npm run test:ai-chat-formatting` passes.
- `npm run build` passes.
- A production or local API smoke proves `/api/ai/chat` returns model text through the new upstream.

