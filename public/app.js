const $app = document.getElementById('app');
let menu = null, menuJson = '', cart = JSON.parse(localStorage.getItem('cart') || '{}'), view = 'menu', activeCat = null, order = null;
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

// ---------- content shown around the menu ----------
// [file in /img/posters, title, category key it belongs to]
const POSTERS = [
  ['sizzling-burger', 'Sizzling Cheese Burgers', 'burgers'],
  ['sizzling-brownie', 'Sizzling Brownie', 'desserts'],
  ['rolls', 'Rolls', 'rolls'],
  ['mug-cakes', 'Mug Cakes', 'desserts'],
  ['chocolate-bowls', 'Chocolate Bowls', 'desserts'],
  ['loaded-fries', 'Loaded Fries', 'fries'],
  ['cheese-garlic-bun', 'Cheese Garlic Bun', 'sides'],
  ['sandwiches', 'Sandwiches', 'sandwiches'],
  ['menu-sandwich-pasta-burgers', 'Sandwich · Pasta · Burgers', 'sandwiches'],
  ['menu-maggi-fries-sides', 'Maggi · Fries · Sides', 'maggi'],
  ['menu-rolls-pulav', 'Rolls · Tava Pulav & Rice', 'rolls'],
  ['menu-desserts', 'Desserts & Ice Cream', 'desserts'],
  ['menu-tea-coffee-mojito', 'Tea · Coffee · Mojito', 'tea'],
];
const posterSize = (f) => (f === 'menu-maggi-fries-sides' || f === 'menu-tea-coffee-mojito' ? [1280, 853] : [900, 1350]);
const CAT_EMOJI = { rolls: '🌯', 'tava pulav & rice': '🍛', sandwiches: '🥪', pasta: '🍝', burgers: '🍔', maggi: '🍜', fries: '🍟', sides: '🧀', desserts: '🍰', 'ice cream': '🍦', tea: '🍵', coffee: '☕', mojito: '🍹' };
const emoji = (c) => CAT_EMOJI[c.name.toLowerCase()] || '🍽️';
const RIBBON = ['Good Food', 'Good Mood', 'Sip', 'Relax', 'Repeat', 'Freshly Made with Love', 'Good Food Always'];

// price with the regular price struck through when the item has an active offer
const priceHtml = (it) => it.origPrice ? `<s>${cur()}${it.origPrice}</s> <b>${cur()}${it.price}</b>` : `${cur()}${it.price}`;
const badgeCls = (b) => (b === 'NEW' ? 'new' : b === 'LIMITED TIME' ? 'limited' : '');
const offerBadge = (it) => it.offer ? `<span class="obadge ${badgeCls(it.offer.badge)}">${esc(it.offer.badge)}</span>` : '';

const img = (it, cls = 'ph', pill = false) =>
  `<div class="${cls}" data-open="${it.id}">🍽️${it.image ? `<img src="${esc(it.image)}" alt="${esc(it.name)}" loading="lazy" decoding="async" onerror="this.remove()">` : ''}${offerBadge(it)}${pill ? `<span class="pill ${it.origPrice ? 'has-off' : ''}">${priceHtml(it)}</span>` : ''}</div>`;

function setQty(id, d) {
  cart[id] = Math.max(0, (cart[id] || 0) + d);
  if (!cart[id]) delete cart[id];
  saveCart();
  if (view === 'menu') return refreshMenuUI(id, d > 0);
  render();
}
function go(v) { view = v; window.scrollTo(0, 0); render(); }

function ctrl(it) {
  if (!it.available) return '<span class="tag">Unavailable</span>';
  return cart[it.id]
    ? `<div class="qty"><button data-q="${it.id}" data-d="-1" aria-label="Remove one">−</button><b>${cart[it.id]}</b><button data-q="${it.id}" data-d="1" aria-label="Add one">+</button></div>`
    : `<button class="add" data-q="${it.id}" data-d="1">Add +</button>`;
}

// update just the controls + cart bar (no re-render, so scroll/search/animations stay put)
function barHtml(bump) {
  const n = cartCount();
  return n ? `<button class="bar" data-go="cart"><span>🛒 <span class="cnt ${bump ? 'bump' : ''}">${n}</span> item${n > 1 ? 's' : ''}</span><span>View cart · ${cur()}${cartTotal()}</span></button>` : '';
}
function refreshMenuUI(id, pop) {
  const it = item(id);
  document.querySelectorAll(`[data-ctl="${id}"]`).forEach((el) => {
    el.innerHTML = ctrl(it);
    if (pop) el.firstElementChild.classList.add('pop');
  });
  const bw = document.getElementById('barwrap');
  if (bw) {
    const had = !!bw.firstElementChild;
    bw.innerHTML = barHtml(true);
    if (had && bw.firstElementChild) bw.firstElementChild.style.animation = 'none';
  }
}

