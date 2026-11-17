import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import {
  Plus, Trash2, Layers, Printer, Share2, ArrowLeftRight, RefreshCw, Camera
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const METAL_CATALOG = [
  // --- Copper Grades & Bhukka ---
  { name: "Copper Bhukka (Dust / Powder Scrap)", hsn: "7404" },
  { name: "Copper Armature Wire Scrap", hsn: "7404" },
  { name: "Copper Heavy / Patti / Pipe", hsn: "7404" },
  { name: "Copper Rassa (Cable/Strand Scrap)", hsn: "7404" },
  { name: "Copper Gitak / Chhath", hsn: "7404" },

  // --- Brass Grades & Bhukka ---
  { name: "Brass Bhukka (Dust / Powder Scrap)", hsn: "7404" },
  { name: "Brass Tukda (PV)", hsn: "7404" },
  { name: "Brass Chalu Katran (PK)", hsn: "7404" },
  { name: "Pittal / Brass Passing Katran (PPK)", hsn: "7404" },
  { name: "Brass Honey / Purja / Tap", hsn: "7404" },

  // --- Motors, Transformers & Compressors ---
  { name: "Electric Motor Scrap (Copper Winding)", hsn: "8501" },
  { name: "Transformer Scrap (Copper/Aluminium Core)", hsn: "8504" },
  { name: "AC Compressor Scrap", hsn: "8414" },
  { name: "Old Machinery / Plant Scrap", hsn: "7204" },

  // --- Karbait (Tungsten Carbide) ---
  { name: "Karbait (Tungsten Carbide Tips / Scrap)", hsn: "8101" },
  { name: "Karbait Insert / Drill Bit Scrap", hsn: "8207" },

  // --- Wires & Cables ---
  { name: "Polycab Wire 1.0 / 1.5 / 2.5 sq.mm", hsn: "8544" },
  { name: "Polycab Wire 4.0 / 6.0 sq.mm / 6 Core", hsn: "8544" },
  { name: "Polycab Wire 10.0 sq.mm", hsn: "8544" },
  { name: "KEI Wire (All Sizes 1mm to 10mm / 6 Core)", hsn: "8544" },
  { name: "Local Brand Wire & AC Copper Cable", hsn: "8544" },
  { name: "PVC Insulated Copper Cable Scrap", hsn: "7404" },

  // --- Points & Other Non-Ferrous ---
  { name: "Copper Points (Contactor / Switchgear)", hsn: "7404" },
  { name: "Brass Points", hsn: "7404" },
  { name: "Stainless Steel (SS 304 / 316 / 202)", hsn: "7204" },
  { name: "MS / Iron Scrap (Loha)", hsn: "7204" },
  { name: "Aluminium Wire / Section / Utensil", hsn: "7602" },
  { name: "Nickel / Monel / Inconel", hsn: "7503" },
  { name: "Zinc (Jasta) & Lead (Sisa) Scrap", hsn: "7902" }
];

const detectHsnCode = (text) => {
  if (!text) return '7404';
  const lower = text.toLowerCase();
  const exact = METAL_CATALOG.find(m => m.name.toLowerCase() === lower);
  if (exact) return exact.hsn;

  if (lower.includes('motor')) return '8501';
  if (lower.includes('transformer')) return '8504';
  if (lower.includes('compressor')) return '8414';
  if (lower.includes('karbait') || lower.includes('carbide') || lower.includes('tungsten')) return '8101';
  if (lower.includes('polycab') || lower.includes('kei') || lower.includes('sq.mm') || lower.includes('core') || lower.includes('cable') || lower.includes('ac wire')) return '8544';
  if (lower.includes('copper') || lower.includes('tamba') || lower.includes('bhukka') || lower.includes('armature') || lower.includes('patti') || lower.includes('rassa') || lower.includes('gitak') || lower.includes('brass') || lower.includes('pital') || lower.includes('tukda') || lower.includes('katran') || lower.includes('pk') || lower.includes('ppk') || lower.includes('pv')) return '7404';
  if (lower.includes('ss') || lower.includes('steel') || lower.includes('iron') || lower.includes('loha') || lower.includes('ms')) return '7204';
  if (lower.includes('alum')) return '7602';
  if (lower.includes('nickel')) return '7503';
  if (lower.includes('zinc') || lower.includes('jasta')) return '7902';
  if (lower.includes('lead') || lower.includes('sisa') || lower.includes('battery')) return '7802';

  return '7404';
};

const LOCATIONS = [
  "Shop  (Site 1)",
  "Vasai (Site 2)",
];

const formatDateDDMMYYYY = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [vouchers, setVouchers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [workerLogs, setWorkerLogs] = useState([]);
  const [printVoucher, setPrintVoucher] = useState(null);

  const billRef = useRef(null);

  // Form States
  const [locationName, setLocationName] = useState(LOCATIONS[0]);
  const [partyName, setPartyName] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [partyGstin, setPartyGstin] = useState('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleNo, setVehicleNo] = useState('MH-02-SUPER-CARRY');
  const [kataSlipNo, setKataSlipNo] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [brokerageAmt, setBrokerageAmt] = useState('');
  const [kantaLoadingCharges, setKantaLoadingCharges] = useState('');
  const [gstType, setGstType] = useState('CGST_SGST');
  const [gstPercent, setGstPercent] = useState(0);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState([
    { itemName: '', hsn: '', alloyGrade: '', grossKg: '', lessKg: '', rate: '' },
    { itemName: '', hsn: '', alloyGrade: '', grossKg: '', lessKg: '', rate: '' }
  ]);

  const [tripForm, setTripForm] = useState({
    tripDate: new Date().toISOString().split('T')[0],
    locationName: LOCATIONS[0],
    cashTaken: '',
    maalPurchasedCash: '',
    maalWeightKg: '',
    expTransport: '',
    expLabour: '',
    expKata: '',
    expFoodOther: '',
    remarks: ''
  });

  const [transferForm, setTransferForm] = useState({
    transferDate: new Date().toISOString().split('T')[0],
    fromLocation: LOCATIONS[1],
    toLocation: LOCATIONS[0],
    itemName: '',
    netKg: '',
    remarks: 'Brought to Main Shop from Site'
  });

  const [workerForm, setWorkerForm] = useState({
    logDate: new Date().toISOString().split('T')[0],
    workerName: 'Worker 1',
    locationName: LOCATIONS[0],
    attendance: 'Present',
    upaadAdvance: '',
    remarks: ''
  });

  const [filterLoc, setFilterLoc] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [searchParty, setSearchParty] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [vRes, tRes, trRes, wRes] = await Promise.all([
        axios.get(`${API_BASE}/vouchers`),
        axios.get(`${API_BASE}/trips`),
        axios.get(`${API_BASE}/transfers`),
        axios.get(`${API_BASE}/workers`)
      ]);
      setVouchers(vRes.data);
      setTrips(tRes.data);
      setTransfers(trRes.data);
      setWorkerLogs(wRes.data);
    } catch (err) {
      console.error("Error loading ERP data:", err);
    }
  };

  const handleClearAllData = async () => {
    const confirmClear = window.confirm("⚠️ WARNING: Kya aap saari sample entries aur data ko permanently delete karna chahte hain? Yeh dobara wapas nahi aayega!");
    if (!confirmClear) return;

    try {
      await axios.post(`${API_BASE}/reset-data`);
      alert("All sample entries cleared successfully! Now ERP is fresh.");
      fetchAllData();
    } catch (err) {
      alert("Error clearing data.");
    }
  };

  // --- FULL-WIDTH HD BILL PHOTO SHARE (FIXED FOR MOBILE & DESKTOP) ---
  const shareBillAsPhoto = async (v) => {
    if (!billRef.current) return;
    try {
      const canvas = await html2canvas(billRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        windowWidth: 900,
        onclone: (clonedDoc) => {
          const clonedBill = clonedDoc.getElementById('printable-bill-area');
          if (clonedBill) {
            clonedBill.style.width = '820px';
            clonedBill.style.maxWidth = '820px';
            clonedBill.style.padding = '24px';
          }
        }
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `${v.voucherNo}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Bill - ${v.voucherNo}`,
            text: `Samsara Metal Traders Bill (${v.partyName})`
          });
        } else {
          const link = document.createElement('a');
          link.download = `${v.voucherNo}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          alert("Bill ki HD Photo download ho gayi hai! Ab WhatsApp par paste/send kar dein.");
        }
      }, 'image/png');
    } catch (err) {
      console.error("Photo share error:", err);
      alert("Photo share karne mein dikkat aayi, text WhatsApp use karein.");
    }
  };

  const addItemRow = () => {
    setItems([...items, { itemName: '', hsn: '', alloyGrade: '', grossKg: '', lessKg: '', rate: '' }]);
  };

  const removeItemRow = (index) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    if (field === 'itemName') {
      updated[index].hsn = detectHsnCode(value);
    }
    setItems(updated);
  };

  const getNetKg = (row) => {
    const gross = parseFloat(row.grossKg) || 0;
    const less = parseFloat(row.lessKg) || 0;
    return Math.max(0, gross - less);
  };

  const getRowTotal = (row) => {
    return getNetKg(row) * (parseFloat(row.rate) || 0);
  };

  const totalGrossKg = items.reduce((s, r) => s + (parseFloat(r.grossKg) || 0), 0);
  const totalLessKg = items.reduce((s, r) => s + (parseFloat(r.lessKg) || 0), 0);
  const totalNetKg = items.reduce((s, r) => s + getNetKg(r), 0);
  const itemsSubTotal = items.reduce((s, r) => s + getRowTotal(r), 0);
  const extraCharges = parseFloat(kantaLoadingCharges) || 0;
  const taxableValue = itemsSubTotal + extraCharges;
  const gstAmount = (taxableValue * gstPercent) / 100;
  const grandTotal = Math.round(taxableValue + gstAmount);
  const paidNum = parseFloat(paidAmount) || 0;
  const balanceAmount = grandTotal - paidNum;

  const handleSaveVoucher = async (type) => {
    if (!partyName.trim()) {
      alert("Kripya Party Name (Supplier / Buyer) bharein!");
      return;
    }

    const validItems = items
      .filter(r => r.itemName.trim() && getNetKg(r) > 0)
      .map(r => ({
        itemName: r.itemName.trim(),
        hsn: r.hsn || detectHsnCode(r.itemName),
        alloyGrade: r.alloyGrade,
        grossKg: parseFloat(r.grossKg) || 0,
        lessKg: parseFloat(r.lessKg) || 0,
        netKg: getNetKg(r),
        rate: parseFloat(r.rate) || 0,
        lineTotal: getRowTotal(r)
      }));

    if (validItems.length === 0) {
      alert("Kam se kam 1 item aur uska Gross Weight daalna zaroori hai!");
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/vouchers`, {
        voucherType: type,
        locationName,
        partyName: partyName.trim(),
        partyPhone: partyPhone.trim(),
        partyGstin: partyGstin.trim().toUpperCase(),
        voucherDate,
        vehicleNo,
        kataSlipNo,
        brokerName,
        brokerageAmt: parseFloat(brokerageAmt) || 0,
        kantaLoadingCharges: extraCharges,
        gstType,
        items: validItems,
        totalGrossKg,
        totalLessKg,
        totalNetKg,
        subTotal: itemsSubTotal,
        gstPercent,
        gstAmount,
        grandTotal,
        paidAmount: paidNum,
        balanceAmount,
        paymentMode,
        notes
      });

      alert(`${type} Saved Successfully! Voucher No: ${res.data.voucher.voucherNo}`);
      setPartyName('');
      setPartyPhone('');
      setPartyGstin('');
      setKataSlipNo('');
      setBrokerName('');
      setBrokerageAmt('');
      setKantaLoadingCharges('');
      setPaidAmount('');
      setNotes('');
      setItems([
        { itemName: '', hsn: '', alloyGrade: '', grossKg: '', lessKg: '', rate: '' },
        { itemName: '', hsn: '', alloyGrade: '', grossKg: '', lessKg: '', rate: '' }
      ]);
      fetchAllData();
      setPrintVoucher(res.data.voucher);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      alert("Server error saving voucher.");
    }
  };

  const handleSettleBalance = async (v) => {
    const amt = prompt(`Party: ${v.partyName}\nAbhi Balance Baaki: ₹${v.balanceAmount.toFixed(2)}\n\nKitna रुपया abhi mila / diya?`);
    if (!amt || isNaN(amt) || Number(amt) <= 0) return;
    const mode = prompt("Payment Mode (Cash / UPI / RTGS):", "Cash") || "Cash";
    await axios.put(`${API_BASE}/vouchers/${v._id}/settle`, { amount: Number(amt), mode });
    fetchAllData();
  };

  const shareOnWhatsApp = (v) => {
    const defaultNum = v.partyPhone ? v.partyPhone.replace(/\D/g, '').slice(-10) : '';
    const targetNum = prompt("Enter 10-digit WhatsApp Number to send this bill:", defaultNum);
    if (!targetNum || targetNum.length < 10) return;

    const itemLines = v.items.map(
      i => `• *${i.itemName}* (HSN ${i.hsn || '7404'}): Gross ${i.grossKg} - Less ${i.lessKg} = *${i.netKg} KG* × *₹${i.rate}* = *₹${i.lineTotal.toLocaleString('en-IN')}*`
    ).join('%0A');

    const msg = `*SAMSARA METAL TRADERS*%0A` +
      `Voucher: *${v.voucherNo}* (${v.voucherType})%0A` +
      `Date: ${formatDateDDMMYYYY(v.voucherDate)} | Vasai, Palghar%0A` +
      `Party: *${v.partyName}*%0A` +
      `------------------------%0A` +
      `${itemLines}%0A` +
      `------------------------%0A` +
      `Total Net Wt: *${v.totalNetKg || v.items.reduce((s, x) => s + (x.netKg || x.qtyKg), 0)} KG*%0A` +
      `Grand Total: *₹${v.grandTotal.toLocaleString('en-IN')}*%0A` +
      `Paid/Recv: ₹${v.paidAmount.toLocaleString('en-IN')}%0A` +
      `*Balance Baaki: ₹${v.balanceAmount.toLocaleString('en-IN')}*`;

    window.open(`https://wa.me/91${targetNum}?text=${msg}`, '_blank');
  };

  const cashTaken = parseFloat(tripForm.cashTaken) || 0;
  const maalCash = parseFloat(tripForm.maalPurchasedCash) || 0;
  const totalTripExp = (parseFloat(tripForm.expTransport) || 0) +
    (parseFloat(tripForm.expLabour) || 0) +
    (parseFloat(tripForm.expKata) || 0) +
    (parseFloat(tripForm.expFoodOther) || 0);
  const cashReturned = cashTaken - (maalCash + totalTripExp);

  const handleSaveTrip = async (e) => {
    e.preventDefault();
    await axios.post(`${API_BASE}/trips`, {
      ...tripForm,
      cashTaken,
      maalPurchasedCash: maalCash,
      maalWeightKg: parseFloat(tripForm.maalWeightKg) || 0,
      expTransport: parseFloat(tripForm.expTransport) || 0,
      expLabour: parseFloat(tripForm.expLabour) || 0,
      expKata: parseFloat(tripForm.expKata) || 0,
      expFoodOther: parseFloat(tripForm.expFoodOther) || 0,
      totalExp: totalTripExp,
      cashReturned
    });
    alert("Field Cash Hisab Saved!");
    setTripForm({
      ...tripForm,
      cashTaken: '', maalPurchasedCash: '', maalWeightKg: '',
      expTransport: '', expLabour: '', expKata: '', expFoodOther: '', remarks: ''
    });
    fetchAllData();
  };

  const handleSaveTransfer = async (e) => {
    e.preventDefault();
    if (transferForm.fromLocation === transferForm.toLocation) {
      return alert("From Location aur To Location alag honi chahiye!");
    }
    await axios.post(`${API_BASE}/transfers`, {
      ...transferForm,
      netKg: parseFloat(transferForm.netKg) || 0
    });
    alert("Stock Consolidated / Shifted to Main Shop Successfully!");
    setTransferForm({ ...transferForm, itemName: '', netKg: '' });
    fetchAllData();
  };

  const handleSaveWorker = async (e) => {
    e.preventDefault();
    await axios.post(`${API_BASE}/workers`, {
      ...workerForm,
      upaadAdvance: parseFloat(workerForm.upaadAdvance) || 0
    });
    alert("Worker Entry Saved!");
    setWorkerForm({ ...workerForm, upaadAdvance: '', remarks: '' });
    fetchAllData();
  };

  const computeInventory = () => {
    const stockMap = {};
    const ensureItem = (name) => {
      if (!stockMap[name]) {
        stockMap[name] = {
          shopIn: 0, shopOut: 0,
          site2In: 0, site2Out: 0,
          purVal: 0, purKg: 0,
          saleVal: 0, saleKg: 0
        };
      }
    };

    vouchers.forEach(v => {
      const isShop = v.locationName === LOCATIONS[0];
      v.items.forEach(it => {
        const wt = Number(it.netKg ?? it.qtyKg ?? 0);
        ensureItem(it.itemName);
        if (v.voucherType === 'PURCHASE') {
          if (isShop) stockMap[it.itemName].shopIn += wt;
          else stockMap[it.itemName].site2In += wt;
          stockMap[it.itemName].purKg += wt;
          stockMap[it.itemName].purVal += Number(it.lineTotal || 0);
        } else {
          if (isShop) stockMap[it.itemName].shopOut += wt;
          else stockMap[it.itemName].site2Out += wt;
          stockMap[it.itemName].saleKg += wt;
          stockMap[it.itemName].saleVal += Number(it.lineTotal || 0);
        }
      });
    });

    transfers.forEach(tr => {
      const wt = Number(tr.netKg || 0);
      ensureItem(tr.itemName);
      if (tr.fromLocation === LOCATIONS[0]) {
        stockMap[tr.itemName].shopOut += wt;
        stockMap[tr.itemName].site2In += wt;
      } else {
        stockMap[tr.itemName].site2Out += wt;
        stockMap[tr.itemName].shopIn += wt;
      }
    });

    return Object.entries(stockMap).map(([name, d]) => {
      const shopNet = d.shopIn - d.shopOut;
      const site2Net = d.site2In - d.site2Out;
      const avgBuy = d.purKg > 0 ? (d.purVal / d.purKg) : 0;
      const avgSell = d.saleKg > 0 ? (d.saleVal / d.saleKg) : 0;
      return {
        name,
        hsn: detectHsnCode(name),
        shopNet,
        site2Net,
        totalNet: shopNet + site2Net,
        avgBuy,
        avgSell
      };
    });
  };

  const inventoryRows = computeInventory();
  const totalPurchase = vouchers.filter(v => v.voucherType === 'PURCHASE').reduce((s, v) => s + v.grandTotal, 0);
  const payableBaaki = vouchers.filter(v => v.voucherType === 'PURCHASE').reduce((s, v) => s + v.balanceAmount, 0);
  const totalSales = vouchers.filter(v => v.voucherType === 'SALE').reduce((s, v) => s + v.grandTotal, 0);
  const receivableBaaki = vouchers.filter(v => v.voucherType === 'SALE').reduce((s, v) => s + v.balanceAmount, 0);
  const totalStockKg = inventoryRows.reduce((s, r) => s + r.totalNet, 0);

  return (
    <div className="min-vh-100 bg-light pb-5">
      {/* RESPONSIVE NAVIGATION BAR */}
      <nav className="navbar navbar-dark bg-dark px-2 px-md-3 py-2 sticky-top shadow">
        <div className="container-fluid">
          <span
            className="navbar-brand fw-bold text-warning d-flex align-items-center gap-2 fs-6 fs-md-5"
            style={{ cursor: 'pointer' }}
            onClick={() => setTab('dashboard')}
          >
            <Layers size={20} /> SAMSARA METAL TRADERS <span className="badge bg-warning text-dark">PRO</span>
          </span>
          <div className="d-flex flex-wrap gap-1 mt-1 mt-md-0">
            <button className={`btn btn-sm ${tab === 'dashboard' ? 'btn-light fw-bold' : 'btn-outline-light'}`} onClick={() => setTab('dashboard')}>Dashboard</button>
            <button className={`btn btn-sm ${tab === 'purchase' ? 'btn-warning fw-bold' : 'btn-outline-warning'}`} onClick={() => setTab('purchase')}>+ Purchase</button>
            <button className={`btn btn-sm ${tab === 'sale' ? 'btn-success fw-bold' : 'btn-outline-success'}`} onClick={() => setTab('sale')}>+ Sale / Bill</button>
            <button className={`btn btn-sm ${tab === 'stock' ? 'btn-primary fw-bold' : 'btn-outline-light'}`} onClick={() => setTab('stock')}>Godown Stock</button>
            <button className={`btn btn-sm ${tab === 'field' ? 'btn-info fw-bold text-dark' : 'btn-outline-info'}`} onClick={() => setTab('field')}>Field Cash</button>
            <button className={`btn btn-sm ${tab === 'ledger' ? 'btn-light fw-bold' : 'btn-outline-light'}`} onClick={() => setTab('ledger')}>Party Khata</button>
            <button className={`btn btn-sm ${tab === 'workers' ? 'btn-secondary fw-bold' : 'btn-outline-light'}`} onClick={() => setTab('workers')}>Workers</button>
          </div>
        </div>
      </nav>

      <div className="container-fluid px-2 px-md-4 my-3 my-md-4">
        {/* PRINTABLE & PHOTO-SHAREABLE INVOICE MODAL */}
        {printVoucher && (
          <div className="card border-dark shadow-lg p-2 p-md-4 mb-4 bg-white mx-auto" style={{ maxWidth: '880px' }}>
            <div className="table-responsive">
              <div id="printable-bill-area" ref={billRef} className="p-3 bg-white text-dark" style={{ minWidth: '680px' }}>
                <div className="d-flex justify-content-between align-items-start border-bottom border-dark pb-3 mb-3">
                  <div>
                    <h3 className="fw-bold mb-0 text-dark">SAMSARA METAL TRADERS</h3>
                    <div className="small text-muted">Dealers in Non-Ferrous Metals: Copper, Brass, SS, Aluminium &amp; Nickel Scrap</div>
                    <div className="small fw-semibold">Vasai, Palghar</div>
                  </div>
                  <div className="text-end">
                    <span className="badge bg-dark fs-6 mb-1">
                      {printVoucher.gstPercent > 0 ? 'TAX INVOICE' : `${printVoucher.voucherType} VOUCHER`}
                    </span>
                    <div className="fw-bold">No: {printVoucher.voucherNo}</div>
                    <div className="small fw-semibold">Date: {formatDateDDMMYYYY(printVoucher.voucherDate)}</div>
                  </div>
                </div>

                <div className="row mb-3 small">
                  <div className="col-6">
                    <strong>Party Name:</strong> <span className="fw-bold fs-6">{printVoucher.partyName}</span><br />
                    {printVoucher.partyPhone && <><strong>Phone:</strong> {printVoucher.partyPhone}<br /></>}
                    {printVoucher.partyGstin && <><strong>Party GSTIN:</strong> {printVoucher.partyGstin}</>}
                  </div>
                  <div className="col-6 text-end">
                    <strong>Vehicle No:</strong> {printVoucher.vehicleNo || '-'}<br />
                    <strong>Kanta Slip No:</strong> {printVoucher.kataSlipNo || '-'}<br />
                    <strong>Payment Mode:</strong> {printVoucher.paymentMode}
                  </div>
                </div>

                <table className="table table-bordered border-dark table-sm align-middle">
                  <thead className="table-dark">
                    <tr>
                      <th>#</th>
                      <th className="fw-bold">Item Name</th>
                      <th>HSN</th>
                      <th className="text-end">Gross</th>
                      <th className="text-end">Less</th>
                      <th className="text-end fw-bold">Net Qty (KG)</th>
                      <th className="text-end fw-bold">Rate (₹)</th>
                      <th className="text-end fw-bold">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printVoucher.items.map((it, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td className="fw-bold fs-6 text-dark">{it.itemName}</td>
                        <td className="small">{it.hsn || detectHsnCode(it.itemName)}</td>
                        <td className="text-end small">{Number(it.grossKg ?? it.qtyKg).toFixed(2)}</td>
                        <td className="text-end text-danger small">{Number(it.lessKg || 0).toFixed(2)}</td>
                        <td className="text-end fw-bold fs-6 text-dark">{Number(it.netKg ?? it.qtyKg).toFixed(2)} KG</td>
                        <td className="text-end fw-bold fs-6 text-dark">₹{Number(it.rate).toFixed(2)}</td>
                        <td className="text-end fw-bold fs-6 text-dark">₹{Number(it.lineTotal).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="row justify-content-end small mt-2">
                  <div className="col-6">
                    <div className="d-flex justify-content-between"><span>Sub-Total:</span><strong>₹{Number(printVoucher.subTotal).toLocaleString('en-IN')}</strong></div>
                    {printVoucher.kantaLoadingCharges > 0 && (
                      <div className="d-flex justify-content-between"><span>Kanta / Loading Charges:</span><span>₹{Number(printVoucher.kantaLoadingCharges).toLocaleString('en-IN')}</span></div>
                    )}
                    {printVoucher.gstPercent > 0 && (
                      <div className="d-flex justify-content-between">
                        <span>GST ({printVoucher.gstPercent}% {printVoucher.gstType === 'IGST' ? 'IGST' : 'CGST+SGST'}):</span>
                        <span>₹{Number(printVoucher.gstAmount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between fs-5 fw-bold border-top border-dark pt-1 mt-1">
                      <span>GRAND TOTAL:</span><span>₹{Number(printVoucher.grandTotal).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="d-flex justify-content-between text-success fw-bold">
                      <span>Paid / Received:</span><span>₹{Number(printVoucher.paidAmount).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="d-flex justify-content-between text-danger fw-bold fs-5 border-top border-dark pt-1">
                      <span>BALANCE BAAKI:</span><span>₹{Number(printVoucher.balanceAmount).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="d-flex flex-wrap justify-content-end gap-2 mt-3 pt-2 border-top d-print-none">
              <button className="btn btn-primary btn-sm fw-bold d-flex align-items-center gap-1" onClick={() => shareBillAsPhoto(printVoucher)}>
                <Camera size={15} /> Direct Send Bill Photo (WhatsApp)
              </button>
              <button className="btn btn-success btn-sm fw-bold d-flex align-items-center gap-1" onClick={() => shareOnWhatsApp(printVoucher)}>
                <Share2 size={15} /> Send Text Message
              </button>
              <button className="btn btn-dark btn-sm fw-bold d-flex align-items-center gap-1" onClick={() => window.print()}>
                <Printer size={15} /> Print / PDF
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setPrintVoucher(null)}>Close</button>
            </div>
          </div>
        )}

        {/* TAB 1: DASHBOARD */}
        {tab === 'dashboard' && (
          <>
            <div className="row g-2 g-md-3 mb-4">
              <div className="col-6 col-md-3">
                <div className="card p-3 border-0 shadow-sm border-start border-4 border-warning h-100">
                  <small className="text-muted fw-bold">TOTAL PURCHASE</small>
                  <h5 className="fw-bold mb-1">₹{totalPurchase.toLocaleString('en-IN')}</h5>
                  <small className="text-danger fw-bold">Dena Baaki: ₹{payableBaaki.toLocaleString('en-IN')}</small>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card p-3 border-0 shadow-sm border-start border-4 border-success h-100">
                  <small className="text-muted fw-bold">TOTAL SALES</small>
                  <h5 className="fw-bold mb-1">₹{totalSales.toLocaleString('en-IN')}</h5>
                  <small className="text-primary fw-bold">Lena Baaki: ₹{receivableBaaki.toLocaleString('en-IN')}</small>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card p-3 border-0 shadow-sm border-start border-4 border-primary h-100">
                  <small className="text-muted fw-bold">TOTAL NET STOCK</small>
                  <h5 className="fw-bold mb-1">{totalStockKg.toFixed(2)} KG</h5>
                  <button className="btn btn-link btn-sm p-0 text-decoration-none text-start" onClick={() => setTab('stock')}>View Godown Split →</button>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card p-3 border-0 shadow-sm border-start border-4 border-danger h-100">
                  <small className="text-muted fw-bold">DATA MANAGEMENT</small>
                  <button className="btn btn-outline-danger btn-sm w-100 fw-bold mt-2" onClick={handleClearAllData}>
                    <RefreshCw size={14} /> Clear Sample Data
                  </button>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm p-3">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">Recent Vouchers</h6>
                <button className="btn btn-sm btn-outline-primary" onClick={() => setTab('ledger')}>Open Full Khata</button>
              </div>
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle small" style={{ minWidth: '750px' }}>
                  <thead className="table-dark">
                    <tr>
                      <th>Date</th>
                      <th>Voucher #</th>
                      <th>Type</th>
                      <th>Location</th>
                      <th>Party Name</th>
                      <th>Net Weight</th>
                      <th>Grand Total</th>
                      <th>Balance Baaki</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.slice(0, 12).map(v => {
                      const netWt = v.totalNetKg ?? v.items.reduce((s, i) => s + Number(i.netKg ?? i.qtyKg ?? 0), 0);
                      return (
                        <tr key={v._id}>
                          <td>{formatDateDDMMYYYY(v.voucherDate)}</td>
                          <td className="fw-bold">{v.voucherNo}</td>
                          <td><span className={`badge ${v.voucherType === 'SALE' ? 'bg-success' : 'bg-warning text-dark'}`}>{v.voucherType}</span></td>
                          <td><span className="badge bg-secondary">{v.locationName}</span></td>
                          <td className="fw-bold">{v.partyName}</td>
                          <td className="fw-semibold">{Number(netWt).toFixed(2)} KG</td>
                          <td className="fw-bold">₹{Number(v.grandTotal).toLocaleString('en-IN')}</td>
                          <td className="fw-bold text-danger">
                            {v.balanceAmount > 0 ? (
                              <div className="d-flex align-items-center gap-1">
                                <span>₹{Number(v.balanceAmount).toLocaleString('en-IN')}</span>
                                <button className="btn btn-outline-success btn-sm py-0 px-1" onClick={() => handleSettleBalance(v)}>Settle</button>
                              </div>
                            ) : <span className="text-success">✓ Cleared</span>}
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button className="btn btn-outline-dark" title="Open Bill / Photo" onClick={() => setPrintVoucher(v)}><Printer size={14} /></button>
                              <button className="btn btn-outline-success" title="WhatsApp Text" onClick={() => shareOnWhatsApp(v)}><Share2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* TAB 2 & 3: PURCHASE & SALE ENTRY */}
        {(tab === 'purchase' || tab === 'sale') && (
          <div className="card border-0 shadow-sm p-3 p-md-4 mx-auto" style={{ maxWidth: '1150px' }}>
            <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
              <div>
                <h5 className={`fw-bold mb-0 ${tab === 'sale' ? 'text-success' : 'text-dark'}`}>
                  {tab === 'sale' ? 'SALE / GST TAX INVOICE (MAAL BECHA)' : 'METAL PURCHASE VOUCHER (MAAL LAAYA)'}
                </h5>
                <small className="text-muted">Auto HSN Code Detection + Net Weight Calculator</small>
              </div>
              <span className={`badge fs-6 ${tab === 'sale' ? 'bg-success' : 'bg-warning text-dark'}`}>{tab.toUpperCase()}</span>
            </div>

            <div className="row g-2 mb-3">
              <div className="col-12 col-md-3">
                <label className="form-label small fw-bold">Location / Godown</label>
                <select className="form-select form-select-sm" value={locationName} onChange={e => setLocationName(e.target.value)}>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label small fw-bold">{tab === 'sale' ? 'Buyer Party Name' : 'Supplier / Kider Se Laaye'}</label>
                <input type="text" className="form-control form-control-sm" placeholder="Enter Party Name" value={partyName} onChange={e => setPartyName(e.target.value)} />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label small fw-bold">WhatsApp / Phone</label>
                <input type="tel" className="form-control form-control-sm" placeholder="10-digit mobile" value={partyPhone} onChange={e => setPartyPhone(e.target.value)} />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label small fw-bold">Party GSTIN</label>
                <input type="text" className="form-control form-control-sm" placeholder="27AAAAA0000A1Z5" value={partyGstin} onChange={e => setPartyGstin(e.target.value)} />
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label small fw-bold">Date</label>
                <input type="date" className="form-control form-control-sm" value={voucherDate} onChange={e => setVoucherDate(e.target.value)} />
              </div>
            </div>

            <div className="row g-2 mb-3">
              <div className="col-6 col-md-3">
                <label className="form-label small fw-bold">Vehicle / Tempo No.</label>
                <input type="text" className="form-control form-control-sm" placeholder="MH-02-Super Carry" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small fw-bold">Kanta Slip #</label>
                <input type="text" className="form-control form-control-sm" placeholder="Slip No." value={kataSlipNo} onChange={e => setKataSlipNo(e.target.value)} />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small fw-bold">Broker Name</label>
                <input type="text" className="form-control form-control-sm" placeholder="Direct / Broker" value={brokerName} onChange={e => setBrokerName(e.target.value)} />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small fw-bold">Brokerage (₹)</label>
                <input type="number" className="form-control form-control-sm" placeholder="0.00" value={brokerageAmt} onChange={e => setBrokerageAmt(e.target.value)} />
              </div>
            </div>

            {/* MOBILE-FRIENDLY HORIZONTAL SCROLLABLE METAL TABLE */}
            <div className="table-responsive mb-2">
              <table className="table table-bordered align-middle mb-0" style={{ minWidth: '850px' }}>
                <thead className="table-dark small">
                  <tr>
                    <th style={{ width: '26%' }}>Item Name</th>
                    <th style={{ width: '9%' }} className="text-center">HSN</th>
                    <th style={{ width: '11%' }}>Grade %</th>
                    <th style={{ width: '12%' }} className="text-end">Gross KG</th>
                    <th style={{ width: '10%' }} className="text-end">Less</th>
                    <th style={{ width: '11%' }} className="text-end">Net KG</th>
                    <th style={{ width: '10%' }} className="text-end">Rate (₹)</th>
                    <th style={{ width: '12%' }} className="text-end">Total (₹)</th>
                    <th style={{ width: '4%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, idx) => {
                    const netKg = getNetKg(row);
                    const rowTot = getRowTotal(row);
                    return (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            list="metalList"
                            className="form-control form-control-sm fw-bold"
                            placeholder="Copper, Brass, SS 304..."
                            value={row.itemName}
                            onChange={e => updateItem(idx, 'itemName', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm text-center fw-bold bg-light text-primary"
                            placeholder="Auto"
                            value={row.hsn}
                            onChange={e => updateItem(idx, 'hsn', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Cu 98%"
                            value={row.alloyGrade}
                            onChange={e => updateItem(idx, 'alloyGrade', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.001"
                            className="form-control form-control-sm text-end fw-semibold"
                            placeholder="0.00"
                            value={row.grossKg}
                            onChange={e => updateItem(idx, 'grossKg', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.001"
                            className="form-control form-control-sm text-end text-danger"
                            placeholder="0.00"
                            value={row.lessKg}
                            onChange={e => updateItem(idx, 'lessKg', e.target.value)}
                          />
                        </td>
                        <td className="text-end fw-bold bg-light">{netKg.toFixed(3)}</td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control form-control-sm text-end fw-bold"
                            placeholder="0.00"
                            value={row.rate}
                            onChange={e => updateItem(idx, 'rate', e.target.value)}
                          />
                        </td>
                        <td className="text-end fw-bold bg-light">₹{rowTot.toFixed(2)}</td>
                        <td className="text-center">
                          <button className="btn btn-sm btn-outline-danger py-0 px-1" onClick={() => removeItemRow(idx)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="table-secondary fw-bold small">
                  <tr>
                    <td colSpan={3}>TOTAL WEIGHT SUMMARY</td>
                    <td className="text-end">{totalGrossKg.toFixed(3)} KG</td>
                    <td className="text-end text-danger">-{totalLessKg.toFixed(3)} KG</td>
                    <td className="text-end text-primary">{totalNetKg.toFixed(3)} KG</td>
                    <td></td>
                    <td className="text-end">₹{itemsSubTotal.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <datalist id="metalList">
              {METAL_CATALOG.map(m => <option key={m.name} value={m.name}>{m.hsn}</option>)}
            </datalist>

            <div className="mt-2 mb-4">
              <button className="btn btn-outline-primary btn-sm fw-bold" onClick={addItemRow}>
                <Plus size={16} /> Add More Item Row
              </button>
            </div>

            <div className="row g-3 g-md-4 border-top pt-3">
              <div className="col-12 col-md-6">
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small fw-bold">Payment Mode</label>
                    <select className="form-select form-select-sm" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                      <option>Cash</option>
                      <option>UPI / GPay</option>
                      <option>RTGS / NEFT / Bank</option>
                      <option>Full Credit (Udhaar)</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold">GST Type</label>
                    <select className="form-select form-select-sm" value={gstType} onChange={e => setGstType(e.target.value)}>
                      <option value="CGST_SGST">Maharashtra (CGST + SGST)</option>
                      <option value="IGST">Out of State (IGST)</option>
                    </select>
                  </div>
                </div>
                <label className="form-label small fw-bold">Remarks / Quality Notes</label>
                <textarea rows="2" className="form-control form-control-sm" placeholder="e.g. Maal Shop par utra..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <div className="col-12 col-md-6">
                <div className="bg-light p-3 rounded border">
                  <div className="d-flex justify-content-between mb-2">
                    <span>Items Sub-Total:</span>
                    <strong>₹{itemsSubTotal.toFixed(2)}</strong>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Add Kanta / Loading (+ ₹):</span>
                    <input type="number" className="form-control form-control-sm w-50 text-end" placeholder="0" value={kantaLoadingCharges} onChange={e => setKantaLoadingCharges(e.target.value)} />
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>GST %:</span>
                    <select className="form-select form-select-sm w-50" value={gstPercent} onChange={e => setGstPercent(Number(e.target.value))}>
                      <option value={0}>0% (Kachchi Parchi / Cash)</option>
                      <option value={18}>18% GST (Metal Standard)</option>
                      <option value={12}>12% GST</option>
                      <option value={5}>5% GST</option>
                    </select>
                  </div>
                  {gstPercent > 0 && (
                    <div className="d-flex justify-content-between text-muted small mb-2">
                      <span>
                        {gstType === 'IGST' ? `IGST (${gstPercent}%)` : `CGST (${gstPercent / 2}%) + SGST (${gstPercent / 2}%)`}:
                      </span>
                      <span>₹{gstAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <hr className="my-2" />
                  <div className="d-flex justify-content-between fs-5 fw-bold mb-2">
                    <span>GRAND TOTAL:</span>
                    <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="fw-bold text-success mb-0">
                      {tab === 'sale' ? 'Abhi Kitna Mila (₹):' : 'Humne Kitna Diya (₹):'}
                    </label>
                    <input
                      type="number"
                      className="form-control form-control-sm w-50 text-end fw-bold border-success"
                      placeholder="0"
                      value={paidAmount}
                      onChange={e => setPaidAmount(e.target.value)}
                    />
                  </div>
                  <div className="d-flex justify-content-between fs-5 fw-bold text-danger pt-2 border-top">
                    <span>BALANCE BAAKI:</span>
                    <span>₹{balanceAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-end">
              <button className={`btn btn-lg w-100 w-md-auto ${tab === 'sale' ? 'btn-success' : 'btn-warning'} fw-bold px-5`} onClick={() => handleSaveVoucher(tab.toUpperCase())}>
                Save {tab.toUpperCase()} &amp; Generate Bill
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: GODOWN STOCK & CONSOLIDATION TO SHOP */}
        {tab === 'stock' && (
          <div className="row g-4">
            <div className="col-12 col-md-8">
              <div className="card border-0 shadow-sm p-3">
                <h5 className="fw-bold mb-2">Live Metal Stock Position (Shop vs. Site / Yard)</h5>
                <small className="text-muted d-block mb-3">Site (Location 2) ka maal 2-3 din baad Shop par shift hota hai.</small>
                <div className="table-responsive">
                  <table className="table table-bordered table-sm align-middle small" style={{ minWidth: '550px' }}>
                    <thead className="table-dark">
                      <tr>
                        <th>Metal Item</th>
                        <th>HSN</th>
                        <th className="text-end">Main Shop (KG)</th>
                        <th className="text-end">Location 2 / Site (KG)</th>
                        <th className="text-end">Total Combined Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryRows.map(r => (
                        <tr key={r.name}>
                          <td className="fw-bold">{r.name}</td>
                          <td className="text-primary fw-semibold">{r.hsn}</td>
                          <td className="text-end fw-bold text-success">{r.shopNet.toFixed(2)} KG</td>
                          <td className="text-end fw-semibold text-warning">{r.site2Net.toFixed(2)} KG</td>
                          <td className="text-end fw-bold text-primary">{r.totalNet.toFixed(2)} KG</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="card border-0 shadow-sm p-3">
                <h5 className="fw-bold mb-2"><ArrowLeftRight size={18} /> Shift Site Stock to Shop</h5>
                <small className="text-muted d-block mb-3">Location 2 se sara maal Main Shop par shift karne ke liye:</small>
                <form onSubmit={handleSaveTransfer}>
                  <input type="date" className="form-control form-control-sm mb-2" value={transferForm.transferDate} onChange={e => setTransferForm({ ...transferForm, transferDate: e.target.value })} required />
                  <div className="mb-2">
                    <label className="small fw-bold">Kahan Se (Source)</label>
                    <select className="form-select form-select-sm" value={transferForm.fromLocation} onChange={e => setTransferForm({ ...transferForm, fromLocation: e.target.value })}>
                      {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="small fw-bold">Kahan Bheja (Destination)</label>
                    <select className="form-select form-select-sm" value={transferForm.toLocation} onChange={e => setTransferForm({ ...transferForm, toLocation: e.target.value })}>
                      {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <input type="text" list="metalList" className="form-control form-control-sm mb-2" placeholder="Metal Item Name" value={transferForm.itemName} onChange={e => setTransferForm({ ...transferForm, itemName: e.target.value })} required />
                  <input type="number" step="0.01" className="form-control form-control-sm mb-3" placeholder="Net Weight Shifted (KG)" value={transferForm.netKg} onChange={e => setTransferForm({ ...transferForm, netKg: e.target.value })} required />
                  <button className="btn btn-success w-100 fw-bold btn-sm">Record Stock Transfer</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: FIELD CASH HISAB */}
        {tab === 'field' && (
          <div className="row g-4">
            <div className="col-12 col-md-5">
              <div className="card p-3 border-0 shadow-sm">
                <h5 className="fw-bold mb-3">Aaj Ka Field Cash &amp; Kharcha Hisab</h5>
                <form onSubmit={handleSaveTrip}>
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="small fw-bold">Date</label>
                      <input type="date" className="form-control form-control-sm" value={tripForm.tripDate} onChange={e => setTripForm({ ...tripForm, tripDate: e.target.value })} required />
                    </div>
                    <div className="col-6">
                      <label className="small fw-bold">Location / Site</label>
                      <select className="form-select form-select-sm" value={tripForm.locationName} onChange={e => setTripForm({ ...tripForm, locationName: e.target.value })}>
                        {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="small fw-bold text-primary">1. Subah Kitna Rupees Lekar Gaye (₹)</label>
                    <input type="number" className="form-control fw-bold" placeholder="e.g. 100000" value={tripForm.cashTaken} onChange={e => setTripForm({ ...tripForm, cashTaken: e.target.value })} required />
                  </div>

                  <div className="row g-2 mb-2">
                    <div className="col-7">
                      <label className="small fw-bold">2. Cash Mein Maal Laaye (₹)</label>
                      <input type="number" className="form-control form-control-sm" value={tripForm.maalPurchasedCash} onChange={e => setTripForm({ ...tripForm, maalPurchasedCash: e.target.value })} />
                    </div>
                    <div className="col-5">
                      <label className="small fw-bold">Wazan (KG)</label>
                      <input type="number" step="0.01" className="form-control form-control-sm" value={tripForm.maalWeightKg} onChange={e => setTripForm({ ...tripForm, maalWeightKg: e.target.value })} />
                    </div>
                  </div>

                  <div className="p-2 bg-light border rounded mb-2">
                    <div className="small fw-bold mb-1">3. Waha Par Kya-Kya Kharcha Hua (₹):</div>
                    <div className="row g-2">
                      <div className="col-3">
                        <label className="small text-muted">Diesel</label>
                        <input type="number" className="form-control form-control-sm" value={tripForm.expTransport} onChange={e => setTripForm({ ...tripForm, expTransport: e.target.value })} />
                      </div>
                      <div className="col-3">
                        <label className="small text-muted">Hamali</label>
                        <input type="number" className="form-control form-control-sm" value={tripForm.expLabour} onChange={e => setTripForm({ ...tripForm, expLabour: e.target.value })} />
                      </div>
                      <div className="col-3">
                        <label className="small text-muted">Kanta</label>
                        <input type="number" className="form-control form-control-sm" value={tripForm.expKata} onChange={e => setTripForm({ ...tripForm, expKata: e.target.value })} />
                      </div>
                      <div className="col-3">
                        <label className="small text-muted">Other</label>
                        <input type="number" className="form-control form-control-sm" value={tripForm.expFoodOther} onChange={e => setTripForm({ ...tripForm, expFoodOther: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <div className="alert alert-success py-2 d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold">4. Wapas Kitna Cash Bacha:</span>
                    <span className="fs-5 fw-bold">₹{cashReturned.toLocaleString('en-IN')}</span>
                  </div>

                  <input type="text" className="form-control form-control-sm mb-3" placeholder="Remarks..." value={tripForm.remarks} onChange={e => setTripForm({ ...tripForm, remarks: e.target.value })} />
                  <button type="submit" className="btn btn-dark w-100 fw-bold">Save Field Cash Hisab</button>
                </form>
              </div>
            </div>

            <div className="col-12 col-md-7">
              <div className="card p-3 border-0 shadow-sm">
                <h5 className="fw-bold mb-3">Daily Field Cash Register</h5>
                <div className="table-responsive">
                  <table className="table table-sm table-bordered align-middle small" style={{ minWidth: '500px' }}>
                    <thead className="table-dark">
                      <tr>
                        <th>Date &amp; Site</th>
                        <th>Lekar Gaye</th>
                        <th>Maal Laaye</th>
                        <th>Kharcha</th>
                        <th>Wapas Bacha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trips.map(t => (
                        <tr key={t._id}>
                          <td><strong>{formatDateDDMMYYYY(t.tripDate)}</strong><br /><span className="badge bg-secondary">{t.locationName}</span></td>
                          <td className="fw-bold text-primary">₹{Number(t.cashTaken).toLocaleString('en-IN')}</td>
                          <td>₹{Number(t.maalPurchasedCash).toLocaleString('en-IN')}<br /><small className="text-muted">{t.maalWeightKg} KG</small></td>
                          <td className="text-danger">
                            ₹{Number((t.expTransport || 0) + (t.expLabour || 0) + (t.expKata || 0) + (t.expFoodOther || 0)).toLocaleString('en-IN')}
                            <br /><small className="text-muted">{t.remarks}</small>
                          </td>
                          <td className="fw-bold text-success fs-6">₹{Number(t.cashReturned).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PARTY KHATA */}
        {tab === 'ledger' && (
          <div className="card p-3 border-0 shadow-sm">
            <div className="row g-2 mb-3">
              <div className="col-6 col-md-3">
                <select className="form-select form-select-sm" value={filterLoc} onChange={e => setFilterLoc(e.target.value)}>
                  <option value="All">All Locations</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="col-6 col-md-3">
                <select className="form-select form-select-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="All">All Entries</option>
                  <option value="PURCHASE">Only Purchases</option>
                  <option value="SALE">Only Sales</option>
                </select>
              </div>
              <div className="col-12 col-md-6">
                <input type="text" className="form-control form-control-sm" placeholder="Search Party Name, Item, or Voucher No..." value={searchParty} onChange={e => setSearchParty(e.target.value)} />
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-sm table-bordered align-middle small" style={{ minWidth: '800px' }}>
                <thead className="table-dark">
                  <tr>
                    <th>Date</th>
                    <th>Voucher</th>
                    <th>Type</th>
                    <th>Site</th>
                    <th>Party Name</th>
                    <th>Items</th>
                    <th>Grand Total</th>
                    <th>Balance Baaki</th>
                    <th>Bill</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers
                    .filter(v => (filterLoc === 'All' || v.locationName === filterLoc))
                    .filter(v => (filterType === 'All' || v.voucherType === filterType))
                    .filter(v => v.partyName.toLowerCase().includes(searchParty.toLowerCase()) || v.voucherNo.toLowerCase().includes(searchParty.toLowerCase()))
                    .map(v => (
                      <tr key={v._id}>
                        <td>{formatDateDDMMYYYY(v.voucherDate)}</td>
                        <td className="fw-bold">{v.voucherNo}</td>
                        <td><span className={`badge ${v.voucherType === 'SALE' ? 'bg-success' : 'bg-warning text-dark'}`}>{v.voucherType}</span></td>
                        <td>{v.locationName}</td>
                        <td className="fw-bold">{v.partyName}</td>
                        <td>
                          {v.items.map((it, i) => (
                            <div key={i}>
                              • <strong>{it.itemName}</strong>: <strong>{it.netKg} KG</strong> × ₹{it.rate} = ₹{Number(it.lineTotal).toLocaleString('en-IN')}
                            </div>
                          ))}
                        </td>
                        <td className="fw-bold">₹{Number(v.grandTotal).toLocaleString('en-IN')}</td>
                        <td className="fw-bold text-danger">
                          {v.balanceAmount > 0 ? (
                            <>
                              ₹{Number(v.balanceAmount).toLocaleString('en-IN')}{' '}
                              <button className="btn btn-outline-success btn-sm py-0 px-1" onClick={() => handleSettleBalance(v)}>Settle</button>
                            </>
                          ) : <span className="text-success">✓ Cleared</span>}
                        </td>
                        <td>
                          <button className="btn btn-sm btn-outline-dark me-1" onClick={() => setPrintVoucher(v)}><Printer size={13} /></button>
                          <button className="btn btn-sm btn-outline-success" onClick={() => shareOnWhatsApp(v)}><Share2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: WORKERS */}
        {tab === 'workers' && (
          <div className="row g-4">
            <div className="col-12 col-md-4">
              <div className="card p-3 border-0 shadow-sm">
                <h5 className="fw-bold mb-3">Worker Hazri &amp; Upaad Entry</h5>
                <form onSubmit={handleSaveWorker}>
                  <input type="date" className="form-control form-control-sm mb-2" value={workerForm.logDate} onChange={e => setWorkerForm({ ...workerForm, logDate: e.target.value })} required />
                  <input type="text" className="form-control form-control-sm mb-2" placeholder="Worker Name" value={workerForm.workerName} onChange={e => setWorkerForm({ ...workerForm, workerName: e.target.value })} required />
                  <select className="form-select form-select-sm mb-2" value={workerForm.locationName} onChange={e => setWorkerForm({ ...workerForm, locationName: e.target.value })}>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <select className="form-select form-select-sm mb-2" value={workerForm.attendance} onChange={e => setWorkerForm({ ...workerForm, attendance: e.target.value })}>
                    <option value="Present">Full Day Present</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Absent">Absent</option>
                  </select>
                  <input type="number" className="form-control form-control-sm mb-2" placeholder="Upaad / Advance Given Today (₹)" value={workerForm.upaadAdvance} onChange={e => setWorkerForm({ ...workerForm, upaadAdvance: e.target.value })} />
                  <input type="text" className="form-control form-control-sm mb-3" placeholder="Remarks" value={workerForm.remarks} onChange={e => setWorkerForm({ ...workerForm, remarks: e.target.value })} />
                  <button className="btn btn-dark btn-sm w-100 fw-bold">Save Worker Entry</button>
                </form>
              </div>
            </div>

            <div className="col-12 col-md-8">
              <div className="card p-3 border-0 shadow-sm">
                <h5 className="fw-bold mb-3">Worker Attendance &amp; Upaad Register</h5>
                <div className="table-responsive">
                  <table className="table table-sm table-bordered small" style={{ minWidth: '500px' }}>
                    <thead className="table-dark">
                      <tr>
                        <th>Date</th>
                        <th>Worker Name</th>
                        <th>Site</th>
                        <th>Attendance</th>
                        <th>Upaad Taken (₹)</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workerLogs.map(w => (
                        <tr key={w._id}>
                          <td>{formatDateDDMMYYYY(w.logDate)}</td>
                          <td className="fw-bold">{w.workerName}</td>
                          <td>{w.locationName}</td>
                          <td><span className={`badge ${w.attendance === 'Present' ? 'bg-success' : 'bg-secondary'}`}>{w.attendance}</span></td>
                          <td className="fw-bold text-danger">₹{w.upaadAdvance}</td>
                          <td>{w.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}