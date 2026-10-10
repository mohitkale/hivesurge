// Minimal Node typings for art budget tests (repo has no @types/node dependency).
declare module 'node:fs' {
  export function existsSync(p: string): boolean;
  export function readdirSync(p: string): string[];
  export function statSync(p: string): { size: number };
}
declare module 'node:path' {
  export function join(...p: string[]): string;
}
