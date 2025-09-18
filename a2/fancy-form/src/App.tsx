import React, { useEffect, useMemo, useRef, useState } from "react";

// ————————————————————————————————————————————————————————————
// Currency Swap Form — Single-file React component (Vite friendly)
// - No external UI deps required; styled with lightweight CSS below
// - Uses Switcheo token icons + prices endpoint
// - Includes validation, slippage, mock balances & submit flow
// - Drop this file into a Vite React project and render <SwapApp />
// ————————————————————————————————————————————————————————————

// Endpoint & icon base (from prompt)
const PRICES_URL = "https://interview.switcheo.com/prices.json";
const ICON_BASE =
  "https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens"; // /<SYMBOL>.svg

// Types
interface PriceRow {
  currency: string;
  date: string; // ISO
  price: number; // USD
}

interface TokenMeta {
  symbol: string;
  priceUSD: number; // latest price (USD)
  updatedAt: string; // ISO latest
}

// Utilities
function byLatestPerCurrency(rows: PriceRow[]): TokenMeta[] {
  const map = new Map<string, PriceRow>();
  for (const row of rows) {
    const prev = map.get(row.currency);
    if (!prev || new Date(row.date).getTime() > new Date(prev.date).getTime()) {
      map.set(row.currency, row);
    }
  }
  return Array.from(map.values())
    .filter(
      (r) => typeof r.price === "number" && isFinite(r.price) && r.price > 0
    )
    .map((r) => ({ symbol: r.currency, priceUSD: r.price, updatedAt: r.date }));
}

function formatNumber(n: number, maxFrac = 8) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: maxFrac,
  }).format(n);
}

function iconUrl(symbol: string) {
  return `${ICON_BASE}/${encodeURIComponent(symbol)}.svg`;
}

// A tiny in-memory mock wallet balance (could be replaced by real wallet hook)
const DEFAULT_BALANCES: Record<string, number> = {
  USDC: 2500,
  USD: 1000,
  ETH: 0.75,
  ATOM: 123.45,
  OSMO: 200,
  SWTH: 100000,
};

