/**
 * Formula Engine Service
 *
 * Evaluates mathematical formulas for calculated custom fields.
 * Supports basic arithmetic operations and common functions.
 *
 * Security:
 * - Uses a safe expression parser instead of unsafe dynamic code evaluation
 * - Validates variable names and operators
 * - Prevents code injection
 */

/**
 * Supported operators and their implementations
 */
const OPERATORS = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => {
    if (b === 0) throw new Error('Division by zero');
    return a / b;
  },
  '^': (a, b) => Math.pow(a, b)
};

/**
 * Supported functions and their implementations
 */
const FUNCTIONS = {
  sqrt: (x) => {
    if (x < 0) throw new Error('Cannot take square root of negative number');
    return Math.sqrt(x);
  },
  abs: (x) => Math.abs(x),
  round: (x, decimals = 0) => {
    const multiplier = Math.pow(10, decimals);
    return Math.round(x * multiplier) / multiplier;
  },
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  min: (...args) => Math.min(...args),
  max: (...args) => Math.max(...args)
};

/**
 * Tokenize a formula string into tokens
 * @param {string} formula - The formula string
 * @returns {Array} Array of tokens
 */
function tokenize(formula) {
  const tokens = [];
  let current = '';
  let inVariable = false;

  for (let i = 0; i < formula.length; i++) {
    const char = formula[i];

    if (char === '{') {
      if (current.trim()) {
        tokens.push(current.trim());
        current = '';
      }
      inVariable = true;
    } else if (char === '}') {
      if (inVariable && current) {
        tokens.push({ type: 'variable', name: current.trim() });
        current = '';
      }
      inVariable = false;
    } else if (inVariable) {
      current += char;
    } else if (['+', '-', '*', '/', '^', '(', ')', ','].includes(char)) {
      if (current.trim()) {
        tokens.push(current.trim());
        current = '';
      }
      if (char !== ' ') {
        tokens.push(char);
      }
    } else if (char === ' ' && !inVariable) {
      if (current.trim()) {
        tokens.push(current.trim());
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    tokens.push(current.trim());
  }

  return tokens;
}

/**
 * Parse tokens into an expression tree (Shunting Yard algorithm)
 * @param {Array} tokens - Array of tokens
 * @returns {Array} Postfix notation array
 */
function parseToPostfix(tokens) {
  const output = [];
  const operatorStack = [];
  const argCountStack = []; // Track argument counts for functions
  const hasArgStack = []; // Track if we've seen at least one arg
  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
  const rightAssociative = { '^': true };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Variable or number
    if (typeof token === 'object' && token.type === 'variable') {
      output.push(token);
      // Mark that we've seen an argument if we're in a function
      if (hasArgStack.length > 0 && !hasArgStack[hasArgStack.length - 1]) {
        hasArgStack[hasArgStack.length - 1] = true;
        argCountStack[argCountStack.length - 1] = 1;
      }
    } else if (!isNaN(parseFloat(token)) && isFinite(token)) {
      output.push(parseFloat(token));
      // Mark that we've seen an argument if we're in a function
      if (hasArgStack.length > 0 && !hasArgStack[hasArgStack.length - 1]) {
        hasArgStack[hasArgStack.length - 1] = true;
        argCountStack[argCountStack.length - 1] = 1;
      }
    }
    // Function
    else if (FUNCTIONS.hasOwnProperty(token)) {
      operatorStack.push({ type: 'function', name: token, argCount: 0 });
    }
    // Operator
    else if (OPERATORS.hasOwnProperty(token)) {
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1] !== '(' &&
        (
          (precedence[operatorStack[operatorStack.length - 1]] > precedence[token]) ||
          (precedence[operatorStack[operatorStack.length - 1]] === precedence[token] && !rightAssociative[token])
        )
      ) {
        output.push(operatorStack.pop());
      }
      operatorStack.push(token);
    }
    // Left parenthesis
    else if (token === '(') {
      // Check if this is a function call
      const prevToken = operatorStack[operatorStack.length - 1];
      if (prevToken && typeof prevToken === 'object' && prevToken.type === 'function') {
        argCountStack.push(0); // Start with 0, will be set to 1 when first arg is seen
        hasArgStack.push(false);
      }
      operatorStack.push(token);
    }
    // Right parenthesis
    else if (token === ')') {
      while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
        output.push(operatorStack.pop());
      }
      if (operatorStack.length === 0) {
        throw new Error('Mismatched parentheses');
      }
      operatorStack.pop(); // Remove '('

      // If there's a function on the stack, pop it to output with arg count
      if (operatorStack.length > 0 && typeof operatorStack[operatorStack.length - 1] === 'object' &&
          operatorStack[operatorStack.length - 1].type === 'function') {
        const func = operatorStack.pop();
        const argCount = argCountStack.pop() || 0;
        hasArgStack.pop();
        func.argCount = argCount;
        output.push(func);
      }
    }
    // Comma (function argument separator)
    else if (token === ',') {
      while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
        output.push(operatorStack.pop());
      }
      // Increment argument count when we see a comma
      if (argCountStack.length > 0) {
        argCountStack[argCountStack.length - 1]++;
      }
    }
  }

  while (operatorStack.length > 0) {
    const op = operatorStack.pop();
    if (op === '(' || op === ')') {
      throw new Error('Mismatched parentheses');
    }
    output.push(op);
  }

  return output;
}

