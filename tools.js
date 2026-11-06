/*
 * Calc Suit — tool catalogue.
 * Each tool is a declarative form (fields) plus a compute() function that turns
 * validated numbers into a result description. No DOM work happens here; the
 * renderer in app.js draws whatever compute() returns.
 *
 * compute(v) returns:
 *   null                       → inputs incomplete, show the prompt
 *   { error }                  → inputs complete but impossible
 *   { hero | trio, bar, stats, table, how }
 */
(function (root) {
  'use strict';
  var E = root.CalcEngine;
  var F = E.finance, D = E.dates, I = E.islamic;

  function money(v) { return E.formatFixed(v, 2); }
  function num(v) { return E.formatNumber(v); }
  function round(v, d) { return Number(E.formatFixed(v, d, false).replace('−', '-')); }
  function pct(v, d) { return E.formatNumber(round(v, d == null ? 2 : d)) + '%'; }
  function plural(n, one, many) { return num(n) + ' ' + (n === 1 ? one : (many || one + 's')); }
  function ymText(months) {
    var y = Math.floor(months / 12), m = months % 12, out = [];
    if (y) out.push(plural(y, 'year'));
    if (m || !y) out.push(plural(m, 'month'));
    return out.join(' ');
  }
  function dateText(p) {
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return p.d + ' ' + months[p.m - 1] + ' ' + p.y;
  }
  function have() { for (var i = 0; i < arguments.length; i++) if (arguments[i] == null) return false; return true; }

  var RATE = { id: 'rate', label: 'Interest rate', type: 'number', unit: '% per year', min: 0, max: 100, placeholder: '12' };

  function taxTool(id, name, label, desc, keywords, extra) {
    var Label = label.charAt(0).toUpperCase() + label.slice(1);
    return {
      id: id, cat: 'everyday', name: name, desc: desc, keywords: keywords,
      fields: [
        { id: 'mode', type: 'seg', label: 'The amount', options: [['add', 'Excludes ' + label], ['remove', 'Includes ' + label]], default: 'add' },
        { id: 'amount', label: 'Amount', type: 'number', min: 0, placeholder: '1,000' },
        { id: 'rate', label: label + ' rate', type: 'number', unit: '%', min: 0, max: 100, placeholder: 'Your local rate', help: label + ' rates differ by country and product. Enter the rate that applies to you.' }
      ].concat(extra || []),
      compute: function (v) {
        if (!have(v.amount, v.rate)) return null;
        var r = F.tax(v.amount, v.rate, v.mode);
        var stats = [['Amount before ' + label, money(r.net)], [Label + ' (' + pct(v.rate) + ')', money(r.tax)], ['Amount with ' + label, money(r.gross)]];
        if (v.split) stats.splice(2, 0, ['CGST (' + pct(v.rate / 2) + ')', money(r.tax / 2)], ['SGST (' + pct(v.rate / 2) + ')', money(r.tax / 2)]);
        return {
          hero: v.mode === 'add' ? { label: 'Total with ' + label, value: money(r.gross) } : { label: 'Amount before ' + label, value: money(r.net) },
          stats: stats,
          how: v.mode === 'add'
            ? [Label + ' = amount × rate ÷ 100', 'Total = amount + ' + label]
            : ['Amount before ' + label + ' = total ÷ (1 + rate ÷ 100)', Label + ' = total − amount before ' + label]
        };
      }
    };
  }

  function converter(id, cat, desc, keywords) {
    return { id: id, cat: 'convert', name: E.units[cat].name, desc: desc, keywords: keywords, type: 'converter', category: cat };
  }

  var TOOLS = [
    /* ---------------------------- Everyday ---------------------------- */
    {
      id: 'percentage', cat: 'everyday', name: 'Percentage', desc: 'Percent of a number, or what percent one is of another',
      keywords: 'percent percentage of ratio share',
      fields: [
        { id: 'mode', type: 'seg', label: 'Find', options: [['of', 'X% of Y'], ['is', 'X is what % of Y']], default: 'of' },
        { id: 'x', label: 'X', type: 'number', placeholder: '15', labelFn: function (v) { return v.mode === 'of' ? 'Percent (X)' : 'Value (X)'; }, unitFn: function (v) { return v.mode === 'of' ? '%' : ''; } },
        { id: 'y', label: 'Y', type: 'number', placeholder: '200', labelFn: function () { return 'Of (Y)'; } }
      ],
      compute: function (v) {
        if (!have(v.x, v.y)) return null;
        if (v.mode === 'of') {
          var r = v.x / 100 * v.y;
          return { hero: { label: pct(v.x, 6) + ' of ' + num(v.y), value: num(r) }, how: ['Result = X ÷ 100 × Y'] };
        }
        if (v.y === 0) return { error: 'Y can’t be 0: no number is a percentage of zero.' };
        return { hero: { label: num(v.x) + ' is this share of ' + num(v.y), value: pct(v.x / v.y * 100, 4) }, how: ['Percent = X ÷ Y × 100'] };
      }
    },
    {
      id: 'percent-change', cat: 'everyday', name: 'Percentage increase / decrease', desc: 'Change between two values, or raise or lower a value by a percent',
      keywords: 'percent change increase decrease growth difference rise fall',
      fields: [
        { id: 'mode', type: 'seg', label: 'Find', options: [['between', 'Change between values'], ['apply', 'Apply a % change']], default: 'between' },
        { id: 'from', label: 'Starting value', type: 'number', placeholder: '80', showIf: function (v) { return v.mode === 'between'; } },
        { id: 'to', label: 'New value', type: 'number', placeholder: '100', showIf: function (v) { return v.mode === 'between'; } },
        { id: 'value', label: 'Value', type: 'number', placeholder: '250', showIf: function (v) { return v.mode === 'apply'; } },
        { id: 'dir', type: 'seg', label: 'Direction', options: [['up', 'Increase'], ['down', 'Decrease']], default: 'up', showIf: function (v) { return v.mode === 'apply'; } },
        { id: 'p', label: 'By', type: 'number', unit: '%', min: 0, placeholder: '20', showIf: function (v) { return v.mode === 'apply'; } }
      ],
      compute: function (v) {
        if (v.mode === 'between') {
          if (!have(v.from, v.to)) return null;
          if (v.from === 0) return { error: 'The starting value can’t be 0: a change from zero has no percentage.' };
          var ch = (v.to - v.from) / Math.abs(v.from) * 100;
          return {
            hero: { label: ch > 0 ? 'Increase' : ch < 0 ? 'Decrease' : 'No change', value: pct(Math.abs(ch), 4) },
            stats: [['Difference', num(v.to - v.from)]],
            how: ['Change = (new − starting) ÷ |starting| × 100']
          };
        }
        if (!have(v.value, v.p)) return null;
        var f = v.dir === 'up' ? 1 + v.p / 100 : 1 - v.p / 100;
        var res = v.value * f;
        return {
          hero: { label: 'After a ' + pct(v.p, 4) + (v.dir === 'up' ? ' increase' : ' decrease'), value: num(res) },
          stats: [['Change', num(res - v.value)]],
          how: ['Result = value × (1 ' + (v.dir === 'up' ? '+' : '−') + ' percent ÷ 100)']
        };
      }
    },
    {
      id: 'discount', cat: 'everyday', name: 'Discount', desc: 'Sale price and how much you save',
      keywords: 'discount sale off price saving coupon',
      fields: [
        { id: 'price', label: 'Original price', type: 'number', min: 0, placeholder: '2,500' },
        { id: 'd1', label: 'Discount', type: 'number', unit: '%', min: 0, max: 100, placeholder: '20', chips: [10, 20, 25, 50] },
        { id: 'd2', label: 'Extra discount', type: 'number', unit: '%', min: 0, max: 100, optional: true, placeholder: 'Optional', help: 'Applied after the first discount, as stores usually do.' }
      ],
      compute: function (v) {
        if (!have(v.price, v.d1)) return null;
        var after1 = v.price * (1 - v.d1 / 100);
        var fin = after1 * (1 - (v.d2 || 0) / 100);
        var stats = [['Original price', money(v.price)], ['You save', money(v.price - fin)]];
        if (v.d2) stats.push(['Combined discount', pct((1 - fin / v.price) * 100)]);
        return {
          hero: { label: 'Price after discount', value: money(fin) }, stats: stats,
          how: ['Price = original × (1 − discount ÷ 100)' + (v.d2 ? ' × (1 − extra ÷ 100)' : '')]
        };
      }
    },
    {
      id: 'tip', cat: 'everyday', name: 'Tip', desc: 'Tip amount and total, optionally per person',
      keywords: 'tip gratuity restaurant service',
      fields: [
        { id: 'bill', label: 'Bill amount', type: 'number', min: 0, placeholder: '3,200' },
        { id: 'tip', label: 'Tip', type: 'number', unit: '%', min: 0, max: 100, default: '10', chips: [5, 10, 15, 20] },
        { id: 'people', label: 'Number of people', type: 'number', min: 1, int: true, default: '1', max: 1000 }
      ],
      compute: function (v) {
        if (!have(v.bill, v.tip, v.people)) return null;
        var t = v.bill * v.tip / 100, total = v.bill + t;
        var stats = [['Tip', money(t)], ['Total', money(total)]];
        if (v.people > 1) stats.push(['Tip per person', money(t / v.people)], ['Total per person', money(total / v.people)]);
        return { hero: { label: 'Tip', value: money(t), sub: 'Total ' + money(total) }, stats: stats, how: ['Tip = bill × tip % ÷ 100'] };
      }
    },
    {
      id: 'split-bill', cat: 'everyday', name: 'Split bill', desc: 'Share a bill with tax and tip between people',
      keywords: 'split bill share divide friends group dinner',
      fields: [
        { id: 'bill', label: 'Bill total', type: 'number', min: 0, placeholder: '7,450' },
        { id: 'people', label: 'Number of people', type: 'number', min: 1, int: true, max: 1000, default: '2' },
        { id: 'tax', label: 'Tax not yet included', type: 'number', unit: '%', min: 0, max: 100, optional: true, placeholder: 'Optional' },
        { id: 'tip', label: 'Tip', type: 'number', unit: '%', min: 0, max: 100, optional: true, placeholder: 'Optional' },
        { id: 'roundUp', type: 'switch', label: 'Round each share up to a whole amount', default: false }
      ],
      compute: function (v) {
        if (!have(v.bill, v.people)) return null;
        var tax = v.bill * (v.tax || 0) / 100;
        var tip = v.bill * (v.tip || 0) / 100;
        var total = v.bill + tax + tip;
        var each = total / v.people;
        var shown = v.roundUp ? Math.ceil(each - 1e-9) : each;
        var stats = [['Bill', money(v.bill)]];
        if (tax) stats.push(['Tax', money(tax)]);
        if (tip) stats.push(['Tip', money(tip)]);
        stats.push(['Total', money(total)]);
        if (v.roundUp) stats.push(['Collected after rounding', money(shown * v.people)], ['Extra from rounding', money(shown * v.people - total)]);
        return {
          hero: { label: 'Each person pays', value: v.roundUp ? num(shown) : money(shown) }, stats: stats,
          how: ['Share = (bill + tax + tip) ÷ people', 'Tax and tip are worked out on the bill before either is added.']
        };
      }
    },
    taxTool('sales-tax', 'Sales tax', 'tax', 'Add sales tax to a price, or take it out', 'sales tax add remove state us'),
    taxTool('vat', 'VAT', 'VAT', 'Add or remove value-added tax at any rate', 'vat value added tax add remove inclusive exclusive'),
    taxTool('gst', 'GST', 'GST', 'Add or remove goods and services tax at any rate', 'gst goods services tax cgst sgst inclusive exclusive',
      [{ id: 'split', type: 'switch', label: 'Show CGST and SGST halves', default: false, help: 'For India, where intra-state GST splits equally between centre and state.' }]),

    /* ---------------------------- Finance ---------------------------- */
    {
      id: 'emi', cat: 'finance', name: 'EMI', desc: 'Monthly instalment, interest and payment schedule',
      keywords: 'emi loan instalment installment mortgage car home monthly payment',
      fields: [
        { id: 'amount', label: 'Loan amount', type: 'number', min: 0, placeholder: '1,000,000' },
        RATE,
        { id: 'tenure', label: 'Tenure', type: 'number', min: 0, placeholder: '5', unitSelect: { id: 'unit', options: [['years', 'Years'], ['months', 'Months']], default: 'years' } }
      ],
      compute: function (v) {
        if (!have(v.amount, v.rate, v.tenure)) return null;
        var n = Math.round(v.unit === 'months' ? v.tenure : v.tenure * 12);
        if (v.amount <= 0) return { error: 'Enter a loan amount above 0.' };
        if (n < 1) return { error: 'The tenure must be at least 1 month.' };
        if (n > 600) return { error: 'The tenure can be at most 50 years (600 months).' };
        var r = F.emi(v.amount, v.rate, n);
        return {
          hero: { label: 'Monthly EMI', value: money(r.emi) },
          bar: [{ label: 'Principal', value: v.amount, color: 'var(--bar-principal)' }, { label: 'Interest', value: Math.max(0, r.interest), color: 'var(--bar-interest)' }],
          stats: [['Loan amount', money(v.amount)], ['Total interest', money(r.interest)], ['Total payment', money(r.total)], ['Instalments', n + ' (' + ymText(n) + ')']],
          table: { title: 'payment schedule', head: ['Month', 'Principal', 'Interest', 'Balance'],
            rows: r.schedule.map(function (s) { return [String(s.n), money(s.principal), money(s.interest), money(s.balance)]; }) },
          how: ['EMI = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)', 'P is the loan, r the monthly rate (yearly rate ÷ 12 ÷ 100), n the number of months. Interest is charged on the reducing balance.']
        };
      }
    },
    {
      id: 'loan-payoff', cat: 'finance', name: 'Loan repayment', desc: 'How long a loan takes to repay at a set monthly payment',
      keywords: 'loan repayment payoff pay off debt how long months credit card',
      fields: [
        { id: 'amount', label: 'Loan balance', type: 'number', min: 0, placeholder: '500,000' },
        RATE,
        { id: 'payment', label: 'Monthly payment', type: 'number', min: 0, placeholder: '15,000' }
      ],
      compute: function (v) {
        if (!have(v.amount, v.rate, v.payment)) return null;
        if (v.amount <= 0 || v.payment <= 0) return { error: 'Enter a balance and a payment above 0.' };
        var r = F.payoff(v.amount, v.rate, v.payment);
        if (!r.ok && r.minPayment != null) return { error: 'This payment never reduces the loan. The first month’s interest alone is ' + money(r.minPayment) + ', so pay more than that.' };
        if (!r.ok) return { error: 'At this payment the loan would take more than 100 years to repay.' };
        return {
          hero: { label: 'Paid off in', value: ymText(r.months), sub: r.months + ' payments' },
          bar: [{ label: 'Principal', value: v.amount, color: 'var(--bar-principal)' }, { label: 'Interest', value: r.interest, color: 'var(--bar-interest)' }],
          stats: [['Total interest', money(r.interest)], ['Total paid', money(r.total)], ['Final payment', money(r.lastPayment)]],
          how: ['Each month: interest = balance × yearly rate ÷ 12 ÷ 100, then the payment is subtracted. The last payment covers whatever remains.']
        };
      }
    },
    {
      id: 'affordability', cat: 'finance', name: 'Loan affordability', desc: 'Largest loan your monthly budget can repay',
      keywords: 'afford affordability borrow how much loan mortgage budget income',
      fields: [
        { id: 'income', label: 'Monthly income', type: 'number', min: 0, placeholder: '200,000' },
        { id: 'share', label: 'Share of income for all repayments', type: 'number', unit: '%', min: 0, max: 100, placeholder: '35', help: 'Lenders set their own limit. Use the one that applies to you.' },
        { id: 'debts', label: 'Existing monthly repayments', type: 'number', min: 0, optional: true, placeholder: 'Optional' },
        RATE,
        { id: 'years', label: 'Loan term', type: 'number', unit: 'years', min: 0, max: 50, placeholder: '20' },
        { id: 'down', label: 'Down payment you have', type: 'number', min: 0, optional: true, placeholder: 'Optional' }
      ],
      compute: function (v) {
        if (!have(v.income, v.share, v.rate, v.years)) return null;
        var budget = v.income * v.share / 100 - (v.debts || 0);
        if (budget <= 0) return { error: 'Existing repayments already use the whole budget, so there is nothing left for a new loan.' };
        var n = Math.round(v.years * 12);
        if (n < 1) return { error: 'The loan term must be at least 1 month.' };
        var loan = F.affordable(budget, v.rate, n);
        var stats = [['Monthly payment available', money(budget)], ['Total repaid', money(budget * n)], ['Interest over the term', money(budget * n - loan)]];
        if (v.down) stats.push(['Price you could pay (loan + down payment)', money(loan + v.down)]);
        return {
          hero: { label: 'You could borrow up to', value: money(loan) }, stats: stats,
          how: ['Budget = income × share − existing repayments', 'Loan = budget × (1 − (1 + r)⁻ⁿ) ÷ r, with r the monthly rate and n the months.']
        };
      }
    },
    {
      id: 'simple-interest', cat: 'finance', name: 'Simple interest', desc: 'Interest on the principal only',
      keywords: 'simple interest principal rate time',
      fields: [
        { id: 'p', label: 'Principal', type: 'number', min: 0, placeholder: '50,000' },
        RATE,
        { id: 't', label: 'Time', type: 'number', min: 0, placeholder: '3', unitSelect: { id: 'unit', options: [['years', 'Years'], ['months', 'Months'], ['days', 'Days']], default: 'years' } }
      ],
      compute: function (v) {
        if (!have(v.p, v.rate, v.t)) return null;
        var years = v.unit === 'months' ? v.t / 12 : v.unit === 'days' ? v.t / 365 : v.t;
        var r = F.simpleInterest(v.p, v.rate, years);
        return {
          hero: { label: 'Interest', value: money(r.interest) },
          stats: [['Principal', money(v.p)], ['Total amount', money(r.total)]],
          how: ['Interest = principal × rate ÷ 100 × years' + (v.unit === 'days' ? ' (days ÷ 365)' : v.unit === 'months' ? ' (months ÷ 12)' : '')]
        };
      }
    },
    {
      id: 'compound-interest', cat: 'finance', name: 'Compound interest', desc: 'Growth when interest earns interest',
      keywords: 'compound interest apy effective rate deposit',
      fields: [
        { id: 'p', label: 'Principal', type: 'number', min: 0, placeholder: '100,000' },
        RATE,
        { id: 'freq', label: 'Compounded', type: 'select', options: [['1', 'Yearly'], ['2', 'Every 6 months'], ['4', 'Quarterly'], ['12', 'Monthly'], ['365', 'Daily']], default: '12' },
        { id: 'years', label: 'Time', type: 'number', unit: 'years', min: 0, max: 100, placeholder: '10' }
      ],
      compute: function (v) {
        if (!have(v.p, v.rate, v.years)) return null;
        var r = F.compound(v.p, v.rate, Number(v.freq), v.years);
        if (!isFinite(r.total)) return { error: 'These numbers are too large to show.' };
        return {
          hero: { label: 'Amount after ' + plural(v.years, 'year'), value: money(r.total) },
          bar: [{ label: 'Principal', value: v.p, color: 'var(--bar-principal)' }, { label: 'Interest', value: r.interest, color: 'var(--bar-interest)' }],
          stats: [['Interest earned', money(r.interest)], ['Effective yearly rate', pct(r.effectiveRate, 4)]],
          table: { title: 'year-by-year balance', head: ['Year', 'Balance'], rows: r.byYear.map(function (y) { return [String(y.year), money(y.balance)]; }) },
          how: ['Amount = P × (1 + r ÷ n)^(n × t)', 'r is the yearly rate as a decimal, n the compounding periods per year, t the years.']
        };
      }
    },
    {
      id: 'savings', cat: 'finance', name: 'Savings', desc: 'What regular deposits grow to',
      keywords: 'savings deposit save monthly goal bank',
      fields: [
        { id: 'initial', label: 'Starting balance', type: 'number', min: 0, default: '0' },
        { id: 'monthly', label: 'Monthly deposit', type: 'number', min: 0, placeholder: '10,000' },
        { id: 'rate', label: 'Interest rate', type: 'number', unit: '% per year', min: 0, max: 100, placeholder: '8' },
        { id: 'years', label: 'Time', type: 'number', unit: 'years', min: 0, max: 60, placeholder: '5' }
      ],
      compute: function (v) {
        if (!have(v.initial, v.monthly, v.rate, v.years)) return null;
        if (Math.round(v.years * 12) < 1) return { error: 'The time must be at least 1 month.' };
        var r = F.growth(v.initial, v.monthly, v.rate, v.years, 0, 0);
        return {
          hero: { label: 'Balance after ' + plural(v.years, 'year'), value: money(r.balance) },
          bar: [{ label: 'Deposits', value: r.contributed, color: 'var(--bar-principal)' }, { label: 'Interest', value: Math.max(0, r.growth), color: 'var(--bar-interest)' }],
          stats: [['Total deposited', money(r.contributed)], ['Interest earned', money(r.growth)]],
          table: { title: 'year-by-year balance', head: ['Year', 'Deposited', 'Balance'], rows: r.byYear.map(function (y) { return [String(y.year), money(y.contributed), money(y.balance)]; }) },
          how: ['Interest is added monthly at the yearly rate ÷ 12, and each deposit is made at the end of the month.']
        };
      }
    },
    {
      id: 'investment', cat: 'finance', name: 'Investment growth', desc: 'Future value with contributions, step-ups and inflation',
      keywords: 'investment growth sip mutual fund return future value inflation',
      fields: [
        { id: 'initial', label: 'Amount invested now', type: 'number', min: 0, default: '0' },
        { id: 'monthly', label: 'Monthly contribution', type: 'number', min: 0, placeholder: '5,000' },
        { id: 'rate', label: 'Expected return', type: 'number', unit: '% per year', min: -50, max: 100, placeholder: '10' },
        { id: 'years', label: 'Time', type: 'number', unit: 'years', min: 0, max: 60, placeholder: '15' },
        { id: 'step', label: 'Raise contributions each year by', type: 'number', unit: '%', min: 0, max: 100, optional: true, placeholder: 'Optional' },
        { id: 'infl', label: 'Inflation', type: 'number', unit: '% per year', min: 0, max: 100, optional: true, placeholder: 'Optional', help: 'Shows what the final amount is worth in today’s money.' }
      ],
      compute: function (v) {
        if (!have(v.initial, v.monthly, v.rate, v.years)) return null;
        if (Math.round(v.years * 12) < 1) return { error: 'The time must be at least 1 month.' };
        var r = F.growth(v.initial, v.monthly, v.rate, v.years, v.step || 0, v.infl || 0);
        var stats = [['Total invested', money(r.contributed)], ['Growth', money(r.growth)]];
        if (r.realValue != null) stats.push(['Worth in today’s money', money(r.realValue)]);
        return {
          hero: { label: 'Value after ' + plural(v.years, 'year'), value: money(r.balance) },
          bar: [{ label: 'Invested', value: r.contributed, color: 'var(--bar-principal)' }, { label: 'Growth', value: Math.max(0, r.growth), color: 'var(--bar-interest)' }],
          stats: stats,
          table: { title: 'year-by-year value', head: ['Year', 'Invested', 'Value'], rows: r.byYear.map(function (y) { return [String(y.year), money(y.contributed), money(y.balance)]; }) },
          how: ['Assumes the same return every year, compounded monthly. Real returns vary and are not guaranteed.']
        };
      }
    },
    {
      id: 'profit-margin', cat: 'finance', name: 'Profit and margin', desc: 'Profit, margin and markup from cost and price',
      keywords: 'profit margin gross markup cost selling price business',
      fields: [
        { id: 'cost', label: 'Cost', type: 'number', min: 0, placeholder: '800' },
        { id: 'price', label: 'Selling price', type: 'number', min: 0, placeholder: '1,000' }
      ],
      compute: function (v) {
        if (!have(v.cost, v.price)) return null;
        var r = F.profit(v.cost, v.price);
        return {
          hero: { label: r.profit >= 0 ? 'Profit' : 'Loss', value: money(Math.abs(r.profit)) },
          stats: [['Margin (profit ÷ price)', r.marginPct == null ? '—' : pct(r.marginPct)], ['Markup (profit ÷ cost)', r.markupPct == null ? '—' : pct(r.markupPct)]],
          how: ['Margin = (price − cost) ÷ price × 100', 'Markup = (price − cost) ÷ cost × 100']
        };
      }
    },
    {
      id: 'markup', cat: 'finance', name: 'Markup', desc: 'Selling price from cost and a markup or target margin',
      keywords: 'markup price pricing margin target cost retail',
      fields: [
        { id: 'cost', label: 'Cost', type: 'number', min: 0, placeholder: '800' },
        { id: 'mode', type: 'seg', label: 'Price using', options: [['markup', 'Markup %'], ['margin', 'Target margin %']], default: 'markup' },
        { id: 'p', label: 'Percent', type: 'number', unit: '%', min: 0, placeholder: '25', labelFn: function (v) { return v.mode === 'margin' ? 'Target margin' : 'Markup'; } }
      ],
      compute: function (v) {
        if (!have(v.cost, v.p)) return null;
        if (v.mode === 'margin') {
          var m = F.priceFromMargin(v.cost, v.p);
          if (!m) return { error: 'A margin must be below 100%: at 100% the price would be infinite.' };
          return { hero: { label: 'Selling price', value: money(m.price) }, stats: [['Profit', money(m.profit)], ['Equivalent markup', m.markupPct == null ? '—' : pct(m.markupPct)]], how: ['Price = cost ÷ (1 − margin ÷ 100)'] };
        }
        var k = F.priceFromMarkup(v.cost, v.p);
        return { hero: { label: 'Selling price', value: money(k.price) }, stats: [['Profit', money(k.profit)], ['Resulting margin', k.marginPct == null ? '—' : pct(k.marginPct)]], how: ['Price = cost × (1 + markup ÷ 100)'] };
      }
    },
    {
      id: 'break-even', cat: 'finance', name: 'Break-even', desc: 'Units and sales needed to cover costs',
      keywords: 'break even breakeven units fixed variable cost contribution',
      fields: [
        { id: 'fixed', label: 'Fixed costs', type: 'number', min: 0, placeholder: '100,000', help: 'Costs that stay the same whatever you sell: rent, salaries.' },
        { id: 'price', label: 'Price per unit', type: 'number', min: 0, placeholder: '500' },
        { id: 'variable', label: 'Variable cost per unit', type: 'number', min: 0, placeholder: '300' },
        { id: 'target', label: 'Target profit', type: 'number', min: 0, optional: true, placeholder: 'Optional' }
      ],
      compute: function (v) {
        if (!have(v.fixed, v.price, v.variable)) return null;
        var r = F.breakEven(v.fixed, v.price, v.variable, v.target || 0);
        if (!r.ok) return { error: 'The price must be higher than the variable cost per unit, or each sale loses money.' };
        return {
          hero: { label: v.target ? 'Units to reach the target profit' : 'Units to break even', value: num(r.unitsRounded), sub: 'Exactly ' + num(round(r.units, 2)) },
          stats: [['Sales revenue needed', money(r.revenue)], ['Contribution per unit', money(r.contribution)], ['Contribution ratio', pct(r.contributionRatio)]],
          how: ['Units = (fixed costs + target profit) ÷ (price − variable cost)']
        };
      }
    },

    /* --------------------------- Date & time --------------------------- */
    {
      id: 'age', cat: 'date', name: 'Age', desc: 'Exact age, birthday countdown and more',
      keywords: 'age birthday born old years zodiac',
      fields: [
        { id: 'birth', label: 'Date of birth', type: 'date' },
        { id: 'asof', label: 'Age on', type: 'date', default: 'today' },
        { id: 'name', label: 'Name in Urdu or Arabic', type: 'text', optional: true, placeholder: 'Optional, e.g. محمد علی', dir: 'auto',
          help: 'Used only to work out the Abjad value. It stays on this device.' }
      ],
      compute: function (v) {
        var b = D.parseISO(v.birth), a = D.parseISO(v.asof);
        if (!b || !a) return null;
        var future = b.t > a.t;
        var lo = future ? a : b, hi = future ? b : a;
        var r = D.ymd(lo, hi);
        var days = D.daysBetween(lo, hi);
        var months = r.y * 12 + r.m;
        var stats = [];
        if (future) stats.push(['Note', 'The birth date is after the “age on” date, so this is a countdown.']);
        stats.push(['Born on a', D.weekday(b)], ['Total months', num(months)], ['Total weeks', num(Math.floor(days / 7)) + (days % 7 ? ' and ' + plural(days % 7, 'day') : '')],
          ['Total days', num(days)], ['Total hours', num(days * 24)]);
        if (!future) {
          var nb = D.nextBirthday(b, a);
          stats.push(['Next birthday', nb.days === 0 ? 'Today' : dateText(nb.date) + ' (in ' + plural(nb.days, 'day') + ')']);
        }
        var z = zodiac(b.m, b.d);
        var bj = I.burj[z];
        stats.push(['Star sign', z]);
        stats.push(['Islamic sign (burj)', bj[1] + '  ' + bj[0] + ', ' + z]);
        stats.push(['Chinese zodiac', chinese(b.y) + (b.m <= 2 ? ' or ' + chinese(b.y - 1) : '')]);
        var hb = I.hijri(b);
        if (hb) {
          stats.push(['Islamic date of birth', hb.d + ' ' + hb.monthName + ' ' + hb.y + ' AH']);
          var ha = future ? null : I.hijriAge(b, a);
          if (ha != null && ha >= 0) stats.push(['Age in Hijri years', num(ha)]);
        }
        var how = [];
        if (v.name && String(v.name).trim()) {
          var ab = I.abjad(v.name);
          if (ab.letters) {
            stats.push(['Abjad value of the name', num(ab.total)]);
            stats.push(['Abjad single digit', String(ab.digit)]);
          } else {
            stats.push(['Abjad value of the name', ab.latin ? 'Type the name in Urdu or Arabic letters' : '—']);
          }
          how.push('Abjad uses the classical letter values (ا 1, ب 2, ج 3 … غ 1000); Urdu letters take the value of the Arabic letter they come from (پ as ب, ٹ as ت, گ as ک). The single digit adds the digits until one is left.');
        }
        if (hb) how.push('The Hijri date uses the Umm al-Qura calendar and can differ by a day from the date set by local moon sighting.');
        if (b.m <= 2) how.push('The Chinese year starts in late January or February, so births early in the year may belong to the previous animal.');
        return {
          trio: [{ v: num(r.y), l: r.y === 1 ? 'Year' : 'Years' }, { v: num(r.m), l: r.m === 1 ? 'Month' : 'Months' }, { v: num(r.d), l: r.d === 1 ? 'Day' : 'Days' }],
          stats: stats,
          how: how.length ? how : null
        };
      }
    },
    {
      id: 'date-diff', cat: 'date', name: 'Date difference', desc: 'Years, months and days between two dates',
      keywords: 'date difference between duration years months days',
      fields: [
        { id: 'a', label: 'Start date', type: 'date', default: 'today' },
        { id: 'b', label: 'End date', type: 'date' }
      ],
      compute: function (v) {
        var a = D.parseISO(v.a), b = D.parseISO(v.b);
        if (!a || !b) return null;
        var swapped = b.t < a.t;
        var lo = swapped ? b : a, hi = swapped ? a : b;
        var r = D.ymd(lo, hi), days = D.daysBetween(lo, hi);
        var stats = [['Total days', num(days)], ['Weeks', num(Math.floor(days / 7)) + (days % 7 ? ' and ' + plural(days % 7, 'day') : '')], ['Total months', num(r.y * 12 + r.m) + (r.d ? ' and ' + plural(r.d, 'day') : '')]];
        if (swapped) stats.unshift(['Note', 'The end date is before the start date. Showing the gap between them.']);
        return {
          trio: [{ v: num(r.y), l: r.y === 1 ? 'Year' : 'Years' }, { v: num(r.m), l: r.m === 1 ? 'Month' : 'Months' }, { v: num(r.d), l: r.d === 1 ? 'Day' : 'Days' }],
          stats: stats, how: ['The end date is not counted, so 1 Jan to 2 Jan is 1 day.']
        };
      }
    },
    {
      id: 'days-between', cat: 'date', name: 'Days between dates', desc: 'Total days, weekdays and weekend days',
      keywords: 'days between count working business weekdays weekend',
      fields: [
        { id: 'a', label: 'From', type: 'date', default: 'today' },
        { id: 'b', label: 'To', type: 'date' },
        { id: 'incl', type: 'switch', label: 'Count the end date too', default: false }
      ],
      compute: function (v) {
        var a = D.parseISO(v.a), b = D.parseISO(v.b);
        if (!a || !b) return null;
        var lo = a.t <= b.t ? a : b, hi = a.t <= b.t ? b : a;
        var total = D.daysBetween(lo, hi) + (v.incl ? 1 : 0);
        var endForCount = v.incl ? hi : D.parseISO(D.toISO(hi.t - 86400000));
        var weekdays = total > 0 ? D.weekdaysInclusive(lo, endForCount) : 0;
        return {
          hero: { label: 'Days', value: num(total) },
          stats: [['Weekdays (Mon–Fri)', num(weekdays)], ['Weekend days', num(total - weekdays)], ['Weeks', num(Math.floor(total / 7)) + (total % 7 ? ' and ' + plural(total % 7, 'day') : '')]],
          how: ['Public holidays are not taken out, because they differ by country.']
        };
      }
    },
    {
      id: 'date-add', cat: 'date', name: 'Add or subtract days', desc: 'The date a number of days, weeks, months or years away',
      keywords: 'add subtract days date after before deadline due later business',
      fields: [
        { id: 'start', label: 'Start date', type: 'date', default: 'today' },
        { id: 'op', type: 'seg', label: 'Do', options: [['add', 'Add'], ['sub', 'Subtract']], default: 'add' },
        { id: 'n', label: 'Amount', type: 'number', min: 0, int: true, max: 100000, placeholder: '30',
          unitSelect: { id: 'unit', options: [['days', 'Days'], ['bdays', 'Weekdays'], ['weeks', 'Weeks'], ['months', 'Months'], ['years', 'Years']], default: 'days' } }
      ],
      compute: function (v) {
        var s = D.parseISO(v.start);
        if (!s || v.n == null) return null;
        var k = v.op === 'sub' ? -v.n : v.n;
        var r;
        if (v.unit === 'bdays') r = D.addBusinessDays(s, k);
        else r = D.add(s, v.unit === 'years' ? k : 0, v.unit === 'months' ? k : 0, v.unit === 'weeks' ? k : 0, v.unit === 'days' ? k : 0);
        if (!r || r.y < 1 || r.y > 9999) return { error: 'That date is out of range.' };
        return {
          hero: { label: 'Date', value: dateText(r), sub: D.weekday(r) },
          stats: [['Calendar days from the start', num(D.daysBetween(s, r))]],
          how: v.unit === 'months' || v.unit === 'years' ? ['When the day doesn’t exist in the target month, the last day of that month is used (31 Jan + 1 month = 28 or 29 Feb).']
            : v.unit === 'bdays' ? ['Weekdays skip Saturdays and Sundays. Public holidays are not skipped.'] : null
        };
      }
    },
    {
      id: 'time-duration', cat: 'date', name: 'Time duration', desc: 'Hours and minutes between two times, with breaks',
      keywords: 'time duration hours minutes shift work timesheet clock',
      fields: [
        { id: 'start', label: 'Start time', type: 'time', placeholder: '09:00' },
        { id: 'end', label: 'End time', type: 'time', placeholder: '17:30' },
        { id: 'brk', label: 'Break', type: 'number', unit: 'minutes', min: 0, max: 1440, int: true, optional: true, placeholder: 'Optional' }
      ],
      compute: function (v) {
        var s = D.parseTime(v.start), e = D.parseTime(v.end);
        if (s == null || e == null) return null;
        var r = D.duration(s, e, v.brk || 0);
        if (r.minutes < 0) return { error: 'The break is longer than the time worked.' };
        var h = Math.floor(r.minutes / 60), m = r.minutes % 60;
        var stats = [['In hours', num(round(r.minutes / 60, 4)) + ' h'], ['In minutes', num(r.minutes) + ' min']];
        if (r.overnight) stats.unshift(['Note', 'The end time is earlier than the start, so it’s taken as the next day.']);
        return { hero: { label: 'Duration', value: h + ' h ' + m + ' min' }, stats: stats };
      }
    },

    /* --------------------------- Converters --------------------------- */
    converter('length', 'length', 'Metres, feet, inches, miles and more', 'length distance metre meter feet foot inch cm km mile yard'),
    converter('mass', 'mass', 'Kilograms, pounds, ounces, tola and more', 'weight mass kg kilogram pound lb ounce gram tola stone ton'),
    converter('temperature', 'temperature', 'Celsius, Fahrenheit and Kelvin', 'temperature celsius fahrenheit kelvin degrees'),
    converter('area', 'area', 'Square metres, acres, hectares and more', 'area square feet metre acre hectare'),
    converter('volume', 'volume', 'Litres, gallons, cups and more', 'volume litre liter gallon cup ml millilitre fluid ounce'),
    converter('speed', 'speed', 'km/h, mph, knots and m/s', 'speed velocity kmh mph knot'),
    converter('time-units', 'time', 'Seconds to years', 'time seconds minutes hours days weeks years convert'),
    converter('data', 'data', 'Bytes, kB/KiB, MB/MiB, GB/GiB and bits', 'data storage byte kb mb gb tb bit megabyte gigabyte'),
    converter('energy', 'energy', 'Joules, calories, kWh, BTU', 'energy joule calorie kcal kwh btu'),
    converter('pressure', 'pressure', 'Pascal, bar, psi, atm, mmHg', 'pressure pascal bar psi atm mmhg tyre tire')
  ];

  var ZODIAC = [[1, 20, 'Capricorn'], [2, 19, 'Aquarius'], [3, 21, 'Pisces'], [4, 20, 'Aries'], [5, 21, 'Taurus'], [6, 21, 'Gemini'],
    [7, 23, 'Cancer'], [8, 23, 'Leo'], [9, 23, 'Virgo'], [10, 23, 'Libra'], [11, 22, 'Scorpio'], [12, 22, 'Sagittarius'], [13, 0, 'Capricorn']];
  function zodiac(m, d) {
    // Each entry: the sign that runs until (month, day) exclusive
    for (var i = 0; i < ZODIAC.length; i++) {
      var z = ZODIAC[i];
      if (m < z[0] || (m === z[0] && d < z[1])) return z[2];
    }
    return 'Capricorn';
  }
  var ANIMALS = ['Monkey', 'Rooster', 'Dog', 'Pig', 'Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat'];
  function chinese(y) { return ANIMALS[((y % 12) + 12) % 12]; }

  var CATEGORIES = [
    { id: 'everyday', name: 'Daily use' },
    { id: 'finance', name: 'Finance' },
    { id: 'date', name: 'Date & time' },
    { id: 'convert', name: 'Unit converters' }
  ];

  var byId = {};
  TOOLS.forEach(function (t) { byId[t.id] = t; });

  root.CalcTools = { list: TOOLS, byId: byId, categories: CATEGORIES, _zodiac: zodiac, _chinese: chinese };
  if (typeof module === 'object' && module.exports) module.exports = root.CalcTools;
})(typeof self !== 'undefined' ? self : this);
