import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,amountInPence,updateBalance,validState} from './model.js';
test('balances track borrowing and repayment independently, using exact pennies',()=>{let s=initialState();s=updateBalance(s,'Flex',amountInPence('1200.25'),'set');s=updateBalance(s,'Lloyd’s',amountInPence('900'),'set');s=updateBalance(s,'Flex',amountInPence('200'),'pay');s=updateBalance(s,'Klarna',amountInPence('30.10'),'add');assert.equal(s.balances.Flex,100025);assert.equal(s.balances['Lloyd’s'],90000);assert.equal(s.balances.Klarna,3010);assert.equal(s.history.length,4);assert.equal(s.history[0].before,0);assert.ok(validState(s));});
test('rejects overpayment and malformed amounts',()=>{assert.throws(()=>updateBalance(initialState(),'Flex',20000,'pay'),/more than/);for(const value of ['-1','1.001','NaN','1e3','0','Infinity'])assert.throws(()=>amountInPence(value));assert.equal(amountInPence('0.29'),29);});
test('full repayment and zero balance are supported',()=>{let s=updateBalance(initialState(),'Flex',20000,'set');s=updateBalance(s,'Flex',20000,'pay');assert.equal(s.balances.Flex,0);assert.equal(s.history[0].before,20000);assert.ok(validState(updateBalance(s,'Klarna',0,'set')));});
test('invalid backup data is rejected',()=>{assert.equal(validState({balances:{},history:[]}),false);const s=initialState();s.history=[{category:'Flex',amount:2}];assert.equal(validState(s),false);});

test('custom debts preserve existing balances and support repayments, borrowing and backups', async () => {
  const {createAccount, migrateState, accountNames} = await import('./model.js');
  const old = updateBalance(initialState(), 'Flex', 12345, 'set');
  let s = createAccount(migrateState(JSON.parse(JSON.stringify(old))), 'Energy bill', 8000);
  assert.equal(s.balances.Flex, 12345);
  assert.deepEqual(s.history.slice(1), old.history);
  s = updateBalance(s, 'Energy bill', 1000, 'pay');
  s = updateBalance(s, 'Energy bill', 250, 'add');
  assert.equal(s.balances['Energy bill'], 7250);
  assert.equal(accountNames(s).reduce((sum, name) => sum + s.balances[name], 0), 19595);
  assert.ok(validState(migrateState(JSON.parse(JSON.stringify(s)))));
  assert.throws(() => updateBalance(s, 'Energy bill', 7251, 'pay'), /more than/);
  assert.ok(validState(createAccount(s, 'Rent', 0)));
  for (const name of ['', ' ', 'flex', 'Energy bill', '__proto__', 'constructor', 'x'.repeat(61)]) assert.throws(() => createAccount(s, name, 1));
  for (const amount of [-1, 0.5, NaN, Infinity]) assert.throws(() => createAccount(s, 'Rent', amount));
});

test('legacy Plana balances and activity migrate without losing custom accounts', async () => {
  const {migrateState, createAccount} = await import('./model.js');
  let s = createAccount(updateBalance(initialState(), 'Klarna', 500, 'set'), 'Council tax', 900);
  s.balances.Plana = s.balances.Klarna;
  delete s.balances.Klarna;
  s.history = s.history.map(h => h.category === 'Klarna' ? {...h, category: 'Plana'} : h);
  const migrated = migrateState(s);
  assert.equal(migrated.balances.Klarna, 500);
  assert.equal(migrated.balances['Council tax'], 900);
  assert.equal(migrated.history[1].category, 'Klarna');
  assert.ok(validState(migrated));
});
