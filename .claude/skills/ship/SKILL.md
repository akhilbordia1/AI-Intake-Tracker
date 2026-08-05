---
name: ship
description: Verify, commit, and push this prototype to the deploy branch. The refspec is not the obvious one — work happens on chat-form-format and the deployed branch is main.
disable-model-invocation: true
---

# Ship

**User-invoked only.** A push is outward-facing and this one publishes: `main` is what deploys. Never
run this because a change looks finished — run it when asked.

## The refspec, which is the whole reason this skill exists

```bash
git push origin chat-form-format:main
```

Work happens on **`chat-form-format`**. The deployed branch is **`main`**. A bare `git push` pushes
`chat-form-format` to `chat-form-format` and deploys nothing, which looks like success. Nothing in the
repo records this — not `package.json`, not the git config, not a CI file. That is what this file is for.

Confirm the branch before pushing. If HEAD is not `chat-form-format`, stop and ask — the mapping above
is for that branch specifically, and force-pushing someone else's branch onto `main` is not recoverable
from here.

## Order

1. **Verify first.** Run the `verify` skill's full set. A red check means stop and say so — do not
   commit "to save the work" and do not push past a failure without being told to.
2. **Look at what you are about to commit.** `git status --short` and `git diff --cached --stat`.
   Unexpected files (a `.log`, a `/tmp` artefact, `tsconfig.tsbuildinfo`) get excluded, not committed.
3. **Commit.** Message conventions below.
4. **Push** with the refspec above.
5. **Confirm it landed.** `git ls-remote origin main` should match local HEAD. Report the sha and the
   range, e.g. `93a8307..eb4d5f5`.

## Commit messages

Written normally — no caveman, no ponytail, whatever mode the conversation is in.

- Subject: one line, imperative, no type prefix, no scope. It says what the change *does* for the
  product, not which files moved. `Give the record its own name row, and let the rail leave for good`.
- Body: the **why**, wrapped at ~76 columns. This codebase's comments carry the reasoning, and the log
  is the same voice one level up: what was wrong before, and what the change trades for what. Name the
  bugs found on the way, and say when one was older than the change.
- End with:

  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  ```

## Before pushing, check the docs moved with the code

If the change touched the shell, the tokens, the type scale, or a data invariant, `CLAUDE.md` and
`DESIGN.md` should already say so. They are the map the next session reads; a push that leaves them
stale is how the map starts lying.
