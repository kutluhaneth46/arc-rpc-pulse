const REFRESH_MS = 60_000;
const STALE_MINUTES = 30;

const els = {
  checkedAt: document.getElementById("checked-at"),
  healthy: document.getElementById("stat-healthy"),
  rate: document.getElementById("stat-rate"),
  avg: document.getElementById("stat-avg"),
  fast: document.getElementById("stat-fast"),
  rows: document.getElementById("endpoint-rows"),
  refresh: document.getElementById("refresh-btn"),
  live: document.getElementById("live-badge"),
  vantage: document.getElementById("vantage-note"),
};

function formatTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function ageMinutes(iso) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

function statusClass(ep) {
  const status = ep.status ?? (ep.ok ? "ok" : ep.rateLimited ? "limited" : "error");
  if (status === "ok") return "ok";
  if (status === "limited") return "warn";
  return "bad";
}

function statusLabel(ep) {
  const status = ep.status ?? (ep.ok ? "ok" : ep.rateLimited ? "limited" : "error");
  if (status === "ok") return "OK";
  if (status === "limited") return "Limited";
  return "Down";
}

function note(ep) {
  const status = ep.status ?? (ep.ok ? "ok" : ep.rateLimited ? "limited" : "error");
  if (status === "ok") return "—";
  if (status === "limited") return `-32011 (transient)`;
  return ep.error ?? "error";
}

function renderRows(data) {
  if (data.providers?.length) {
    return data.providers
      .flatMap((provider) => {
        const budgetNote = provider.sharedBudget
          ? `<span class="budget-tag">shared budget</span>`
          : "";
        const header = `
    <tr class="provider-header">
      <td colspan="6">
        <strong>${provider.name}</strong> ${budgetNote}
        <span class="muted">· provider ${statusLabel({ status: provider.status })}</span>
      </td>
    </tr>`;
        const hosts = provider.hosts
          .map(
            (host) => `
    <tr>
      <td><span class="status-pill ${statusClass(host)}">${statusLabel(host)}</span></td>
      <td>
        <div class="provider host-indent">
          <strong>${host.label}</strong>
          <span>${host.url}</span>
        </div>
      </td>
      <td class="mono">${host.latencyMs} ms</td>
      <td class="mono">${host.chainId ?? "—"}</td>
      <td class="mono">${host.blockNumber ?? "—"}</td>
      <td class="muted">${note(host)}</td>
    </tr>`,
          )
          .join("");
        return header + hosts;
      })
      .join("");
  }

  return (data.endpoints ?? [])
    .map(
      (ep) => `
    <tr>
      <td><span class="status-pill ${statusClass(ep)}">${statusLabel(ep)}</span></td>
      <td>
        <div class="provider">
          <strong>${ep.name}</strong>
          <span>${ep.url}</span>
        </div>
      </td>
      <td class="mono">${ep.latencyMs} ms</td>
      <td class="mono">${ep.chainId ?? "—"}</td>
      <td class="mono">${ep.blockNumber ?? "—"}</td>
      <td class="muted">${note(ep)}</td>
    </tr>`,
    )
    .join("");
}

function render(data) {
  const { summary, checkedAt } = data;
  const age = ageMinutes(checkedAt);
  const stale = age > STALE_MINUTES;

  els.checkedAt.innerHTML = stale
    ? `<span class="stale-badge">STALE</span> ${age}m ago · ${formatTime(checkedAt)}`
    : `${age}m ago · ${formatTime(checkedAt)}`;
  els.live.classList.toggle("stale", stale);

  const providersTotal = summary.providersTotal ?? summary.total;
  const providersOk = summary.providersOk ?? summary.healthy;

  els.healthy.textContent = `${providersOk}/${providersTotal} providers`;
  els.rate.textContent = String(summary.hostsLimited ?? summary.rateLimited ?? 0);
  els.avg.textContent =
    summary.avgLatencyMs != null ? `${summary.avgLatencyMs} ms` : "—";
  els.fast.textContent = summary.fastest
    ? `${summary.fastest.name} · ${summary.fastest.latencyMs} ms`
    : "—";

  if (els.vantage) {
    els.vantage.textContent =
      data.vantage ??
      "Latency measured from GitHub Actions runner (single vantage, serial probes).";
  }

  els.rows.innerHTML = renderRows(data);
}

async function fetchPulse() {
  const isLocal =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";

  if (isLocal) {
    try {
      const res = await fetch("/api/pulse", { cache: "no-store" });
      if (res.ok) return res.json();
    } catch {
      // fall through to static snapshot
    }
  }

  const res = await fetch("data.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function load({ manual = false } = {}) {
  if (manual) els.refresh.disabled = true;
  els.live.classList.add("loading");

  try {
    const data = await fetchPulse();
    render(data);
  } catch (error) {
    els.rows.innerHTML = `<tr><td colspan="6" class="loading">Failed to load: ${
      error instanceof Error ? error.message : "unknown"
    }</td></tr>`;
  } finally {
    els.refresh.disabled = false;
    els.live.classList.remove("loading");
  }
}

els.refresh.addEventListener("click", () => load({ manual: true }));
load();
setInterval(() => load(), REFRESH_MS);