/**
 * Evaluate a postfix expression
 * @param {Array} postfix - Postfix notation array
 * @param {Object} values - Variable values map
 * @returns {number} Result
 */
function evaluatePostfix(postfix, values) {
  const stack = [];

  for (const token of postfix) {
    if (typeof token === 'number') {
      stack.push(token);
    } else if (typeof token === 'object' && token.type === 'variable') {
      const value = values[token.name];
      if (value === undefined || value === null) {
        throw new Error(`Missing value for variable: ${token.name}`);
      }
      if (isNaN(value) || !isFinite(value)) {
        throw new Error(`Invalid value for variable ${token.name}: ${value}`);
      }
      stack.push(parseFloat(value));
    } else if (typeof token === 'object' && token.type === 'function') {
      const func = FUNCTIONS[token.name];
      if (!func) {
        throw new Error(`Unknown function: ${token.name}`);
      }

      // Use the argument count tracked during parsing
      const argCount = token.argCount || 1;
      if (stack.length < argCount) {
        throw new Error(`Insufficient arguments for function: ${token.name}`);
      }

      // Pop arguments from stack
      const args = [];
      for (let i = 0; i < argCount; i++) {
        args.unshift(stack.pop());
      }

      // Call the function with the arguments
      const result = func(...args);
      stack.push(result);
    } else if (OPERATORS.hasOwnProperty(token)) {
      if (stack.length < 2) {
        throw new Error(`Insufficient operands for operator: ${token}`);
      }
      const b = stack.pop();
      const a = stack.pop();
      stack.push(OPERATORS[token](a, b));
    }
  }

  if (stack.length !== 1) {
    throw new Error('Invalid formula expression');
  }

  return stack[0];
}

/**
 * Evaluate a formula with given variable values
 *
 * @param {string} formula - Formula string (e.g., "{weight} / ({height} * {height})")
 * @param {Object} values - Map of variable names to values
 * @param {number} decimalPlaces - Number of decimal places to round to (default: 2)
 * @returns {Object} { success: boolean, result: number|null, error: string|null }
 */
function evaluateFormula(formula, values, decimalPlaces = 2) {
  try {
    if (!formula || typeof formula !== 'string') {
      return { success: false, result: null, error: 'Formula is required' };
    }

    if (!values || typeof values !== 'object') {
      return { success: false, result: null, error: 'Values must be an object' };
    }

    // Tokenize and parse
    const tokens = tokenize(formula);
    const postfix = parseToPostfix(tokens);

    // Evaluate
    const result = evaluatePostfix(postfix, values);

    // Round to specified decimal places
    const multiplier = Math.pow(10, decimalPlaces);
    const rounded = Math.round(result * multiplier) / multiplier;

    return { success: true, result: rounded, error: null };
  } catch (error) {
    return { success: false, result: null, error: error.message };
  }
}

