# Yomi AI Markdown Rendering Fix After CPA Migration

Date: 2026-05-18

## Objective

Fix the production AI teacher response rendering after the CPA v1 migration so Markdown emphasis from the new upstream is displayed as readable UI, not raw `**...**` text.

## Scope

- Main AI teacher chat renderer: `StreamingMarkdown`.
- AI chat upstream request shaping for Qwen thinking behavior.
- Existing AI chat formatting regression test.
- Production deployment and live `/api/ai/chat` smoke.

## Non-goals

- Do not change the CPA v1 upstream route.
- Do not change the approved model fallback chain.
- Do not redesign the AI chat page.
- Do not change word/grammar explanation card renderers unless the same bug appears there.

## Acceptance

- `a. **夯实基础 **：...` renders without raw `**` and with `夯实基础` in a `<strong>`.
- Existing Japanese heading cases still render as intended.
- No model reasoning text appears in the final chat response.
- Qwen CPA requests disable thinking so first visible content is not blocked behind long reasoning output.
- Production `/api/ai/chat` returns real text through CPA v1.
- Static/build checks pass.
