# Repository Guide

This is a pnpm workspace monorepo. Prefer repo-local conventions and skills
before introducing new patterns.

## Workspace Map

| Area          | Path               | Stack                                                                                           | Notes                                                                                                      |
| ------------- | ------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Web app       | `apps/web`         | TanStack Start, React 19, TanStack Router, TanStack Query, Tailwind CSS v4, Vite, Convex client | Uses shared web UI from `@workspace/ui`.                                                                   |
| Mobile app    | `apps/mobile`      | Expo Router, React Native, NativeWind, React Native Reusables, Convex client                    | Owns native UI components in `components/ui`, derived from the shared web design system.                   |
| Backend       | `packages/backend` | Convex                                                                                          | Owns Convex schema, functions, generated API exports, auth, email, billing, and backend integration logic. |
| Web UI system | `packages/ui`      | React 19, shadcn-style components, Tailwind CSS v4, Base UI, lucide-react, `usehooks-ts`        | Source of truth for the web design system and design tokens.                                               |
| Automation    | `scripts`          | Shell and explicit Node.js scripts                                                              | JavaScript is allowed here for repo tooling.                                                               |

## Design System Ownership

`packages/ui` defines the canonical web design system. Treat
`packages/ui/src/styles/globals.css` and `packages/ui/src/components` as the
source of truth for tokens, component anatomy, variants, naming, and interaction
patterns.

The mobile app does not directly reuse web React components. Instead,
`apps/mobile/components/ui` implements native components with React Native
Reusables and `@rn-primitives`, while matching the web design system's tokens,
variants, and component behavior where native constraints allow.

Mobile theme files are generated from the web token source:

- Source: `packages/ui/src/styles/globals.css`
- Generated: `apps/mobile/global.css`
- Generated: `apps/mobile/lib/theme.ts`
- Sync command: `pnpm sync:mobile-theme`

This sync translates theme colors; font changes still need a platform migration
from web `@fontsource-variable/*` packages to matching mobile
`@expo-google-fonts/*` packages.

Do not hand-edit generated mobile theme files. Change the token source in
`packages/ui`, then sync the mobile theme.

## File Naming

Use directories as naming context across the entire codebase. For any directory
that names a domain, workflow, module, or role, do not repeat that directory
name in descendant filenames unless an external convention requires it.

Framework-mandated filenames, generated files, config entrypoints, and
third-party convention files may keep their required names.

## Module Layout

Prefer domain-, workflow-, or module-first structure over flat folders once any
area of the codebase has several related files. This applies across apps,
packages, backend functions, scripts, tooling, and UI code.

Inside any source folder, group by user-facing workflow, domain concept, or
module ownership before grouping by implementation role. Avoid broad top-level
piles of components, hooks, actions, controllers, utilities, or helpers when
those files actually belong to different workflows or modules.

Within a workflow, domain, or module folder, split by role only when there are
enough files to justify it:

- `_components/` contains UI implementation private to that workflow or domain.
- `_lib/` contains state, actions, controllers, adapters, and domain logic.
- `_pages/` contains page-level compositions used by routes or screens.
- `_types/` contains shared types when they are large enough to deserve their
  own file.
- `_utils/` is a last resort for small pure helpers genuinely reused inside that
  workflow, domain, or module; prefer named domain files over generic utilities.

## Quality Gate

Before handing off code, run:

```sh
pnpm fix
```

Wait for the command to finish. It is designed to continue after failed checks
and print a final summary of failed commands. Treat Oxlint errors and React
Doctor errors/warnings as blocking quality feedback.

React Doctor warnings are intentionally blocking so agents fix the underlying
React issues, including warning-level issues. Do not add or modify React Doctor
config, disable rules, lower severity, or add suppressions merely to make
`pnpm fix` pass unless the user explicitly asks for that policy change. For
each React Doctor diagnostic, fix the issue or clearly report why it is a
confirmed false positive or unrelated pre-existing issue.

React Doctor is used for React-specific diagnostics; Oxlint owns the generic
lint gate. Do not use React Doctor's duplicate lint pass as a substitute for
fixing or intentionally configuring Oxlint diagnostics.

Fix every `pnpm fix` diagnostic that is caused by, or directly related to, the
code you changed. Then run `pnpm fix` again and repeat until the relevant
diagnostics are resolved.

If remaining errors or warnings are unrelated to the implemented work,
pre-existing, or confirmed false positives, do not expand the scope to fix them
unless the user asks. Clearly report the failed command(s), representative
diagnostics, and why they were left untreated.

## Skill Selection

Read only the skill files needed for the task. Prefer repo-local skills in
`.agents/skills`. For backend-owned features, read `packages/backend/AGENTS.md`
first and then use the backend-local skills in `packages/backend/.agents/skills`.

| Work type                                | Primary skills                                                                                                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Global web UI, styling, design review    | `frontend-design`, `web-design-guidelines`, `shadcn`, `vercel-react-best-practices`                                                                               |
| Shared React component APIs              | `vercel-composition-patterns`, `usehooks-ts`, `shadcn`                                                                                                            |
| Web app routing, loaders, SSR, data flow | `tanstack-start-best-practices`, `tanstack-router-best-practices`, `tanstack-query-best-practices`, `tanstack-integration-best-practices`, `native-data-fetching` |
| Mobile screens, navigation, native UI    | `building-native-ui`, `vercel-react-native-skills`, `react-native-reusables`, `expo-tailwind-setup`                                                               |
| Mobile builds, releases, native modules  | `expo-dev-client`, `expo-deployment`, `upgrading-expo`, `expo-module`, `Expo UI SwiftUI`, `use-dom`                                                               |
| Convex backend                           | `packages/backend/AGENTS.md`, then the needed backend-local Convex skills in `packages/backend/.agents/skills/`.                                                  |
| Backend auth                             | `packages/backend/AGENTS.md`, `convex-dev-better-auth`, and the backend-local Better Auth skills in `packages/backend/.agents/skills/`.                           |
| Backend email                            | `packages/backend/AGENTS.md`, `convex-dev-resend`, and the backend-local Resend/email skills in `packages/backend/.agents/skills/`.                               |
| Backend billing                          | `packages/backend/AGENTS.md`, `convex-dev-stripe`, and the backend-local Stripe skills in `packages/backend/.agents/skills/`.                                     |
| Tooling and architecture                 | `codebase-design`, `improve-codebase-architecture`                                                                                                                |

When reorganizing modules, moving code across files, or improving codebase
architecture, use the `codebase-design` skill first. Structure changes around
deep modules with small interfaces, clear seams, and implementation details
kept local to the owning module.

## Available MCPs

| MCP         | Use for                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Convex      | Inspect deployments, tables, function specs, logs, environment variables, and run Convex functions.        |
| Better Auth | Inspect Better Auth docs and integration guidance for backend auth work.                                   |
| Resend      | Inspect Resend email provider docs and resources for backend transactional email work.                     |
| Stripe      | Inspect Stripe docs and resources for backend billing and payment work.                                    |
| shadcn      | Search registries, inspect component examples, and get add commands for shadcn components.                 |
| Vercel      | Inspect projects, deployments, runtime/build logs, toolbar comments, domains, and deployment access links. |

## Operating Notes

- Keep changes scoped to the package and behavior requested.
- Do not revert unrelated user changes.
