import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import * as XLSX from 'xlsx';
import { 
  Wallet, CreditCard, TrendingUp, Calendar, Plus, Shield, Check, Clock,
  PieChart, Tag, ArrowUpRight, ArrowDownRight, Car, Home, ShoppingBag, 
  Utensils, Briefcase, Gift, Zap, X, Eye, EyeOff, LayoutDashboard, Download, 
  Layers, Calculator, BarChart3, Pencil, Trash2, Layers3, Flame, Filter,
  Upload, FileSpreadsheet, FileJson
} from 'lucide-react';

// --- CONFIGURAZIONE FIREBASE ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
let app, db, auth;

if (isFirebaseConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  auth = getAuth(app);
}

const CATEGORIES_INVESTMENT = [
  'ETF Azionari',
  'ETF Obbligazionari',
  'Multiasset',
  'Materie Prime',
  'Settoriali',
  'Titoli di Stato',
  'Crypto',
  'Altro'
];

const CATEGORIES_BILLS = [
  'Luce & Gas',
  'Utenze Acqua & Rifiuti',
  'Casa (Mutuo / Affitto)',
  'Internet & Telefono',
  'Abbonamenti & Streaming',
  'Assicurazioni',
  'Altro'
];

const initialData = {
  salaryInput: 2650,
  accounts: [
    { id: '1', name: 'Conto Corrente Principale', type: 'banca', balance: 4250.00, iban: 'IT60X0542811101000000123456' },
    { id: '2', name: 'Carta Prepagata', type: 'carta', balance: 350.50, iban: 'IT99Y0300000000000009876543' },
    { id: '3', name: 'Fondo Deposito BBVA', type: 'risparmio', balance: 12000.00, iban: 'IT12A000000000000000111222' },
  ],
  bills: [
    { id: '1', title: 'Bolletta Luce Enel', amount: 85.40, dueDate: '2026-11-18', category: 'Luce & Gas', status: 'pending' },
    { id: '2', title: 'Bolletta Gas Eni Plenitude', amount: 112.30, dueDate: '2026-11-24', category: 'Luce & Gas', status: 'pending' },
    { id: '3', title: 'Internet Fibra Fastweb', amount: 29.90, dueDate: '2026-11-25', category: 'Internet & Telefono', status: 'paid' },
    { id: '4', title: 'Rata Mutuo Casa', amount: 750.00, dueDate: '2026-12-01', category: 'Casa (Mutuo / Affitto)', status: 'pending' },
    { id: '5', title: 'TARI / Tassa Rifiuti', amount: 64.00, dueDate: '2026-12-10', category: 'Utenze Acqua & Rifiuti', status: 'pending' },
    { id: '6', title: 'Abbonamento Netflix / Prime', amount: 17.99, dueDate: '2026-11-30', category: 'Abbonamenti & Streaming', status: 'paid' },
  ],
  investments: [
    { id: '1', name: 'Vanguard FTSE All-World (VWCE)', category: 'ETF Azionari', invested: 10000.00, currentValue: 11850.00 },
    { id: '2', name: 'iShares Global Aggregate Bond (AGGH)', category: 'ETF Obbligazionari', invested: 4000.00, currentValue: 4050.00 },
    { id: '3', name: 'Vanguard LifeStrategy 80', category: 'Multiasset', invested: 3000.00, currentValue: 3240.00 },
    { id: '4', name: 'WisdomTree Physical Gold', category: 'Materie Prime', invested: 1500.00, currentValue: 1720.00 },
    { id: '5', name: 'iShares Semiconductor (SEMI)', category: 'Settoriali', invested: 2000.00, currentValue: 2450.00 },
    { id: '6', name: 'BTP Valore Ottobre 2028', category: 'Titoli di Stato', invested: 5000.00, currentValue: 5110.00 }
  ],
  transactions: [
    { id: '1', date: '2026-11-10', title: 'Stipendio Accreditato', amount: 2650.00, type: 'income', category: 'Lavoro', accountId: '1' },
    { id: '2', date: '2026-11-09', title: 'Spesa Supermercato', amount: 184.30, type: 'expense', category: 'Alimentari', accountId: '2' },
    { id: '3', date: '2026-11-08', title: 'Rifornimento Carburante', amount: 65.00, type: 'expense', category: 'Trasporti', accountId: '2' },
    { id: '4', date: '2026-11-07', title: 'Rata Mutuo / Affitto', amount: 750.00, type: 'expense', category: 'Casa', accountId: '1' },
    { id: '5', date: '2026-11-05', title: 'Bolletta Luce', amount: 85.40, type: 'expense', category: 'Utenze', accountId: '1' },
    { id: '6', date: '2026-11-02', title: 'Cena Ristorante', amount: 45.00, type: 'expense', category: 'Shopping', accountId: '2' },
  ]
};

const categoryConfig = {
  'Alimentari': { icon: Utensils, bg: 'bg-amber-500/10', text: 'text-amber-500', color: '#F59E0B' },
  'Trasporti': { icon: Car, bg: 'bg-purple-500/10', text: 'text-purple-500', color: '#8B5CF6' },
  'Casa': { icon: Home, bg: 'bg-orange-500/10', text: 'text-orange-500', color: '#F97316' },
  'Lavoro': { icon: Briefcase, bg: 'bg-emerald-500/10', text: 'text-emerald-500', color: '#10B981' },
  'Shopping': { icon: ShoppingBag, bg: 'bg-blue-500/10', text: 'text-blue-500', color: '#3B82F6' },
  'Utenze': { icon: Zap, bg: 'bg-rose-500/10', text: 'text-rose-500', color: '#F43F5E' },
  'Altro': { icon: Tag, bg: 'bg-slate-500/10', text: 'text-slate-500', color: '#64748B' },
};

