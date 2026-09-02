# Arc RPC Pulse

Live health dashboard for all **9 public Arc Testnet JSON-RPC endpoints**.

Probes each URL with `eth_chainId` (and `eth_blockNumber` when healthy), reports latency, rate-limit errors (`-32011`), and highlights the fastest endpoint.

**Companion to [arc-dev-survival-kit](https://github.com/kutluhaneth46/arc-dev-survival-kit)** — the kit teaches the patterns; Pulse shows what's happening right now.

## Live

**https://kutluhaneth46.github.io/arc-rpc-pulse/**

Updates every ~10 minutes via GitHub Actions (plus on-demand refresh reads the latest snapshot).

## Quick start (local)

```bash
git clone https://github.com/kutluhaneth46/arc-rpc-pulse.git
cd arc-rpc-pulse
npm start
# → http://localhost:3456
```

CLI one-shot:

```bash
npm run pulse
```

## Deploy

### GitHub Pages (default)

Enabled on `master` → `/public`. The [Pulse workflow](.github/workflows/pulse.yml) commits fresh `public/data.json` every 10 minutes.

### Vercel (optional, live API)

```bash
npx vercel --prod
```

Requires Node 20+. The `/api/pulse` route probes on demand; static hosting falls back to `data.json`.

## What it checks

| Probe | Purpose |
|-------|---------|
| `eth_chainId` | Must return `0x4cef52` (5042002) |
| `eth_blockNumber` | Confirms read path works |
| Error code | Surfaces `-32011` rate limits |

Endpoints match [arc-dev-survival-kit `constants.ts`](https://github.com/kutluhaneth46/arc-dev-survival-kit/blob/main/src/constants.ts) and [arc-node#299](https://github.com/circlefin/arc-node/pull/299).

## Related

- [Arc Developer Survival Kit](https://github.com/kutluhaneth46/arc-dev-survival-kit)
- [arc-node community showcase #305](https://github.com/circlefin/arc-node/issues/305)
- Contributor PRs: [arc-node#299](https://github.com/circlefin/arc-node/pull/299) (RPC guide)

## License

MIT
