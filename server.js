const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { MENU_VERSION, OWNER_NAME, buildMenu, applyMenu } = require('./menu-data');

const PORT = process.env.PORT || 3000;
// Orders are sent to the owner's WhatsApp (one chat) via the WhatsApp Cloud API (Meta). Free-form messages only reach the owner while
// the owner has messaged the business number in the last 24h; set WHATSAPP_TEMPLATE (an approved template with ONE body variable) to
// reach them outside that window.
const WA_TOKEN = process.env.WHATSAPP_TOKEN || '', WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
const WA_TEMPLATE = process.env.WHATSAPP_TEMPLATE || '', WA_LANG = process.env.WHATSAPP_TEMPLATE_LANG || 'en';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'magicbrew123';


const DATA_FILE = path.join(__dirname, 'data', 'db.json');
const UPLOADS = path.join(__dirname, 'uploads');

// ---------- tiny JSON "database" ----------
function seed() {
  return {
    settings: {
      cafeName: 'Magic Brew Café & More', tagline: 'Brewed with magic', ownerName: OWNER_NAME,
      ownerMobile: '', upiId: '', upiName: 'Magic Brew Cafe',
      publicUrl: '', paymentQrImage: '', currency: '₹',
    },
    ...buildMenu(), menuVersion: MENU_VERSION,
    orders: [], nextOrderId: 1001,
  };
}
// Storage: on Vercel (no writable disk) data lives in Upstash Redis (REST) and photos in Vercel Blob.
// Locally it falls back to data/db.json and uploads/.
// Vercel integrations may add a custom prefix (e.g. STORAGE_KV_REST_API_URL), so match by suffix.
const envBy = (re) => { const k = Object.keys(process.env).find((n) => re.test(n) && process.env[n]); return k ? process.env[k] : ''; };
const REDIS_URL = envBy(/(^|_)(KV_REST_API_URL|UPSTASH_REDIS_REST_URL)$/);
const REDIS_TOKEN = envBy(/(^|_)(KV_REST_API_TOKEN|UPSTASH_REDIS_REST_TOKEN)$/);
const BLOB_TOKEN = envBy(/(^|_)BLOB_READ_WRITE_TOKEN$/);
const REMOTE = !!(REDIS_URL && REDIS_TOKEN);
const DB_KEY = 'magicbrew:db';
const redis = async (cmd) => {
  const r = await fetch(REDIS_URL, { method: 'POST', headers: { Authorization: `Bearer ${REDIS_TOKEN}` }, body: JSON.stringify(cmd) });
  const d = await r.json();
  if (!r.ok || d.error) throw new Error('Redis: ' + (d.error || r.status));
  return d.result;
};

let db = null, dirty = false;
async function loadDb() {
  if (process.env.VERCEL && !REMOTE) throw new Error('Database not connected: add Upstash Redis under Vercel > Storage and redeploy');
  if (REMOTE) {
    const raw = await redis(['GET', DB_KEY]);
    db = raw ? JSON.parse(raw) : seed();
    if (!raw || applyMenu(db)) { dirty = true; await persist(); }
  } else if (!db) {
    const loaded = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : seed();
    db = loaded; applyMenu(db); dirty = true; await persist();
  }
}
async function persist() {
  if (!dirty) return;
  dirty = false;
  if (REMOTE) return void (await redis(['SET', DB_KEY, JSON.stringify(db)]));
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}
const save = () => { dirty = true; };   // flushed just before each response is sent
const uid = (p) => p + crypto.randomBytes(4).toString('hex');

// ---------- app ----------
const app = express();
app.use(express.json());
app.use('/uploads', express.static(UPLOADS));
app.use(express.static(path.join(__dirname, 'public')));