function card(it, i) {
  const nv = /chicken|egg/i.test(it.name), v = !nv && /paneer|veg/i.test(it.name);
  return `<div class="card rv ${it.available ? '' : 'off'}" style="--d:${(i % 3) * 70}ms" data-name="${esc((it.name + ' ' + it.description).toLowerCase())}">
    ${img(it, 'ph', true)}<div class="b"><div class="name" data-open="${it.id}">${nv || v ? `<span class="dot ${nv ? 'nv' : 'v'}" title="${nv ? 'Non-veg' : 'Veg'}"></span>` : ''}<span>${esc(it.name)}</span></div>
    ${it.description ? `<div class="desc">${esc(it.description)}</div>` : ''}
    <div class="row"><span class="ctl" data-ctl="${it.id}">${ctrl(it)}</span></div></div></div>`;
}

// active offers, set by the owner in Admin > Offers (the server already applied the offer price)
function offersSection() {
  const list = menu.items.filter((i) => i.offer);
  if (!list.length) return '';
  return `<section class="offers-sec" id="offers"><div class="off-h"><div class="kick">Limited · Special</div><h2>🎁 Today's Offers</h2></div>
    <div class="off-rail">${list.map((it) => `<div class="ocard ${it.available ? '' : 'off'}">${img(it, 'ph')}
      <div class="ob"><div class="name" data-open="${it.id}"><span>${esc(it.offer.title || it.name)}</span></div>
      ${it.offer.title ? `<div class="desc">${esc(it.name)}</div>` : ''}
      <div class="oprice"><s>${cur()}${it.origPrice}</s><b>${cur()}${it.price}</b><em>${Math.round((1 - it.price / it.origPrice) * 100)}% OFF</em></div>
      ${it.offer.endDate ? `<div class="until">Till ${esc(new Date(it.offer.endDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }))}</div>` : ''}
      <span class="ctl" data-ctl="${it.id}">${ctrl(it)}</span></div></div>`).join('')}</div></section>`;
}

function bestSellers() {
  return `<section class="best" id="best"><div class="best-h"><div class="kick">Loved by everyone</div>
    <h2><span class="st">✦</span> Our Best Sellers <span class="st">✦</span></h2><p>Swipe through our favourites · tap a poster to see it big</p></div>
    <div class="rail-wrap"><button class="railbtn l" data-rail="-1" aria-label="Previous">‹</button><button class="railbtn r" data-rail="1" aria-label="Next">›</button>
    <div class="rail" id="rail">${POSTERS.map(([f, t], i) => { const [w, h] = posterSize(f);
      return `<button class="poster" data-poster="${i}" aria-label="${esc(t)}"><span class="badge2">★ ${i < 8 ? 'Best Seller' : 'Menu'}</span><img src="/img/posters/${f}.webp" alt="${esc(t)}" width="${w}" height="${h}" ${i > 2 ? 'loading="lazy"' : ''} decoding="async"></button>`; }).join('')}</div></div></section>`;
}

function highlights(s, cats) {
  const owner = esc(s.ownerName || 'Akshay Khaire');
  return `<section class="hl"><h2>Café Highlights</h2><div class="hlgrid">
    <div class="hlc owner"><span class="ic">👨‍🍳</span><div><small>Café owner</small><b>${owner}</b><small>Welcome to Magic Brew – we hope every visit feels a little magical.</small></div></div>
    <div class="hlc p1"><span class="ic">🍽️</span><b>${menu.items.length} treats</b><small>Across ${cats.length} categories, from chai to sizzlers.</small></div>
    <div class="hlc p2"><span class="ic">💛</span><b>Made with love</b><small>Freshly made, just for you.</small></div>
    <div class="hlc p3"><span class="ic">☕</span><b>Sip · Relax · Repeat</b><small>Good food, good mood.</small></div>
    <div class="hlc p4"><span class="ic">📱</span><b>Order from your phone</b><small>Add to cart, place your order${s.hasUpi ? ' and pay with UPI' : ''}.</small></div>
  </div></section>`;
}

