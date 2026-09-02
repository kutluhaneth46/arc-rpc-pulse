import {
  PROVIDERS,
  EXPECTED_CHAIN_ID,
  RATE_LIMIT_CODE,
} from "./endpoints.mjs";

const TIMEOUT_MS = 12_000;
const RETRY_DELAY_MS = 1_000;

async function jsonRpc(url, method, params = []) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`non-JSON response (${res.status})`);
  }

  if (data.error) {
    const err = new Error(data.error.message ?? "RPC error");
    err.code = data.error.code;
    throw err;
  }

  return data.result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** @returns {'ok' | 'limited' | 'error'} */
async function probeHost(host) {
  const started = performance.now();

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const chainId = await jsonRpc(host.url, "eth_chainId");
      const latencyMs = Math.round(performance.now() - started);
      const chainOk = String(chainId).toLowerCase() === EXPECTED_CHAIN_ID;

      let blockNumber = null;
      if (chainOk) {
        try {
          const block = await jsonRpc(host.url, "eth_blockNumber");
          blockNumber = Number.parseInt(String(block), 16);
        } catch {
          // optional
        }
      }

      return {
        id: host.id,
        label: host.label,
        url: host.url,
        status: chainOk ? "ok" : "error",
        ok: chainOk,
        latencyMs,
        chainId: String(chainId),
        blockNumber,
        error: chainOk ? null : `unexpected chainId ${chainId}`,
        code: null,
        rateLimited: false,
      };
    } catch (error) {
      const code = error?.code ?? null;
      if (code === RATE_LIMIT_CODE && attempt === 0) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      const latencyMs = Math.round(performance.now() - started);
      const rateLimited = code === RATE_LIMIT_CODE;
      return {
        id: host.id,
        label: host.label,
        url: host.url,
        status: rateLimited ? "limited" : "error",
        ok: false,
        latencyMs,
        chainId: null,
        blockNumber: null,
        error: error instanceof Error ? error.message : String(error),
        code,
        rateLimited,
      };
    }
  }

  return {
    id: host.id,
    label: host.label,
    url: host.url,
    status: "error",
    ok: false,
    latencyMs: 0,
    chainId: null,
    blockNumber: null,
    error: "probe failed",
    code: null,
    rateLimited: false,
  };
}

function providerStatus(hosts) {
  if (hosts.some((h) => h.status === "ok")) return "ok";
  if (hosts.every((h) => h.status === "limited")) return "limited";
  if (hosts.some((h) => h.status === "limited")) return "limited";
  return "error";
}

export async function pulseAll() {
  const checkedAt = new Date().toISOString();
  const providers = [];

  // Serial probes — avoids self-contending all nine budgets at once (osr21 #305).
  for (const provider of PROVIDERS) {
    const hosts = [];
    for (const host of provider.hosts) {
      hosts.push(await probeHost(host));
    }
    providers.push({
      id: provider.id,
      name: provider.name,
      sharedBudget: provider.sharedBudget ?? false,
      status: providerStatus(hosts),
      hosts,
    });
  }

  const endpoints = providers.flatMap((p) =>
    p.hosts.map((h) => ({
      ...h,
      name: h.label,
      providerId: p.id,
      providerName: p.name,
    })),
  );

  const hostsOk = endpoints.filter((e) => e.status === "ok");
  const hostsLimited = endpoints.filter((e) => e.status === "limited");
  const hostsError = endpoints.filter((e) => e.status === "error");
  const providersOk = providers.filter((p) => p.status === "ok");
  const providersLimited = providers.filter((p) => p.status === "limited");

  const latencies = hostsOk.map((e) => e.latencyMs);
  const avgLatencyMs = latencies.length
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : null;
  const fastest = hostsOk.length
    ? [...hostsOk].sort((a, b) => a.latencyMs - b.latencyMs)[0]
    : null;

  return {
    checkedAt,
    expectedChainId: EXPECTED_CHAIN_ID,
    vantage: "GitHub Actions runner (single-position, serial probes)",
    summary: {
      providersTotal: providers.length,
      providersOk: providersOk.length,
      providersLimited: providersLimited.length,
      hostsTotal: endpoints.length,
      hostsOk: hostsOk.length,
      hostsLimited: hostsLimited.length,
      hostsError: hostsError.length,
      // legacy fields
      total: endpoints.length,
      healthy: hostsOk.length,
      unhealthy: hostsError.length,
      rateLimited: hostsLimited.length,
      avgLatencyMs,
      fastest: fastest
        ? { name: fastest.name, latencyMs: fastest.latencyMs }
        : null,
    },
    providers,
    endpoints,
  };
}