// load fresh data per request; write changes back before the response goes out
app.use('/api', async (req, res, next) => {
  try {
    await loadDb();
    if (db.pushSubs || db.vapid) { delete db.pushSubs; delete db.vapid; dirty = true; }
    if (db.settings.ownerWhatsApp !== undefined) { db.settings.ownerMobile = db.settings.ownerMobile || db.settings.ownerWhatsApp; delete db.settings.ownerWhatsApp; dirty = true; }
    const json = res.json.bind(res);
    res.json = (body) => { persist().then(() => json(body), (e) => { console.error(e); res.status(500); json({ error: 'Could not save changes' }); }); return res; };
    next();
  } catch (e) { console.error(e); res.status(500).json({ error: 'Storage unavailable: ' + e.message }); }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_, f, cb) => cb(null, /^image\//.test(f.mimetype)),
});
// returns the public URL of the stored image
async function storeImage(file) {
  const name = Date.now() + '-' + crypto.randomBytes(3).toString('hex') + (path.extname(file.originalname).toLowerCase() || '.jpg');
  if (BLOB_TOKEN) {
    const { put } = require('@vercel/blob');
    return (await put('menu/' + name, file.buffer, { access: 'public', contentType: file.mimetype, token: BLOB_TOKEN })).url;
  }
  if (REMOTE) throw new Error('Image storage not configured (add a Vercel Blob store)');
  fs.mkdirSync(UPLOADS, { recursive: true });
  fs.writeFileSync(path.join(UPLOADS, name), file.buffer);
  return '/uploads/' + name;
}

