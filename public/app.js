const $app = document.getElementById('app');
let menu = null, cart = JSON.parse(localStorage.getItem('cart') || '{}'), view = 'menu', activeCat = null, order = null;
let form = { name: localStorage.getItem('cname') || '', mobile: localStorage.getItem('cmobile') || '', notes: '' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cur = () => menu.settings.currency;
const api = async (url, opt) => {
  const r = await fetch(url, opt);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
};
const post = (url, body) => api(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const saveCart = () => localStorage.setItem('cart', JSON.stringify(cart));
const item = (id) => menu.items.find((i) => i.id === id);
const cartLines = () => Object.entries(cart).map(([id, qty]) => ({ it: item(id), qty })).filter((l) => l.it && l.it.available);
const cartCount = () => cartLines().reduce((s, l) => s + l.qty, 0);
const cartTotal = () => cartLines().reduce((s, l) => s + l.qty * l.it.price, 0);
const img = (it, cls = 'ph') =>
  `<div class="${cls}" ${it.image ? `style="background-image:url('${esc(it.image)}')"` : ''} data-open="${it.id}">${it.image ? '' : '🍽️'}</div>`;

function setQty(id, d) {
  cart[id] = Math.max(0, (cart[id] || 0) + d);
  if (!cart[id]) delete cart[id];
  saveCart();
  render();
}
function go(v) { view = v; window.scrollTo(0, 0); render(); }

function ctrl(it) {
  if (!it.available) return '<span class="tag">Unavailable</span>';
  return cart[it.id]
    ? `<div class="qty"><button data-q="${it.id}" data-d="-1">−</button><b>${cart[it.id]}</b><button data-q="${it.id}" data-d="1">+</button></div>`
    : `<button class="add" data-q="${it.id}" data-d="1">Add</button>`;
}

function menuView() {
  const s = menu.settings;
  const cats = menu.categories.filter((c) => menu.items.some((i) => i.categoryId === c.id));
  const bar = cartCount()
    ? `<button class="bar" data-go="cart"><span>🛒 ${cartCount()} item${cartCount() > 1 ? 's' : ''}</span><span>View cart · ${cur()}${cartTotal()}</span></button>`
    : '';
  const track = localStorage.getItem('lastOrder')
    ? `<p class="center" style="margin:10px 0 0"><a href="#" data-track style="color:#f6e7cf;font-size:.85rem">Track my last order</a></p>` : '';
  return `<div class="hero"><h1>${esc(s.cafeName)}</h1><p>${esc(s.tagline)}</p>${track}</div>
  <div class="tabs">${cats.map((c) => `<button class="tab ${activeCat === c.id ? 'on' : ''}" data-cat="${c.id}">${esc(c.name)}</button>`).join('')}</div>
  <main>${cats.map((c) => `<section class="sec" id="cat-${c.id}"><h2>${esc(c.name)}</h2><div class="grid">
    ${menu.items.filter((i) => i.categoryId === c.id).map((it) =>
      `<div class="card ${it.available ? '' : 'off'}">${img(it)}<div class="b"><div class="name">${esc(it.name)}</div><div class="row"><span class="price">${cur()}${it.price}</span>${ctrl(it)}</div></div></div>`).join('')}
  </div></section>`).join('')}</main>${bar}`;
}

function itemModal(id) {
  const it = item(id);
  if (!it) return;
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="sheet">${img(it)}<div class="in"><h2>${esc(it.name)}</h2>
    <p style="color:var(--muted)">${esc(it.description) || 'Freshly prepared at Magic Brew.'}</p>
    <div class="row" style="margin-top:14px"><span class="price" style="font-size:1.3rem">${cur()}${it.price}</span><span id="mc">${ctrl(it)}</span></div></div></div>`;
  m.onclick = (e) => {
    if (e.target === m) return m.remove();
    const b = e.target.closest('[data-q]');
    if (b) { e.stopPropagation(); setQty(b.dataset.q, +b.dataset.d); m.querySelector('#mc').innerHTML = ctrl(it); }
  };
  document.body.appendChild(m);
}

function cartView() {
  const ls = cartLines();
  if (!ls.length) return `<div class="page"><button class="back" data-go="menu">← Menu</button><div class="center panel"><div class="big">🛒</div><p>Your cart is empty</p></div></div>`;
  return `<div class="page"><button class="back" data-go="menu">← Menu</button><h2>Your Cart</h2>
  <div class="panel">${ls.map(({ it, qty }) => `<div class="line"><div><div class="name">${esc(it.name)}</div><small>${cur()}${it.price} each</small></div>
    <div class="qty"><button data-q="${it.id}" data-d="-1">−</button><b>${qty}</b><button data-q="${it.id}" data-d="1">+</button></div><b>${cur()}${it.price * qty}</b></div>`).join('')}
  <div class="line total"><span>Total</span><span>${cur()}${cartTotal()}</span></div></div>
  <button class="primary" data-go="details">Continue</button></div>`;
}

function detailsView(err = '') {
  return `<div class="page"><button class="back" data-go="cart">← Cart</button><h2>Your Details</h2>
  <div class="panel"><label>Name</label><input id="f-name" value="${esc(form.name)}" autocomplete="name" placeholder="Your name">
  <label>Mobile number</label><input id="f-mobile" value="${esc(form.mobile)}" inputmode="numeric" maxlength="10" autocomplete="tel" placeholder="10-digit mobile">
  <label>Notes for the kitchen (optional)</label><textarea id="f-notes" rows="2" placeholder="Less spicy, table no. etc.">${esc(form.notes)}</textarea></div>
  <div class="panel"><b>Order summary</b>${cartLines().map(({ it, qty }) => `<div class="line"><span>${qty} × ${esc(it.name)}</span><span>${cur()}${it.price * qty}</span></div>`).join('')}
  <div class="line total"><span>Total</span><span>${cur()}${cartTotal()}</span></div></div>
  <div class="err" id="err">${esc(err)}</div><button class="primary" id="place">Place Order · ${cur()}${cartTotal()}</button></div>`;
}

async function placeOrder() {
  form = { name: document.getElementById('f-name').value, mobile: document.getElementById('f-mobile').value, notes: document.getElementById('f-notes').value };
  const btn = document.getElementById('place');
  btn.disabled = true;
  btn.textContent = 'Placing…';
  try {
    const d = await post('/api/orders', { ...form, cart: cartLines().map((l) => ({ id: l.it.id, qty: l.qty })) });
    localStorage.setItem('cname', form.name);
    localStorage.setItem('cmobile', form.mobile);
    localStorage.setItem('lastOrder', d.order.id);
    order = d.order; cart = {}; saveCart(); window.__wa = d;
    go('confirm');
  } catch (e) { $app.innerHTML = detailsView(e.message); }
}

function orderSummary(o) {
  return `<div class="panel">${o.items.map((i) => `<div class="line"><span>${i.qty} × ${esc(i.name)}</span><span>${cur()}${i.price * i.qty}</span></div>`).join('')}
  <div class="line total"><span>Total</span><span>${cur()}${o.total}</span></div></div>`;
}
const waBtn = (href, label) =>
  `<a class="ghost" style="display:block;text-align:center;text-decoration:none;margin-bottom:10px" href="${esc(href)}" target="_blank" rel="noopener">📲 ${label}</a>`;

function confirmView() {
  const d = window.__wa || {};
  const wa = !d.whatsappSent && d.whatsappLink ? waBtn(d.whatsappLink, 'Send order to café on WhatsApp') : '';
  return `<div class="page center"><div class="big">✅</div><h2>Order Placed!</h2><p>Order <b>#${order.id}</b> for ${esc(order.customer.name)}</p>
  <div style="text-align:left">${orderSummary(order)}</div>${wa}
  <button class="primary" data-go="pay">Pay the Bill · ${cur()}${order.total}</button>
  <p><a href="#" data-go="status">View order status</a> · <a href="#" data-go="menu">Back to menu</a></p></div>`;
}

async function payView() {
  $app.innerHTML = '<div class="page center"><p>Loading payment…</p></div>';
  const p = await api(`/api/orders/${order.id}/pay`);
  const qr = p.uploadedQr || p.qr;
  const body = qr
    ? `<img class="qrimg" src="${esc(qr)}" alt="Payment QR">
      <p style="margin:8px 0"><b>${cur()}${order.total}</b> to ${esc(menu.settings.upiName)}</p>
      ${p.upiLink ? `<a class="primary" style="display:block;text-decoration:none;margin-bottom:10px" href="${esc(p.upiLink)}">Pay with UPI app</a>` : ''}
      ${p.upiId ? `<small style="color:var(--muted)">UPI ID: ${esc(p.upiId)}</small>` : ''}`
    : `<p>The café hasn't set up online payment yet. Please pay at the counter.</p>`;
  $app.innerHTML = `<div class="page center"><button class="back" style="float:left" data-go="confirm">← Back</button><h2 style="clear:both">Pay the Bill</h2>
  <div class="panel">${body}</div>
  <div class="panel" style="text-align:left"><b>Paid already?</b><label>UPI transaction / reference ID (optional)</label><input id="txn" placeholder="e.g. 4128XXXXXXXX"><br><br>
  <button class="primary" id="paid">I've paid</button></div></div>`;
}

async function markPaid() {
  const btn = document.getElementById('paid');
  btn.disabled = true;
  try {
    const d = await post(`/api/orders/${order.id}/payment`, { txnId: document.getElementById('txn').value });
    order = d.order; window.__wa = d;
    go('status');
  } catch (e) { alert(e.message); btn.disabled = false; }
}

async function statusView() {
  try { order = (await api(`/api/orders/${order.id}`)).order; }
  catch (e) { localStorage.removeItem('lastOrder'); return go('menu'); }
  const d = window.__wa || {};
  const st = { new: 'Received', preparing: 'Being prepared 👨‍🍳', ready: 'Ready 🎉', completed: 'Completed', cancelled: 'Cancelled' }[order.status];
  const ps = order.payment.status;
  $app.innerHTML = `<div class="page"><button class="back" data-go="menu">← Menu</button><h2>Order #${order.id}</h2>
  <div class="panel"><div class="line"><span>Order status</span><span class="badge">${st}</span></div>
  <div class="line"><span>Payment</span><span class="badge ${ps === 'paid' ? 'ok' : ''}">${ps === 'paid' ? 'Paid ✓' : ps === 'reported' ? 'Awaiting café confirmation' : 'Unpaid'}</span></div>
  ${order.payment.txnId ? `<div class="line"><span>Transaction ID</span><span>${esc(order.payment.txnId)}</span></div>` : ''}</div>
  ${orderSummary(order)}
  ${ps === 'reported' && d.whatsappLink && !d.whatsappSent ? waBtn(d.whatsappLink, 'Send payment details to café on WhatsApp') : ''}
  ${ps === 'unpaid' ? '<button class="primary" data-go="pay">Pay the Bill</button>' : ''}
  <button class="ghost" style="margin-top:10px" data-go="status">Refresh</button></div>`;
}

function render() {
  if (view === 'pay') return payView();
  if (view === 'status') return statusView();
  $app.innerHTML = { menu: menuView, cart: cartView, details: detailsView, confirm: confirmView }[view]();
}

document.addEventListener('click', (e) => {
  if (e.target.closest('.modal')) return;
  const t = e.target.closest('[data-q],[data-go],[data-cat],[data-open],[data-track],#place,#paid');
  if (!t) return;
  if (t.dataset.q) return setQty(t.dataset.q, +t.dataset.d);
  if (t.dataset.open) return itemModal(t.dataset.open);
  if (t.dataset.cat) {
    activeCat = t.dataset.cat;
    return document.getElementById('cat-' + activeCat).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (t.dataset.track !== undefined) { e.preventDefault(); order = { id: localStorage.getItem('lastOrder') }; return go('status'); }
  if (t.dataset.go) { e.preventDefault(); return go(t.dataset.go); }
  if (t.id === 'place') return placeOrder();
  if (t.id === 'paid') return markPaid();
});

api('/api/menu')
  .then((m) => { menu = m; document.title = m.settings.cafeName; render(); })
  .catch((e) => { $app.innerHTML = `<p class="err" style="padding:20px">Could not load menu: ${esc(e.message)}</p>`; });

// Pick up owner menu changes without a manual reload
setInterval(async () => {
  if (view === 'menu' && !document.querySelector('.modal')) {
    try { menu = await api('/api/menu'); render(); } catch {}
  }
}, 30000);
