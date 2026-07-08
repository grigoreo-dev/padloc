# Contributing

Thank you for contributing to this padloc fork.

## Language policy

Everything committed to this repository must be in English: code, comments,
documentation, commit messages, pull requests, issues, and GitHub templates.

## Development prerequisites

-   Node.js 18 (see `.nvmrc`)
-   pnpm 10.15.0 (see `packageManager` in `package.json`)
-   Corepack

Recommended setup:

```bash
nvm use
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install
```

## Branch workflow

Use GitHub Flow:

1. Create a short-lived branch from `main`.
2. Make the change.
3. Open a pull request into `main`.
4. Wait for CI and review.
5. Merge with squash merge.

Branch name examples:

-   `feat/passkey-support`
-   `fix/session-timeout`
-   `docs/contributing-guide`
-   `chore/dependency-refresh`

## Commit and PR title format

Use conventional-style prefixes:

-   `feat: add ...`
-   `fix: correct ...`
-   `docs: update ...`
-   `chore: change ...`
-   `ci: adjust ...`
-   `test: add ...`
-   `refactor: simplify ...`

The PR title is checked automatically and should use the same format.

## Local validation

Run the focused checks relevant to your change. The common checks are:

```bash
pnpm run prettier:check
pnpm run locale:extract
pnpm run pwa:build
pnpm run web-extension:build
pnpm run server:start-dry
pnpm -r run test
```

E2E tests are slower and can be run with:

```bash
pnpm run test:e2e
```

## Pull request review

Every PR should:

-   Fill out the PR template.
-   Pass the required CI checks.
-   Receive maintainer review.
-   Read and resolve CodeRabbit and Cubic feedback where relevant.
-   List any follow-up work explicitly.

AI review is advisory. The maintainer makes the final decision.