// Stateless signed login tokens (serverless instances don't share memory)
const SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('mb|' + ADMIN_PASSWORD).digest('hex');
const sign = (exp) => crypto.createHmac('sha256', SECRET).update(String(exp)).digest('hex');
const newToken = (hours = 12) => { const exp = Date.now() + hours * 3600 * 1000; return exp + '.' + sign(exp); };
function validToken(t) {
  const [exp, sig] = String(t).split('.');
  if (!exp || !sig || +exp < Date.now()) return false;
  const good = Buffer.from(sign(exp)), got = Buffer.from(sig);
  return good.length === got.length && crypto.timingSafeEqual(good, got);
}
function auth(req, res, next) {
  if (!validToken((req.headers.authorization || '').replace('Bearer ', ''))) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Private sign-in link for the owner: derived from the Redis token and printed only in the Vercel
// runtime logs (visible to the project owner). Turn off with ADMIN_MAGIC_LINK=off.
const MAGIC = REMOTE && process.env.ADMIN_MAGIC_LINK !== 'off'
  ? crypto.createHmac('sha256', REDIS_TOKEN).update('admin-magic-link').digest('hex').slice(0, 40) : '';
if (MAGIC && process.env.VERCEL) {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  console.log('ADMIN SIGN-IN LINK: https://' + host + '/admin.html?key=' + MAGIC);
}
app.post('/api/admin/key-login', (req, res) => {
  const a = Buffer.from(String(req.body.key || '')), b = Buffer.from(MAGIC);
  if (!MAGIC || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Invalid link' });
  res.json({ token: newToken() });
});
// One-tap login from the notification link: the link carries a signature bound to that order id.
const orderSig = (id) => crypto.createHmac('sha256', SECRET).update('order-link|' + id).digest('hex').slice(0, 32);
app.post('/api/admin/order-login', (req, res) => {
  const a = Buffer.from(String(req.body.sig || '')), b = Buffer.from(orderSig(+req.body.order || 0));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Invalid link' });
  res.json({ token: newToken() });
});
// Email login code (free via Resend). Code is emailed only to OWNER_EMAIL; the server keeps no state —
// the challenge is a signed expiry + hash of the code.
const RESEND_KEY = process.env.RESEND_API_KEY || '', OWNER_EMAIL = process.env.OWNER_EMAIL || '';
const otpHash = (exp, code) => crypto.createHmac('sha256', SECRET).update('otp|' + exp + '|' + code).digest('hex');
app.post('/api/admin/otp/request', async (req, res) => {
  if (!RESEND_KEY || !OWNER_EMAIL) return res.status(400).json({ error: 'Email login is not set up (add RESEND_API_KEY and OWNER_EMAIL on the server)' });
  const code = String(crypto.randomInt(0, 1e8)).padStart(8, '0'), exp = Date.now() + 10 * 60 * 1000;
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Magic Brew <onboarding@resend.dev>', to: [OWNER_EMAIL], subject: 'Your Magic Brew login code: ' + code,
      text: 'Your owner login code is ' + code + '. It expires in 10 minutes. If you did not request it, ignore this email.' }) }).catch(() => null);
  if (!r || !r.ok) { console.error('Resend error', r && r.status, r && await r.text()); return res.status(502).json({ error: 'Could not send the email' }); }
  res.json({ challenge: exp + '.' + otpHash(exp, code), hint: OWNER_EMAIL.replace(/^(.).*(@.*)$/, '$1***$2') });
});
app.post('/api/admin/otp/verify', (req, res) => {
  const [exp, sig] = String(req.body.challenge || '').split('.');
  const code = String(req.body.code || '').replace(/\D/g, '');
  if (!exp || !sig || +exp < Date.now() || !code) return res.status(401).json({ error: 'Code expired — request a new one' });
  const good = Buffer.from(otpHash(exp, code)), got = Buffer.from(sig);
  if (good.length !== got.length || !crypto.timingSafeEqual(good, got)) return res.status(401).json({ error: 'Wrong code' });
  res.json({ token: newToken() });
});
// 4-digit PIN login (ADMIN_PIN env). Locks for 15 min after 5 wrong tries, counted in Redis when available.
const ADMIN_PIN = /^\d{4}$/.test((process.env.ADMIN_PIN || '').trim()) ? process.env.ADMIN_PIN.trim() : '';
const memFails = { n: 0, until: 0 };
app.post('/api/admin/pin-login', async (req, res) => {
  if (!ADMIN_PIN) return res.status(400).json({ error: 'PIN not set up yet (add ADMIN_PIN on the server)' });
  const key = 'magicbrew:pinfails';
  const locked = REMOTE ? +(await redis(['GET', key + ':lock'])) : memFails.until > Date.now();
  if (locked) return res.status(429).json({ error: 'Too many wrong tries. Try again in 15 minutes.' });
  const a = Buffer.from(String(req.body.pin || '')), b = Buffer.from(ADMIN_PIN);
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) { if (REMOTE) await redis(['DEL', key]); else memFails.n = 0; return res.json({ token: newToken(720) }); }
  if (REMOTE) {
    const n = await redis(['INCR', key]); await redis(['EXPIRE', key, 900]);
    if (n >= 5) { await redis(['SET', key + ':lock', '1', 'EX', 900]); await redis(['DEL', key]); }
  } else if (++memFails.n >= 5) { memFails.until = Date.now() + 900000; memFails.n = 0; }
  res.status(401).json({ error: 'Wrong PIN' });
});
app.post('/api/admin/login', (req, res) => {
  if (process.env.VERCEL && !process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'Set the ADMIN_PASSWORD environment variable' });
  const a = Buffer.from(String(req.body.password || ''));
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Wrong password' });
  res.json({ token: newToken() });
});

// Optional testing shortcut: log in without a password, only from this same computer.
// Off unless the server is started with ADMIN_LOCAL_LOGIN=1.
const isLocal = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) && !req.headers['x-forwarded-for'];
const localLoginOn = (req) => process.env.ADMIN_LOCAL_LOGIN === '1' && isLocal(req);
app.get('/api/admin/local-login', (req, res) => res.json({ available: localLoginOn(req) }));
app.post('/api/admin/local-login', (req, res) => {
  if (!localLoginOn(req)) return res.status(403).json({ error: 'Not available' });
  res.json({ token: newToken() });
});

// Public QR code that opens the customer menu
app.get('/api/menu-qr', async (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const local = /^(localhost|127\.|\[::1\]|\d+\.\d+\.\d+\.\d+)/.test(host);
  const url = (db.settings.publicUrl || (local ? `http://${lanIp()}:${PORT}` : `https://${host}`)).replace(/\/$/, '') + '/';
  res.json({ url, qr: await QRCode.toDataURL(url, { margin: 2, width: 720, errorCorrectionLevel: 'H' }), name: db.settings.cafeName });
});

