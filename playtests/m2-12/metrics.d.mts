export interface AnalyticsEventLike {
  name: string;
  ts: number;
  session?: string;
  props?: Record<string, string | number | boolean>;
}
export interface SessionMetrics {
  battles: number;
  wins: number;
  fails: number;
  completionRate: number | null;
  retryAfterLossRate: number | null;
  timeToFirstWinS: number | null;
  dropOffLevel: string | number | boolean | null;
  dropOffWasLoss: boolean | null;
  sessionLengthMin: number;
  levelsReached: (string | number | boolean)[];
  ftueSteps: number;
  ftueQueenMs: number | null;
}
export const RETRY_WINDOW_MS: number;
export function sessionMetrics(events: AnalyticsEventLike[]): SessionMetrics;
export function labelFor(file: string): 'bot' | 'qa' | 'other';
export function aggregate(rows: { label: string; metrics: SessionMetrics }[]): Record<
  string,
  {
    sessions: number;
    battles: number;
    wins: number;
    fails: number;
    completionRate: number | null;
    retryAfterLossRate: number | null;
  }
>;