/**
 * Validate a formula without evaluating it
 *
 * @param {string} formula - Formula string
 * @returns {Object} { valid: boolean, error: string|null, dependencies: string[] }
 */
function validateFormula(formula) {
  try {
    if (!formula || typeof formula !== 'string') {
      return { valid: false, error: 'Formula is required', dependencies: [] };
    }

    // Check for balanced braces
    const openBraces = (formula.match(/\{/g) || []).length;
    const closeBraces = (formula.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      return { valid: false, error: 'Unbalanced braces in formula', dependencies: [] };
    }

    // Extract dependencies
    const dependencies = extractDependencies(formula);

    // Validate variable names (alphanumeric and underscores only)
    for (const dep of dependencies) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dep)) {
        return {
          valid: false,
          error: `Invalid variable name: ${dep}. Must start with letter or underscore and contain only alphanumeric characters and underscores.`,
          dependencies: []
        };
      }
    }

    // Try to tokenize and parse with dummy values
    const tokens = tokenize(formula);
    const dummyValues = {};
    dependencies.forEach(dep => dummyValues[dep] = 1);

    const postfix = parseToPostfix(tokens);
    evaluatePostfix(postfix, dummyValues);

    return { valid: true, error: null, dependencies };
  } catch (error) {
    return { valid: false, error: error.message, dependencies: [] };
  }
}

/**
 * Extract dependency field names from a formula
 *
 * @param {string} formula - Formula string
 * @returns {string[]} Array of field names this formula depends on
 */
function extractDependencies(formula) {
  if (!formula || typeof formula !== 'string') {
    return [];
  }

  const dependencies = new Set();
  const regex = /\{([^}]+)\}/g;
  let match;

  while ((match = regex.exec(formula)) !== null) {
    dependencies.add(match[1].trim());
  }

  return Array.from(dependencies);
}

/**
 * Detect circular dependencies in calculated fields
 *
 * @param {string} fieldName - The field being checked
 * @param {Array} dependencies - Direct dependencies of this field
 * @param {Object} allFields - Map of all field definitions { name: { dependencies: [] } }
 * @returns {Object} { hasCircular: boolean, cycle: string[]|null }
 */
function detectCircularDependencies(fieldName, dependencies, allFields) {
  const visited = new Set();
  const recursionStack = new Set();
  const cycle = [];

  function dfs(currentField, path) {
    visited.add(currentField);
    recursionStack.add(currentField);
    path.push(currentField);

    const fieldDeps = currentField === fieldName ? dependencies : (allFields[currentField]?.dependencies || []);

    for (const dep of fieldDeps) {
      if (!visited.has(dep)) {
        if (dfs(dep, [...path])) {
          return true;
        }
      } else if (recursionStack.has(dep)) {
        // Found a cycle
        const cycleStart = path.indexOf(dep);
        cycle.push(...path.slice(cycleStart), dep);
        return true;
      }
    }

    recursionStack.delete(currentField);
    return false;
  }

  const hasCircular = dfs(fieldName, []);

  return {
    hasCircular,
    cycle: hasCircular ? cycle : null
  };
}

/**
 * Get available operators and functions for formula building
 *
 * @returns {Object} { operators: string[], functions: Array<{name, description, example}> }
 */
function getAvailableOperators() {
  return {
    operators: Object.keys(OPERATORS),
    functions: [
      { name: 'sqrt', description: 'Square root', example: 'sqrt({value})' },
      { name: 'abs', description: 'Absolute value', example: 'abs({value})' },
      { name: 'round', description: 'Round to N decimals', example: 'round({value}, 2)' },
      { name: 'floor', description: 'Round down', example: 'floor({value})' },
      { name: 'ceil', description: 'Round up', example: 'ceil({value})' },
      { name: 'min', description: 'Minimum value', example: 'min({value1}, {value2})' },
      { name: 'max', description: 'Maximum value', example: 'max({value1}, {value2})' }
    ]
  };
}

module.exports = {
  evaluateFormula,
  validateFormula,
  extractDependencies,
  detectCircularDependencies,
  getAvailableOperators
};
