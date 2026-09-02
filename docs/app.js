const REFRESH_MS = 60_000;

const els = {
  checkedAt: document.getElementById("checked-at"),
  healthy: document.getElementById("stat-healthy"),
  rate: document.getElementById("stat-rate"),
  avg: document.getElementById("stat-avg"),
  fast: document.getElementById("stat-fast"),
  rows: document.getElementById("endpoint-rows"),
  refresh: document.getElementById("refresh-btn"),
  live: document.getElementById("live-badge"),
};

function formatTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function statusClass(ep) {
  if (ep.ok) return "ok";
  if (ep.rateLimited) return "warn";
  return "bad";
}

function statusLabel(ep) {
  if (ep.ok) return "OK";
  if (ep.rateLimited) return "Rate limit";
  return "Down";
}

function note(ep) {
  if (ep.ok) return "—";
  if (ep.rateLimited) return `-32011 request limit`;
  return ep.error ?? "error";
}

function render(data) {
  const { summary, checkedAt, endpoints } = data;

  els.checkedAt.textContent = `Last check · ${formatTime(checkedAt)}`;
  els.healthy.textContent = `${summary.healthy}/${summary.total}`;
  els.rate.textContent = String(summary.rateLimited);
  els.avg.textContent =
    summary.avgLatencyMs != null ? `${summary.avgLatencyMs} ms` : "—";
  els.fast.textContent = summary.fastest
    ? `${summary.fastest.name} · ${summary.fastest.latencyMs} ms`
    : "—";

  els.rows.innerHTML = endpoints
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

async function fetchPulse() {
  try {
    const res = await fetch("/api/pulse", { cache: "no-store" });
    if (res.ok) return res.json();
  } catch {
    // static hosting (GitHub Pages) — no serverless API
  }

  const res = await fetch("./data.json", { cache: "no-store" });
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
