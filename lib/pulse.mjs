import {
  ENDPOINTS,
  EXPECTED_CHAIN_ID,
  RATE_LIMIT_CODE,
} from "./endpoints.mjs";

const TIMEOUT_MS = 12_000;

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

export async function probeEndpoint(endpoint) {
  const started = performance.now();

  try {
    const chainId = await jsonRpc(endpoint.url, "eth_chainId");
    const latencyMs = Math.round(performance.now() - started);
    const chainOk = String(chainId).toLowerCase() === EXPECTED_CHAIN_ID;

    let blockNumber = null;
    if (chainOk) {
      try {
        const block = await jsonRpc(endpoint.url, "eth_blockNumber");
        blockNumber = Number.parseInt(String(block), 16);
      } catch {
        // chainId succeeded; block probe is optional
      }
    }

    return {
      id: endpoint.id,
      name: endpoint.name,
      url: endpoint.url,
      ok: chainOk,
      latencyMs,
      chainId: String(chainId),
      blockNumber,
      error: chainOk ? null : `unexpected chainId ${chainId}`,
      code: null,
      rateLimited: false,
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - started);
    const code = error?.code ?? null;
    return {
      id: endpoint.id,
      name: endpoint.name,
      url: endpoint.url,
      ok: false,
      latencyMs,
      chainId: null,
      blockNumber: null,
      error: error instanceof Error ? error.message : String(error),
      code,
      rateLimited: code === RATE_LIMIT_CODE,
    };
  }
}

export async function pulseAll() {
  const checkedAt = new Date().toISOString();
  const endpoints = await Promise.all(ENDPOINTS.map((ep) => probeEndpoint(ep)));

  const healthy = endpoints.filter((e) => e.ok);
  const rateLimited = endpoints.filter((e) => e.rateLimited);
  const latencies = healthy.map((e) => e.latencyMs);
  const avgLatencyMs = latencies.length
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : null;
  const fastest = healthy.length
    ? [...healthy].sort((a, b) => a.latencyMs - b.latencyMs)[0]
    : null;

  return {
    checkedAt,
    expectedChainId: EXPECTED_CHAIN_ID,
    summary: {
      total: endpoints.length,
      healthy: healthy.length,
      unhealthy: endpoints.length - healthy.length,
      rateLimited: rateLimited.length,
      avgLatencyMs,
      fastest: fastest
        ? { name: fastest.name, latencyMs: fastest.latencyMs }
        : null,
    },
    endpoints,
  };
}