// ---------- public API ----------
const publicSettings = () => {
  const { cafeName, tagline, ownerName, currency, upiId, upiName, paymentQrImage } = db.settings;
  return { cafeName, tagline, ownerName, currency, hasUpi: !!upiId, upiName, paymentQrImage };
};

app.get('/api/menu', (req, res) => {
  const categories = [...db.categories].sort((a, b) => a.order - b.order);
  res.json({ settings: publicSettings(), categories, items: db.items });
});

const baseUrl = (req) => {
  if (db.settings.publicUrl) return db.settings.publicUrl.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  return (/^(localhost|127\.)/.test(host) ? 'http://' : 'https://') + host;
};
const ownerLink = (req, o) => `${baseUrl(req)}/admin.html?order=${o.id}&sig=${orderSig(o.id)}`;

const waNumber = (n) => { const d = String(n || '').replace(/\D/g, ''); return d.length === 10 ? '91' + d : d; };
async function waPost(body) {
  const r = await fetch(`https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`, { method: 'POST',
    headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to: waNumber(db.settings.ownerMobile), ...body }) });
  return { ok: r.ok, err: r.ok ? '' : `HTTP ${r.status} ${(await r.text()).slice(0, 300)}` };
}
// Sends to the owner's WhatsApp; every order goes to the same chat. `why` collects failure reasons.
async function sendWhatsApp(text, why = []) {
  if (!WA_TOKEN || !WA_PHONE_ID) { why.push('WhatsApp is not connected (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID missing on the server)'); return false; }
  if (!waNumber(db.settings.ownerMobile)) { why.push('Owner WhatsApp number is not set in Settings'); return false; }
  try {
    let r = await waPost({ type: 'text', text: { body: text } });
    if (!r.ok && WA_TEMPLATE) {
      why.push('Text message refused (' + r.err + '), retried with template');
      const param = text.replace(/\s*\n+\s*/g, ' | ').replace(/ {2,}/g, ' ').slice(0, 1000);
      r = await waPost({ type: 'template', template: { name: WA_TEMPLATE, language: { code: WA_LANG }, components: [{ type: 'body', parameters: [{ type: 'text', text: param }] }] } });
    }
    if (!r.ok) { why.push(r.err); console.error('WhatsApp error', r.err); }
    return r.ok;
  } catch (e) { why.push(e.message); console.error('WhatsApp send failed', e.message); return false; }
}
function orderText(o, req) {
  const cu = db.settings.currency;
  return [
    `*New Order #${o.id}*`, `Customer: ${o.customer.name}`, `Mobile: ${o.customer.mobile}`, o.notes ? `Note: ${o.notes}` : null, '',
    ...o.items.map((i) => `${i.qty} × ${i.name} – ${cu}${i.price * i.qty}`), '',
    `*Total: ${cu}${o.total}*`, `Time: ${new Date(o.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, '', `Open: ${ownerLink(req, o)}`,
  ].filter((x) => x !== null).join('\n');
}
function paymentText(o, req) {
  const cu = db.settings.currency;
  return [`*Payment reported – Order #${o.id}*`, `Customer: ${o.customer.name} (${o.customer.mobile})`, `Total: ${cu}${o.total}`,
    `Transaction ID: ${o.payment.txnId || 'Not provided'}`, 'Awaiting your verification.', '', `Open: ${ownerLink(req, o)}`].join('\n');
}
const notifyOwner = (req, o, kind, why) => sendWhatsApp(kind === 'payment' ? paymentText(o, req) : orderText(o, req), why);