function menuView() {
  const s = menu.settings;
  const cats = menu.categories.filter((c) => menu.items.some((i) => i.categoryId === c.id));
  const track = localStorage.getItem('lastOrder') ? `<a href="#" class="line2" data-track>📦 Track my order</a>` : '';
  const rib = RIBBON.map((t) => `<span>${t}</span><span>✦</span>`).join('');
  return `<div class="hero"><span class="float f1">☕</span><span class="float f2">🌿</span><span class="float f3">🍰</span><span class="float f4">🍃</span>
    <img class="logo" src="/img/logo.webp" alt="${esc(s.cafeName)} logo" width="711" height="400" fetchpriority="high">
    <h1>${esc(s.cafeName)}</h1><p class="tag2">${esc(s.tagline)}</p>
    <div class="cta"><a href="#" class="gold" data-jump="menu-start">Explore the menu ↓</a><a href="#" class="line2" data-jump="best">★ Best sellers</a>${track}</div></div>
  <div class="ribbon" aria-hidden="true"><div>${rib}${rib}</div></div>
  <main>${offersSection()}${bestSellers()}${highlights(s, cats)}</main>
  <div class="searchbox" id="menu-start"><input id="q" type="search" placeholder="Search the menu…" aria-label="Search the menu" autocomplete="off"></div>
  <div class="tabs" id="tabs">${cats.map((c) => `<button class="tab ${activeCat === c.id ? 'on' : ''}" data-cat="${c.id}">${emoji(c)} ${esc(c.name)}</button>`).join('')}</div>
  <main id="menu">${cats.map((c) => `<section class="sec" id="cat-${c.id}"><h2 class="sec-h"><span class="em">${emoji(c)}</span>${esc(c.name)}</h2><div class="grid">
    ${menu.items.filter((i) => i.categoryId === c.id).map(card).join('')}</div></section>`).join('')}
    <div class="empty" id="noresult" hidden><div class="big">🔎</div><p>Nothing matches that. Try another word!</p></div></main>
  <footer class="foot"><img src="/img/logo.webp" alt="" width="711" height="400" loading="lazy"><div class="script">Good Food Always</div>
    <p>Owner · <b>${esc(s.ownerName || 'Akshay Khaire')}</b></p><p>Sip · Relax · Repeat ♥</p></footer>
  <button id="totop" aria-label="Back to top">↑</button><div id="barwrap">${barHtml()}</div>`;
}

// ---------- menu behaviour (runs after every menu render) ----------
let observers = [];
function afterMenu() {
  observers.forEach((o) => o.disconnect());
  observers = [];
  const cards = [...document.querySelectorAll('.card.rv')];
  if (!('IntersectionObserver' in window)) { cards.forEach((c) => c.classList.add('in')); return; }
  const rv = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
  cards.forEach((c) => rv.observe(c));
  const secs = [...document.querySelectorAll('.sec')];
  const vis = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('vis'); vis.unobserve(e.target); } }), { threshold: 0.15 });
  const spy = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setActive(e.target.id.slice(4)); }), { rootMargin: '-30% 0px -65% 0px' });
  secs.forEach((s) => { vis.observe(s); spy.observe(s); });
  observers.push(rv, vis, spy);
}
function setActive(id) {
  if (activeCat === id) return;
  activeCat = id;
  const tabs = document.getElementById('tabs');
  if (!tabs) return;
  tabs.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.cat === id;
    t.classList.toggle('on', on);
    if (on) tabs.scrollTo({ left: t.offsetLeft - (tabs.clientWidth - t.offsetWidth) / 2, behavior: 'smooth' });
  });
}
function filterMenu(q) {
  q = q.trim().toLowerCase();
  let any = false;
  document.querySelectorAll('#menu .sec').forEach((sec) => {
    let n = 0;
    sec.querySelectorAll('.card').forEach((c) => { const ok = !q || c.dataset.name.includes(q); c.hidden = !ok; if (ok) n++; });
    sec.hidden = !n;
    if (n) any = true;
  });
  document.getElementById('noresult').hidden = any;
}
const scrollToEl = (el) => el && el.scrollIntoView({ behavior: 'smooth', block: 'start' });

// ---------- poster lightbox ----------
let lbIndex = -1;
function closeLB() { document.querySelector('.lb')?.remove(); document.body.style.overflow = ''; lbIndex = -1; }
function openLB(i) {
  const n = POSTERS.length;
  i = (i + n) % n;
  const [f, t, cat] = POSTERS[i];
  const target = document.getElementById('cat-c-' + cat);
  document.querySelector('.lb')?.remove();
  const el = document.createElement('div');
  el.className = 'lb';
  el.innerHTML = `<button class="x" data-lb="x" aria-label="Close">✕</button><button class="nav p" data-lb="p" aria-label="Previous">‹</button><button class="nav n" data-lb="n" aria-label="Next">›</button>
    <div class="stage" data-lb="x"><img src="/img/posters/${f}.webp" alt="${esc(t)}"></div>
    <div class="cap"><b>${esc(t)}</b>${target ? `<a href="#" data-lb="see" data-target="${target.id}">Order from the menu ↓</a>` : ''}<span class="cnt2">${i + 1} / ${n}</span></div>`;
  let x0 = null;
  el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) openLB(lbIndex + (dx < 0 ? 1 : -1)); });
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  lbIndex = i;
  [i + 1, i - 1].forEach((j) => { new Image().src = `/img/posters/${POSTERS[(j + n) % n][0]}.webp`; });
}

