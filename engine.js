/*
 * Calc Suit — calculation engine.
 * Pure logic only: no DOM, no storage, no network. Loaded by the app as
 * window.CalcEngine and by the Node test-suite through module.exports.
 *
 * Expression evaluation uses a hand-written tokenizer + recursive-descent
 * parser. Nothing is ever passed to eval(), Function() or similar.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CalcEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Errors                                                              */
  /* ------------------------------------------------------------------ */
  function CalcError(code, message) {
    this.code = code;
    this.message = message;
  }
  var MSG = {
    syntax: 'Check the expression',
    divzero: 'Can’t divide by zero',
    domain: 'Invalid input for this function',
    overflow: 'Result is too large',
    factorial: 'Factorial needs a whole number from 0 to 170',
    undefined: 'Undefined',
    toolong: 'Expression is too long'
  };
  function fail(code) { throw new CalcError(code, MSG[code] || MSG.syntax); }

  var LIMITS = { maxLength: 400, maxTokens: 300, maxDepth: 60 };

  /* ------------------------------------------------------------------ */
  /* Tokenizer                                                           */
  /* ------------------------------------------------------------------ */
  // Function names, longest first so "asin" wins over "sin".
  var FUNCS = ['asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'sqrt', 'cbrt', 'abs', 'sin', 'cos', 'tan', 'log', 'ln'];
  var ALIASES = {
    'sin⁻¹': 'asin', 'cos⁻¹': 'acos', 'tan⁻¹': 'atan',
    '√': 'sqrt', '∛': 'cbrt'
  };
  var OPS = { '+': '+', '-': '-', '−': '-', '–': '-', '*': '*', '×': '*', '·': '*', '/': '/', '÷': '/', '^': '^', '!': '!', '%': '%', '(': '(', ')': ')' };

  function tokenize(src) {
    if (typeof src !== 'string') fail('syntax');
    if (src.length > LIMITS.maxLength) fail('toolong');
    var s = src.replace(/,/g, ''); // thousands separators from pasted / displayed values
    var tokens = [];
    var i = 0;
    while (i < s.length) {
      var c = s[i];
      if (c === ' ' || c === ' ' || c === ' ') { i++; continue; }

      // Number: digits, at most one dot, optional exponent written as E (scientific entry key)
      if ((c >= '0' && c <= '9') || c === '.') {
        var start = i, dots = 0;
        while (i < s.length && ((s[i] >= '0' && s[i] <= '9') || s[i] === '.')) {
          if (s[i] === '.') dots++;
          i++;
        }
        if (dots > 1) fail('syntax');
        var body = s.slice(start, i);
        if (body === '.') fail('syntax');
        if (s[i] === 'E') {
          var j = i + 1;
          if (s[j] === '+' || s[j] === '-' || s[j] === '−') j++;
          var expStart = j;
          while (j < s.length && s[j] >= '0' && s[j] <= '9') j++;
          if (j === expStart) fail('syntax');
          body += 'e' + s.slice(i + 1, j).replace('−', '-');
          i = j;
        }
        var n = Number(body);
        if (!isFinite(n)) fail('overflow');
        tokens.push({ t: 'num', v: n });
        continue;
      }

      // Aliased symbols (multi-char first)
      var matched = false;
      for (var a in ALIASES) {
        if (s.substr(i, a.length) === a) {
          tokens.push({ t: 'func', v: ALIASES[a] });
          i += a.length; matched = true; break;
        }
      }
      if (matched) continue;

      for (var f = 0; f < FUNCS.length; f++) {
        var name = FUNCS[f];
        if (s.substr(i, name.length) === name) {
          tokens.push({ t: 'func', v: name });
          i += name.length; matched = true; break;
        }
      }
      if (matched) continue;

      if (c === 'π') { tokens.push({ t: 'num', v: Math.PI, c: true }); i++; continue; }
      if (s.substr(i, 2) === 'pi') { tokens.push({ t: 'num', v: Math.PI, c: true }); i += 2; continue; }
      if (c === 'e') { tokens.push({ t: 'num', v: Math.E, c: true }); i++; continue; }
      if (s.substr(i, 3) === 'Ans') { tokens.push({ t: 'ans' }); i += 3; continue; }

      if (OPS[c]) { tokens.push({ t: 'op', v: OPS[c] }); i++; continue; }

      fail('syntax'); // unknown character: refuse rather than silently skipping
    }
    if (tokens.length > LIMITS.maxTokens) fail('toolong');
    return tokens;
  }

  /* ------------------------------------------------------------------ */
  /* Math helpers                                                        */
  /* ------------------------------------------------------------------ */
  function factorial(n) {
    if (!(n >= 0) || Math.floor(n) !== n) fail('factorial');
    if (n > 170) fail('factorial');
    var r = 1;
    for (var k = 2; k <= n; k++) r *= k;
    return r;
  }

  // Degree-mode trig with exact results at the special angles that
  // binary floating point cannot represent (sin 180° = 0, tan 90° undefined).
  function trigDeg(fn, x) {
    var d = x % 360;
    if (d < 0) d += 360;
    if (fn === 'sin') {
      if (d === 0 || d === 180) return 0;
      if (d === 90) return 1;
      if (d === 270) return -1;
      if (d === 30 || d === 150) return 0.5;
      if (d === 210 || d === 330) return -0.5;
    } else if (fn === 'cos') {
      if (d === 90 || d === 270) return 0;
      if (d === 0) return 1;
      if (d === 180) return -1;
      if (d === 60 || d === 300) return 0.5;
      if (d === 120 || d === 240) return -0.5;
    } else if (fn === 'tan') {
      if (d === 90 || d === 270) fail('undefined');
      if (d === 0 || d === 180) return 0;
      if (d === 45 || d === 225) return 1;
      if (d === 135 || d === 315) return -1;
    }
    var rad = x * Math.PI / 180;
    return fn === 'sin' ? Math.sin(rad) : fn === 'cos' ? Math.cos(rad) : Math.tan(rad);
  }

  function snapTiny(v) { return Math.abs(v) < 1e-15 ? 0 : v; }

  function applyFunc(name, x, angle) {
    var deg = angle !== 'rad';
    switch (name) {
      case 'sin': case 'cos': case 'tan':
        if (deg) return trigDeg(name, x);
        if (name === 'tan' && Math.abs(Math.cos(x)) < 1e-15) fail('undefined');
        return snapTiny(Math[name](x));
      case 'asin': case 'acos':
        if (x < -1 || x > 1) fail('domain');
        var r = Math[name](x);
        return deg ? r * 180 / Math.PI : r;
      case 'atan':
        var t = Math.atan(x);
        return deg ? t * 180 / Math.PI : t;
      case 'sinh': return Math.sinh(x);
      case 'cosh': return Math.cosh(x);
      case 'tanh': return Math.tanh(x);
      case 'ln': if (x <= 0) fail('domain'); return Math.log(x);
      case 'log': if (x <= 0) fail('domain'); return Math.log10(x);
      case 'sqrt': if (x < 0) fail('domain'); return Math.sqrt(x);
      case 'cbrt': return Math.cbrt(x);
      case 'abs': return Math.abs(x);
    }
    fail('syntax');
  }

  /* ------------------------------------------------------------------ */
  /* Parser                                                              */
  /*   expr    := term (('+'|'-') term)*                                 */
  /*   term    := signed (('*'|'/') signed | <implicit ×> signed)*       */
  /*   signed  := ('-'|'+') signed | power                               */
  /*   power   := postfix ('^' signed)?          (right associative)     */
  /*   postfix := primary ('!' | '%')*                                   */
  /*   primary := number | constant | Ans | func primary | '(' expr ')'  */
  /* A term that is only "n%" next to + or − means "n percent of the     */
  /* left side", so 200 + 10% = 220 like a desk calculator.               */
  /* ------------------------------------------------------------------ */
  function parse(tokens, opts) {
    var pos = 0, depth = 0;
    var angle = opts.angle || 'deg';
    var ans = typeof opts.ans === 'number' ? opts.ans : 0;

    function peek() { return tokens[pos]; }
    function isOp(tk, v) { return tk && tk.t === 'op' && tk.v === v; }
    function enter() { if (++depth > LIMITS.maxDepth) fail('toolong'); }
    function leave() { depth--; }

    function startsPrimary(tk) {
      return tk && (tk.t === 'num' || tk.t === 'func' || tk.t === 'ans' || isOp(tk, '('));
    }

    function parseExpr() {
      enter();
      var left = parseTerm();
      var v = left.v;
      while (isOp(peek(), '+') || isOp(peek(), '-')) {
        var op = tokens[pos++].v;
        var right = parseTerm();
        var rv = right.pct ? v * right.v : right.v;
        v = op === '+' ? v + rv : v - rv;
      }
      leave();
      return { v: v, pct: left.pct && v === left.v };
    }

    function parseTerm() {
      var first = parseSigned();
      var v = first.v, factors = 1;
      for (;;) {
        var tk = peek();
        if (isOp(tk, '*') || isOp(tk, '/')) {
          pos++;
          var r = parseSigned().v;
          if (tk.v === '/') {
            if (r === 0) fail('divzero');
            v = v / r;
          } else v = v * r;
          factors++;
        } else if (startsPrimary(tk)) {
          v = v * parseSigned().v; // implicit multiplication: 2π, 3(4), (2)(3)
          factors++;
        } else break;
      }
      return { v: v, pct: factors === 1 && first.pct };
    }

    function parseSigned() {
      if (isOp(peek(), '-')) { pos++; enter(); var a = parseSigned(); leave(); return { v: -a.v, pct: a.pct }; }
      if (isOp(peek(), '+')) { pos++; enter(); var b = parseSigned(); leave(); return b; }
      return parsePower();
    }

    function parsePower() {
      var base = parsePostfix();
      if (isOp(peek(), '^')) {
        pos++;
        enter();
        var exp = parseSigned().v;
        leave();
        var r = Math.pow(base.v, exp);
        if (isNaN(r)) fail('domain');
        return { v: r, pct: false };
      }
      return base;
    }

    function parsePostfix() {
      var v = parsePrimary();
      var pct = false;
      for (;;) {
        if (isOp(peek(), '!')) { pos++; v = factorial(v); pct = false; }
        else if (isOp(peek(), '%')) { pos++; v = v / 100; pct = true; }
        else break;
      }
      return { v: v, pct: pct };
    }

    function parsePrimary() {
      var tk = peek();
      if (!tk) fail('syntax');
      if (tk.t === 'num') { pos++; return tk.v; }
      if (tk.t === 'ans') { pos++; return ans; }
      if (tk.t === 'func') {
        pos++;
        enter();
        var arg;
        if (isOp(peek(), '(')) {
          pos++;
          arg = parseExpr().v;
          if (!isOp(peek(), ')')) fail('syntax');
          pos++;
        } else {
          // √9, √π, sin 30 — a function may take a single primary without brackets
          var nx = peek();
          if (!nx || !(nx.t === 'num' || nx.t === 'func' || nx.t === 'ans')) fail('syntax');
          arg = parsePostfix().v;
        }
        leave();
        return applyFunc(tk.v, arg, angle);
      }
      if (isOp(tk, '(')) {
        pos++;
        var inner = parseExpr().v;
        if (!isOp(peek(), ')')) fail('syntax');
        pos++;
        return inner;
      }
      fail('syntax');
    }

    var result = parseExpr().v;
    if (pos !== tokens.length) fail('syntax');
    return result;
  }

  /** Close any brackets the user left open: "(−5" → "(−5)". */
  function autoClose(src) {
    var open = 0;
    for (var i = 0; i < src.length; i++) {
      if (src[i] === '(') open++;
      else if (src[i] === ')') open = Math.max(0, open - 1);
    }
    return src + ')'.repeat(Math.min(open, 50));
  }

  /**
   * Evaluate an expression safely.
   * @returns {{ok:true, value:number} | {ok:false, code:string, error:string}}
   */
  function evaluate(src, opts) {
    opts = opts || {};
    try {
      var text = String(src == null ? '' : src).trim();
      if (!text) return { ok: false, code: 'empty', error: '' };
      var tokens = tokenize(autoClose(text));
      if (!tokens.length) return { ok: false, code: 'empty', error: '' };
      var v = parse(tokens, opts);
      if (isNaN(v)) fail('domain');
      if (!isFinite(v)) fail('overflow');
      if (Object.is(v, -0)) v = 0;
      return { ok: true, value: v };
    } catch (e) {
      if (e instanceof CalcError) return { ok: false, code: e.code, error: e.message };
      if (e instanceof RangeError) return { ok: false, code: 'toolong', error: MSG.toolong };
      return { ok: false, code: 'syntax', error: MSG.syntax };
    }
  }

  /* ------------------------------------------------------------------ */
  /* Number formatting                                                   */
  /* ------------------------------------------------------------------ */
  function groupInt(intPart, sep) {
    return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  }

  /**
   * Format a result for display. Rounds to 15 significant digits, which hides
   * binary floating-point noise (0.1 + 0.2 → 0.3) without losing real precision.
   */
  function formatNumber(v, opts) {
    opts = opts || {};
    var grouping = opts.grouping !== false;
    var sig = opts.sig || 15;
    if (typeof v !== 'number' || isNaN(v)) return 'Error';
    if (!isFinite(v)) return v > 0 ? '∞' : '−∞';
    if (v === 0) return '0';
    var abs = Math.abs(v);
    var neg = v < 0 ? '−' : '';
    function expForm() {
      var ex = abs.toExponential(Math.min(sig, 15) - 1); // d.ddddde+N
      var parts = ex.split('e');
      var mant = parts[0].indexOf('.') >= 0 ? parts[0].replace(/0+$/, '').replace(/\.$/, '') : parts[0];
      var e = parseInt(parts[1], 10);
      return neg + mant + 'E' + (e < 0 ? '−' : '') + Math.abs(e);
    }
    if (abs >= 1e15 || abs < 1e-6 || opts.scientific) return expForm();
    var s = abs.toPrecision(sig);
    if (s.indexOf('e') >= 0) return expForm();
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    var dot = s.indexOf('.');
    var ip = dot >= 0 ? s.slice(0, dot) : s;
    var fp = dot >= 0 ? s.slice(dot) : '';
    return neg + (grouping ? groupInt(ip, ',') : ip) + fp;
  }

  /** Plain machine form (no grouping, ASCII minus) for reusing a result in an expression. */
  function toPlain(v) {
    var s = formatNumber(v, { grouping: false });
    return s.replace(/−/g, '-');
  }

  /** Money-style fixed decimals with grouping. */
  function formatFixed(v, decimals, grouping) {
    if (typeof v !== 'number' || !isFinite(v)) return '—';
    var d = decimals == null ? 2 : decimals;
    var neg = v < 0 ? '−' : '';
    // Decimal-aware half-up rounding: 1.005 → 1.01 (plain toFixed gives 1.00)
    var abs = Math.abs(v);
    var rounded = abs < 1e15 ? Number(Math.round(Number(abs + 'e' + d)) + 'e-' + d) : abs;
    var s = (isFinite(rounded) ? rounded : abs).toFixed(d);
    var dot = s.indexOf('.');
    var ip = dot >= 0 ? s.slice(0, dot) : s;
    var fp = dot >= 0 ? s.slice(dot) : '';
    if (Number(s) === 0) neg = '';
    return neg + (grouping === false ? ip : groupInt(ip, ',')) + fp;
  }

  /* ------------------------------------------------------------------ */
  /* Finance                                                             */
  /* ------------------------------------------------------------------ */
  function pmt(principal, monthlyRate, n) {
    if (monthlyRate === 0) return principal / n;
    var f = Math.pow(1 + monthlyRate, n);
    return principal * monthlyRate * f / (f - 1);
  }

  var finance = {
    /** Equated monthly instalment on a reducing balance. */
    emi: function (principal, annualRatePct, months) {
      var r = annualRatePct / 12 / 100;
      var n = Math.round(months);
      var emi = pmt(principal, r, n);
      var schedule = [];
      var bal = principal, totalInterest = 0;
      for (var m = 1; m <= n; m++) {
        var interest = bal * r;
        var princ = emi - interest;
        if (m === n) princ = bal;
        bal = Math.max(0, bal - princ);
        totalInterest += interest;
        schedule.push({ n: m, principal: princ, interest: interest, balance: bal });
      }
      return { emi: emi, months: n, total: emi * n, interest: emi * n - principal, schedule: schedule };
    },

    /** How long a loan takes to repay with a fixed monthly payment. */
    payoff: function (principal, annualRatePct, payment) {
      var r = annualRatePct / 12 / 100;
      if (payment <= principal * r) return { ok: false, minPayment: principal * r };
      var bal = principal, months = 0, interest = 0;
      while (bal > 1e-9 && months < 1200) {
        var i = bal * r;
        interest += i;
        bal = bal + i - payment;
        months++;
      }
      var lastPayment = payment + Math.min(0, bal); // final payment is smaller
      if (months >= 1200 && bal > 1e-9) return { ok: false, tooLong: true };
      return { ok: true, months: months, interest: interest, total: principal + interest, lastPayment: lastPayment };
    },

    /** Largest loan whose monthly payment fits the budget. */
    affordable: function (monthlyBudget, annualRatePct, months) {
      var r = annualRatePct / 12 / 100;
      var n = Math.round(months);
      if (r === 0) return monthlyBudget * n;
      return monthlyBudget * (1 - Math.pow(1 + r, -n)) / r;
    },

    simpleInterest: function (principal, annualRatePct, years) {
      var interest = principal * annualRatePct / 100 * years;
      return { interest: interest, total: principal + interest };
    },

    /** Lump sum compounded `perYear` times a year for `years` years. */
    compound: function (principal, annualRatePct, perYear, years) {
      var r = annualRatePct / 100;
      var total = principal * Math.pow(1 + r / perYear, perYear * years);
      var effective = Math.pow(1 + r / perYear, perYear) - 1;
      var byYear = [];
      for (var y = 1; y <= Math.ceil(years); y++) {
        var t = Math.min(y, years);
        byYear.push({ year: y, balance: principal * Math.pow(1 + r / perYear, perYear * t) });
      }
      return { total: total, interest: total - principal, effectiveRate: effective * 100, byYear: byYear };
    },

    /**
     * Regular saving / investing, simulated month by month.
     * Contributions are made at the end of each month; interest compounds monthly.
     * stepUpPct raises the monthly contribution once a year; inflationPct gives today's-money value.
     */
    growth: function (initial, monthly, annualRatePct, years, stepUpPct, inflationPct) {
      var r = annualRatePct / 100 / 12;
      var months = Math.round(years * 12);
      var bal = initial, contributed = initial, contrib = monthly;
      var byYear = [];
      for (var m = 1; m <= months; m++) {
        bal = bal * (1 + r) + contrib;
        contributed += contrib;
        if (m % 12 === 0) {
          byYear.push({ year: m / 12, balance: bal, contributed: contributed });
          if (stepUpPct) contrib = contrib * (1 + stepUpPct / 100);
        }
      }
      if (months % 12 !== 0) byYear.push({ year: +(months / 12).toFixed(2), balance: bal, contributed: contributed });
      var real = inflationPct ? bal / Math.pow(1 + inflationPct / 100, months / 12) : null;
      return { balance: bal, contributed: contributed, growth: bal - contributed, realValue: real, byYear: byYear };
    },

    profit: function (cost, revenue) {
      var profit = revenue - cost;
      return {
        profit: profit,
        marginPct: revenue !== 0 ? profit / revenue * 100 : null,
        markupPct: cost !== 0 ? profit / cost * 100 : null
      };
    },

    priceFromMarkup: function (cost, markupPct) {
      var price = cost * (1 + markupPct / 100);
      return { price: price, profit: price - cost, marginPct: price !== 0 ? (price - cost) / price * 100 : null };
    },

    priceFromMargin: function (cost, marginPct) {
      if (marginPct >= 100) return null;
      var price = cost / (1 - marginPct / 100);
      return { price: price, profit: price - cost, markupPct: cost !== 0 ? (price - cost) / cost * 100 : null };
    },

    breakEven: function (fixedCosts, pricePerUnit, variableCostPerUnit, targetProfit) {
      var contribution = pricePerUnit - variableCostPerUnit;
      if (contribution <= 0) return { ok: false };
      var units = (fixedCosts + (targetProfit || 0)) / contribution;
      return {
        ok: true,
        contribution: contribution,
        contributionRatio: contribution / pricePerUnit * 100,
        units: units,
        unitsRounded: Math.ceil(units - 1e-9),
        revenue: units * pricePerUnit
      };
    },

    /** Add or remove a percentage tax (VAT, GST, sales tax). */
    tax: function (amount, ratePct, mode) {
      if (mode === 'remove') {
        var net = amount / (1 + ratePct / 100);
        return { net: net, tax: amount - net, gross: amount };
      }
      var tax = amount * ratePct / 100;
      return { net: amount, tax: tax, gross: amount + tax };
    }
  };

  /* ------------------------------------------------------------------ */
  /* Dates — all arithmetic in UTC calendar days, so daylight-saving     */
  /* shifts and time zones can never move a result by a day.             */
  /* ------------------------------------------------------------------ */
  var DAY = 86400000;
  function parseISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var t = Date.UTC(y, mo - 1, d);
    var dt = new Date(t);
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return { y: y, m: mo, d: d, t: t };
  }
  function toISO(t) {
    var d = new Date(t);
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function daysInMonth(y, m1) { return new Date(Date.UTC(y, m1, 0)).getUTCDate(); }
  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  /** Today's date in the device's own time zone (not UTC). */
  function todayISO(now) {
    var d = now || new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  var dates = {
    parseISO: parseISO,
    toISO: toISO,
    todayISO: todayISO,
    isLeap: isLeap,

    /**
     * Calendar difference a → b (a ≤ b) in years, months, days: the largest number of
     * whole months that fits (month ends clamp, so 31 Jan + 1 month = 28/29 Feb), then days.
     */
    ymd: function (a, b) {
      var months = (b.y - a.y) * 12 + (b.m - a.m);
      var anchor = dates.add(a, 0, months, 0, 0);
      while (months > 0 && anchor.t > b.t) { months--; anchor = dates.add(a, 0, months, 0, 0); }
      var d = Math.round((b.t - anchor.t) / DAY);
      return { y: Math.floor(months / 12), m: months % 12, d: d };
    },

    daysBetween: function (a, b) { return Math.round((b.t - a.t) / DAY); },

    /** Weekdays (Mon–Fri) in [a, b], inclusive of both ends. */
    weekdaysInclusive: function (a, b) {
      var lo = Math.min(a.t, b.t), hi = Math.max(a.t, b.t);
      var total = Math.round((hi - lo) / DAY) + 1;
      var full = Math.floor(total / 7);
      var count = full * 5;
      var startDow = new Date(lo).getUTCDay();
      for (var i = 0; i < total % 7; i++) {
        var dow = (startDow + i) % 7;
        if (dow !== 0 && dow !== 6) count++;
      }
      return count;
    },

    /** Add years / months / weeks / days, clamping to month end (31 Jan + 1 month = 28/29 Feb). */
    add: function (base, years, months, weeks, days) {
      var totalMonths = (base.m - 1) + months + years * 12;
      var y = base.y + Math.floor(totalMonths / 12);
      var m0 = ((totalMonths % 12) + 12) % 12;
      var d = Math.min(base.d, daysInMonth(y, m0 + 1));
      var t = Date.UTC(y, m0, d) + (weeks * 7 + days) * DAY;
      return parseISO(toISO(t));
    },

    /** Move by n business days (Mon–Fri), skipping weekends. */
    addBusinessDays: function (base, n) {
      var t = base.t, step = n < 0 ? -1 : 1, left = Math.abs(n);
      while (left > 0) {
        t += step * DAY;
        var dow = new Date(t).getUTCDay();
        if (dow !== 0 && dow !== 6) left--;
      }
      return parseISO(toISO(t));
    },

    weekday: function (p) {
      return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(p.t).getUTCDay()];
    },

    /** Next birthday on or after asOf. 29 Feb birthdays fall on 28 Feb in common years. */
    nextBirthday: function (birth, asOf) {
      function on(y) {
        var d = birth.m === 2 && birth.d === 29 && !isLeap(y) ? 28 : birth.d;
        return parseISO(y + '-' + pad2(birth.m) + '-' + pad2(d));
      }
      var nb = on(asOf.y);
      if (nb.t < asOf.t) nb = on(asOf.y + 1);
      return { date: nb, days: Math.round((nb.t - asOf.t) / DAY) };
    },

    /** "HH:MM" → minutes since midnight. */
    parseTime: function (s) {
      var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || ''));
      if (!m) return null;
      var h = +m[1], mi = +m[2];
      if (h > 23 || mi > 59) return null;
      return h * 60 + mi;
    },

    /** Duration between two clock times; an end before the start is treated as the next day. */
    duration: function (startMin, endMin, breakMin) {
      var mins = endMin - startMin;
      var overnight = mins < 0;
      if (overnight) mins += 1440;
      mins -= breakMin || 0;
      return { minutes: mins, overnight: overnight };
    }
  };

  /* ------------------------------------------------------------------ */
  /* Islamic calendar, burj and Abjad                                    */
  /* ------------------------------------------------------------------ */
  var HIJRI_MONTHS = ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Ula', 'Jumada al-Akhirah',
    'Rajab', 'Shaban', 'Ramadan', 'Shawwal', 'Dhul Qadah', 'Dhul Hijjah'];

  /**
   * Hijri date for a calendar day, using the Umm al-Qura calendar built into the
   * browser engine (falls back to the tabular Islamic calendar). Returns null when
   * the engine has no Islamic calendar support.
   */
  function hijri(p) {
    if (typeof Intl === 'undefined' || !Intl.DateTimeFormat) return null;
    var cals = ['islamic-umalqura', 'islamic-civil', 'islamic'];
    for (var i = 0; i < cals.length; i++) {
      try {
        var f = new Intl.DateTimeFormat('en-u-ca-' + cals[i] + '-nu-latn', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' });
        if (f.resolvedOptions().calendar !== cals[i] || !f.formatToParts) continue;
        var o = {};
        f.formatToParts(new Date(p.t)).forEach(function (x) {
          if (x.type === 'day' || x.type === 'month' || x.type === 'year') o[x.type] = parseInt(x.value, 10);
        });
        if (o.day >= 1 && o.month >= 1 && o.month <= 12 && o.year) {
          return { y: o.year, m: o.month, d: o.day, monthName: HIJRI_MONTHS[o.month - 1], calendar: cals[i] };
        }
      } catch (e) { /* try the next calendar */ }
    }
    return null;
  }

  /** Whole Hijri years from birth to asOf. */
  function hijriAge(birth, asOf) {
    var a = hijri(birth), b = hijri(asOf);
    if (!a || !b) return null;
    var y = b.y - a.y;
    if (b.m < a.m || (b.m === a.m && b.d < a.d)) y--;
    return y;
  }

  // Burj names as used in Urdu, matched to the same date ranges as the western signs.
  var BURJ = {
    Aries: ['Hamal', 'حمل'], Taurus: ['Saur', 'ثور'], Gemini: ['Jauza', 'جوزا'], Cancer: ['Sartan', 'سرطان'],
    Leo: ['Asad', 'اسد'], Virgo: ['Sumbula', 'سنبلہ'], Libra: ['Mizan', 'میزان'], Scorpio: ['Aqrab', 'عقرب'],
    Sagittarius: ['Qaus', 'قوس'], Capricorn: ['Jadi', 'جدی'], Aquarius: ['Dalw', 'دلو'], Pisces: ['Hoot', 'حوت']
  };

  // Abjad-e-Kabir (hisab al-jummal) values. Urdu letters take the value of the
  // Arabic letter they derive from: پ=ب, چ=ج, ژ=ز, گ=ک, ٹ=ت, ڈ=د, ڑ=ر, ں=ن, ھ/ہ=ه, ے=ی.
  var ABJAD = {
    'ا': 1, 'أ': 1, 'إ': 1, 'آ': 1, 'ٱ': 1, 'ء': 1,
    'ب': 2, 'پ': 2, 'ج': 3, 'چ': 3, 'د': 4, 'ڈ': 4,
    'ه': 5, 'ہ': 5, 'ھ': 5, 'ة': 5, 'ۃ': 5, 'ۂ': 5, 'ۀ': 5,
    'و': 6, 'ؤ': 6, 'ز': 7, 'ژ': 7, 'ح': 8, 'ط': 9,
    'ي': 10, 'ی': 10, 'ى': 10, 'ئ': 10, 'ے': 10, 'ۓ': 10,
    'ك': 20, 'ک': 20, 'گ': 20, 'ل': 30, 'م': 40, 'ن': 50, 'ں': 50,
    'س': 60, 'ع': 70, 'ف': 80, 'ص': 90, 'ق': 100, 'ر': 200, 'ڑ': 200,
    'ش': 300, 'ت': 400, 'ٹ': 400, 'ث': 500, 'خ': 600, 'ذ': 700, 'ض': 800, 'ظ': 900, 'غ': 1000
  };
  /**
   * Abjad value of a name written in Arabic or Urdu letters. Vowel marks, tatweel and
   * spaces are skipped; a doubled letter (shadda) counts once, as is customary.
   */
  function abjad(text) {
    var s = String(text == null ? '' : text);
    if (s.normalize) s = s.normalize('NFC');
    var total = 0, letters = 0, latin = false;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ABJAD[ch] != null) { total += ABJAD[ch]; letters++; }
      else if (/[A-Za-z]/.test(ch)) latin = true;
    }
    return { total: total, letters: letters, latin: latin, digit: total ? 1 + (total - 1) % 9 : 0 };
  }

  /* ------------------------------------------------------------------ */
  /* Unit conversion — factor = value of one unit in the category's base */
  /* ------------------------------------------------------------------ */
  var units = {
    length: { name: 'Length', base: 'm', units: [
      ['mm', 'Millimetre', 0.001], ['cm', 'Centimetre', 0.01], ['m', 'Metre', 1], ['km', 'Kilometre', 1000],
      ['in', 'Inch', 0.0254], ['ft', 'Foot', 0.3048], ['yd', 'Yard', 0.9144], ['mi', 'Mile', 1609.344],
      ['nmi', 'Nautical mile', 1852], ['µm', 'Micrometre', 1e-6]
    ] },
    mass: { name: 'Weight & mass', base: 'kg', units: [
      ['mg', 'Milligram', 1e-6], ['g', 'Gram', 0.001], ['kg', 'Kilogram', 1], ['t', 'Tonne', 1000],
      ['oz', 'Ounce', 0.028349523125], ['lb', 'Pound', 0.45359237], ['st', 'Stone', 6.35029318],
      ['ton (US)', 'Short ton (US)', 907.18474], ['ton (UK)', 'Long ton (UK)', 1016.0469088],
      ['ct', 'Carat', 0.0002], ['tola', 'Tola', 0.0116638038]
    ] },
    temperature: { name: 'Temperature', base: 'C', units: [
      ['°C', 'Celsius'], ['°F', 'Fahrenheit'], ['K', 'Kelvin']
    ] },
    area: { name: 'Area', base: 'm²', units: [
      ['mm²', 'Square millimetre', 1e-6], ['cm²', 'Square centimetre', 1e-4], ['m²', 'Square metre', 1],
      ['ha', 'Hectare', 1e4], ['km²', 'Square kilometre', 1e6], ['in²', 'Square inch', 0.00064516],
      ['ft²', 'Square foot', 0.09290304], ['yd²', 'Square yard', 0.83612736], ['ac', 'Acre', 4046.8564224],
      ['mi²', 'Square mile', 2589988.110336]
    ] },
    volume: { name: 'Volume', base: 'L', units: [
      ['mL', 'Millilitre', 0.001], ['L', 'Litre', 1], ['m³', 'Cubic metre', 1000], ['cm³', 'Cubic centimetre', 0.001],
      ['tsp', 'Teaspoon (US)', 0.00492892159375], ['tbsp', 'Tablespoon (US)', 0.01478676478125],
      ['fl oz', 'Fluid ounce (US)', 0.0295735295625], ['cup', 'Cup (US)', 0.2365882365],
      ['pt', 'Pint (US)', 0.473176473], ['qt', 'Quart (US)', 0.946352946], ['gal', 'Gallon (US)', 3.785411784],
      ['pt (UK)', 'Pint (UK)', 0.56826125], ['gal (UK)', 'Gallon (UK)', 4.54609],
      ['in³', 'Cubic inch', 0.016387064], ['ft³', 'Cubic foot', 28.316846592]
    ] },
    speed: { name: 'Speed', base: 'm/s', units: [
      ['m/s', 'Metres per second', 1], ['km/h', 'Kilometres per hour', 1 / 3.6], ['mph', 'Miles per hour', 0.44704],
      ['kn', 'Knot', 1852 / 3600], ['ft/s', 'Feet per second', 0.3048]
    ] },
    time: { name: 'Time', base: 's', units: [
      ['ms', 'Millisecond', 0.001], ['s', 'Second', 1], ['min', 'Minute', 60], ['h', 'Hour', 3600],
      ['d', 'Day', 86400], ['wk', 'Week', 604800], ['mo', 'Month (average)', 2629746],
      ['yr', 'Year (average)', 31556952], ['µs', 'Microsecond', 1e-6]
    ] },
    data: { name: 'Data storage', base: 'B', units: [
      ['bit', 'Bit', 0.125], ['B', 'Byte', 1], ['kB', 'Kilobyte (1000 B)', 1e3], ['MB', 'Megabyte (1000 kB)', 1e6],
      ['GB', 'Gigabyte (1000 MB)', 1e9], ['TB', 'Terabyte (1000 GB)', 1e12], ['PB', 'Petabyte (1000 TB)', 1e15],
      ['KiB', 'Kibibyte (1024 B)', 1024], ['MiB', 'Mebibyte (1024 KiB)', 1048576],
      ['GiB', 'Gibibyte (1024 MiB)', 1073741824], ['TiB', 'Tebibyte (1024 GiB)', 1099511627776],
      ['Mbit', 'Megabit', 125000], ['Gbit', 'Gigabit', 125000000]
    ] },
    energy: { name: 'Energy', base: 'J', units: [
      ['J', 'Joule', 1], ['kJ', 'Kilojoule', 1000], ['cal', 'Calorie', 4.184], ['kcal', 'Kilocalorie', 4184],
      ['Wh', 'Watt-hour', 3600], ['kWh', 'Kilowatt-hour', 3.6e6], ['BTU', 'British thermal unit', 1055.05585262],
      ['ft·lbf', 'Foot-pound', 1.3558179483314004], ['eV', 'Electronvolt', 1.602176634e-19]
    ] },
    pressure: { name: 'Pressure', base: 'Pa', units: [
      ['Pa', 'Pascal', 1], ['kPa', 'Kilopascal', 1000], ['MPa', 'Megapascal', 1e6], ['bar', 'Bar', 1e5],
      ['mbar', 'Millibar', 100], ['atm', 'Atmosphere', 101325], ['psi', 'Pound per square inch', 6894.757293168361],
      ['mmHg', 'Millimetre of mercury', 133.322387415], ['inHg', 'Inch of mercury', 3386.388640341],
      ['Torr', 'Torr', 101325 / 760]
    ] }
  };

  function convert(category, value, from, to) {
    var cat = units[category];
    if (!cat || typeof value !== 'number' || !isFinite(value)) return NaN;
    if (category === 'temperature') {
      var c;
      if (from === '°C') c = value; else if (from === '°F') c = (value - 32) * 5 / 9; else if (from === 'K') c = value - 273.15; else return NaN;
      if (to === '°C') return c; if (to === '°F') return c * 9 / 5 + 32; if (to === 'K') return c + 273.15;
      return NaN;
    }
    var f = null, t = null;
    for (var i = 0; i < cat.units.length; i++) {
      if (cat.units[i][0] === from) f = cat.units[i][2];
      if (cat.units[i][0] === to) t = cat.units[i][2];
    }
    if (f == null || t == null) return NaN;
    return value * f / t;
  }

  return {
    evaluate: evaluate,
    tokenize: tokenize,
    autoClose: autoClose,
    formatNumber: formatNumber,
    formatFixed: formatFixed,
    toPlain: toPlain,
    factorial: factorial,
    finance: finance,
    dates: dates,
    islamic: { hijri: hijri, hijriAge: hijriAge, burj: BURJ, abjad: abjad, months: HIJRI_MONTHS },
    units: units,
    convert: convert,
    LIMITS: LIMITS
  };
});
