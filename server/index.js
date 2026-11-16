const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, 'database.json');

const defaultData = {
  vouchers: [],
  trips: [],
  transfers: [],
  workerLogs: []
};

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
}

const readDB = () => {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    return { ...defaultData, ...data };
  } catch (e) {
    return defaultData;
  }
};

const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// --- VOUCHERS ---
app.get('/api/vouchers', (req, res) => {
  res.json(readDB().vouchers);
});

app.post('/api/vouchers', (req, res) => {
  const db = readDB();
  const prefix = req.body.voucherType === 'SALE' ? 'SMT-SL-' : 'SMT-PR-';
  const voucherNo = prefix + Math.floor(10000 + Math.random() * 90000);
  const newVoucher = {
    _id: Date.now().toString(),
    ...req.body,
    voucherNo,
    paymentHistory: req.body.paidAmount > 0 ? [
      { date: req.body.voucherDate, amount: Number(req.body.paidAmount), mode: req.body.paymentMode }
    ] : [],
    createdAt: new Date().toISOString()
  };
  db.vouchers.unshift(newVoucher);
  writeDB(db);
  res.json({ status: 'success', voucher: newVoucher });
});

app.put('/api/vouchers/:id/settle', (req, res) => {
  const db = readDB();
  const addPayment = Number(req.body.amount) || 0;
  const mode = req.body.mode || 'Cash';
  const v = db.vouchers.find(item => item._id === req.params.id);
  if (!v) return res.status(404).json({ message: 'Voucher not found' });

  v.paidAmount = Number(v.paidAmount) + addPayment;
  v.balanceAmount = Math.max(0, Number(v.grandTotal) - v.paidAmount);
  if (!v.paymentHistory) v.paymentHistory = [];
  v.paymentHistory.push({
    date: new Date().toISOString().split('T')[0],
    amount: addPayment,
    mode
  });

  writeDB(db);
  res.json({ status: 'success', voucher: v });
});

// --- TRIPS ---
app.get('/api/trips', (req, res) => {
  res.json(readDB().trips);
});

app.post('/api/trips', (req, res) => {
  const db = readDB();
  const newTrip = {
    _id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  db.trips.unshift(newTrip);
  writeDB(db);
  res.json({ status: 'success', trip: newTrip });
});

// --- TRANSFERS ---
app.get('/api/transfers', (req, res) => {
  res.json(readDB().transfers);
});

app.post('/api/transfers', (req, res) => {
  const db = readDB();
  const newTransfer = {
    _id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  db.transfers.unshift(newTransfer);
  writeDB(db);
  res.json({ status: 'success', transfer: newTransfer });
});

// --- WORKERS ---
app.get('/api/workers', (req, res) => {
  res.json(readDB().workerLogs);
});

app.post('/api/workers', (req, res) => {
  const db = readDB();
  const newLog = {
    _id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  db.workerLogs.unshift(newLog);
  writeDB(db);
  res.json({ status: 'success', log: newLog });
});

// --- RESET / CLEAR ALL DATA API ---
app.post('/api/reset-data', (req, res) => {
  writeDB(defaultData);
  res.json({ status: 'success', message: 'All ERP entries and data cleared successfully.' });
});

const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Samsara Metal ERP Pro Server running on http://localhost:${PORT}`));