# File ownership

One owner (BE, the AC owner) for the whole change; no FE or devops files. Product code is out of bounds.

| Pattern | Owner |
|---|---|
| app/tools/e2e-pw-common.js | BE |
| app/tools/e2e-voice-hooks.js | BE |
| app/tools/e2e-pw-voice.js | BE |
| app/tools/e2e-pw.js | BE |
| app/README.md | BE |
| .gitignore | BE |

Not touched by anyone in this task: `app/src/**`, `app/public/**` (Don't touch), `app/package.json` (no new dependency), `docs/strategy.md`, `docs/architecture/**`. `app/e2e-out/**` is generated output (gitignored), never committed.