function itemModal(id) {
  const it = item(id);
  if (!it) return;
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="sheet">${img(it)}<div class="in"><h2>${esc(it.name)}</h2>
    <p style="color:var(--muted)">${esc(it.description) || 'Freshly prepared at Magic Brew.'}</p>
    <div class="row" style="margin-top:14px"><span class="price mprice" style="font-size:1.3rem">${priceHtml(it)}</span><span id="mc" data-ctl="${it.id}">${ctrl(it)}</span></div></div></div>`;
  m.onclick = (e) => {
    if (e.target === m) return m.remove();
    const b = e.target.closest('[data-q]');
    if (b) { e.stopPropagation(); setQty(b.dataset.q, +b.dataset.d); }
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
  if (view === 'menu') afterMenu();
}

document.addEventListener('click', (e) => {
  if (e.target.closest('.modal')) return;
  const lb = e.target.closest('[data-lb]');
  if (lb) {
    e.preventDefault();
    const k = lb.dataset.lb;
    if (k === 'x') { if (e.target === lb || lb.classList.contains('x')) closeLB(); return; }
    if (k === 'p') return openLB(lbIndex - 1);
    if (k === 'n') return openLB(lbIndex + 1);
    if (k === 'see') { const id = lb.dataset.target; closeLB(); return scrollToEl(document.getElementById(id)); }
  }
  if (e.target.id === 'totop') return window.scrollTo({ top: 0, behavior: 'smooth' });
  const t = e.target.closest('[data-q],[data-go],[data-cat],[data-open],[data-track],[data-poster],[data-rail],[data-jump],#place,#paid');
  if (!t) return;
  if (t.dataset.q) return setQty(t.dataset.q, +t.dataset.d);
  if (t.dataset.open) return itemModal(t.dataset.open);
  if (t.dataset.poster !== undefined) return openLB(+t.dataset.poster);
  if (t.dataset.rail) { const r = document.getElementById('rail'); return r.scrollBy({ left: +t.dataset.rail * r.clientWidth * 0.8, behavior: 'smooth' }); }
  if (t.dataset.jump) { e.preventDefault(); return scrollToEl(document.getElementById(t.dataset.jump)); }
  if (t.dataset.cat) {
    const q = document.getElementById('q');
    if (q && q.value) { q.value = ''; filterMenu(''); }
    setActive(t.dataset.cat);
    return scrollToEl(document.getElementById('cat-' + t.dataset.cat));
  }
  if (t.dataset.track !== undefined) { e.preventDefault(); order = { id: localStorage.getItem('lastOrder') }; return go('status'); }
  if (t.dataset.go) { e.preventDefault(); return go(t.dataset.go); }
  if (t.id === 'place') return placeOrder();
  if (t.id === 'paid') return markPaid();
});
document.addEventListener('input', (e) => { if (e.target.id === 'q') filterMenu(e.target.value); });
document.addEventListener('keydown', (e) => {
  if (lbIndex < 0) return;
  if (e.key === 'Escape') closeLB();
  else if (e.key === 'ArrowRight') openLB(lbIndex + 1);
  else if (e.key === 'ArrowLeft') openLB(lbIndex - 1);
});
window.addEventListener('scroll', () => {
  const b = document.getElementById('totop');
  if (b) b.classList.toggle('show', window.scrollY > 900);
}, { passive: true });

api('/api/menu')
  .then((m) => { menu = m; menuJson = JSON.stringify(m); document.title = m.settings.cafeName; render(); })
  .catch((e) => { $app.innerHTML = `<p class="err" style="padding:20px">Could not load menu: ${esc(e.message)}</p>`; });

// Pick up owner menu changes without a manual reload (only re-renders when something actually changed)
setInterval(async () => {
  if (view === 'menu' && !document.querySelector('.modal, .lb')) {
    try {
      const m = await api('/api/menu'), j = JSON.stringify(m);
      if (j === menuJson) return;
      const q = document.getElementById('q')?.value || '';
      menu = m; menuJson = j; render();
      if (q) { document.getElementById('q').value = q; filterMenu(q); }
    } catch {}
  }
}, 30000);
