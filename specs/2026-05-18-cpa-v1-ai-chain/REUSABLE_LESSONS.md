# Reusable Lessons: Provider Gateway Migration

Use this when moving a project from a local or project-specific AI proxy to a shared public gateway.

## Proven Pattern

1. Map the user-visible contract first.
   Keep the browser or app endpoint stable when possible. In Yomi, the UI keeps calling `/api/ai/chat`; only that route's upstream changes.

2. Separate key existence from protocol compatibility.
   A key being present is not enough. Probe the exact public route and exact protocol, such as `/chat/completions` or a Gemini Live token route.

3. Retire old base URL overrides, not just defaults.
   If an env var can silently point back to an old local proxy, the migration is not complete. Keep secret-name compatibility only when useful; fix the upstream surface when the user has mandated one.

4. Preserve app behavior while replacing the backend hop.
   Keep streaming shape, cache semantics, error behavior, model order, and frontend state contracts unless the request explicitly asks to change them.

5. Verify from the real consumer surface.
   Static checks are not enough. For an AI route, prove that the public app endpoint returns real model text after deployment.

6. Document the retired dependency in the project source of truth.
   README should say what the active route is, what secret is required, and what no longer needs to run.

## Reuse Checklist

- Identify all frontend call sites and confirm whether they can stay unchanged.
- Identify the single server route that owns secret usage.
- Probe the new gateway with the current key without printing the key.
- Remove or ignore env-controlled old base URL paths.
- Keep model fallback order unless the user approves a model/provider change.
- Run type/lint/build checks.
- Deploy or restart the actual runtime.
- Smoke test the public user-facing endpoint.

