# Deploy: voice-over (mode 1, design-time check)
Baseline red; code is truth. Local only, nothing is deployed by devops.

## Pinned runtime
Runtime: Node 24.21.0 (base image none: no Dockerfile exists, lockfile app/package-lock.json lockfileVersion 3)

- Source: `node --version` on the dev host = v24.21.0. The repo does NOT pin it today: no `.nvmrc`, no `.node-version`, no `engines` in `app/package.json`. The 24.21.0 value is the version in use, not a repo-declared one.
- Deps unchanged: `socket.io ^4.7.5` (prod), `socket.io-client ^4.8.4` (dev). Voice adds zero npm deps (native `RTCPeerConnection` in the browser, Node core `https` on the server, Node core `crypto`/`child_process` only if the helper is a Node script).
- Cert helper tooling on host: OpenSSL 3.2.4 (`openssl version`). Windows host has it via Git for Windows.

## Target
Targets that exist today: **none**. No Dockerfile, compose, CI (`.github/` absent), IaC, registry, or deploy script. Staging and production do not exist in the repo; where the game runs for real is the user's setup (not proposed here).

How it runs today and how this task is verified (node, since no Dockerfile exists, so "docker local" is not available):
- Install: `cd app && npm install` (or `npm ci`, lockfile v3 present).
- Run HTTP (unchanged, AC-12 fallback): `cd app && npm start` -> `http://localhost:3000` (Moderator `/mod`). Or `.claude/launch.json` config `app` (`node app/src/server/index.js`, port 3000).
- Run HTTPS (new, AC-12): set `HTTPS_KEY` and `HTTPS_CERT` (file paths to PEM) before start, e.g. `HTTPS_KEY=certs/key.pem HTTPS_CERT=certs/cert.pem npm start` -> startup log prints `https://localhost:3000`. Socket.IO reuses the same origin, so `io()` in clients becomes wss with no client change. `PORT` stays 3000 by default.
- Self-signed cert helper (AC-21, P2): a script under `app/tools/` (BE-owned file; it sits beside `make_thumbs.py`, `play-bots.js`) that takes the LAN IP and runs `openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj /CN=<ip> -addext subjectAltName=IP:<ip>` writing key+cert to a gitignored dir. No real secret is committed; the cert is throwaway.
- Phones on LAN: `https://<LAN-ip>:3000` after tapping through the self-signed warning (documented in README per AC-21). Alternative: a tunnel (documented, not installed by devops).
- Tests: `cd app && npm test` (chain in `package.json`); voice tests join this chain. Plain HTTP mode must stay green with HTTPS env unset.
- Optional env: `VOICE_ICE_SERVERS` (JSON, AC-20; default none = LAN host candidates only), `MOD_PASSWORD`, `PORT`. No `.env.example` exists and none is required; env is read from the process environment.

## Files devops owns
For the Orchestrator to pass to architect (contract ownership table). Devops does not edit any of these in mode 1.
- None today (no Dockerfile/compose/CI/deploy scripts exist). No `.env.example` exists.
- Proposed, small, and only if architect wants them as devops-owned: `.gitignore` entry for the cert directory/`*.pem`/`*.key` (see Risk R-2); `.nvmrc` with `24.21.0` (see R-1).
- `app/src/server/index.js` HTTPS branch and `app/tools/<cert script>` are application/tooling code: BE-owned, not devops.

## Risks
- R-1 Runtime not pinned in repo: no `.nvmrc`/`engines`. Smoke or CI on another Node proves nothing (`devops-preflight.mjs` checks `.nvmrc`). Fix: add `.nvmrc` = `24.21.0` (and optionally `engines.node`) before any mode 2 run. No code change needed.
- R-2 Private key could be committed: `.gitignore` has no `*.pem`/`*.key`/certs rule. The cert helper must write to a path git ignores; add that rule in the same change. Never commit a key or cert.
- R-3 HTTPS startup failure modes (BE to cover in a test or clear error): `HTTPS_KEY` set but `HTTPS_CERT` missing/unreadable, bad PEM. Must fail fast with a clear message or fall back to HTTP; a throw inside request handling kills the server (`session.js:12` note). Only one of the two set is the likely mistake.
- R-4 Self-signed cert on phones: warning must be accepted; iOS Safari mic permission persists poorly; cert is bound to one LAN IP, so a changed DHCP address means regenerate. Accepted by AC assumptions.
- R-5 Mod3D page loads Three from jsdelivr via import map (`mod3d.html:128-129`): needs internet on the TV host; unchanged by this task, HTTPS does not add mixed content (CDN is https).
- R-6 WebRTC on LAN: mDNS host candidates fail on APs with client isolation / blocked mDNS; no TURN by design (out of scope). Not provable by a smoke on one machine; document.
- R-7 Missing for real hosting (user's own setup, not proposed here): no Dockerfile, no CI, no hosting target, no TLS cert for a public host, no TURN. Voice needs HTTPS or localhost, so any real host must provide a real certificate or a tunnel.
- R-8 No dedicated health endpoint is listed in the README URL table (`/`, `/mod`, `/gallery`, `/data.js`, docs images). A future mode 2 health-200 check would use `GET /` (200 HTML). Only relevant if a Dockerfile is added.

## 3d smoke trigger
**Not triggered.** Checked against the trigger list: no new runtime/dependency/native package/datastore (zero new npm deps; HTTPS uses Node core `https`); no devops-owned files exist or are expected to change (no Dockerfile/compose/CI); and there is no stack on record needing a first smoke because there is no container stack at all (the app is plain `node`). Voice only adds routes, UI, logic and an optional HTTPS listener, which QA covers by running `npm test` and starting the server in both HTTP and HTTPS modes locally.
Re-trigger if: a dependency is added, a Dockerfile/compose/CI file is introduced, or architect assigns `.nvmrc`/`.gitignore` edits to devops (then a trivial preflight only).
