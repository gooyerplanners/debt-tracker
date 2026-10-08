export const categories = ['Flex', 'Lloyd’s', 'Klarna'];
export const initialState = () => ({ balances: Object.fromEntries(categories.map(c => [c, 0])), history: [] });
export function amountInPence(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) throw new Error('Enter an amount with up to two decimal places.');
  const n = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error('Enter an amount greater than £0.');
  return n;
}
export function updateBalance(state, category, amount, action) {
  if (!categories.includes(category) || !['add', 'pay', 'set'].includes(action)) throw new Error('Choose an account and action.');
  if (!Number.isSafeInteger(amount) || amount < 0 || (action !== 'set' && amount === 0)) throw new Error('Enter a valid amount.');
  const old = state.balances[category];
  const next = action === 'set' ? amount : old + (action === 'pay' ? -amount : amount);
  if (next < 0) throw new Error('The repayment is more than this account’s balance.');
  if (!Number.isSafeInteger(next)) throw new Error('This amount is too large.');
  return { balances: { ...state.balances, [category]: next }, history: [{id: crypto.randomUUID(), category, action, amount, before: old, after: next, date: new Date().toISOString()}, ...state.history] };
}
export function validState(s) {
  return s && categories.every(c => Number.isSafeInteger(s.balances?.[c]) && s.balances[c] >= 0) && Array.isArray(s.history) && s.history.every(h => categories.includes(h.category) && ['set','pay','add'].includes(h.action) && Number.isSafeInteger(h.amount) && h.amount >= 0 && Number.isSafeInteger(h.before) && h.before >= 0 && Number.isSafeInteger(h.after) && h.after >= 0 && typeof h.id === 'string' && !isNaN(Date.parse(h.date)));
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
