type Token =
  | { type: 'num'; value: number }
  | { type: 'op'; op: '+' | '-' | '*' | '/' | 'neg' }
  | { type: 'paren'; paren: '(' | ')' };

type Op = '+' | '-' | '*' | '/' | 'neg';

function isFiniteNumber(n: number): boolean {
  return typeof n === 'number' && Number.isFinite(n) && !Number.isNaN(n);
}

function tokenize(expression: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expression.length) {
    const ch = expression[i];

    if (ch >= '0' && ch <= '9') {
      let j = i + 1;
      while (j < expression.length && ((expression[j] >= '0' && expression[j] <= '9') || expression[j] === '.')) {
        j++;
      }
      const raw = expression.slice(i, j);
      if (raw === '.' || raw.split('.').length > 2) return null;
      const value = Number(raw);
      if (!isFiniteNumber(value)) return null;
      tokens.push({ type: 'num', value });
      i = j;
      continue;
    }

    if (ch === '.') {
      // Leading-decimal number like ".5"
      let j = i + 1;
      while (j < expression.length && ((expression[j] >= '0' && expression[j] <= '9') || expression[j] === '.')) {
        j++;
      }
      const raw = expression.slice(i, j);
      if (raw === '.' || raw.split('.').length > 2) return null;
      const value = Number(raw);
      if (!isFiniteNumber(value)) return null;
      tokens.push({ type: 'num', value });
      i = j;
      continue;
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ type: 'op', op: ch });
      i++;
      continue;
    }

    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', paren: ch });
      i++;
      continue;
    }

    // Should never happen given sanitization.
    return null;
  }

  return tokens;
}

function toRpn(tokens: Token[]): Token[] | null {
  const output: Token[] = [];
  const stack: Token[] = [];

  const precedence: Record<Op, number> = {
    neg: 3,
    '*': 2,
    '/': 2,
    '+': 1,
    '-': 1,
  };

  const isRightAssociative = (op: Token & { type: 'op' }): boolean => op.op === 'neg';

  let prev: Token | null = null;

  for (const token of tokens) {
    if (token.type === 'num') {
      output.push(token);
      prev = token;
      continue;
    }

    if (token.type === 'paren') {
      if (token.paren === '(') {
        stack.push(token);
        prev = token;
        continue;
      }

      // ')'
      let foundLeftParen = false;
      while (stack.length > 0) {
        const top = stack.pop()!;
        if (top.type === 'paren' && top.paren === '(') {
          foundLeftParen = true;
          break;
        }
        output.push(top);
      }
      if (!foundLeftParen) return null;
      prev = token;
      continue;
    }

    if (token.type === 'op') {
      // Detect unary +/-
      let opToken: Token & { type: 'op' } = token;
      const isUnary =
        !prev ||
        (prev.type === 'op') ||
        (prev.type === 'paren' && prev.paren === '(');

      if (isUnary && (token.op === '+' || token.op === '-')) {
        if (token.op === '+') {
          prev = token;
          continue; // unary plus: no-op
        }
        opToken = { type: 'op', op: 'neg' };
      }

      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (top.type !== 'op') break;

        const topPrec = precedence[top.op];
        const curPrec = precedence[opToken.op];
        const shouldPop = isRightAssociative(opToken) ? topPrec > curPrec : topPrec >= curPrec;
        if (!shouldPop) break;
        output.push(stack.pop() as Token);
      }

      stack.push(opToken);
      prev = token;
      continue;
    }
  }

  while (stack.length > 0) {
    const top = stack.pop()!;
    if (top.type === 'paren') return null;
    output.push(top);
  }

  return output;
}

function evalRpn(rpn: Token[]): number | null {
  const stack: number[] = [];

  for (const token of rpn) {
    if (token.type === 'num') {
      stack.push(token.value);
      continue;
    }

    if (token.type !== 'op') return null;

    if (token.op === 'neg') {
      const a = stack.pop();
      if (a === undefined) return null;
      stack.push(-a);
      continue;
    }

    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) return null;

    let result: number;
    switch (token.op) {
      case '+':
        result = a + b;
        break;
      case '-':
        result = a - b;
        break;
      case '*':
        result = a * b;
        break;
      case '/':
        if (b === 0) return null;
        result = a / b;
        break;
      default:
        return null;
    }

    if (!isFiniteNumber(result)) return null;
    stack.push(result);
  }

  if (stack.length !== 1) return null;
  return stack[0];
}

// Safely evaluates mathematical expressions like "1000 + 150 - 50".
// NOTE: Must not use `eval`/`Function` because the app sets a strict CSP (no `unsafe-eval`).
export function evaluateExpression(expression: string): number {
  if (!expression) return 0;

  // Strip everything after '=' (e.g. "100 + 50 = 150" -> "100 + 50")
  const expr = expression.split('=')[0].trim();

  // Keep only numbers and mathematical symbols: 0-9, +, -, *, /, (, ), .
  const sanitized = expr.replace(/[^0-9+\-*/().]/g, '');
  if (!sanitized) return 0;

  const tokens = tokenize(sanitized);
  if (!tokens || tokens.length === 0) return 0;

  const rpn = toRpn(tokens);
  if (!rpn) return 0;

  const evaluated = evalRpn(rpn);
  return evaluated !== null && evaluated > 0 ? evaluated : 0;
}
