# AGENTS.md — dyno-phi

This file governs how AI agents should behave in this repository. Read it in full before making any changes.

---

## Project Overview

**dyno-phi** is the frontend application for Dyno's Psi-Phi platform, available at `design.dynotx.com`. It is a Next.js (App Router, TypeScript, Tailwind CSS) application that provides:

- An agentic scoring and filtering interface for protein binder design candidates
- A user-facing dashboard that consumes Dyno Phi REST APIs deployed externally
- Visualization and workflow tooling for computational scientists and biopharma developers

This is a **frontend-only** application. All data and AI computation happens via external REST APIs.

---

## Engineering Principles

The full engineering principles document lives at `docs/engineering-principles.md` (local only, not committed). The short version:

1. **Clarity over cleverness.** Code is read more than it is written.
2. **Do one thing.** Functions, components, and modules should have a single responsibility.
3. **Small and focused.** If it scrolls off the screen, it's too big.
4. **Name things well.** Names replace comments. If you need a comment to explain a name, rename it.
5. **No magic.** No magic numbers, no magic strings, no implicit behavior.
6. **Leave it cleaner.** Every PR should leave the codebase in a better state than it found it.
7. **Test behavior, not implementation.** Tests verify what the code does, not how it does it.

---

## Repository Structure

```
src/
  app/           # Next.js App Router pages and layouts
  components/    # Shared React components
  lib/           # Pure utilities, API clients, helpers
    api/         # All REST API call functions live here — never in components
  hooks/         # Custom React hooks
  types/         # Shared TypeScript type definitions
  styles/        # Global styles (Tailwind configuration)
public/          # Static assets
docs/            # Local-only documentation (gitignored)
```

---

## Coding Standards

### TypeScript
- No implicit `any`. Every public function and API boundary must be explicitly typed.
- Use `zod` for runtime validation of all external API responses before they enter the application.
- Prefer `type` over `interface` for data shapes; use `interface` for extensible contracts.

### React / Next.js
- **Default to Server Components.** Only add `"use client"` when the component requires browser APIs, event handlers, or hooks.
- Co-locate tests with components: `Button/Button.tsx` + `Button/Button.test.tsx`.
- Avoid prop-drilling beyond two levels. Use React Context or Zustand for shared state.
- Handle all three states for async data: **loading**, **error**, **success** (and often **empty**).
- Use `loading.tsx` and `error.tsx` App Router conventions for page-level states.

### API Integration
- All `fetch` calls live in `src/lib/api/`. Components never call `fetch` directly.
- Validate response shapes at the API layer using `zod` schemas before returning to callers.
- Return strongly-typed results; never return raw `Response` or unvalidated JSON to components.
- Never put API keys or secrets in client-side code. Use Next.js Server Actions or Route Handlers if credentials are needed.

### Styling
- Use Tailwind CSS utility classes. Avoid custom CSS unless Tailwind cannot express it.
- Group Tailwind classes consistently: layout → spacing → typography → color → effects.
- Extract repeated class combinations into reusable components, not `@apply` blocks.

### Commits
- Follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Each commit should be a coherent, atomic change that passes all linting and tests.
- Write commit messages that explain *why*, not *what*.

---

## What Agents Should Not Do

- Do not introduce new dependencies without explicit user approval.
- Do not create new files unless they are strictly necessary — prefer editing existing files.
- Do not add comments that restate what the code does. Only explain non-obvious intent.
- Do not commit environment files (`.env*`), secrets, or the `docs/` directory.
- Do not bypass ESLint or TypeScript errors with suppression comments (`// @ts-ignore`, `// eslint-disable`) without a documented reason.
- Do not implement server-side persistence (databases, file system writes) — this is a frontend app.

---

## Running the App

```bash
npm run dev      # Start development server at localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
npm run test     # Run tests (once configured)
```

---

## Key External Resources

- Dyno Phi API documentation: _TBD — will be provided in follow-up sessions_
- Design target: `design.dynotx.com`
- Related announcement: NVIDIA GTC / Dyno Psi-1 open-weights model launch
