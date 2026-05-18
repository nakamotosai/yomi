# Yomi AI Thinking Transient Display Design

Date: 2026-05-18

## Objective

Allow Qwen/CPA thinking mode to stay enabled for the main AI teacher chat, show a temporary thinking state while reasoning is streaming, then remove the thinking content when final answer text begins. The final chat history, bookmarks, cache, and copied/exported content must contain only the final answer.

## Current State

- `src/app/api/ai/chat/route.ts` currently disables Qwen thinking with `chat_template_kwargs.enable_thinking=false`.
- The API currently returns `text/plain` and streams only visible answer text to the browser.
- `src/store/useGeminiStore.ts` reads `/api/ai/chat` as a plain text stream and appends every chunk to the final assistant message.
- `src/components/AIChatView.tsx` has only `StreamingDots` for pre-answer waiting; it has no separate transient thinking surface.

## Required Behavior

1. Do not disable Qwen thinking for the main AI teacher chat.
2. Show a visible temporary thinking state as soon as reasoning starts.
3. When final answer content starts, delete the thinking state from the UI and start rendering the answer.
4. Persist only the final answer:
   - `history`
   - `bookmarks`
   - R2 cache
   - D1 cache
   - retry source prompt
5. Keep word/grammar AI explanation behavior stable unless explicitly migrated later.

## Recommended UX

Show a small transient panel inside the assistant bubble:

- Title: `AI 老师正在思考`
- Body: short status text such as `正在整理答案结构...`
- Optional: elapsed seconds after 3s

Do not show raw chain-of-thought text by default. If raw `reasoning_content` is temporarily displayed, it must be treated as volatile UI state and removed from DOM when answer content starts. It must never be persisted.

## API Design

Keep backward compatibility by adding an opt-in event stream mode:

```json
{
  "prompt": "...",
  "systemPrompt": "...",
  "temperature": 0.7,
  "streamMode": "events"
}
```

When `streamMode !== "events"`, keep the current plain text contract for word/grammar explanation calls.

When `streamMode === "events"`, return `Content-Type: text/event-stream; charset=utf-8` with events:

```text
event: thinking_start
data: {"model":"qwen/qwen3.5-122b-a10b"}

event: thinking_delta
data: {"text":"..."}

event: answer_start
data: {}

event: answer_delta
data: {"text":"正文片段"}

event: done
data: {"model":"qwen/qwen3.5-122b-a10b","totalTokens":123}
```

For privacy and UI stability, the first implementation should send generic thinking status events instead of raw `reasoning_content` text:

```text
event: thinking_delta
data: {"text":"正在整理答案结构...","raw":false}
```

If raw temporary thinking is later required, gate it behind a local UI setting and keep the same deletion/persistence guarantees.

## Backend Changes

File: `src/app/api/ai/chat/route.ts`

- Extend `AIRequestBody` with `streamMode?: "text" | "events"`.
- Remove `chat_template_kwargs.enable_thinking=false` for event-mode Qwen chat.
- Keep `enable_thinking=false` available for plain text mode if needed to protect existing explanation UX.
- In the upstream SSE parser:
  - route `delta.reasoning_content` to transient thinking events when event mode is active.
  - route `delta.content` to answer events.
  - on first answer content, emit `answer_start` before `answer_delta`.
- For finalization and cache, accumulate only answer content in `fullText`.
- Never write reasoning text into R2/D1 cache.
- Never use reasoning-only fallback as final answer in event mode; if no final content arrives, return a structured error event.

## Frontend Store Changes

File: `src/store/useGeminiStore.ts`

- Add transient thinking state outside persisted storage:

```ts
chatThinkingText: Record<string, string>;
chatThinkingActive: Record<string, boolean>;
```

- Do not include those fields in `partialize`.
- Main `sendMessage()` should call `/api/ai/chat` with `streamMode: "events"`.
- Parse SSE events:
  - `thinking_start`: mark the assistant placeholder as thinking.
  - `thinking_delta`: update transient thinking UI.
  - `answer_start`: clear transient thinking text and mark thinking inactive.
  - `answer_delta`: enqueue final answer chunks to the existing typewriter.
  - `done`: commit only `fullResponse`.
- On abort/delete/reset/retry, clear transient thinking state for the target message.

## Frontend UI Changes

File: `src/components/AIChatView.tsx`

- Replace the current dots-only waiting state with:
  - thinking panel when `chatThinkingActive[timestamp] === true`
  - existing dots when network is pending but no thinking has arrived
  - `StreamingMarkdown` once final answer text starts
- When final answer content starts, thinking panel disappears immediately.
- Do not render thinking state for non-active historical messages.

## Testing Plan

Add focused tests before production deploy:

1. Route parser unit/smoke fixture:
   - upstream sends `reasoning_content`, then `content`.
   - event stream emits thinking event(s), then `answer_start`, then answer event(s).
   - accumulated final text contains only answer.

2. Store parser test:
   - thinking state appears after `thinking_start`.
   - thinking state clears on `answer_start`.
   - committed history contains only final answer.

3. Browser DOM replay:
   - while thinking active: temporary panel visible.
   - after answer starts: no thinking text remains in `document.body.innerText`.
   - final answer Markdown renders normally.

4. Production API smoke:
   - `https://yomi.saaaai.com/api/ai/chat` with `streamMode:"events"` returns event-stream.
   - no reasoning text appears after final answer starts.
   - existing plain text mode still returns text for explanation calls.

## Rollout Plan

1. Implement event-mode backend while preserving plain text mode.
2. Switch only main AI teacher chat to `streamMode:"events"`.
3. Keep word/grammar explanation on plain text mode.
4. Run typecheck, lint, AI formatting test, build, pages build.
5. Deploy Cloudflare Pages.
6. Verify custom domain production API and browser DOM behavior.
7. Update README current state with the new thinking display contract.

## Acceptance

- Qwen thinking is not disabled for main AI teacher chat.
- User sees a temporary thinking state before final answer text starts.
- Thinking state is removed when final answer starts.
- Final history/bookmarks/cache contain no thinking text.
- Main answer still uses CPA v1.
- Markdown rendering remains fixed for `**标题 **：`.