// Main component
export default function SwapApp() {
  // UI state
  const [tokens, setTokens] = useState<TokenMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // selections
  const [fromSymbol, setFromSymbol] = useState<string>("USDC");
  const [toSymbol, setToSymbol] = useState<string>("ATOM");
  const [amountIn, setAmountIn] = useState<string>("");

  // trade options
  const [slippage, setSlippage] = useState<number>(0.5); // %
  const [feeBps] = useState<number>(20); // 20 bps = 0.20%, mock platform fee

  // mock balances (stateful so we can update after swap)
  const [balances, setBalances] =
    useState<Record<string, number>>(DEFAULT_BALANCES);

  // ephemeral UI state
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  // Fetch prices
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(PRICES_URL, { signal: ac.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw: PriceRow[] = await res.json();
        const latest = byLatestPerCurrency(raw);
        // Filter to only tokens with icons available: best-effort (we won't HEAD request; show fallback if missing)
        setTokens(latest.sort((a, b) => a.symbol.localeCompare(b.symbol)));
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  // Helpers to find selected token metadata
  const fromToken = useMemo(
    () => tokens.find((t) => t.symbol === fromSymbol) || null,
    [tokens, fromSymbol]
  );
  const toToken = useMemo(
    () => tokens.find((t) => t.symbol === toSymbol) || null,
    [tokens, toSymbol]
  );

  // Derived numbers
  const amountInNum = useMemo(() => Number(amountIn) || 0, [amountIn]);
  const rate = useMemo(() => {
    if (!fromToken || !toToken) return 0;
    // 1 FROM -> X TO  (prices are in USD)
    return fromToken.priceUSD / toToken.priceUSD;
  }, [fromToken, toToken]);

  const amountOut = useMemo(() => amountInNum * rate, [amountInNum, rate]);
  const platformFee = useMemo(
    () => amountOut * (feeBps / 10_000),
    [amountOut, feeBps]
  );
  const minReceived = useMemo(
    () => amountOut * (1 - slippage / 100) - platformFee,
    [amountOut, slippage, platformFee]
  );

  // Validations
  const sameToken = fromSymbol === toSymbol;
  const hasPrice = !!fromToken && !!toToken;
  const fromBal = balances[fromSymbol] ?? 0;
  const amountTooHigh = amountInNum > fromBal + 1e-12; // small epsilon
  const amountInvalid = !isFinite(amountInNum) || amountInNum <= 0;

  const canSwap =
    !loading &&
    !error &&
    hasPrice &&
    !sameToken &&
    !amountInvalid &&
    !amountTooHigh &&
    amountOut > 0;

  // Actions
  const flip = () => {
    setFromSymbol(toSymbol);
    setToSymbol(fromSymbol);
  };

  const onMax = () => {
    const v = balances[fromSymbol] ?? 0;
    setAmountIn(v ? String(v) : "");
  };

  const submit = async () => {
    if (!canSwap) return;
    setSubmitting(true);
    setToast(null);
    await new Promise((r) => setTimeout(r, 1100)); // simulate network delay

    // Mock success: deduct from fromSymbol, add to toSymbol with slippage + fee impact
    setBalances((prev) => {
      const next = { ...prev };
      const out = Math.max(minReceived, 0);
      next[fromSymbol] = (next[fromSymbol] ?? 0) - amountInNum;
      next[toSymbol] = (next[toSymbol] ?? 0) + out;
      return next;
    });

    setSubmitting(false);
    setToast({
      type: "success",
      msg: `Swapped ${formatNumber(
        amountInNum
      )} ${fromSymbol} → ~${formatNumber(minReceived)} ${toSymbol}`,
    });
    setAmountIn("");
  };

  // Token list (only those with a price)
  const tokenOptions = tokens;

  // —————————————————— UI ——————————————————
  return (
    <div className="swap-root">
      <style>{css}</style>

      <div className="shell">
        <header className="header">
          <div className="brand">
            <div className="logo">⇄</div>
            <div>
              <h1>Currency Swap</h1>
              <p className="muted">
                Swap assets at live prices • Mock wallet • Slippage & fee
              </p>
            </div>
          </div>
          <button
            className="ghost"
            onClick={() =>
              setToast({ type: "success", msg: "Connected (mock)" })
            }
          >
            Connect Wallet
          </button>
        </header>

        <main className="card">
          {/* FROM */}
          <div className="row">
            <div className="row-head">
              <span className="label">From</span>
              <span className="sub">Balance: {formatNumber(fromBal)}</span>
            </div>
            <div className="row-body">
              <TokenSelect
                tokens={tokenOptions}
                value={fromSymbol}
                onChange={setFromSymbol}
                disabled={loading}
              />
              <div className="amount">
                <input
                  inputMode="decimal"
                  placeholder="0.0"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                />
                <div className="amount-tools">
                  <button className="mini ghost" onClick={onMax}>
                    MAX
                  </button>
                  <div className="usd">
                    ≈ $
                    {fromToken
                      ? formatNumber(amountInNum * fromToken.priceUSD, 2)
                      : "-"}
                  </div>
                </div>
              </div>
            </div>
            {amountInvalid && (
              <div className="error">Enter a valid amount greater than 0.</div>
            )}
            {amountTooHigh && (
              <div className="error">Insufficient balance.</div>
            )}
          </div>

          {/* FLIP */}
          <div className="flip">
            <button className="flip-btn" onClick={flip} title="Swap direction">
              ⥮
            </button>
          </div>

          {/* TO */}
          <div className="row">
            <div className="row-head">
              <span className="label">To</span>
              <span className="sub">Will receive</span>
            </div>
            <div className="row-body">
              <TokenSelect
                tokens={tokenOptions}
                value={toSymbol}
                onChange={setToSymbol}
                disabled={loading}
              />
              <div className="amount readonly">
                <input
                  readOnly
                  value={amountOut ? formatNumber(amountOut) : ""}
                  placeholder="0.0"
                />
                <div className="amount-tools">
                  <div className="usd">
                    ≈ $
                    {toToken
                      ? formatNumber(amountOut * toToken.priceUSD, 2)
                      : "-"}
                  </div>
                </div>
              </div>
            </div>
            {sameToken && (
              <div className="error">Choose a different target currency.</div>
            )}
            {!hasPrice && !loading && (
              <div className="error">Price unavailable for selected pair.</div>
            )}
          </div>

          {/* Rate + Slippage + Fee */}
          <div className="meta">
            <div className="pill">
              Rate: 1 {fromSymbol} = {rate ? formatNumber(rate) : "-"}{" "}
              {toSymbol}
            </div>
            <div className="pill">Fee: {(feeBps / 100).toFixed(2)}%</div>
            <div className="pill">Slippage: {slippage.toFixed(2)}%</div>
          </div>

          <div className="slippage">
            <input
              type="range"
              min={0.1}
              max={5}
              step={0.1}
              value={slippage}
              onChange={(e) => setSlippage(Number(e.target.value))}
            />
            <div className="slip-row">
              <span className="sub">
                Minimum received (after slippage & fee)
              </span>
              <span className="bold">
                {minReceived > 0
                  ? `${formatNumber(minReceived)} ${toSymbol}`
                  : "-"}
              </span>
            </div>
          </div>

          {/* Submit */}
          <button
            className="cta"
            disabled={!canSwap || submitting}
            onClick={submit}
          >
            {submitting ? "Swapping…" : "Swap"}
          </button>

          {/* Footer info */}
          <div className="footer">
            {loading && <span className="muted">Loading prices…</span>}
            {error && (
              <span className="error">Failed to fetch prices: {error}</span>
            )}
            {!loading && !error && (
              <span className="muted">
                Prices from Switcheo • Updated{" "}
                {fromToken?.updatedAt
                  ? new Date(fromToken.updatedAt).toLocaleString()
                  : "recently"}
              </span>
            )}
          </div>
        </main>

        {toast && (
          <div
            className={`toast ${toast.type}`}
            onAnimationEnd={() => setToast(null)}
          >
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}

// —————————————————— Token Select ——————————————————
function TokenSelect({
  tokens,
  value,
  onChange,
  disabled,
}: {
  tokens: TokenMeta[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selected = tokens.find((t) => t.symbol === value) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter((t) => t.symbol.toLowerCase().includes(q));
  }, [tokens, query]);

  return (
    <div className={`select ${disabled ? "disabled" : ""}`} ref={ref}>
      <button
        className="select-btn"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <TokenChip symbol={selected?.symbol || "-"} />
        <span className="sym">{selected?.symbol || "Select"}</span>
        <span className="chev">▾</span>
      </button>
      {open && (
        <div className="dropdown">
          <input
            className="search"
            placeholder="Search token…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="list">
            {filtered.length === 0 && <div className="empty">No results</div>}
            {filtered.map((t) => (
              <button
                className={`item ${t.symbol === value ? "active" : ""}`}
                key={t.symbol}
                onClick={() => {
                  onChange(t.symbol);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <TokenChip symbol={t.symbol} />
                <div className="col">
                  <div className="row1">
                    <span className="sym">{t.symbol}</span>
                    <span className="price">
                      ${formatNumber(t.priceUSD, 4)}
                    </span>
                  </div>
                  <div className="row2">
                    Updated {new Date(t.updatedAt).toLocaleTimeString()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TokenChip({ symbol }: { symbol: string }) {
  const [ok, setOk] = useState(true);
  return (
    <span className="chip">
      {ok ? (
        <img
          src={iconUrl(symbol)}
          onError={() => setOk(false)}
          alt={symbol}
          loading="lazy"
        />
      ) : (
        <span className="placeholder">{symbol.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}

// —————————————————— Styles ——————————————————
const css = `
:root {
  --bg: #0b1020;
  --card: #0f162e;
  --muted: #95a0b5;
  --text: #e9eefc;
  --accent: #6ee7f3;
  --accent2: #a78bfa;
  --error: #ff6b6b;
  --success: #4ade80;
}
* { box-sizing: border-box; }
body { background: var(--bg); }
.swap-root { min-height: 100vh; background: radial-gradient(1000px 600px at 20% -10%, rgba(167,139,250,.25), transparent), radial-gradient(1000px 600px at 100% 0%, rgba(110,231,243,.18), transparent); color: var(--text); display: flex; align-items: center; justify-content: center; padding: 24px; }
.shell { width: 100%; max-width: 880px; }
.header { display:flex; justify-content: space-between; align-items:center; margin-bottom: 18px; }
.brand{ display:flex; gap:12px; align-items:center; }
.logo{ width:44px; height:44px; border-radius:12px; background: linear-gradient(135deg, var(--accent), var(--accent2)); display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:800; color:#0b0f1f; box-shadow: 0 10px 30px rgba(111,231,243,.25); }
.header h1{ margin:0; font-size:20px; }
.muted{ color: var(--muted); font-size: 13px; }
.ghost{ background: transparent; color: var(--text); border:1px solid rgba(255,255,255,.12); padding:10px 14px; border-radius: 10px; cursor:pointer; transition:.2s; }
.ghost:hover{ border-color: rgba(255,255,255,.25); }

.card{ background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.02)); border: 1px solid rgba(255,255,255,.08); border-radius:18px; padding: 18px; backdrop-filter: blur(6px); box-shadow: 0 10px 50px rgba(0,0,0,.35); }
.row{ background: rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.06); border-radius: 14px; padding: 14px; margin-bottom: 12px; }
.row-head{ display:flex; justify-content: space-between; margin-bottom: 10px; }
.label{ font-weight: 600; }
.sub{ color: var(--muted); font-size: 12px; }
.row-body{ display:flex; gap: 12px; align-items: center; }
.select{ position:relative; min-width: 210px; }
.select.disabled{ opacity:.6; pointer-events:none; }
.select-btn{ width:100%; display:flex; align-items:center; gap:10px; background: rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); padding: 10px 12px; border-radius: 12px; color: var(--text); cursor:pointer; }
.chev{ margin-left: auto; opacity:.7; }
.dropdown{ position:absolute; top: calc(100% + 8px); left:0; right:0; background: var(--card); border:1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 8px; z-index: 30; box-shadow: 0 10px 40px rgba(0,0,0,.45); }
.search{ width:100%; background: rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius: 10px; padding: 10px 12px; color: var(--text); outline:none; margin-bottom: 8px; }
.list{ max-height: 280px; overflow:auto; }
.item{ width: 100%; display:flex; align-items:center; gap: 10px; background: transparent; border:0; color: var(--text); text-align:left; padding: 8px; border-radius: 10px; cursor:pointer; }
.item:hover{ background: rgba(255,255,255,.04); }
.item.active{ outline: 2px solid rgba(167,139,250,.35); }
.sym{ font-weight: 600; letter-spacing: .2px; }
.price{ color: var(--muted); font-size: 12px; }
.col{ display:flex; flex-direction: column; }
.row1{ display:flex; gap:8px; align-items:center; }
.row2{ color: var(--muted); font-size: 11px; }

.chip{ width: 26px; height: 26px; display:inline-flex; align-items:center; justify-content:center; border-radius: 999px; overflow:hidden; background: rgba(255,255,255,.08); }
.chip img{ width: 100%; height: 100%; object-fit: cover; }
.placeholder{ font-size:10px; color:#0b0f1f; font-weight:700; background: linear-gradient(135deg, var(--accent), var(--accent2)); width:100%; height:100%; display:flex; align-items:center; justify-content:center; }

.amount{ flex:1; display:flex; flex-direction: column; gap:6px; }
.amount input{ width:100%; background: rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 12px; color: var(--text); font-size: 22px; outline:none; }
.amount.readonly input{ color: var(--muted); }
.amount-tools{ display:flex; justify-content: space-between; align-items:center; }
.mini{ font-size: 12px; padding: 6px 8px; border-radius: 8px; }
.usd{ color: var(--muted); font-size: 12px; }

.flip{ display:flex; justify-content:center; margin: 10px 0 14px; }
.flip-btn{ width: 40px; height: 40px; border-radius: 12px; border:1px solid rgba(255,255,255,.1); background: linear-gradient(135deg, rgba(167,139,250,.1), rgba(110,231,243,.08)); color: var(--text); cursor:pointer; }

.meta{ display:flex; flex-wrap: wrap; gap:8px; margin-top: 10px; }
.pill{ padding: 8px 10px; border:1px solid rgba(255,255,255,.08); border-radius: 999px; font-size: 12px; color: var(--muted); }

.slippage{ margin-top: 10px; border-top:1px dashed rgba(255,255,255,.08); padding-top: 12px; }
.slip-row{ display:flex; justify-content: space-between; margin-top: 4px; }
.bold{ font-weight: 700; }

.cta{ width:100%; margin-top: 16px; padding: 14px 16px; border-radius: 12px; background: linear-gradient(135deg, var(--accent), var(--accent2)); color:#0b0f1f; font-weight:800; cursor:pointer; border: none; box-shadow: 0 12px 35px rgba(167,139,250,.25); }
.cta:disabled{ opacity:.5; cursor:not-allowed; }

.footer{ margin-top: 10px; display:flex; justify-content: space-between; align-items:center; min-height: 24px; }
.error{ color: var(--error); font-size: 12px; margin-top: 6px; }
.toast{ position: fixed; right: 18px; bottom: 18px; background: #14223f; color: var(--text); border:1px solid rgba(255,255,255,.12); border-left: 4px solid var(--success); border-radius: 10px; padding: 10px 12px; animation: toast 2.2s ease-out forwards; }
.toast.error{ border-left-color: var(--error); }
@keyframes toast { 0%{ opacity:0; transform: translateY(12px)} 10%{ opacity:1; transform: translateY(0)} 80%{opacity:1} 100%{ opacity:0; transform: translateY(12px)} }
`;