const budgetRules = [
  { name: 'Spese Essenziali (Mutuo/Utenze/Cibo)', pct: 55, color: '#3B82F6', textClass: 'text-blue-400' },
  { name: 'Risparmi & Investimenti Lungo Termine', pct: 15, color: '#10B981', textClass: 'text-emerald-400' },
  { name: 'Obiettivi & Progetti Breve Termine', pct: 15, color: '#8B5CF6', textClass: 'text-purple-400' },
  { name: 'Investimenti Strategici / Debiti', pct: 10, color: '#F59E0B', textClass: 'text-amber-400' },
  { name: 'Spese Personali & Svago', pct: 5, color: '#EC4899', textClass: 'text-pink-400' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [investSubTab, setInvestSubTab] = useState('all');
  
  const [user, setUser] = useState(null);
  const [data, setData] = useState(() => {
    const local = localStorage.getItem('finanza_app_data');
    return local ? JSON.parse(local) : initialData;
  });
  const [showValues, setShowValues] = useState(true);

  const jsonInputRef = useRef(null);
  const excelInputRef = useRef(null);

  // Modali State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [newTx, setNewTx] = useState({ 
    title: '', 
    amount: '', 
    type: 'expense', 
    category: 'Alimentari', 
    accountId: '1', 
    date: new Date().toISOString().split('T')[0] 
  });

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountForm, setAccountForm] = useState({ name: '', type: 'banca', balance: '', iban: '' });

  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [investmentForm, setInvestmentForm] = useState({ name: '', category: 'ETF Azionari', invested: '', currentValue: '' });

  const [showBillModal, setShowBillModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [billForm, setBillForm] = useState({ title: '', amount: '', dueDate: '', category: 'Luce & Gas', status: 'pending' });

  const [simSalary, setSimSalary] = useState(data.salaryInput || 2650);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const userDocRef = doc(db, 'users', u.uid);
        onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const val = docSnap.data();
            setData(val);
            if (val.salaryInput) setSimSalary(val.salaryInput);
          }
        });
      } else {
        await signInAnonymously(auth);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const updateData = (newData) => {
    setData(newData);
    localStorage.setItem('finanza_app_data', JSON.stringify(newData));
    if (user && isFirebaseConfigured) {
      setDoc(doc(db, 'users', user.uid), newData);
    }
  };

  // --- TOTALI PATRIMONIO ---
  const totalBankBalance = useMemo(() => data.accounts.reduce((sum, a) => sum + Number(a.balance), 0), [data.accounts]);
  const totalInvestedCarico = useMemo(() => data.investments.reduce((sum, i) => sum + Number(i.invested), 0), [data.investments]);
  const totalInvestedCurrent = useMemo(() => data.investments.reduce((sum, i) => sum + Number(i.currentValue), 0), [data.investments]);
  const pendingBills = useMemo(() => data.bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + Number(b.amount), 0), [data.bills]);
  const netWorth = totalBankBalance + totalInvestedCurrent - pendingBills;
  const totalGainAbs = totalInvestedCurrent - totalInvestedCarico;
  const totalROI = totalInvestedCarico > 0 ? (totalGainAbs / totalInvestedCarico) * 100 : 0;

  // --- DASHBOARD SPESE ---
  const monthlyExpensesData = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    const expenses = data.transactions.filter(tx => tx.type === 'expense');
    const monthExpenses = expenses.filter(tx => tx.date.startsWith(currentMonthPrefix));
    const activeExpensesList = monthExpenses.length > 0 ? monthExpenses : expenses;
    
    const totalSpent = activeExpensesList.reduce((sum, tx) => sum + Number(tx.amount), 0);

    const categoriesSum = {};
    activeExpensesList.forEach(tx => {
      categoriesSum[tx.category] = (categoriesSum[tx.category] || 0) + Number(tx.amount);
    });

    const categoriesList = Object.keys(categoriesSum).map(cat => ({
      name: cat,
      amount: categoriesSum[cat],
      pct: totalSpent > 0 ? (categoriesSum[cat] / totalSpent) * 100 : 0,
      color: categoryConfig[cat]?.color || '#64748B'
    })).sort((a,b) => b.amount - a.amount);

    return { totalSpent, categoriesList };
  }, [data.transactions]);

  // --- INVESTIMENTI ---
  const investmentCategories = useMemo(() => {
    const groups = {};
    data.investments.forEach(inv => {
      groups[inv.category] = (groups[inv.category] || 0) + Number(inv.currentValue);
    });
    const total = totalInvestedCurrent || 1;
    const categoryColors = {
      'ETF Azionari': '#3B82F6',
      'ETF Obbligazionari': '#10B981',
      'Multiasset': '#8B5CF6',
      'Materie Prime': '#F59E0B',
      'Settoriali': '#EC4899',
      'Titoli di Stato': '#06B6D4',
      'Crypto': '#F97316',
      'Altro': '#64748B'
    };
    return Object.keys(groups).map(cat => ({
      name: cat,
      amount: groups[cat],
      pct: (groups[cat] / total) * 100,
      color: categoryColors[cat] || '#64748B'
    })).sort((a,b) => b.amount - a.amount);
  }, [data.investments, totalInvestedCurrent]);

  // --- SCADENZIARIO UTENZE ---
  const billsAnalytics = useMemo(() => {
    const categories = {};
    let luceGasTotal = 0;
    let luceGasCount = 0;

    data.bills.forEach(bill => {
      const amt = Number(bill.amount);
      categories[bill.category] = (categories[bill.category] || 0) + amt;
      if (bill.category === 'Luce & Gas') {
        luceGasTotal += amt;
        luceGasCount += 1;
      }
    });

    const totalAllBills = data.bills.reduce((sum, b) => sum + Number(b.amount), 0) || 1;
    const categoryColors = {
      'Luce & Gas': '#F59E0B',
      'Utenze Acqua & Rifiuti': '#06B6D4',
      'Casa (Mutuo / Affitto)': '#3B82F6',
      'Internet & Telefono': '#8B5CF6',
      'Abbonamenti & Streaming': '#EC4899',
      'Assicurazioni': '#10B981',
      'Altro': '#64748B'
    };

    const categoryList = Object.keys(categories).map(cat => ({
      name: cat,
      amount: categories[cat],
      pct: (categories[cat] / totalAllBills) * 100,
      color: categoryColors[cat] || '#64748B'
    })).sort((a,b) => b.amount - a.amount);

    return { categoryList, luceGasTotal, luceGasCount, totalAllBills };
  }, [data.bills]);

  // --- HANDLER TRANSAZIONI ---
  const handleOpenAddTx = () => {
    setEditingTx(null);
    setNewTx({ 
      title: '', 
      amount: '', 
      type: 'expense', 
      category: 'Alimentari', 
      accountId: data.accounts[0]?.id || '1', 
      date: new Date().toISOString().split('T')[0] 
    });
    setShowAddModal(true);
  };

  const handleOpenEditTx = (tx) => {
    setEditingTx(tx);
    setNewTx({ 
      title: tx.title, 
      amount: tx.amount.toString(), 
      type: tx.type, 
      category: tx.category, 
      accountId: tx.accountId || data.accounts[0]?.id || '1', 
      date: tx.date 
    });
    setShowAddModal(true);
  };

  const handleSaveTx = (e) => {
    e.preventDefault();
    if (!newTx.title || !newTx.amount) return;
    const newAmt = parseFloat(newTx.amount);

    if (editingTx) {
      const oldAmt = editingTx.amount;
      const oldType = editingTx.type;
      const oldAccId = editingTx.accountId;
      const targetAccId = newTx.accountId;

      const updatedAccounts = data.accounts.map(acc => {
        let bal = acc.balance;
        if (acc.id === oldAccId) {
          bal += (oldType === 'income' ? -oldAmt : oldAmt);
        }
        if (acc.id === targetAccId) {
          bal += (newTx.type === 'income' ? newAmt : -newAmt);
        }
        return { ...acc, balance: bal };
      });

      const updatedTxList = data.transactions.map(t => 
        t.id === editingTx.id ? { ...newTx, id: editingTx.id, amount: newAmt } : t
      );

      updateData({ ...data, accounts: updatedAccounts, transactions: updatedTxList });
    } else {
      const updatedAccounts = data.accounts.map(acc => 
        acc.id === newTx.accountId 
          ? { ...acc, balance: acc.balance + (newTx.type === 'income' ? newAmt : -newAmt) } 
          : acc
      );
      const updatedTxList = [{ ...newTx, id: Date.now().toString(), amount: newAmt }, ...data.transactions];
      updateData({ ...data, accounts: updatedAccounts, transactions: updatedTxList });
    }

    setShowAddModal(false);
  };

  const handleDeleteTx = (tx) => {
    if (window.confirm(`Eliminare il movimento "${tx.title}" di € ${tx.amount}?`)) {
      const amt = Number(tx.amount);
      const updatedAccounts = data.accounts.map(acc => 
        acc.id === tx.accountId 
          ? { ...acc, balance: acc.balance + (tx.type === 'income' ? -amt : amt) } 
          : acc
      );
      const updatedTxList = data.transactions.filter(t => t.id !== tx.id);
      updateData({ ...data, accounts: updatedAccounts, transactions: updatedTxList });
    }
  };

  // --- HANDLER CONTI ---
  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setAccountForm({ name: '', type: 'banca', balance: '', iban: '' });
    setShowAccountModal(true);
  };

  const handleOpenEditAccount = (acc) => {
    setEditingAccount(acc);
    setAccountForm({ name: acc.name, type: acc.type, balance: acc.balance.toString(), iban: acc.iban || '' });
    setShowAccountModal(true);
  };

  const handleSaveAccount = (e) => {
    e.preventDefault();
    if (!accountForm.name || accountForm.balance === '') return;
    const bal = parseFloat(accountForm.balance);

    if (editingAccount) {
      const updatedAccs = data.accounts.map(a => 
        a.id === editingAccount.id ? { ...a, name: accountForm.name, type: accountForm.type, balance: bal, iban: accountForm.iban } : a
      );
      updateData({ ...data, accounts: updatedAccs });
    } else {
      const newAcc = { id: Date.now().toString(), name: accountForm.name, type: accountForm.type, balance: bal, iban: accountForm.iban };
      updateData({ ...data, accounts: [...data.accounts, newAcc] });
    }
    setShowAccountModal(false);
  };

  const handleDeleteAccount = (id) => {
    if (data.accounts.length <= 1) {
      alert("Devi mantenere almeno un conto attivo!");
      return;
    }
    if (window.confirm("Eliminare questo conto?")) {
      updateData({ ...data, accounts: data.accounts.filter(a => a.id !== id) });
    }
  };

  // --- HANDLER INVESTIMENTI ---
  const handleOpenAddInvestment = () => {
    setEditingInvestment(null);
    setInvestmentForm({ name: '', category: 'ETF Azionari', invested: '', currentValue: '' });
    setShowInvestmentModal(true);
  };

  const handleOpenEditInvestment = (inv) => {
    setEditingInvestment(inv);
    setInvestmentForm({ name: inv.name, category: inv.category, invested: inv.invested.toString(), currentValue: inv.currentValue.toString() });
    setShowInvestmentModal(true);
  };

  const handleSaveInvestment = (e) => {
    e.preventDefault();
    if (!investmentForm.name || !investmentForm.invested) return;
    const invVal = parseFloat(investmentForm.invested);
    const currVal = parseFloat(investmentForm.currentValue || investmentForm.invested);

    if (editingInvestment) {
      const updatedInv = data.investments.map(i => 
        i.id === editingInvestment.id ? { ...i, name: investmentForm.name, category: investmentForm.category, invested: invVal, currentValue: currVal } : i
      );
      updateData({ ...data, investments: updatedInv });
    } else {
      const newInv = { id: Date.now().toString(), name: investmentForm.name, category: investmentForm.category, invested: invVal, currentValue: currVal };
      updateData({ ...data, investments: [...data.investments, newInv] });
    }
    setShowInvestmentModal(false);
  };

  const handleDeleteInvestment = (id) => {
    if (window.confirm("Eliminare questo strumento dal portafoglio?")) {
      updateData({ ...data, investments: data.investments.filter(i => i.id !== id) });
    }
  };

  // --- HANDLER SCADENZIARIO & BOLLETTE ---
  const handleOpenAddBill = () => {
    setEditingBill(null);
    setBillForm({ title: '', amount: '', dueDate: new Date().toISOString().split('T')[0], category: 'Luce & Gas', status: 'pending' });
    setShowBillModal(true);
  };

  const handleOpenEditBill = (bill) => {
    setEditingBill(bill);
    setBillForm({ title: bill.title, amount: bill.amount.toString(), dueDate: bill.dueDate, category: bill.category, status: bill.status });
    setShowBillModal(true);
  };

  const handleSaveBill = (e) => {
    e.preventDefault();
    if (!billForm.title || !billForm.amount || !billForm.dueDate) return;
    const amt = parseFloat(billForm.amount);

    if (editingBill) {
      const updatedBills = data.bills.map(b => 
        b.id === editingBill.id ? { ...b, title: billForm.title, amount: amt, dueDate: billForm.dueDate, category: billForm.category, status: billForm.status } : b
      );
      updateData({ ...data, bills: updatedBills });
    } else {
      const newBill = { id: Date.now().toString(), title: billForm.title, amount: amt, dueDate: billForm.dueDate, category: billForm.category, status: billForm.status };
      updateData({ ...data, bills: [...data.bills, newBill] });
    }
    setShowBillModal(false);
  };

  const handleDeleteBill = (id) => {
    if (window.confirm("Eliminare questa scadenza dal registro?")) {
      updateData({ ...data, bills: data.bills.filter(b => b.id !== id) });
    }
  };

  const handleToggleBillStatus = (id) => {
    const updatedBills = data.bills.map(b => b.id === id ? { ...b, status: b.status === 'paid' ? 'pending' : 'paid' } : b);
    updateData({ ...data, bills: updatedBills });
  };

  // --- HANDLERS BACKUP: JSON & EXCEL ---
  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup_finanza_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.accounts)) {
          updateData(parsed);
          alert("Backup JSON importato con successo!");
        } else {
          alert("File JSON non valido per questa applicazione.");
        }
      } catch (err) {
        alert("Errore nella lettura del file JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Foglio Movimenti
    const txData = data.transactions.map(t => ({
      ID: t.id,
      Data: t.date,
      Titolo: t.title,
      Importo: t.amount,
      Tipo: t.type,
      Categoria: t.category,
      ID_Conto: t.accountId
    }));
    const wsTx = XLSX.utils.json_to_sheet(txData);
    XLSX.utils.book_append_sheet(wb, wsTx, "Movimenti");

    // Foglio Conti
    const accData = data.accounts.map(a => ({
      ID: a.id,
      Nome: a.name,
      Tipo: a.type,
      Saldo: a.balance,
      IBAN: a.iban || ''
    }));
    const wsAcc = XLSX.utils.json_to_sheet(accData);
    XLSX.utils.book_append_sheet(wb, wsAcc, "Conti");

    // Foglio Investimenti
    const invData = data.investments.map(i => ({
      ID: i.id,
      Nome: i.name,
      Categoria: i.category,
      Capitale_Investito: i.invested,
      Valore_Attuale: i.currentValue
    }));
    const wsInv = XLSX.utils.json_to_sheet(invData);
    XLSX.utils.book_append_sheet(wb, wsInv, "Investimenti");

    // Foglio Scadenze
    const billData = data.bills.map(b => ({
      ID: b.id,
      Titolo: b.title,
      Importo: b.amount,
      Data_Scadenza: b.dueDate,
      Categoria: b.category,
      Stato: b.status
    }));
    const wsBill = XLSX.utils.json_to_sheet(billData);
    XLSX.utils.book_append_sheet(wb, wsBill, "Scadenze");

    XLSX.writeFile(wb, `finanza_famiglia_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const dataBuffer = new Uint8Array(event.target.result);
        const workbook = XLSX.read(dataBuffer, { type: 'array' });

        const importedData = { ...data };

        if (workbook.SheetNames.includes("Movimenti")) {
          const rawTx = XLSX.utils.sheet_to_json(workbook.Sheets["Movimenti"]);
          importedData.transactions = rawTx.map(t => ({
            id: String(t.ID || Date.now()),
            date: String(t.Data || new Date().toISOString().split('T')[0]),
            title: String(t.Titolo || ''),
            amount: Number(t.Importo || 0),
            type: String(t.Tipo || 'expense'),
            category: String(t.Categoria || 'Altro'),
            accountId: String(t.ID_Conto || '1')
          }));
        }

        if (workbook.SheetNames.includes("Conti")) {
          const rawAcc = XLSX.utils.sheet_to_json(workbook.Sheets["Conti"]);
          importedData.accounts = rawAcc.map(a => ({
            id: String(a.ID || Date.now()),
            name: String(a.Nome || ''),
            type: String(a.Tipo || 'banca'),
            balance: Number(a.Saldo || 0),
            iban: String(a.IBAN || '')
          }));
        }

        if (workbook.SheetNames.includes("Investimenti")) {
          const rawInv = XLSX.utils.sheet_to_json(workbook.Sheets["Investimenti"]);
          importedData.investments = rawInv.map(i => ({
            id: String(i.ID || Date.now()),
            name: String(i.Nome || ''),
            category: String(i.Categoria || 'Altro'),
            invested: Number(i.Capitale_Investito || 0),
            currentValue: Number(i.Valore_Attuale || i.Capitale_Investito || 0)
          }));
        }

        if (workbook.SheetNames.includes("Scadenze")) {
          const rawBills = XLSX.utils.sheet_to_json(workbook.Sheets["Scadenze"]);
          importedData.bills = rawBills.map(b => ({
            id: String(b.ID || Date.now()),
            title: String(b.Titolo || ''),
            amount: Number(b.Importo || 0),
            dueDate: String(b.Data_Scadenza || ''),
            category: String(b.Categoria || 'Altro'),
            status: String(b.Stato || 'pending')
          }));
        }

        updateData(importedData);
        alert("Dati aggiornati con successo dal file Excel!");
      } catch (err) {
        alert("Errore nell'elaborazione del file Excel. Verifica la struttura dei fogli.");
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const formatEuro = (v) => showValues ? `€ ${v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'accounts', label: 'Conti & Carte', icon: Wallet },
    { id: 'investments', label: 'Investimenti & Grafici', icon: TrendingUp },
    { id: 'bills', label: 'Scadenziario & Utenze', icon: Calendar },
    { id: 'simulator', label: 'Simulatore Stipendio', icon: Calculator },
    { id: 'transactions', label: 'Movimenti', icon: Layers },
    { id: 'backup', label: 'Backup & Cloud', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-900/50 p-6 space-y-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/30">
            F
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight text-white">Finanza Famiglia</h1>
            <span className="text-[11px] text-slate-400">Cloud Sync Attivo</span>
          </div>
        </div>

        <nav className="space-y-1.5 flex-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition ${
                  active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <button 
          onClick={handleOpenAddTx}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nuovo Movimento
        </button>
      </aside>

      {/* HEADER MOBILE */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-30">
        <h1 className="font-bold text-base text-white">Finanza Famiglia</h1>
        <button onClick={() => setShowValues(!showValues)} className="text-slate-400">
          {showValues ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto max-w-6xl mx-auto w-full pb-28 md:pb-8">
        
        {/* TOP CARDS PATRIMONIO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-500/20 shadow-xl">
            <span className="text-xs text-blue-400 font-semibold block mb-1">Patrimonio Netto</span>
            <span className="text-2xl md:text-3xl font-extrabold text-white">{formatEuro(netWorth)}</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <span className="text-xs text-slate-400 font-semibold block mb-1">Liquidità Conti</span>
            <span className="text-2xl md:text-3xl font-extrabold text-emerald-400">{formatEuro(totalBankBalance)}</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <span className="text-xs text-rose-400 font-semibold block mb-1">Spese del Mese</span>
            <span className="text-2xl md:text-3xl font-extrabold text-rose-400">{formatEuro(monthlyExpensesData.totalSpent)}</span>
          </div>
        </div>

        {/* 1. DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-rose-400" /> Analisi Spese del Mese (%)
                </h3>
                <span className="text-xs text-slate-400 font-medium">Totale: {formatEuro(monthlyExpensesData.totalSpent)}</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
                <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1E293B" strokeWidth="4.5" />
                    {monthlyExpensesData.categoriesList.reduce((acc, cat, idx) => {
                      const dasharray = `${cat.pct} ${100 - cat.pct}`;
                      const offset = acc.offset;
                      acc.offset -= cat.pct;
                      acc.paths.push(
                        <path
                          key={idx}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke={cat.color}
                          strokeWidth="4.5"
                          strokeDasharray={dasharray}
                          strokeDashoffset={offset}
                        />
                      );
                      return acc;
                    }, { offset: 0, paths: [] }).paths}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-slate-400 uppercase">Totale Uscite</span>
                    <span className="text-sm font-bold text-white">{formatEuro(monthlyExpensesData.totalSpent)}</span>
                  </div>
                </div>

                <div className="space-y-3 w-full">
                  {monthlyExpensesData.categoriesList.map((cat, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-slate-300 font-medium">{cat.name}</span>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <span className="font-bold text-white">{formatEuro(cat.amount)}</span>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{cat.pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden flex">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${cat.pct}%`, backgroundColor: cat.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-bold text-white">Ultimi Movimenti</h2>
                  <button onClick={() => setActiveTab('transactions')} className="text-xs text-blue-400 hover:underline">Vedi Tutti</button>
                </div>
                <div className="space-y-3">
                  {data.transactions.slice(0, 5).map(tx => {
                    const cat = categoryConfig[tx.category] || categoryConfig['Altro'];
                    const Icon = cat.icon;
                    const isInc = tx.type === 'income';
                    return (
                      <div key={tx.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800/80">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.bg} ${cat.text}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{tx.title}</p>
                            <p className="text-xs text-slate-500">{tx.date} • {tx.category}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${isInc ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {isInc ? '+' : '-'}{formatEuro(tx.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-bold text-white">Conti & Saldi</h2>
                  <button onClick={() => setActiveTab('accounts')} className="text-xs text-blue-400 hover:underline">Gestisci</button>
                </div>
                <div className="space-y-3">
                  {data.accounts.map(acc => (
                    <div key={acc.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-semibold text-white">{acc.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{acc.type}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-400">{formatEuro(acc.balance)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 2. CONTI & CARTE TAB */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Conti Correnti e Carte</h2>
                <p className="text-xs text-slate-400">Aggiungi, modifica o rimuovi i tuoi conti e aggiorna i saldi.</p>
              </div>
              <button 
                onClick={handleOpenAddAccount} 
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-600/30 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Aggiungi Nuovo Conto
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.accounts.map(acc => (
                <div key={acc.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{acc.type}</span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleOpenEditAccount(acc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Modifica Conto"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteAccount(acc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                        title="Elimina Conto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white">{acc.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 truncate">{acc.iban || 'Nessun IBAN salvato'}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-xs text-slate-400">Saldo Disponibile</span>
                    <span className="text-lg font-extrabold text-emerald-400">{formatEuro(acc.balance)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. INVESTIMENTI & GRAFICI TAB */}
        {activeTab === 'investments' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Analisi Investimenti & Portafoglio</h2>
                <p className="text-xs text-slate-400">Composizione asset class, rendimento e tabella dettagliata</p>
              </div>

              <div className="flex items-center gap-2">
                <div className={`px-3.5 py-2 rounded-xl text-xs font-bold ${totalGainAbs >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                  ROI: {totalGainAbs >= 0 ? '+' : ''}{formatEuro(totalGainAbs)} ({totalROI.toFixed(2)}%)
                </div>
                <button 
                  onClick={handleOpenAddInvestment}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-600/30 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Aggiungi Strumento
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'all', label: 'Tutte le Viste' },
                { id: 'allocation', label: 'Allocazione Asset Class' },
                { id: 'performance', label: 'Rendimento Titoli' },
                { id: 'table', label: 'Tabella Portafoglio' }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setInvestSubTab(sub.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    investSubTab === sub.id 
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' 
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {(investSubTab === 'all' || investSubTab === 'allocation') && (
              <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-purple-400" /> Allocazione per Asset Class
                </h3>

                <div className="flex flex-col md:flex-row items-center gap-8 py-2">
                  <div className="relative w-52 h-52 shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1E293B" strokeWidth="4" />
                      {investmentCategories.reduce((acc, cat, idx) => {
                        const dasharray = `${cat.pct} ${100 - cat.pct}`;
                        const offset = acc.offset;
                        acc.offset -= cat.pct;
                        acc.paths.push(
                          <path
                            key={idx}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke={cat.color}
                            strokeWidth="4"
                            strokeDasharray={dasharray}
                            strokeDashoffset={offset}
                          />
                        );
                        return acc;
                      }, { offset: 0, paths: [] }).paths}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Totale Investito</span>
                      <span className="text-base font-extrabold text-white">{formatEuro(totalInvestedCurrent)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    {investmentCategories.map((cat, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-xs text-slate-200 font-semibold">{cat.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-white block">{formatEuro(cat.amount)}</span>
                          <span className="text-[10px] text-slate-400">{cat.pct.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {(investSubTab === 'all' || investSubTab === 'performance') && (
              <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-400" /> Confronto Prezzo Carico vs Mercato
                </h3>

                <div className="space-y-4 pt-2">
                  {data.investments.map(inv => {
                    const maxVal = Math.max(inv.invested, inv.currentValue);
                    const pctInvested = (inv.invested / maxVal) * 100;
                    const pctCurrent = (inv.currentValue / maxVal) * 100;
                    const isProfit = inv.currentValue >= inv.invested;

                    return (
                      <div key={inv.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">{inv.category}</span>
                            <span className="font-bold text-white">{inv.name}</span>
                          </div>
                          <span className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfit ? '+' : ''}{formatEuro(inv.currentValue - inv.invested)}
                          </span>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center gap-3 text-[11px]">
                            <span className="w-24 text-slate-400 shrink-0">Investito:</span>
                            <div className="flex-1 bg-slate-950 h-2 rounded-full overflow-hidden">
                              <div className="bg-slate-600 h-full rounded-full" style={{ width: `${pctInvested}%` }} />
                            </div>
                            <span className="w-20 text-right font-medium text-slate-300">{formatEuro(inv.invested)}</span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px]">
                            <span className="w-24 text-slate-400 shrink-0">Valore Attuale:</span>
                            <div className="flex-1 bg-slate-950 h-2.5 rounded-full overflow-hidden">
                              <div className={`${isProfit ? 'bg-emerald-500' : 'bg-rose-500'} h-full rounded-full`} style={{ width: `${pctCurrent}%` }} />
                            </div>
                            <span className="w-20 text-right font-bold text-white">{formatEuro(inv.currentValue)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(investSubTab === 'all' || investSubTab === 'table') && (
              <div className="bg-slate-900/60 rounded-3xl border border-slate-800 overflow-hidden space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers3 className="w-5 h-5 text-indigo-400" /> Tabella Analitica Portafoglio
                  </h3>
                  <span className="text-xs text-slate-400">{data.investments.length} strumenti registrati</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-3">Strumento</th>
                        <th className="py-3 px-3">Categoria</th>
                        <th className="py-3 px-3 text-right">Cap. Investito</th>
                        <th className="py-3 px-3 text-right">Valore Attuale</th>
                        <th className="py-3 px-3 text-right">Profitto / Perdita</th>
                        <th className="py-3 px-3 text-right">ROI %</th>
                        <th className="py-3 px-3 text-center">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {data.investments.map(inv => {
                        const gain = inv.currentValue - inv.invested;
                        const roi = inv.invested > 0 ? (gain / inv.invested) * 100 : 0;
                        const isProfit = gain >= 0;

                        return (
                          <tr key={inv.id} className="hover:bg-slate-900/80 transition">
                            <td className="py-3.5 px-3 font-semibold text-white">{inv.name}</td>
                            <td className="py-3.5 px-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap">
                                {inv.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right text-slate-300 font-medium">{formatEuro(inv.invested)}</td>
                            <td className="py-3.5 px-3 text-right text-white font-bold">{formatEuro(inv.currentValue)}</td>
                            <td className={`py-3.5 px-3 text-right font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}{formatEuro(gain)}
                            </td>
                            <td className={`py-3.5 px-3 text-right font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}{roi.toFixed(2)}%
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button 
                                  onClick={() => handleOpenEditInvestment(inv)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                  title="Modifica Strumento"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteInvestment(inv.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                                  title="Elimina Strumento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* 4. SCADENZIARIO & UTENZE TAB */}
        {activeTab === 'bills' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Scadenziario Utenze & Bollette</h2>
                <p className="text-xs text-slate-400">Pianifica i pagamenti ricorsivi, gestisci lo stato delle bollette e monitora le spese per Luce & Gas.</p>
              </div>
              <button 
                onClick={handleOpenAddBill} 
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-lg shadow-amber-600/30 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Nuova Scadenza
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-900/30 to-slate-900 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Utenze Energetiche</span>
                  <Flame className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Focus Luce & Gas</h3>
                  <p className="text-xs text-slate-400 mt-1">{billsAnalytics.luceGasCount} bollette registrate</p>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-400">Totale Spesa:</span>
                  <span className="text-lg font-extrabold text-amber-400">{formatEuro(billsAnalytics.luceGasTotal)}</span>
                </div>
              </div>

              <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ripartizione Spese Utenze per Categoria</h3>
                
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden flex p-0.5 gap-0.5">
                  {billsAnalytics.categoryList.map((cat, idx) => (
                    <div key={idx} style={{ width: `${cat.pct}%`, backgroundColor: cat.color }} className="h-full rounded-sm" title={`${cat.name}: ${cat.pct.toFixed(1)}%`} />
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {billsAnalytics.categoryList.map((cat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-slate-300 font-medium truncate">{cat.name}: <strong className="text-white">{formatEuro(cat.amount)}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Elenco Scadenze Registrate</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.bills.map(bill => {
                  const isPaid = bill.status === 'paid';
                  return (
                    <div key={bill.id} className={`p-4 rounded-2xl border flex justify-between items-center transition ${isPaid ? 'bg-slate-950/40 border-slate-800/50 opacity-70' : 'bg-slate-900 border-slate-800'}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{bill.category}</span>
                          <h4 className="text-sm font-bold text-white">{bill.title}</h4>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Scadenza: {bill.dueDate}</p>
                      </div>

                      <div className="text-right space-y-1.5">
                        <span className="text-base font-extrabold text-white block">{formatEuro(bill.amount)}</span>
                        
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => handleToggleBillStatus(bill.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${isPaid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}
                          >
                            {isPaid ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                            {isPaid ? 'Pagato' : 'In attesa'}
                          </button>

                          <button 
                            onClick={() => handleOpenEditBill(bill)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Modifica Scadenza"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button 
                            onClick={() => handleDeleteBill(bill.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Elimina Scadenza"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* 5. SIMULATORE STIPENDIO TAB */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 p-6 rounded-3xl border border-blue-500/20 space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-blue-400" /> Simulatore Allocazione Stipendio
                  </h2>
                  <p className="text-xs text-slate-400">Pianifica le entrate in base alle regole di budget (5 Bucket Model)</p>
                </div>

                <div className="flex items-center gap-3 bg-slate-900/90 px-4 py-2 rounded-2xl border border-slate-700">
                  <span className="text-xs font-semibold text-slate-400">Stipendio Netto:</span>
                  <span className="text-sm font-bold text-white">€</span>
                  <input 
                    type="number" step="50" 
                    value={simSalary} onChange={e => {
                      const val = Number(e.target.value);
                      setSimSalary(val);
                      updateData({ ...data, salaryInput: val });
                    }}
                    className="w-24 bg-transparent text-lg font-extrabold text-blue-400 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ripartizione Visiva Budget Mensile</h3>
              
              <div className="w-full bg-slate-950 h-5 rounded-xl overflow-hidden flex p-0.5 gap-0.5">
                {budgetRules.map((rule, idx) => (
                  <div 
                    key={idx} 
                    style={{ width: `${rule.pct}%`, backgroundColor: rule.color }} 
                    className="h-full rounded-md transition-all duration-300 hover:opacity-80" 
                    title={`${rule.name}: ${rule.pct}%`}
                  />
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {budgetRules.map((rule, idx) => {
                  const allocatedAmount = (simSalary * rule.pct) / 100;
                  return (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 relative overflow-hidden">
                      <div className="w-1.5 h-full absolute left-0 top-0" style={{ backgroundColor: rule.color }} />
                      <div className="pl-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-300">{rule.name}</span>
                          <span className={`text-xs font-extrabold px-2 py-0.5 rounded ${rule.textClass} bg-slate-950 border border-slate-800`}>
                            {rule.pct}%
                          </span>
                        </div>
                        <div className="text-xl font-extrabold text-white mt-1">
                          {formatEuro(allocatedAmount)}
                        </div>
                        <span className="text-[11px] text-slate-500 block">€ {(allocatedAmount * 12).toLocaleString('it-IT')} / anno</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 6. MOVIMENTI TAB */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Registro Movimenti</h2>
                <p className="text-xs text-slate-400">Aggiungi, modifica o elimina le entrate e le uscite sul tuo conto.</p>
              </div>
              <button onClick={handleOpenAddTx} className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Aggiungi Movimento
              </button>
            </div>

            <div className="space-y-2.5 pt-2">
              {data.transactions.map(tx => {
                const cat = categoryConfig[tx.category] || categoryConfig['Altro'];
                const Icon = cat.icon;
                const isInc = tx.type === 'income';
                const acc = data.accounts.find(a => a.id === tx.accountId);

                return (
                  <div key={tx.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cat.bg} ${cat.text}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{tx.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {tx.date} • <span className="text-slate-400 font-medium">{tx.category}</span> {acc ? `• (${acc.name})` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-base font-extrabold ${isInc ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {isInc ? '+' : '-'}{formatEuro(tx.amount)}
                      </span>

                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleOpenEditTx(tx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Modifica Movimento"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTx(tx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Elimina Movimento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 7. BACKUP & CLOUD TAB (IMPORT/EXPORT JSON & EXCEL) */}
        {activeTab === 'backup' && (
          <div className="space-y-6 max-w-2xl mx-auto py-4">
            <div className="text-center space-y-2">
              <Shield className="w-12 h-12 text-blue-500 mx-auto" />
              <h2 className="text-xl font-bold text-white">Sincronizzazione, Backup e Importazione PC</h2>
              <p className="text-xs text-slate-400">Esporta i dati per lavorarli su PC con Excel o crea backup di ripristino JSON.</p>
            </div>

            {/* NASCOSTI INPUT FILE PER IMPORT */}
            <input type="file" accept=".json" ref={jsonInputRef} onChange={handleImportJSON} className="hidden" />
            <input type="file" accept=".xlsx, .xls" ref={excelInputRef} onChange={handleImportExcel} className="hidden" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              
              {/* SEZIONE EXCEL */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Gestione Excel (.xlsx)</h3>
                    <p className="text-[11px] text-slate-400">Modifica massiva da computer</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <button 
                    onClick={handleExportExcel}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <Download className="w-4 h-4" /> Esporta in Excel
                  </button>

                  <button 
                    onClick={() => excelInputRef.current?.click()}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <Upload className="w-4 h-4" /> Importa da Excel
                  </button>
                </div>
              </div>

              {/* SEZIONE JSON */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <FileJson className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Backup JSON Completo</h3>
                    <p className="text-[11px] text-slate-400">Salvataggio dati grezzi</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <button 
                    onClick={handleExportJSON}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                  >
                    <Download className="w-4 h-4" /> Esporta Backup JSON
                  </button>

                  <button 
                    onClick={() => jsonInputRef.current?.click()}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <Upload className="w-4 h-4" /> Importa File JSON
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* BOTTOM NAV MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-2 py-2 flex items-center gap-1 overflow-x-auto no-scrollbar z-40">
        {menuItems.map(item => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)} 
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl shrink-0 transition ${active ? 'text-blue-500 font-bold' : 'text-slate-500'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* MODALE NUOVO / MODIFICA MOVIMENTO */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base">
                {editingTx ? 'Modifica Transazione' : 'Nuova Transazione'}
              </h3>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveTx} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Titolo / Descrizione</label>
                <input 
                  type="text" placeholder="Es. Spesa Esselunga, Stipendio..." 
                  value={newTx.title} onChange={e => setNewTx({...newTx, title: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500" required 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Importo €</label>
                <input 
                  type="number" step="0.01" placeholder="0.00" 
                  value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500" required 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Tipo Transazione</label>
                  <select 
                    value={newTx.type} onChange={e => setNewTx({...newTx, type: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="expense">Uscita (Spesa)</option>
                    <option value="income">Entrata (Incasso)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Categoria Spesa</label>
                  <select 
                    value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    {Object.keys(categoryConfig).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Data Regolamento</label>
                <input 
                  type="date" 
                  value={newTx.date} onChange={e => setNewTx({...newTx, date: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500" required 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Conto di Addebito / Accredito</label>
                <select 
                  value={newTx.accountId} onChange={e => setNewTx({...newTx, accountId: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs text-white shadow-lg shadow-blue-600/30">
                {editingTx ? 'Salva Modifiche' : 'Salva Movimento'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE CONTO */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base">
                {editingAccount ? 'Modifica Conto' : 'Aggiungi Nuovo Conto'}
              </h3>
              <button onClick={() => setShowAccountModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Nome Conto / Carta</label>
                <input 
                  type="text" placeholder="Es. Conto Intesa, Revolut..." 
                  value={accountForm.name} onChange={e => setAccountForm({...accountForm, name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500" required 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Tipologia Conto</label>
                <select 
                  value={accountForm.type} onChange={e => setAccountForm({...accountForm, type: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="banca">Conto Bancario</option>
                  <option value="carta">Carta Prepagata / Credito</option>
                  <option value="risparmio">Fondo Deposito / Risparmio</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Saldo Iniziale €</label>
                <input 
                  type="number" step="0.01" placeholder="0.00" 
                  value={accountForm.balance} onChange={e => setAccountForm({...accountForm, balance: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500" required 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">IBAN / Riferimento (Opzionale)</label>
                <input 
                  type="text" placeholder="IT00X000000..." 
                  value={accountForm.iban} onChange={e => setAccountForm({...accountForm, iban: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500" 
                />
              </div>

              <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs text-white shadow-lg shadow-blue-600/30">
                {editingAccount ? 'Salva Modifiche' : 'Crea Conto'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE INVESTIMENTO */}
      {showInvestmentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base">
                {editingInvestment ? 'Modifica Strumento Finanziario' : 'Aggiungi Nuovo Strumento'}
              </h3>
              <button onClick={() => setShowInvestmentModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveInvestment} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Nome Strumento / Ticker</label>
                <input 
                  type="text" placeholder="Es. VWCE, AGGH, BTP 2028..." 
                  value={investmentForm.name} onChange={e => setInvestmentForm({...investmentForm, name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500" required 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Asset Class / Categoria</label>
                <select 
                  value={investmentForm.category} onChange={e => setInvestmentForm({...investmentForm, category: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  {CATEGORIES_INVESTMENT.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Capitale Investito € (Prezzo di Carico)</label>
                <input 
                  type="number" step="0.01" placeholder="0.00" 
                  value={investmentForm.invested} onChange={e => setInvestmentForm({...investmentForm, invested: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500" required 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Valore Attuale di Mercato €</label>
                <input 
                  type="number" step="0.01" placeholder="Lascia vuoto se pari all'investito" 
                  value={investmentForm.currentValue} onChange={e => setInvestmentForm({...investmentForm, currentValue: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500" 
                />
              </div>

              <button type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-xs text-white shadow-lg shadow-purple-600/30">
                {editingInvestment ? 'Salva Modifiche' : 'Aggiungi a Portafoglio'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE SCADENZA / BOLLETTA */}
      {showBillModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base">
                {editingBill ? 'Modifica Scadenza' : 'Aggiungi Nuova Scadenza'}
              </h3>
              <button onClick={() => setShowBillModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveBill} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Titolo Scadenza / Utenza</label>
                <input 
                  type="text" placeholder="Es. Bolletta Luce Enel, Rata Mutuo..." 
                  value={billForm.title} onChange={e => setBillForm({...billForm, title: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500" required 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Categoria Utenza</label>
                <select 
                  value={billForm.category} onChange={e => setBillForm({...billForm, category: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {CATEGORIES_BILLS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Importo €</label>
                <input 
                  type="number" step="0.01" placeholder="0.00" 
                  value={billForm.amount} onChange={e => setBillForm({...billForm, amount: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500" required 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Data Scadenza</label>
                <input 
                  type="date" 
                  value={billForm.dueDate} onChange={e => setBillForm({...billForm, dueDate: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500" required 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Stato Pagamento</label>
                <select 
                  value={billForm.status} onChange={e => setBillForm({...billForm, status: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="pending">In Attesa di Pagamento</option>
                  <option value="paid">Pagato</option>
                </select>
              </div>

              <button type="submit" className="w-full py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold text-xs text-white shadow-lg shadow-amber-600/30">
                {editingBill ? 'Salva Modifiche' : 'Crea Scadenza'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}