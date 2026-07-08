# Task 3.2 Report: Replace deprecated `webextension-polyfill-ts`

## Imports Found

`grep -rn "webextension-polyfill-ts" packages/extension/src` found:

- `packages/extension/src/storage.ts:3`
- `packages/extension/src/content.ts:2`
- `packages/extension/src/app.ts:1`
- `packages/extension/src/toolbar.ts:1` (commented import)
- `packages/extension/src/message.ts:1`
- `packages/extension/src/background.ts:1`

## Dependency Changes

- Removed `webextension-polyfill-ts@0.25.0` from `@padloc/extension`.
- Added `webextension-polyfill@0.12.0` to `@padloc/extension` dependencies.
- Added `@types/webextension-polyfill@0.12.5` to `@padloc/extension` dev dependencies.
- Updated `pnpm-lock.yaml` via pnpm.

## Source Changes

- Replaced `import { browser } from "webextension-polyfill-ts";` with `import browser from "webextension-polyfill";` in extension source.
- Updated `background.ts` named `Menus` and `Runtime` imports to type-only imports from `webextension-polyfill`.
- Adjusted runtime message listener boundaries to accept `unknown` payloads from the maintained type package and cast locally to the existing `Message` union.
- Cast the `requestMasterKey` response to `string | null` at the call site because `browser.runtime.sendMessage` now returns `unknown`.
- Updated the commented import in `toolbar.ts` so no stale package reference remains.

## Build Result

- Command: `pnpm run web-extension:build`
- Result: passed.
- Note: webpack emitted an existing `[DEP_WEBPACK_COMPILATION_ASSETS]` deprecation warning, but compilation completed successfully.

## Stale-Reference Grep Result

- Command: `grep -rn "webextension-polyfill-ts" packages/extension`
- Result: no output.

## Self-Review

- Scope stayed within `packages/extension` source/package metadata plus `pnpm-lock.yaml` and this task report.
- No PWA/server/electron/cordova/tauri source files were changed.
- The type adaptations are limited to WebExtension message API boundaries required by the maintained type definitions.
