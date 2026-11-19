# Agent Wall

**The daily check-in wall for Binance Agent ID holders** — a small, fully
on-chain dApp on BNB Chain built for the Binance **Agent ID Hackathon**
(60,000 USDC prize pool, submissions 2026-11-18 → 2026-12-09 UTC).

Every day, Agent ID holders check in with a short public message, build
consecutive-day streaks, climb the streak leaderboard, and maintain a small
public agent profile (name + link). Everything lives in one self-contained
smart contract: no backend, no database, no admin.

## How Agent ID is integrated

Agent ID is the product's identity layer, not a decorative badge:

- **Access control (gate).** Both write functions — `checkIn()` and
  `setProfile()` — require `balanceOf(msg.sender) > 0` on the Agent ID
  registry (`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`, SPACE ID Agent ID,
  ERC-721). Non-holders can read the wall but can never write to it. There is
  no allowlist to manage and no other way in: if you don't hold an Agent ID,
  you don't post.
- **Identity.** Each wall identity *is* an Agent ID holder address. The
  optional on-chain profile (display name + link) attaches a human-readable
  identity to that address, and streaks/totals are keyed by it — a Sybil would
  need one soulbound, non-transferable Agent ID per fake identity.
- **One human rhythm.** One check-in per address per UTC day turns the
  non-transferable Agent ID into a "proof of daily presence" primitive:
  streaks are costly to fake and free to verify on-chain.

## What the contract does

`contracts/AgentWall.sol` — a single self-contained Solidity file
(`pragma ^0.8.24`, zero external imports/dependencies):

| Function | Description |
| --- | --- |
| `checkIn(string message)` | Holder-only. One per UTC day. Message ≤ 280 bytes. Updates streaks and appends to the wall. Emits `CheckedIn`. |
| `setProfile(string name, string url)` | Holder-only. Name ≤ 64 bytes, URL ≤ 128 bytes. Emits `ProfileSet`. |
| `userInfo(address)` | Totals, current/longest streak, last check-in day, checked-in-today flag. |
| `profileOf(address)` | Public profile for an address. |
| `totals()` | Unique users and total check-ins. |
| `getCheckIns(offset, limit)` | Paginated wall reads (page size capped at 50). |
| `agentIdRegistry()` | The registry the wall is gated by. |

## Contract addresses (BNB Chain mainnet)

| Contract | Address |
| --- | --- |
| Agent ID registry (SPACE ID) | `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` |
| Agent Wall | `0x35331D2c43267ffD7bfA32c6ceB35a5C921BC7C8` |

Agent Wall was deployed on 2026-11-19 in block `134470113`
(tx [`0xfd26f467468b902b11cb20fdcae9ec09188a9cbd710b33ea72d710d75b7a3970`](https://bscscan.com/tx/0xfd26f467468b902b11cb20fdcae9ec09188a9cbd710b33ea72d710d75b7a3970),
1,030,040 gas). Source verified on Sourcify with an **exact match**;
BscScan verification is pending (see `DEPLOY-NOTES.md`).

## Owner permissions disclosure

**None.** Agent Wall has no owner and no admin functions of any kind: no
pause, no edit, no delete, no upgrade/proxy, no fee or withdrawal path, and no
payable functions. It never takes custody of funds or tokens. Once deployed,
the code — including the hardcoded Agent ID registry address — can never be
changed by anyone, including the deployer. The only external call the contract
ever makes is the read-only `balanceOf` check against the Agent ID registry.

## Run the frontend

The frontend is a single static file: `frontend/index.html` (ethers v6 via
CDN, no build step).

```bash
# any static server works, e.g.:
npx serve frontend
# or simply open frontend/index.html in a browser
```

- Reads (wall, leaderboard, stats, Agent ID checks) go through a public BSC
  RPC — no wallet needed.
- Writes (check-in, profile) use the standard injected wallet
  (`window.ethereum` — Binance Wallet, MetaMask, …) on BNB Chain. The page
  never asks for a seed phrase, private key, or any pairing/QR code.
- `AGENT_WALL_ADDRESS` and `DEPLOY_BLOCK` at the top of the inline script in
  `index.html` are already set to the mainnet deployment above.

## Run the tests

Hardhat + a mock registry (`contracts/MockAgentId.sol`, test-only). Because
the registry address is hardcoded in `AgentWall`, the test suite copies the
mock's bytecode onto the real registry address on the local Hardhat network
(`hardhat_setCode`), so the production code path is tested unmodified.

```bash
npm install
npx hardhat test
```

Coverage: non-holder gating for both writes, first check-in bookkeeping and
events, same-day double check-in rejection, message/name/URL length limits,
streak increment on consecutive days, streak reset after a gap day (with
longest streak retained), profile set/update, unique-user totals, and
pagination including the 50-item page cap. **14 tests, all passing.**

## Repository layout

```
contracts/AgentWall.sol    the dApp (single file, deployable as-is)
contracts/MockAgentId.sol  test-only mock of the Agent ID registry
test/AgentWall.test.js     Hardhat test suite
scripts/deploy.js          one-shot mainnet deployment script (see DEPLOY-NOTES.md)
scripts/verify-sourcify.js Sourcify verification submission
frontend/index.html        static frontend (single file)
DEPLOY-NOTES.md            deployment cost, BscScan verification, submission kit
```

## License

MIT — see the `SPDX-License-Identifier: MIT` header in each source file.
