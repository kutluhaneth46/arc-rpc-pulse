/** @see https://github.com/kutluhaneth46/arc-dev-survival-kit/blob/main/src/constants.ts */
export const EXPECTED_CHAIN_ID = "0x4cef52";
export const EXPECTED_CHAIN_ID_DECIMAL = 5042002;
export const RATE_LIMIT_CODE = -32011;

/**
 * Hostnames grouped by provider budget. QuickNode .network/.io share one backend
 * (circlefin/arc-node#305, osr21) — failover between them does not add redundancy.
 */
export const PROVIDERS = [
  {
    id: "arc",
    name: "Arc",
    hosts: [
      { id: "arc-network", label: "Arc Network", url: "https://rpc.testnet.arc.network" },
      { id: "arc-io", label: "Arc .io", url: "https://rpc.testnet.arc.io" },
    ],
  },
  {
    id: "drpc",
    name: "dRPC",
    hosts: [
      { id: "drpc-network", label: "dRPC .network", url: "https://rpc.drpc.testnet.arc.network" },
      { id: "drpc-io", label: "dRPC .io", url: "https://rpc.drpc.testnet.arc.io" },
    ],
  },
  {
    id: "blockdaemon",
    name: "Blockdaemon",
    hosts: [
      {
        id: "blockdaemon-network",
        label: "Blockdaemon .network",
        url: "https://rpc.blockdaemon.testnet.arc.network",
      },
      {
        id: "blockdaemon-io",
        label: "Blockdaemon .io",
        url: "https://rpc.blockdaemon.testnet.arc.io",
      },
    ],
  },
  {
    id: "quicknode",
    name: "QuickNode",
    sharedBudget: true,
    hosts: [
      {
        id: "quicknode-network",
        label: "QuickNode .network",
        url: "https://rpc.quicknode.testnet.arc.network",
      },
      {
        id: "quicknode-io",
        label: "QuickNode .io",
        url: "https://rpc.quicknode.testnet.arc.io",
      },
    ],
  },
  {
    id: "drpc-org",
    name: "dRPC.org",
    hosts: [{ id: "drpc-org", label: "dRPC.org", url: "https://arc-testnet.drpc.org" }],
  },
];

/** Flat list (legacy shape) for scripts that expect ENDPOINTS. */
export const ENDPOINTS = PROVIDERS.flatMap((p) =>
  p.hosts.map((h) => ({ id: h.id, name: h.label, url: h.url, providerId: p.id })),
);