app.post('/api/orders', async (req, res) => {
  const { name, mobile, notes, cart } = req.body || {};
  const cleanName = String(name || '').trim().slice(0, 60);
  const cleanMobile = String(mobile || '').replace(/\D/g, '').slice(-10);
  if (!cleanName) return res.status(400).json({ error: 'Please enter your name' });
  if (!/^[6-9]\d{9}$/.test(cleanMobile)) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
  if (!Array.isArray(cart) || !cart.length) return res.status(400).json({ error: 'Your cart is empty' });

  // Prices always come from the server, never the client.
  const lines = [];
  for (const c of cart) {
    const it = db.items.find((i) => i.id === c.id);
    const qty = Math.min(20, Math.max(1, parseInt(c.qty, 10) || 0));
    if (!it || !it.available) return res.status(400).json({ error: `"${it ? it.name : 'An item'}" is no longer available` });
    lines.push({ id: it.id, name: it.name, price: it.price, qty });
  }
  const order = {
    id: db.nextOrderId++, customer: { name: cleanName, mobile: cleanMobile },
    notes: String(notes || '').trim().slice(0, 200), items: lines,
    total: lines.reduce((s, l) => s + l.price * l.qty, 0),
    status: 'new', payment: { status: 'unpaid', txnId: '' },
    createdAt: new Date().toISOString(),
  };
  db.orders.unshift(order);
  save();
  order.ownerNotified = await notifyOwner(req, order, 'order');
  save();
  res.json({ order });
});

app.get('/api/orders/:id', (req, res) => {
  const o = db.orders.find((x) => x.id === +req.params.id);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  res.json({ order: o });
});

// Payment info for an order: UPI deep link (amount pre-filled) + QR
app.get('/api/orders/:id/pay', async (req, res) => {
  const o = db.orders.find((x) => x.id === +req.params.id);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  const s = db.settings;
  let upiLink = null, qr = null;
  if (s.upiId) {
    upiLink = `upi://pay?pa=${encodeURIComponent(s.upiId)}&pn=${encodeURIComponent(s.upiName)}&am=${o.total.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Order ' + o.id)}`;
    qr = await QRCode.toDataURL(upiLink, { margin: 1, width: 360 });
  }
  res.json({ upiLink, qr, uploadedQr: s.paymentQrImage, total: o.total, upiId: s.upiId });
});

app.post('/api/orders/:id/payment', async (req, res) => {
  const o = db.orders.find((x) => x.id === +req.params.id);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  if (o.payment.status === 'paid') return res.json({ order: o });
  o.payment = { status: 'reported', txnId: String(req.body.txnId || '').trim().slice(0, 40), reportedAt: new Date().toISOString() };
  save();
  await notifyOwner(req, o, 'payment');
  res.json({ order: o });
});

// ---------- admin API ----------
const admin = express.Router();
admin.use(auth);

admin.get('/state', (req, res) => res.json({ ...db, whatsappApi: !!(WA_TOKEN && WA_PHONE_ID) }));

admin.put('/settings', (req, res) => {
  const allowed = ['cafeName', 'tagline', 'ownerName', 'ownerMobile', 'upiId', 'upiName', 'publicUrl', 'currency'];
  for (const k of allowed) if (k in req.body) db.settings[k] = String(req.body[k]).trim();
  save(); res.json(db.settings);
});
admin.post('/settings/payment-qr', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image required' });
    db.settings.paymentQrImage = await storeImage(req.file); save(); res.json(db.settings);
  } catch (e) { next(e); }
});
admin.delete('/settings/payment-qr', (req, res) => { db.settings.paymentQrImage = ''; save(); res.json(db.settings); });

admin.post('/categories', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name required' });
  const c = { id: uid('c'), name, order: db.categories.length };
  db.categories.push(c); save(); res.json(c);
});
admin.put('/categories/:id', (req, res) => {
  const c = db.categories.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (req.body.name !== undefined) c.name = String(req.body.name).trim() || c.name;
  if (req.body.order !== undefined) c.order = +req.body.order;
  save(); res.json(c);
});
admin.delete('/categories/:id', (req, res) => {
  if (db.items.some((i) => i.categoryId === req.params.id)) return res.status(400).json({ error: 'Move or delete this category\'s items first' });
  db.categories = db.categories.filter((c) => c.id !== req.params.id); save(); res.json({ ok: true });
});

