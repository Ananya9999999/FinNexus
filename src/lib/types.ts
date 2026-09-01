export type RiskTolerance = "conservative" | "moderate" | "aggressive";
export type Horizon = "short" | "medium" | "long";
export type DataQuality = "full" | "partial" | "degraded";
export type SignalLabel =
  | "STRONG_BUY"
  | "BUY"
  | "HOLD"
  | "SELL"
  | "STRONG_SELL"
  | "AVOID";

export type PaperAction = "pending" | "accepted" | "ignored" | "sized_down";

export type BehavioralFlag =
  | "loss_averse"
  | "fomo_prone"
  | "momentum_chaser"
  | "prefers_dividends"
  | "balanced";

export type DemoScenario =
  | "none"
  | "reliance_earnings"
  | "fno_trap"
  | "quality_it"
  | "degraded";

export type Holding = {
  ticker: string;
  quantity: number;
  avgPrice: number;
  weightPct: number;
};

export type InvestorProfile = {
  userId: string;
  displayName: string;
  riskTolerance: RiskTolerance;
  investmentHorizon: Horizon;
  maxPositionPct: number;
  preferredSectors: string[];
  avoidSectors: string[];
  behavioralFlags: BehavioralFlag[];
  cashPct: number;
  watchlist: string[];
  notes: string;
  holdings: Holding[];
};

export type MarketSnapshot = {
  ticker: string;
  name: string;
  sector: string;
  lastPrice: number;
  changePct: number;
  volume: number;
  avgVolume20: number;
  high52w: number;
  low52w: number;
  rsi14: number;
  momentum5d: number;
  momentum20d: number;
  volumeZscore: number;
  macdHist: number;
  sma20: number;
  sma50: number;
  deliveryPct: number;
  pcr: number;
  ivRank: number;
  fiiFlow: number;
  dataQuality: DataQuality;
  asOf: string;
  note: string;
  series: { t: string; close: number; volume: number }[];
};

export type Citation = {
  source: string;
  date?: string;
  type?: string;
  snippet: string;
};

export type AgentOutput = {
  agentId: string;
  agentName: string;
  role: string;
  signal: SignalLabel;
  confidence: number;
  score: number;
  reasoning: string;
  keyFactors: string[];
  citations: Citation[];
  metrics: Record<string, number | string | number[]>;
  latencyMs: number;
  degraded: boolean;
  error?: string;
};

export type AgentPhase = "idle" | "running" | "done";

export type Synthesis = {
  finalSignal: SignalLabel;
  confidence: number;
  score: number;
  recommendation: string;
  thesis: string;
  dissent: string;
  invalidation: string;
  personalizedNote: string;
  positionHintPct: number;
  agentWeights: Record<string, number>;
  reasoningChain: string[];
  riskAdjustment: string;
  agreement: number;
  latencyMs: number;
  degraded: boolean;
  currentHoldingPct: number;
  trapWarning?: string;
};

export type PortfolioImpact = {
  action: string;
  currentWeightPct: number;
  proposedWeightPct: number;
  deltaPct: number;
  cashBefore: number;
  cashAfter: number;
  hhiBefore: number;
  hhiAfter: number;
  riskScoreBefore: number;
  riskScoreAfter: number;
  diversificationNote: string;
  withinLimits: boolean;
  maxPositionLimit: number;
};

export type PipelineResult = {
  sessionId: string;
  timestamp: string;
  ticker: string;
  market: MarketSnapshot;
  profile: Pick<
    InvestorProfile,
    | "displayName"
    | "riskTolerance"
    | "investmentHorizon"
    | "behavioralFlags"
    | "maxPositionPct"
    | "cashPct"
  >;
  agents: AgentOutput[];
  synthesis: Synthesis;
  impact: PortfolioImpact;
  metrics: {
    sessionId: string;
    ticker: string;
    totalLatencyMs: number;
    agentLatencies: Record<string, number>;
    dataQuality: DataQuality;
    numAgentsSucceeded: number;
    signalAgreement: number;
    portfolioHhi: number;
    finalConfidence: number;
    convictionScore: number;
    forwardReturnProxy: number;
  };
};

export type LiveQuote = {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  changePct: number;
  volume: number;
  signal?: SignalLabel;
};

export type DecisionRow = {
  id: number;
  sessionId: string;
  ticker: string;
  signal: string;
  confidence: number;
  score: number;
  recommendation: string;
  latencyMs: number;
  agreement: number;
  hhi: number;
  dataQuality: string;
  paperAction: PaperAction;
  paperSizePct: number | null;
  createdAt: string;
};

export type BriefingItem = {
  ticker: string;
  name: string;
  sector: string;
  kind: "holding" | "watch";
  price: number;
  changePct: number;
  weightPct: number;
  signal: SignalLabel;
  headline: string;
  filing?: { title: string; snippet: string; date?: string };
  trap: boolean;
  concentration: boolean;
  overnightNote: string;
};

export type SectorHeat = {
  sector: string;
  changePct: number;
  count: number;
};
