export const categories = ['Flex', 'Lloyd’s', 'Klarna'];
export const initialState = () => ({ balances: Object.fromEntries(categories.map(c => [c, 0])), history: [] });
export function amountInPence(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) throw new Error('Enter an amount with up to two decimal places.');
  const n = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error('Enter an amount greater than £0.');
  return n;
}
export function updateBalance(state, category, amount, action) {
  if (!Object.hasOwn(state.balances, category) || !['add', 'pay', 'set'].includes(action)) throw new Error('Choose an account and action.');
  if (!Number.isSafeInteger(amount) || amount < 0 || (action !== 'set' && amount === 0)) throw new Error('Enter a valid amount.');
  const old = state.balances[category];
  const next = action === 'set' ? amount : old + (action === 'pay' ? -amount : amount);
  if (next < 0) throw new Error('The repayment is more than this account’s balance.');
  if (!Number.isSafeInteger(next)) throw new Error('This amount is too large.');
  return { ...state, balances: { ...state.balances, [category]: next }, history: [{id: crypto.randomUUID(), category, action, amount, before: old, after: next, date: new Date().toISOString()}, ...state.history] };
}
const validName = name => typeof name === 'string' && name.trim() === name && name.length > 0 && name.length <= 60 && !['__proto__', 'prototype', 'constructor'].includes(name);
export const accountNames = state => Object.keys(state.balances);
export function createAccount(state, name, amount) {
  name = String(name).trim();
  if (!validName(name)) throw new Error('Enter a name between 1 and 60 characters.');
  if (accountNames(state).some(c => c.toLocaleLowerCase('en-GB') === name.toLocaleLowerCase('en-GB'))) throw new Error('An account with this name already exists.');
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('Enter a valid remaining balance.');
  return updateBalance({ ...state, balances: { ...state.balances, [name]: 0 } }, name, amount, 'set');
}
export function validState(s) {
  if (!s || !s.balances || typeof s.balances !== 'object' || Array.isArray(s.balances)) return false;
  if (s.budgets !== undefined && !validBudgets(s.budgets)) return false;
  const names = accountNames(s);
  return categories.every(c => Object.hasOwn(s.balances, c)) && names.every(c => validName(c) && Number.isSafeInteger(s.balances[c]) && s.balances[c] >= 0) && new Set(names.map(c => c.toLocaleLowerCase('en-GB'))).size === names.length && Array.isArray(s.history) && s.history.every(h => h && names.includes(h.category) && ['set','pay','add'].includes(h.action) && Number.isSafeInteger(h.amount) && h.amount >= 0 && Number.isSafeInteger(h.before) && h.before >= 0 && Number.isSafeInteger(h.after) && h.after >= 0 && typeof h.id === 'string' && !isNaN(Date.parse(h.date)));
}

// Preserve balances and activity from the account’s original label.
export function migrateState(state) {
  if (!state || !state.balances || !Array.isArray(state.history)) return state;
  const balances = { ...state.balances };
  if (!Object.hasOwn(balances, 'Klarna') && Object.hasOwn(balances, 'Plana')) {
    balances.Klarna = balances.Plana;
    delete balances.Plana;
  }
  return { ...state, balances, history: state.history.map(h => h?.category === 'Plana' ? { ...h, category: 'Klarna' } : h) };
}

export const initialBudgets = () => [];
export function validBudgets(items) {
  return Array.isArray(items) && new Set(items.map(b => b?.id)).size === items.length && items.every(b => b && typeof b.id === 'string' && validName(b.name) && typeof b.icon === 'string' && b.icon.length <= 12 && Number.isSafeInteger(b.remaining) && b.remaining >= 0 && Number.isSafeInteger(b.allocated) && b.allocated >= b.remaining);
}
export function createBudget(state, name, amount, icon = '🧾') {
  name = String(name).trim();
  const budgets = state.budgets ?? initialBudgets();
  if (!validName(name)) throw new Error('Enter a name between 1 and 60 characters.');
  if (budgets.some(b => b.name.toLowerCase() === name.toLowerCase())) throw new Error('An allocation with this name already exists.');
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('Enter a valid budget amount.');
  icon = validateBudgetIcon(icon);
  return {...state, budgets: [...budgets, {id: crypto.randomUUID(), name, icon, remaining: amount, allocated: amount}]};
}
export function adjustBudget(state, id, amount, action) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || !['add', 'remove'].includes(action)) throw new Error('Enter an amount greater than £0.');
  const budgets = state.budgets ?? initialBudgets();
  if (!budgets.some(b => b.id === id)) throw new Error('Choose an allocation.');
  return {...state, budgets: budgets.map(b => {
    if (b.id !== id) return b;
    const remaining = b.remaining + (action === 'add' ? amount : -amount);
    const allocated = b.allocated + (action === 'add' ? amount : 0);
    if (remaining < 0) throw new Error('That is more than the amount remaining.');
    if (!Number.isSafeInteger(remaining) || !Number.isSafeInteger(allocated)) throw new Error('This amount is too large.');
    return {...b, remaining, allocated};
  })};
}

function validateBudgetIcon(icon) {
  icon = String(icon).trim();
  if (!icon || icon.length > 12 || [...new Intl.Segmenter('en', {granularity: 'grapheme'}).segment(icon)].length !== 1 || !/\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u.test(icon)) throw new Error('Choose one emoji using your keyboard.');
  return icon;
}
export function editBudget(state, id, name, icon) {
  const budgets = state.budgets ?? initialBudgets();
  name = String(name).trim();
  if (!budgets.some(b => b.id === id)) throw new Error('Choose an allocation.');
  if (!validName(name)) throw new Error('Enter a name between 1 and 60 characters.');
  if (budgets.some(b => b.id !== id && b.name.toLowerCase() === name.toLowerCase())) throw new Error('An allocation with this name already exists.');
  icon = validateBudgetIcon(icon);
  return {...state, budgets: budgets.map(b => b.id === id ? {...b, name, icon} : b)};
}
export function deleteBudget(state, id) {
  const budgets = state.budgets ?? initialBudgets();
  if (!budgets.some(b => b.id === id)) throw new Error('Choose an allocation.');
  return {...state, budgets: budgets.filter(b => b.id !== id)};
}
