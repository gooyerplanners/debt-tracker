import { editBudget, deleteBudget, initialBudgets, createBudget, adjustBudget, accountNames, createAccount, initialState, amountInPence, updateBalance, validState, migrateState } from './model.js';
const $ = id => document.getElementById(id);
const arrow = '<svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const key = 'balance-debt-tracker-v1';
const money = n => new Intl.NumberFormat('en-GB', {style:'currency',currency:'GBP'}).format(n/100);
let selectedBudget, editingBudget;
let historyExpanded = false;
let state = initialState(), action = 'pay', editing, deferredInstall;
try { const saved = localStorage.getItem(key); if (saved) { const parsed = migrateState(JSON.parse(saved)); if (!validState(parsed)) throw Error(); state = parsed; } }
catch { $('message').textContent = 'Saved data could not be loaded. Restore a backup before recording new changes.'; $('message').className = 'error'; }
function save(next) { try { localStorage.setItem(key, JSON.stringify(next)); state = next; render(); return true; } catch { notify('Could not save on this device. Free up browser storage and try again.', true); return false; } }
function notify(message, error = false) { $('message').textContent = message; $('message').className = error ? 'error' : ''; }
function render() {
  renderBudgets();
  const categories = accountNames(state);
  const selected = $('category').value;
  $('category').replaceChildren(...categories.map(c => new Option(c, c)));
  if (categories.includes(selected)) $('category').value = selected;
  colourSelection();
  $('account-summary').textContent = `Across your ${categories.length} accounts`;
  $('total').textContent = money(categories.reduce((n,c) => n+state.balances[c],0));
  $('accounts').replaceChildren(...categories.map((c,i) => {
    const el = document.createElement('article'); el.className = 'account'; styleAccount(el, c);
    el.innerHTML = `<div class="account-top"><span class="account-icon"></span><span class="account-name"></span></div><h3>${money(state.balances[c])}</h3><p>Left to pay</p><button type="button">Set balance ${arrow}</button>`;
    el.querySelector('.account-name').textContent = c;
    el.querySelector('.account-icon').textContent = c[0].toUpperCase();
    el.querySelector('button').setAttribute('aria-label', `Set ${c} balance`);
    el.querySelector('button').onclick = () => {editing = c; $('dialog-title').textContent = `Set ${c} balance`; $('balance-input').value = (state.balances[c]/100).toFixed(2); $('balance-error').textContent = ''; $('balance-dialog').showModal();};
    return el;
  }));
  $('count').textContent = `${state.history.length} updates`;
  $('history-toggle').hidden = state.history.length <= 4;
  $('history-toggle').textContent = historyExpanded ? 'See less' : 'See more';
  $('history-toggle').setAttribute('aria-expanded', String(historyExpanded));
  $('history').replaceChildren();
  if (!state.history.length) { $('history').innerHTML = '<div class="empty"><span class="empty-icon"><svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></span><strong>A fresh start.</strong><br>Set your balances above, then record<br>your first update here.</div>'; return; }
  state.history.slice(0, historyExpanded ? state.history.length : 4).forEach((h,i) => {
    const el = document.createElement('div'); el.className='activity'; styleAccount(el, h.category);
    const icon = document.createElement('span'); icon.className='activity-icon'; icon.innerHTML=h.action==='pay'?arrow.replace('arrow-icon','arrow-icon down'):h.action==='add'?'+':'=';
    const info = document.createElement('div'); info.className='activity-info';
    const title=document.createElement('strong'); title.textContent=`${h.category} · ${h.action==='pay'?'Repayment':h.action==='add'?'Borrowing':'Balance set'}`;
    const date=document.createElement('small'); date.textContent=new Date(h.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); info.append(title,date);
    if(i===0){const undo=document.createElement('button'); undo.className='undo'; undo.textContent='Undo last update'; undo.onclick=()=>{if(save({...state,balances:{...state.balances,[h.category]:h.before},history:state.history.slice(1)}))notify('Last update undone.');}; info.append(document.createElement('br'),undo);}
    const amount=document.createElement('span'); amount.className='activity-amount'; amount.textContent=money(h.amount);
    el.append(icon,info,amount); $('history').append(el);
  });
}
document.querySelectorAll('[data-action]').forEach(button => button.onclick=()=>{action=button.dataset.action; document.querySelectorAll('[data-action]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));}); $('submit').innerHTML=action==='pay'?`Record repayment ${arrow}`:`Add borrowing ${arrow}`;notify('');});
$('update-form').onsubmit=e=>{e.preventDefault();try {const amount=amountInPence($('amount').value);const category=$('category').value;if(save(updateBalance(state,category,amount,action))){$('amount').value='';notify(`${money(amount)} ${action==='pay'?'repaid to':'added to'} ${category}.`);}}catch(error){notify(error.message,true);}};
$('balance-form').onsubmit=e=>{e.preventDefault();try {const value=$('balance-input').value.trim(); const amount=/^0(?:\.0{1,2})?$/.test(value)?0:amountInPence(value); if(save(updateBalance(state,editing,amount,'set'))){$('balance-dialog').close();notify(`${editing} balance saved.`);}}catch(error){$('balance-error').textContent=error.message;}};
$('cancel').onclick=()=>$('balance-dialog').close();
$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`balance-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('import').onclick=()=>$('file').click();
$('file').onchange=async()=>{try {const file=$('file').files[0];if(!file)return;if(file.size>5_000_000)throw Error('Backup is too large.');const next=migrateState(JSON.parse(await file.text()));if(!validState(next))throw Error('This is not a valid Balance backup.');if(confirm('Replace the balances and activity on this device with this backup?')){if(save(next))notify('Backup restored.');}}catch(error){notify(error.message,true);}finally{$('file').value='';}};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;});
$('install').onclick=async()=>{if(deferredInstall){await deferredInstall.prompt();deferredInstall=null;}else $('install-dialog').showModal();};
$('close-install').onclick=()=>$('install-dialog').close();

window.addEventListener('storage',e=>{if(e.key===key){try{const next=e.newValue?migrateState(JSON.parse(e.newValue)):initialState();if(validState(next)){state=next;render();notify('Balances updated from another tab.');}}catch{notify('Could not read the update from another tab.',true);}}});
render();

function styleAccount(el, name) {
  const index = accountNames(state).indexOf(name);
  el.dataset.account = ['flex', 'lloyds', 'klarna'][index] || 'custom';
  if (index >= 3) {
    // Each added account gets a new hue; never cycle through the original three.
    const hue = (42 + (index - 3) * 137.508) % 360;
    el.style.setProperty('--account-bg', `hsl(${hue} 65% 94%)`);
    el.style.setProperty('--account-accent', `hsl(${hue} 60% 85%)`);
    el.style.setProperty('--account-ink', `hsl(${hue} 35% 32%)`);
    el.style.setProperty('--account-border', `hsl(${hue} 45% 84%)`);
  } else {
    ['--account-bg', '--account-accent', '--account-ink', '--account-border'].forEach(p => el.style.removeProperty(p));
  }
}
function colourSelection() { styleAccount($('category'), $('category').value); }
$('category').addEventListener('change', colourSelection);
colourSelection();

$('add-account').onclick = () => {
  $('account-form').reset();
  $('account-error').textContent = '';
  $('account-dialog').showModal();
};
$('cancel-account').onclick = () => $('account-dialog').close();
$('account-form').onsubmit = e => {
  e.preventDefault();
  try {
    const name = $('account-name').value.trim();
    const value = $('account-balance').value.trim();
    const amount = /^0(?:\.0{1,2})?$/.test(value) ? 0 : amountInPence(value);
    if (save(createAccount(state, name, amount))) {
      $('account-dialog').close();
      $('category').value = name;
      colourSelection();
      $('accounts').lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
      notify(`${name} added.`);
    }
  } catch (error) { $('account-error').textContent = error.message; }
};

// iOS exposes navigator.standalone; other installed browsers use display-mode.
const standalone = window.matchMedia('(display-mode: standalone)');
function updateInstallButton() { $('install').hidden = standalone.matches || navigator.standalone === true; }
updateInstallButton();
standalone.addEventListener('change', updateInstallButton);
window.addEventListener('appinstalled', () => { $('install').hidden = true; });

if ('serviceWorker' in navigator) {
  let waitingWorker;
  let applyingUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (applyingUpdate) window.location.reload();
  });
  function offerUpdate(registration) {
    if (!registration.waiting || !navigator.serviceWorker.controller) return;
    waitingWorker = registration.waiting;
    $('update-banner').hidden = false;
  }
  $('apply-update').onclick = () => {
    if (!waitingWorker) return;
    applyingUpdate = true;
    $('apply-update').disabled = true;
    $('apply-update').textContent = 'Updating…';
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(registration => {
    offerUpdate(registration);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed') offerUpdate(registration);
      });
    });
    const check = () => registration.update().then(() => offerUpdate(registration)).catch(() => {});
    // Check again when returning to a Home Screen app that was left open.
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    window.addEventListener('pageshow', check);
    window.addEventListener('online', check);
    check();
  }).catch(() => {});
}

function renderBudgets() {
  const budgets = state.budgets ?? initialBudgets();
  $('budget-total').textContent = money(budgets.reduce((sum, b) => sum + b.remaining, 0));
  $('budget-empty').hidden = budgets.length > 0;
  $('budget-list').replaceChildren(...budgets.map((b, i) => {
    const card = document.createElement('button');
    card.type = 'button'; card.className = 'budget-card';
    card.style.setProperty('--budget-colour', `hsl(${(178 + i * 137.508) % 360} 65% 78%)`);
    card.innerHTML = '<span class="budget-top"><span class="budget-icon"></span><strong></strong><span class="budget-arrow" aria-hidden="true">›</span></span><span class="budget-track"><span></span></span><span class="budget-amounts"><strong></strong><span></span></span>';
    card.querySelector('.budget-icon').textContent = b.icon;
    card.querySelector('.budget-top strong').textContent = b.name;
    card.querySelector('.budget-track > span').style.width = `${b.allocated ? b.remaining / b.allocated * 100 : 0}%`;
    card.querySelector('.budget-amounts strong').textContent = `${money(b.remaining)} remaining`;
    card.querySelector('.budget-amounts > span').textContent = money(b.allocated);
    card.setAttribute('aria-label', `${b.name}, ${money(b.remaining)} remaining of ${money(b.allocated)}. Add or remove money`);
    card.onclick = () => {
      selectedBudget = b.id;
      $('budget-title').textContent = b.name;
      $('budget-remaining').textContent = `${money(b.remaining)} remaining`;
      $('budget-amount').value = '';
      $('budget-error').textContent = '';
      $('budget-dialog').showModal();
    };
    return card;
  }));
}
$('cancel-budget').onclick = () => $('budget-dialog').close();
$('budget-form').onsubmit = e => {
  e.preventDefault();
  try {
    const amount = amountInPence($('budget-amount').value.trim());
    if (save(adjustBudget(state, selectedBudget, amount, e.submitter.value))) {
      const b = state.budgets.find(b => b.id === selectedBudget);
      $('budget-remaining').textContent = `${money(b.remaining)} remaining`;
      $('budget-amount').value = '';
      $('budget-error').textContent = '';
    }
  } catch (error) { $('budget-error').textContent = error.message; }
};
$('add-budget').onclick = () => openAllocationForm();
$('cancel-new-budget').onclick = () => $('new-budget-dialog').close();
$('new-budget-form').onsubmit = e => {
  e.preventDefault();
  try {
    if (editingBudget) {
      if (save(editBudget(state, editingBudget, $('new-budget-name').value, $('new-budget-icon').value))) $('new-budget-dialog').close();
      return;
    }
    const value = $('new-budget-amount').value.trim();
    const amount = /^0(?:\.0{1,2})?$/.test(value) ? 0 : amountInPence(value);
    if (save(createBudget(state, $('new-budget-name').value, amount, $('new-budget-icon').value))) $('new-budget-dialog').close();
  } catch (error) { $('new-budget-error').textContent = error.message; }
};

$('history-toggle').onclick = () => { historyExpanded = !historyExpanded; render(); };
function openAllocationForm(budget) {
  editingBudget = budget?.id;
  $('new-budget-form').reset();
  $('new-budget-error').textContent = '';
  $('allocation-form-title').textContent = budget ? 'Edit allocation' : 'Add spending allocation';
  $('save-allocation').textContent = budget ? 'Save changes' : 'Add allocation';
  $('starting-budget-field').hidden = !!budget;
  $('new-budget-amount').required = !budget;
  if (budget) {
    $('new-budget-name').value = budget.name;
    $('new-budget-icon').value = budget.icon;
  }
  $('new-budget-dialog').showModal();
}
$('edit-budget').onclick = () => {
  const budget = (state.budgets ?? initialBudgets()).find(b => b.id === selectedBudget);
  if (!budget) return;
  $('budget-dialog').close();
  openAllocationForm(budget);
};
$('delete-budget').onclick = () => {
  const budget = (state.budgets ?? initialBudgets()).find(b => b.id === selectedBudget);
  if (budget && confirm(`Delete “${budget.name}” and its remaining ${money(budget.remaining)} allocation? Your debt balances will stay the same.`)) {
    if (save(deleteBudget(state, budget.id))) $('budget-dialog').close();
  }
};
