/**
 * Fast token estimation for LLM context budgeting.
 * Uses character-based heuristics (~4 chars/token for English).
 * Within ~10% of tiktoken for typical content.
 */

export interface TokenEstimate {
  /** Approximate token count */
  tokens: number;
  /** Character count */
  chars: number;
  /** Percentage of common model context windows used */
  contextUsage: {
    'gpt-4o': number;
    'claude-4': number;
    'gemini-2.5': number;
  };
}

const CONTEXT_WINDOWS: Record<string, number> = {
  'gpt-4o': 128_000,
  'claude-4': 200_000,
  'gemini-2.5': 1_000_000,
};

export function estimateTokens(text: string): TokenEstimate {
  const chars = text.length;
  // ~4 chars per token for English prose/markdown
  // Code tends to be ~3.5 chars/token, but mixed content averages ~4
  const tokens = Math.ceil(chars / 4);

  const contextUsage: Record<string, number> = {};
  for (const [model, window] of Object.entries(CONTEXT_WINDOWS)) {
    contextUsage[model] = Math.round((tokens / window) * 10000) / 100;
  }

  return {
    tokens,
    chars,
    contextUsage: contextUsage as TokenEstimate['contextUsage'],
  };
}
