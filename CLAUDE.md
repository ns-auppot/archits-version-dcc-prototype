# Notes for Claude

## Before pushing to main

This prototype ships with the **UX Companion** comments widget embedded at `public/ux-companion.js`. The source of truth for that file is the [`netSkope/ux-companion`](https://github.com/netSkope/ux-companion) repo — we vendor the built bundle here so GitHub Actions can deploy without needing private-repo credentials.

**Before every `git push`** (or at the user's request to deploy / ship / commit), run:

```sh
npm run sync-companion
```

This shallow-clones `netSkope/ux-companion`, compares the built widget with `public/ux-companion.js`, and replaces the local copy only if it has changed. If the script updates the file, **include the updated `public/ux-companion.js` in the commit** with a message like `Sync ux-companion widget to latest`.

If the script reports `public/ux-companion.js is already up to date`, nothing to do — skip the extra commit.

## How to update the widget intentionally

The user is asking for a widget feature change, not just a sync:

1. Make the change in `~/ux-companion` (the widget repo).
2. From that repo: `pnpm -r build`, commit, push.
3. Come back here: `npm run sync-companion`, commit the updated `public/ux-companion.js`, push.