admin.post('/items', upload.single('image'), async (req, res, next) => {
  try {
  const b = req.body;
  if (!db.categories.some((c) => c.id === b.categoryId)) return res.status(400).json({ error: 'Choose a category' });
  if (!String(b.name || '').trim() || !(+b.price >= 0)) return res.status(400).json({ error: 'Name and price required' });
  const it = {
    id: uid('i'), categoryId: b.categoryId, name: b.name.trim(), price: +b.price,
    description: String(b.description || '').trim(), available: b.available !== 'false',
    image: req.file ? await storeImage(req.file) : '',
  };
  db.items.push(it); save(); res.json(it);
  } catch (e) { next(e); }
});
admin.put('/items/:id', upload.single('image'), async (req, res, next) => {
  try {
  const it = db.items.find((x) => x.id === req.params.id);
  if (!it) return res.status(404).json({ error: 'Not found' });
  const b = req.body;
  if (b.name !== undefined && b.name.trim()) it.name = b.name.trim();
  if (b.price !== undefined && +b.price >= 0) it.price = +b.price;
  if (b.description !== undefined) it.description = b.description.trim();
  if (b.categoryId && db.categories.some((c) => c.id === b.categoryId)) it.categoryId = b.categoryId;
  if (b.available !== undefined) it.available = b.available === true || b.available === 'true';
  if (b.removeImage === 'true') it.image = '';
  if (req.file) it.image = await storeImage(req.file);
  save(); res.json(it);
  } catch (e) { next(e); }
});
admin.delete('/items/:id', (req, res) => { db.items = db.items.filter((i) => i.id !== req.params.id); save(); res.json({ ok: true }); });

admin.put('/orders/:id', (req, res) => {
  const o = db.orders.find((x) => x.id === +req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found' });
  if (['new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'].includes(req.body.status)) o.status = req.body.status;
  if (req.body.paymentStatus === 'paid') { o.payment.status = 'paid'; o.payment.confirmedAt = new Date().toISOString(); }
  if (req.body.paymentStatus === 'unpaid') o.payment = { status: 'unpaid', txnId: '' };
  save(); res.json(o);
});
admin.post('/whatsapp-test', async (req, res) => {
  const why = [];
  res.json({ sent: await sendWhatsApp('✅ Magic Brew test: new orders will arrive in this chat.', why), why });
});
admin.post('/orders/:id/notify', async (req, res) => {
  const o = db.orders.find((x) => x.id === +req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found' });
  const why = [];
  res.json({ sent: await notifyOwner(req, o, 'order', why), why });
});

// QR code that customers scan to open the menu
function lanIp() {
  for (const list of Object.values(os.networkInterfaces()))
    for (const n of list) if (n.family === 'IPv4' && !n.internal) return n.address;
  return 'localhost';
}
admin.get('/cafe-qr', async (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const local = /^(localhost|127\.|\[::1\]|\d+\.\d+\.\d+\.\d+)/.test(host);
  const url = db.settings.publicUrl || (local ? `http://${lanIp()}:${PORT}` : `https://${host}`);
  res.json({ url, qr: await QRCode.toDataURL(url, { margin: 2, width: 600, errorCorrectionLevel: 'H' }), isLocal: !db.settings.publicUrl && local });
});
app.use('/api/admin', admin);

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: err.message || 'Server error' }); });

if (require.main === module) app.listen(PORT, () => {
  console.log(`\n☕ Magic Brew Café running`);
  console.log(`   Customer menu : http://localhost:${PORT}`);
  console.log(`   Admin panel   : http://localhost:${PORT}/admin.html  (password: ${ADMIN_PASSWORD === 'magicbrew123' ? 'magicbrew123 — change with ADMIN_PASSWORD' : 'set via ADMIN_PASSWORD'})`);
  console.log(`   On your phone (same Wi-Fi): http://${lanIp()}:${PORT}\n`);
});

module.exports = app;
