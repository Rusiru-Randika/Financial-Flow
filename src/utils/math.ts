// Safely evaluates mathematical expressions like "1000 + 150 - 50"
export function evaluateExpression(expression: string): number {
  if (!expression) return 0;
  
  // Strip everything after '=' (e.g. "100 + 50 = 150" -> "100 + 50")
  let expr = expression.split('=')[0].trim();
  
  // Sanitize to only keep numbers and mathematical symbols: 0-9, +, -, *, /, (, ), .
  const sanitized = expr.replace(/[^0-9+\-*/().]/g, '');
  if (!sanitized) return 0;

  try {
    // Safe evaluation since only mathematical tokens remain
    const evaluated = Function(`"use strict"; return (${sanitized})`)();
    return typeof evaluated === 'number' && !isNaN(evaluated) ? evaluated : 0;
  } catch (e) {
    console.error('Failed to evaluate math expression:', expression, e);
    return 0;
  }
}
