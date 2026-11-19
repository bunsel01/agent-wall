# Agent Wall — Deployment & Submission Notes

Status: **DEPLOYED to BNB Chain mainnet on 2026-11-19.** Source verified on
Sourcify (**exact match**). BscScan verification is the one remaining owner
step (see §2). Frontend hosting and the hackathon submission are still open.

### Actual deployment (2026-11-19)

| Item | Value |
| --- | --- |
| Contract | `0x35331D2c43267ffD7bfA32c6ceB35a5C921BC7C8` |
| Deploy tx | `0xfd26f467468b902b11cb20fdcae9ec09188a9cbd710b33ea72d710d75b7a3970` |
| Block | 134470113 |
| Deployer | `0x0640596205bf5c2FC87A5175ceD0Ae7C52aA020b` (dedicated deployer wallet) |
| Gas used | 1,030,040 (exactly the local measurement) |
| Gas price | 0.05 gwei (median of 3 public RPCs at deploy time) |
| Actual cost | **0.000051502 BNB** (≈ $0.03) |
| Deployer balance after | 0.000948498 BNB |
| Post-deploy checks | `eth_getCode` = 4,524 bytes; `totals()` = (0, 0); `agentIdRegistry()` = `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` ✓ |

Deployment was a single broadcast via `scripts/deploy.js` (record in
`deploy-result.json`). The deployer key lives outside this repo and the
contract has no admin functions, so the deployer has no power over it.

## 1. Deployment cost estimate (BSC mainnet)

Measured locally (Hardhat, solc 0.8.24, optimizer 200 runs — the exact build
that will be deployed):

| Action | Gas used | Cost @ 0.1 gwei | Cost @ 1 gwei |
| --- | --- | --- | --- |
| Deploy `AgentWall` | 1,030,040 | 0.000103 BNB (≈ $0.06) | 0.001030 BNB (≈ $0.61) |
| First `checkIn` (~50-byte message) | 320,663 | 0.000032 BNB (≈ $0.02) | 0.000321 BNB (≈ $0.19) |
| `setProfile` | 76,919 | 0.0000077 BNB (< $0.01) | 0.000077 BNB (≈ $0.05) |

USD figures assume BNB ≈ $590. Repeat daily check-ins are cheaper than the
first (storage already initialized) — roughly 0.00002 BNB at 0.1 gwei.
Deployment is a single transaction with **no constructor arguments**.

Deployment checklist:

1. ✅ Deploy `contracts/AgentWall.sol` to BNB Chain mainnet (chainId 56),
   value 0 — done 2026-11-19 (see "Actual deployment" above).
2. ✅ Record the contract address and the deployment block number.
3. ⚠️ Verify source: **Sourcify done (exact match)**; **BscScan still
   pending — owner step**, see §2.
4. ✅ Fill `AGENT_WALL_ADDRESS` and `DEPLOY_BLOCK` in `frontend/index.html`.
5. ⬜ Host `frontend/index.html` (any static host) and note the URL for the
   submission form.
6. ⬜ Sanity-check from a second Agent ID holder address: one check-in + one
   profile save; confirm the wall and leaderboard render.

## 2. Source verification

### Sourcify — ✅ DONE (2026-11-19)

Submitted via `scripts/verify-sourcify.js` (Sourcify API v2, no key needed)
using the Hardhat build-info standard JSON input. Result: **exact match**
for `0x35331D2c43267ffD7bfA32c6ceB35a5C921BC7C8` on chain 56 —
https://sourcify.dev/#/lookup/0x35331D2c43267ffD7bfA32c6ceB35a5C921BC7C8

### BscScan — ⬜ REMAINING OWNER STEP

No BscScan API key exists yet, so this is the owner's step (a few minutes):

- **Option A (scripted):** create a free account at https://bscscan.com,
  get an API key, then run
  `npx hardhat verify --network bsc 0x35331D2c43267ffD7bfA32c6ceB35a5C921BC7C8`
  with the key configured (or ask the agent to run it once the key exists).
