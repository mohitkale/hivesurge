export interface Budget {
  initialGzipBytes: number;
  initialBrotliBytes: number;
  distBytes: number;
}
export interface BudgetResult {
  ok: boolean;
  failures: string[];
  initialFiles: string[];
  initialRawBytes: number;
  initialGzipBytes: number;
  initialBrotliBytes: number;
  distBytes: number;
}
export const DEFAULT_BUDGET: Budget;
export function initialJsFiles(distDir: string): string[];
export function checkBudget(distDir: string, budget?: Budget): BudgetResult;
