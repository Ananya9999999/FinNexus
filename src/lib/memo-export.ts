import type { PipelineResult } from "@/lib/types";

export function memoMarkdown(result: PipelineResult) {
  const s = result.synthesis;
  const m = result.market;
  return `# QUORUM Research Memo
**${m.name}** (${m.ticker}) · ${result.timestamp.slice(0, 16).replace("T", " ")} UTC
Session ${result.sessionId}

## Verdict
**${s.finalSignal}** · Conviction ${Math.round(s.confidence * 100)}% · Score ${s.score >= 0 ? "+" : ""}${s.score.toFixed(2)}
Prepared for **${result.profile.displayName}** (${result.profile.riskTolerance}, ${result.profile.investmentHorizon} horizon)

${s.recommendation}

### Thesis
${s.thesis}

### Dissent
${s.dissent}

### Size
${s.positionHintPct >= 0 ? "+" : ""}${s.positionHintPct.toFixed(1)}% of book
${s.trapWarning ? `\n> Trap warning: ${s.trapWarning}\n` : ""}
### Invalidation
${s.invalidation}

## Market snapshot
- Last ₹${m.lastPrice.toLocaleString("en-IN")} (${m.changePct >= 0 ? "+" : ""}${m.changePct}%)
- RSI ${m.rsi14} · Mom 5d ${m.momentum5d}% · Mom 20d ${m.momentum20d}%
- Vol z ${m.volumeZscore} · Delivery ${m.deliveryPct}% · PCR ${m.pcr} · IV rank ${m.ivRank}
- Data quality: ${m.dataQuality}
- ${m.note}

## Specialists
${result.agents
  .map(
    (a) => `### ${a.agentName} — ${a.signal} (conf ${Math.round(a.confidence * 100)}%, ${a.latencyMs} ms)
${a.reasoning}

${a.keyFactors.map((f) => `- ${f}`).join("\n")}

${a.citations.map((c) => `> ${c.source}${c.date ? ` (${c.date})` : ""} — ${c.snippet}`).join("\n")}
`,
  )
  .join("\n")}

## Reasoning chain
${s.reasoningChain.map((x) => `- ${x}`).join("\n")}

## Portfolio impact
${result.impact.action}
Weight ${result.impact.currentWeightPct}% → ${result.impact.proposedWeightPct}%
Cash ${result.impact.cashBefore}% → ${result.impact.cashAfter}%
HHI ${result.impact.hhiBefore} → ${result.impact.hhiAfter}
${result.impact.diversificationNote}

## Session metrics
- Latency ${result.metrics.totalLatencyMs} ms
- Agents succeeded ${result.metrics.numAgentsSucceeded}/5
- Agreement ${Math.round(result.metrics.signalAgreement * 100)}%
- Portfolio HHI ${result.metrics.portfolioHhi}
- 30d forward-return proxy ${result.metrics.forwardReturnProxy}%

---
Not investment advice. Public data + simulated tape. QUORUM.
`;
}

export function downloadMemo(result: PipelineResult) {
  const md = memoMarkdown(result);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `QUORUM_${result.market.ticker.replace(".", "_")}_${result.sessionId}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyMemo(result: PipelineResult) {
  await navigator.clipboard.writeText(memoMarkdown(result));
}

export function printMemo(result: PipelineResult) {
  const md = memoMarkdown(result);
  const escaped = md.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
  const html = `<!doctype html><html><head><title>QUORUM Memo</title>
<style>
  body{font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#111;line-height:1.5;padding:0 24px}
  h1,h2,h3{font-weight:600}
  pre{white-space:pre-wrap;font-family:Georgia,serif}
</style></head><body><pre>${escaped}</pre></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
