import { accountNames, createAccount, initialState, amountInPence, updateBalance, validState, migrateState } from './model.js';
const $ = id => document.getElementById(id);
const arrow = '<svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const key = 'balance-debt-tracker-v1';
const money = n => new Intl.NumberFormat('en-GB', {style:'currency',currency:'GBP'}).format(n/100);
let state = initialState(), action = 'pay', editing, deferredInstall;
try { const saved = localStorage.getItem(key); if (saved) { const parsed = migrateState(JSON.parse(saved)); if (!validState(parsed)) throw Error(); state = parsed; } }
catch { $('message').textContent = 'Saved data could not be loaded. Restore a backup before recording new changes.'; $('message').className = 'error'; }
function save(next) { try { localStorage.setItem(key, JSON.stringify(next)); state = next; render(); return true; } catch { notify('Could not save on this device. Free up browser storage and try again.', true); return false; } }
function notify(message, error = false) { $('message').textContent = message; $('message').className = error ? 'error' : ''; }
function render() {
  const categories = accountNames(state);
  const selected = $('category').value;
  $('category').replaceChildren(...categories.map(c => new Option(c, c)));
  if (categories.includes(selected)) $('category').value = selected;
  colourSelection();
  $('account-summary').textContent = `Across your ${categories.length} accounts`;
  $('total').textContent = money(categories.reduce((n,c) => n+state.balances[c],0));
  $('accounts').replaceChildren(...categories.map((c,i) => {
    const el = document.createElement('article'); el.className = 'account'; el.dataset.account = accountColour(c);
    el.innerHTML = `<div class="account-top"><span class="account-icon"></span><span class="account-name"></span></div><h3>${money(state.balances[c])}</h3><p>Left to pay</p><button type="button">Set balance ${arrow}</button>`;
    el.querySelector('.account-name').textContent = c;
    el.querySelector('.account-icon').textContent = c[0].toUpperCase();
    el.querySelector('button').setAttribute('aria-label', `Set ${c} balance`);
    el.querySelector('button').onclick = () => {editing = c; $('dialog-title').textContent = `Set ${c} balance`; $('balance-input').value = (state.balances[c]/100).toFixed(2); $('balance-error').textContent = ''; $('balance-dialog').showModal();};
    return el;
  }));
  $('count').textContent = `${state.history.length} updates`;
  $('history').replaceChildren();
  if (!state.history.length) { $('history').innerHTML = '<div class="empty"><span class="empty-icon"><svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></span><strong>A fresh start.</strong><br>Set your balances above, then record<br>your first update here.</div>'; return; }
  state.history.slice(0,8).forEach((h,i) => {
    const el = document.createElement('div'); el.className='activity'; el.dataset.account = accountColour(h.category);
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

function accountColour(name) { return ['flex', 'lloyds', 'klarna'][accountNames(state).indexOf(name) % 3]; }
function colourSelection() { $('category').dataset.account = accountColour($('category').value); }
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