- **Option B (web UI, standard JSON — recommended):** on the contract page →
  **Contract** → **Verify and Publish**, choose compiler type
  **Solidity (Standard-JSON-Input)**, compiler **v0.8.24+commit.e11b9ed9**,
  license **MIT**, and upload **`bscscan-standard-json.json`** from the repo
  root (already generated — it is the exact solc input of the deployed
  build). No constructor arguments.
- **Option C (web UI, single file):** the manual flow below.

`AgentWall.sol` is fully self-contained (no imports), so the single-file
flow also works:

1. Open the deployed contract on https://bscscan.com → **Contract** tab →
   **Verify and Publish**.
2. Compiler type: **Solidity (Single file)**.
3. Compiler version: **v0.8.24+commit.e11b9ed9** (match `hardhat.config.js`).
4. License: **MIT**.
5. Optimization: **Yes**, runs **200** (must match the build settings, or
   verification fails).
6. Paste the entire contents of `contracts/AgentWall.sol`.
7. Constructor arguments: **none** (leave empty).
8. Submit. The registry interface at the top of the file is part of the same
   source — no library linking or flattening is needed.

(Equivalent scripted path, if preferred later: `npx hardhat verify --network
bsc <address>` with a BscScan API key configured — not set up yet, the UI flow
above needs no key.)

## 3. Hackathon submission form — required inputs

Per the official announcement, the submission needs:

- **Project name:** Agent Wall
- **Website:** TBD — the hosted `frontend/index.html` URL (fill after hosting)
- **Contract address(es):** `0x35331D2c43267ffD7bfA32c6ceB35a5C921BC7C8`
  (Agent Wall, BNB Chain mainnet, deployed 2026-11-19). The Agent ID
  registry it integrates, `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`, is
  Binance/SPACE ID's own contract and is listed for context, not as a
  submitted contract.
- **Agent ID usage description:** draft below.
- Project logo/screenshots (optional but recommended): capture the wall +
  leaderboard after the first real check-ins land.

### Draft — Agent ID usage description (for the submission form)

> Agent Wall is a daily check-in wall on BNB Chain that is exclusively for
> Binance Agent ID holders. Agent ID is the product's identity and access
> layer: the AgentWall contract (verified, open source, no owner or admin
> functions) checks `balanceOf` on the Agent ID registry
> (0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F) inside every write function, so
> only Agent ID holders can check in or set a profile — there is no allowlist
> and no other way to post. Each holder may check in once per UTC day with a
> short public message, building a consecutive-day streak and a public agent
> profile (name + link) keyed to their Agent ID address. Because an Agent ID
> is soulbound and one-per-person, streaks and the leaderboard are costly to
> Sybil and trivially verifiable on-chain: Agent ID becomes a "proof of daily
> presence" primitive for the agent ecosystem. All state — check-ins,
> profiles, streaks, totals — lives in the single AgentWall contract and is
> readable by anyone through its public views and events; the static frontend
> needs no backend and connects only through the user's own injected wallet.

## 4. Eligibility reminders (from the announcement)

- Submission window: **2026-11-18 08:00 UTC → 2026-12-09 08:00 UTC**.
- Innovation Award eligibility needs **≥ 30 distinct Agent ID addresses**
  interacting with the contract during the submission window — plan community
  promotion (Agent ID Discord, X) immediately after deployment; only
  interactions after deployment count.
- Safety red lines to respect: no QR/pairing-code wallet login in the product
  (the frontend uses standard injected-wallet connection only), no bypassing
  user transaction confirmation, no promises of returns, contracts open-source
  with owner permissions disclosed (ours: none — see README).
- Community Promotion Award (optional, separate): an original X post about
  the project with **#BinanceWalletHackathon** and **#AgenticWallet**,
  submitted through the official campaign survey.
