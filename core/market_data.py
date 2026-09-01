"""Market data provider using yfinance + technical indicators. Graceful degradation included."""

from __future__ import annotations
import time
from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any, List
import pandas as pd
import numpy as np

try:
    import yfinance as yf
except ImportError:
    yf = None


@dataclass
class MarketSnapshot:
    ticker: str
    last_price: float
    change_pct: float
    volume: float
    avg_volume_20: float
    high_52w: float
    low_52w: float
    rsi_14: float
    momentum_5d: float
    momentum_20d: float
    volume_zscore: float
    macd_hist: float
    sma_20: float
    sma_50: float
    data_quality: str  # "full" | "partial" | "degraded"
    as_of: str
    raw_note: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _compute_rsi(series: pd.Series, period: int = 14) -> float:
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / (loss + 1e-9)
    rsi = 100 - (100 / (1 + rs))
    return float(rsi.iloc[-1]) if not rsi.empty else 50.0


def _compute_macd(series: pd.Series) -> float:
    ema12 = series.ewm(span=12, adjust=False).mean()
    ema26 = series.ewm(span=26, adjust=False).mean()
    macd = ema12 - ema26
    signal = macd.ewm(span=9, adjust=False).mean()
    hist = macd - signal
    return float(hist.iloc[-1]) if not hist.empty else 0.0


def fetch_market_snapshot(ticker: str, period: str = "6mo") -> MarketSnapshot:
    """Fetch near-real-time snapshot. Falls back to synthetic on failure."""
    clean = ticker.upper()
    if not clean.endswith((".NS", ".BO")):
        clean = clean + ".NS"

    if yf is None:
        return _synthetic_snapshot(clean, reason="yfinance unavailable")

    try:
        t0 = time.time()
        stock = yf.Ticker(clean)
        hist = stock.history(period=period, auto_adjust=True)
        if hist is None or hist.empty or len(hist) < 30:
            return _synthetic_snapshot(clean, reason="insufficient history")

        close = hist["Close"]
        volume = hist["Volume"]
        last = float(close.iloc[-1])
        prev = float(close.iloc[-2])
        change_pct = ((last - prev) / prev) * 100

        avg_vol_20 = float(volume.tail(20).mean())
        vol_z = (float(volume.iloc[-1]) - avg_vol_20) / (volume.tail(20).std() + 1e-9)

        info = {}
        try:
            info = stock.info or {}
        except Exception:
            pass

        high_52 = float(info.get("fiftyTwoWeekHigh") or close.tail(252).max())
        low_52 = float(info.get("fiftyTwoWeekLow") or close.tail(252).min())

        rsi = _compute_rsi(close)
        mom5 = float((close.iloc[-1] / close.iloc[-6] - 1) * 100) if len(close) > 6 else 0.0
        mom20 = float((close.iloc[-1] / close.iloc[-21] - 1) * 100) if len(close) > 21 else 0.0
        macd_h = _compute_macd(close)
        sma20 = float(close.tail(20).mean())
        sma50 = float(close.tail(50).mean()) if len(close) >= 50 else sma20

        latency = time.time() - t0
        quality = "full" if latency < 3.0 else "partial"

        return MarketSnapshot(
            ticker=clean,
            last_price=round(last, 2),
            change_pct=round(change_pct, 2),
            volume=float(volume.iloc[-1]),
            avg_volume_20=round(avg_vol_20, 0),
            high_52w=round(high_52, 2),
            low_52w=round(low_52, 2),
            rsi_14=round(rsi, 1),
            momentum_5d=round(mom5, 2),
            momentum_20d=round(mom20, 2),
            volume_zscore=round(vol_z, 2),
            macd_hist=round(macd_h, 3),
            sma_20=round(sma20, 2),
            sma_50=round(sma50, 2),
            data_quality=quality,
            as_of=str(hist.index[-1].date()),
            raw_note=f"Fetched in {latency:.2f}s via yfinance",
        )
    except Exception as e:
        return _synthetic_snapshot(clean, reason=f"fetch error: {type(e).__name__}")


def _synthetic_snapshot(ticker: str, reason: str = "") -> MarketSnapshot:
    """Deterministic synthetic data for demo / degraded mode."""
    # Simple hash-based pseudo random but stable
    seed = sum(ord(c) for c in ticker) % 1000
    np.random.seed(seed)
    base = 1500 + (seed % 2000)
    change = np.random.uniform(-2.5, 2.5)
    rsi = 40 + (seed % 40)
    return MarketSnapshot(
        ticker=ticker,
        last_price=round(base * (1 + change / 100), 2),
        change_pct=round(change, 2),
        volume=1_200_000 + seed * 1000,
        avg_volume_20=1_100_000.0,
        high_52w=round(base * 1.25, 2),
        low_52w=round(base * 0.75, 2),
        rsi_14=float(rsi),
        momentum_5d=round(np.random.uniform(-4, 5), 2),
        momentum_20d=round(np.random.uniform(-8, 12), 2),
        volume_zscore=round(np.random.uniform(-1.5, 2.5), 2),
        macd_hist=round(np.random.uniform(-5, 5), 3),
        sma_20=round(base * 0.98, 2),
        sma_50=round(base * 0.95, 2),
        data_quality="degraded",
        as_of="2025-08-29 (synthetic)",
        raw_note=f"Synthetic fallback. Reason: {reason}",
    )


def get_watchlist_snapshots(tickers: List[str]) -> List[MarketSnapshot]:
    return [fetch_market_snapshot(t) for t in tickers]
