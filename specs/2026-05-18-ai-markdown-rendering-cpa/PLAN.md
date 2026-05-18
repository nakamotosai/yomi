# Plan

## Checklist

- [x] Inspect the AI chat renderer and regression tests.
- [x] Identify CPA-specific Markdown shape causing raw stars.
- [x] Normalize whitespace inside Markdown emphasis delimiters.
- [x] Render AI chat strong emphasis as actual bold text.
- [x] Add regression coverage for Chinese list labels with `**title **：`.
- [x] Probe CPA Qwen thinking-off behavior.
- [x] Add Qwen-only `chat_template_kwargs.enable_thinking=false` request shaping.
- [x] Run type/lint/test/build/pages build.
- [x] Deploy production and smoke test the real Yomi endpoint.

## Findings

- CPA/Qwen may emit several seconds of `reasoning_content` before any final `content`.
- Yomi correctly hides reasoning text, but that means the user sees only the typing dots until final content starts.
- Direct CPA probe with top-level `chat_template_kwargs: { "enable_thinking": false }` returned first final content in about 2.9s for the same prompt shape.
- `extra_body` is rejected by CPA validation, so the request field must be top-level and only attached to Qwen models.

## Verification

- `npm run typecheck`: passed.
- `npm run test:ai-chat-formatting`: passed, including `a. **夯实基础 **：`.
- `git diff --check`: passed.
- `npm run lint`: passed with 87 existing warnings and 0 errors.
- `npm run build`: passed.
- `npm run pages:build`: passed.
- `wrangler pages deploy .vercel/output/static --project-name yomi --branch main`: passed; deployment `https://9d584a45.yomi-alr.pages.dev`, source `8bfb320`.
- Production API probe on `https://yomi.saaaai.com/api/ai/chat`: HTTP 200; first body byte about 3.6s for the same three-point prompt; response sample had normalized `**夯实基础**` and no loose `**夯实基础 **`.
- Browser DOM replay on `https://yomi.saaaai.com/` with persisted AI chat fixture: `document.body.innerText` had no raw `**`; `strongTexts` included `学习路径规划`, `夯实基础`, `建立语法框架`, `词汇积累策略`; screenshot artifact `/tmp/yomi-ai-markdown-render-cpa.png`.
