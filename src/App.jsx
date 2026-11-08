import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, onSnapshot, setDoc, addDoc, updateDoc, deleteDoc 
} from 'firebase/firestore';
import {
  Wallet, TrendingUp, TrendingDown, Receipt, PiggyBank, CreditCard, Plus,
  Trash2, Edit3, Download, Upload, Calendar, Euro, PieChart, BarChart3,
  ArrowUpRight, ArrowDownRight, AlertCircle, CheckCircle2, Clock, Search,
  Filter, RefreshCw, FileSpreadsheet, FileJson, Shield, Check, X,
  ChevronRight, Sparkles, Layers, Moon, Sun, Lock, User, Copy, DollarSign,
  ArrowRightLeft, AlertTriangle, Smartphone, ShieldCheck
} from 'lucide-react';

// --- INITIAL DEMO DATA ---
const INITIAL_ACCOUNTS = [
  { id: 'acc-1', name: 'Conto Corrente Principal', type: 'Checking', balance: 4250.50, color: 'bg-blue-600', iban: 'IT60X0542811101000000123456' },
  { id: 'acc-2', name: 'Fondo di Emergenza (Deposito)', type: 'Savings', balance: 12500.00, color: 'bg-emerald-600', iban: 'IT99Y030690240000000987654' },
  { id: 'acc-3', name: 'Carta Ricaricabile Revolut', type: 'Card', balance: 640.20, color: 'bg-purple-600', iban: 'LT12345678901234' },
  { id: 'acc-4', name: 'Contanti / Piccola Cassa', type: 'Cash', balance: 180.00, color: 'bg-amber-600', iban: '-' }
];

const INITIAL_BILLS = [
  { id: 'bill-1', title: 'Bolletta Enel Energia', amount: 145.80, dueDate: '2026-11-15', category: 'Utenze', status: 'pending', autoPay: false, recurrence: 'Bimestrale' },
  { id: 'bill-2', title: 'Affitto / Mutuo Casa', amount: 750.00, dueDate: '2026-11-01', category: 'Casa', status: 'paid', autoPay: true, recurrence: 'Mensile' },
  { id: 'bill-3', title: 'Assicurazione Auto', amount: 480.00, dueDate: '2026-11-28', category: 'Trasporti', status: 'pending', autoPay: false, recurrence: 'Annuale' },
  { id: 'bill-4', title: 'Abbonamento Fibra Internet', amount: 29.90, dueDate: '2026-11-10', category: 'Utenze', status: 'paid', autoPay: true, recurrence: 'Mensile' },
  { id: 'bill-5', title: 'Tassa Rifiuti (TARI)', amount: 185.00, dueDate: '2026-12-05', category: 'Tasse', status: 'pending', autoPay: false, recurrence: 'Annuale' }
];

const INITIAL_INVESTMENTS = [
  { id: 'inv-1', name: 'Vanguard FTSE All-World (VWCE)', code: 'IE00BK5BQT35', category: 'ETF', costBasis: 3500.00, currentValue: 4120.50, units: 38.5 },
  { id: 'inv-2', name: 'iShares S&P 500 (SJSX)', code: 'IE00B5B80508', category: 'ETF', costBasis: 2000.00, currentValue: 2450.00, units: 42.0 },
  { id: 'inv-3', name: 'BTP Valore Mizio 2030', code: 'IT0005565392', category: 'Obbligazioni', costBasis: 5000.00, currentValue: 5120.00, units: 5.0 },
  { id: 'inv-4', name: 'Fondo Pensione Negoziale', code: 'FP-COMETA', category: 'Pensione', costBasis: 6800.00, currentValue: 7340.00, units: 1.0 }
];

const INITIAL_TRANSACTIONS = [
  { id: 'tx-1', date: '2026-11-05', title: 'Stipendio Mensile', amount: 2450.00, type: 'income', category: 'Stipendio', accountId: 'acc-1', notes: 'Accredito mese corrente' },
  { id: 'tx-2', date: '2026-11-04', title: 'Spesa Esselunga', amount: 84.30, type: 'expense', category: 'Alimentari', accountId: 'acc-1', notes: 'Spesa settimanale famiglia' },
  { id: 'tx-3', date: '2026-11-03', title: 'Rifornimento Carburante', amount: 60.00, type: 'expense', category: 'Trasporti', accountId: 'acc-3', notes: 'Benzina' },
  { id: 'tx-4', date: '2026-11-02', title: 'Versamento PAC ETF', amount: 400.00, type: 'expense', category: 'Investimenti', accountId: 'acc-1', notes: 'Acquisto quota mensile VWCE' },
  { id: 'tx-5', date: '2026-10-28', title: 'Ristorante con Famiglia', amount: 95.00, type: 'expense', category: 'Svago', accountId: 'acc-3', notes: 'Cena fine settimana' }
];

const CATEGORIES = ['Stipendio', 'Alimentari', 'Casa', 'Utenze', 'Trasporti', 'Salute', 'Svago', 'Investimenti', 'Tasse', 'Altro'];

// Helper for Currency Formatting
const formatEUR = (val) => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val || 0);
};

// Helper for Firebase setup
let firebaseApp, auth, db;
const setupFirebase = () => {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try {
      const config = typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
      firebaseApp = initializeApp(config);
      auth = getAuth(firebaseApp);
      db = getFirestore(firebaseApp);
      return { auth, db, appId: typeof __app_id !== 'undefined' ? __app_id : 'finanza-personale' };
    } catch (e) {
      console.warn("Firebase non configurato o errato, modalita locale:", e);
    }
  }
  return { auth: null, db: null, appId: 'local-app' };
};

export default function App() {
  // App State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [notification, setNotification] = useState(null);

  // Core Financial Data
  const [accounts, setAccounts] = useState(() => {
    const saved = localStorage.getItem('fp_accounts');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });
  const [bills, setBills] = useState(() => {
    const saved = localStorage.getItem('fp_bills');
    return saved ? JSON.parse(saved) : INITIAL_BILLS;
  });
  const [investments, setInvestments] = useState(() => {
    const saved = localStorage.getItem('fp_investments');
    return saved ? JSON.parse(saved) : INITIAL_INVESTMENTS;
  });
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('fp_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  // Firebase Auth & Cloud Sync
  const [user, setUser] = useState(null);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals state
  const [modalOpen, setModalOpen] = useState(null); // 'transaction', 'account', 'bill', 'investment', 'export'
  const [editItem, setEditItem] = useState(null);

  // Quick Toast Notification
  const showToast = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // --- FIREBASE INTEGRATION SETUP ---
  useEffect(() => {
    const { auth, db } = setupFirebase();
    if (!auth) return;

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Errore autenticazione Firebase:", err);
      }
    };

    initAuth();
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setIsCloudSynced(true);
    });

    return () => unsubAuth();
  }, []);

  // Cloud Real-time Firestore Snapshot Sync (RULE 1 & RULE 2 & RULE 3)
  useEffect(() => {
    const { db, appId } = setupFirebase();
    if (!user || !db) return;

    const userPath = (col) => collection(db, 'artifacts', appId, 'users', user.uid, col);

    // Sync Accounts
    const unsubAcc = onSnapshot(userPath('accounts'), (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setAccounts(data);
      }
    }, (err) => console.error("Firestore Accounts Sync Error:", err));

    // Sync Bills
    const unsubBills = onSnapshot(userPath('bills'), (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setBills(data);
      }
    }, (err) => console.error("Firestore Bills Sync Error:", err));

    // Sync Investments
    const unsubInv = onSnapshot(userPath('investments'), (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setInvestments(data);
      }
    }, (err) => console.error("Firestore Investments Sync Error:", err));

    // Sync Transactions
    const unsubTx = onSnapshot(userPath('transactions'), (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setTransactions(data);
      }
    }, (err) => console.error("Firestore Transactions Sync Error:", err));

    return () => {
      unsubAcc();
      unsubBills();
      unsubInv();
      unsubTx();
    };
  }, [user]);

  // Fallback Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('fp_accounts', JSON.stringify(accounts));
    localStorage.setItem('fp_bills', JSON.stringify(bills));
    localStorage.setItem('fp_investments', JSON.stringify(investments));
    localStorage.setItem('fp_transactions', JSON.stringify(transactions));
  }, [accounts, bills, investments, transactions]);

  // Helper for Firestore Write Ops
  const syncItemToCloud = async (collectionName, itemId, itemData, action = 'set') => {
    const { db, appId } = setupFirebase();
    if (!user || !db) return;
    try {
      setIsSyncing(true);
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, collectionName, itemId);
      if (action === 'delete') {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, itemData, { merge: true });
      }
    } catch (e) {
      console.error(`Error saving to Firestore [${collectionName}]:`, e);
    } finally {
      setIsSyncing(false);
    }
  };

  // --- CALCULATED FINANCIAL METRICS ---
  const totalAccountsBalance = useMemo(() => {
    return accounts.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0);
  }, [accounts]);

  const totalInvestmentsCost = useMemo(() => {
    return investments.reduce((acc, curr) => acc + (Number(curr.costBasis) || 0), 0);
  }, [investments]);

  const totalInvestmentsCurrent = useMemo(() => {
    return investments.reduce((acc, curr) => acc + (Number(curr.currentValue) || 0), 0);
  }, [investments]);

  const investmentsGainAbs = totalInvestmentsCurrent - totalInvestmentsCost;
  const investmentsGainPct = totalInvestmentsCost > 0 ? (investmentsGainAbs / totalInvestmentsCost) * 100 : 0;

  const pendingBillsTotal = useMemo(() => {
    return bills
      .filter(b => b.status === 'pending' || b.status === 'overdue')
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [bills]);

  const netWorth = totalAccountsBalance + totalInvestmentsCurrent - pendingBillsTotal;

  // Upcoming 30-day Bills Alert
  const upcomingBills = useMemo(() => {
    const today = new Date();
    const limit = new Date();
    limit.setDate(today.getDate() + 30);

    return bills.filter(b => {
      if (b.status === 'paid') return false;
      const d = new Date(b.dueDate);
      return d <= limit;
    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [bills]);

  // Monthly Cash Flow Aggregation (Current & previous 5 months)
  const monthlyCashflow = useMemo(() => {
    const monthsMap = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
      monthsMap[key] = { key, label, income: 0, expense: 0 };
    }

    transactions.forEach(t => {
      const dateKey = t.date.substring(0, 7);
      if (monthsMap[dateKey]) {
        if (t.type === 'income') monthsMap[dateKey].income += Number(t.amount);
        if (t.type === 'expense') monthsMap[dateKey].expense += Number(t.amount);
      }
    });

    return Object.values(monthsMap);
  }, [transactions]);

  // --- HANDLERS FOR CRUD ACTIONS ---

  // Accounts CRUD
  const handleSaveAccount = (accData) => {
    let updated;
    const isEdit = !!accData.id;
    const finalId = accData.id || `acc-${Date.now()}`;
    const newObj = { ...accData, id: finalId, balance: parseFloat(accData.balance) || 0 };

    if (isEdit) {
      updated = accounts.map(a => a.id === finalId ? newObj : a);
    } else {
      updated = [...accounts, newObj];
    }
    setAccounts(updated);
    syncItemToCloud('accounts', finalId, newObj);
    showToast(isEdit ? 'Conto aggiornato con successo!' : 'Nuovo conto aggiunto!');
    setModalOpen(null);
  };

  const handleDeleteAccount = (id) => {
    const updated = accounts.filter(a => a.id !== id);
    setAccounts(updated);
    syncItemToCloud('accounts', id, null, 'delete');
    showToast('Conto rimosso', 'warning');
  };

  // Transactions CRUD
  const handleSaveTransaction = (txData) => {
    const isEdit = !!txData.id;
    const finalId = txData.id || `tx-${Date.now()}`;
    const amountNum = parseFloat(txData.amount) || 0;
    const newObj = { ...txData, id: finalId, amount: amountNum };

    let updatedTx;
    if (isEdit) {
      updatedTx = transactions.map(t => t.id === finalId ? newObj : t);
    } else {
      updatedTx = [newObj, ...transactions];

      // Auto balance adjustment on new transaction
      if (txData.accountId) {
        const targetAcc = accounts.find(a => a.id === txData.accountId);
        if (targetAcc) {
          const delta = txData.type === 'income' ? amountNum : -amountNum;
          const updatedBalance = targetAcc.balance + delta;
          const updatedAcc = { ...targetAcc, balance: updatedBalance };
          setAccounts(prev => prev.map(a => a.id === targetAcc.id ? updatedAcc : a));
          syncItemToCloud('accounts', targetAcc.id, updatedAcc);
        }
      }
    }

    setTransactions(updatedTx);
    syncItemToCloud('transactions', finalId, newObj);
    showToast(isEdit ? 'Movimento modificato!' : 'Movimento registrato!');
    setModalOpen(null);
  };

  const handleDeleteTransaction = (id) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    syncItemToCloud('transactions', id, null, 'delete');
    showToast('Movimento eliminato', 'warning');
  };

  // Bills CRUD
  const handleSaveBill = (billData) => {
    const isEdit = !!billData.id;
    const finalId = billData.id || `bill-${Date.now()}`;
    const newObj = { ...billData, id: finalId, amount: parseFloat(billData.amount) || 0 };

    let updated = isEdit ? bills.map(b => b.id === finalId ? newObj : b) : [...bills, newObj];
    setBills(updated);
    syncItemToCloud('bills', finalId, newObj);
    showToast('Scadenza salvata!');
    setModalOpen(null);
  };

  const toggleBillStatus = (bill) => {
    const newStatus = bill.status === 'paid' ? 'pending' : 'paid';
    const updated = { ...bill, status: newStatus };
    setBills(prev => prev.map(b => b.id === bill.id ? updated : b));
    syncItemToCloud('bills', bill.id, updated);
    showToast(newStatus === 'paid' ? 'Bolletta segnata come Pagata!' : 'Bolletta riportata a Da Pagare');
  };

  const handleDeleteBill = (id) => {
    setBills(prev => prev.filter(b => b.id !== id));
    syncItemToCloud('bills', id, null, 'delete');
    showToast('Scadenza rimossa', 'warning');
  };

  // Investments CRUD
  const handleSaveInvestment = (invData) => {
    const isEdit = !!invData.id;
    const finalId = invData.id || `inv-${Date.now()}`;
    const newObj = { 
      ...invData, 
      id: finalId, 
      costBasis: parseFloat(invData.costBasis) || 0,
      currentValue: parseFloat(invData.currentValue) || 0,
      units: parseFloat(invData.units) || 1
    };

    let updated = isEdit ? investments.map(i => i.id === finalId ? newObj : i) : [...investments, newObj];
    setInvestments(updated);
    syncItemToCloud('investments', finalId, newObj);
    showToast('Investimento aggiornato!');
    setModalOpen(null);
  };

  const handleDeleteInvestment = (id) => {
    setInvestments(prev => prev.filter(i => i.id !== id));
    syncItemToCloud('investments', id, null, 'delete');
    showToast('Strumento rimosso dal portafoglio', 'warning');
  };

  // Backup & Import Handlers
  const exportAllJSON = () => {
    const fullBackup = {
      timestamp: new Date().toISOString(),
      app: 'FinanzaPersonaleApp',
      version: '1.0',
      accounts,
      bills,
      investments,
      transactions
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Finanza_Backup_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Backup JSON scaricato con successo!');
  };

  const exportTransactionsCSV = () => {
    let csv = "ID,Data,Titolo,Importo,Tipo,Categoria,Conto,Note\n";
    transactions.forEach(t => {
      const accName = accounts.find(a => a.id === t.accountId)?.name || 'N/A';
      csv += `"${t.id}","${t.date}","${t.title.replace(/"/g, '""')}",${t.amount},"${t.type}","${t.category}","${accName}","${(t.notes||'').replace(/"/g, '""')}"\n`;
    });

    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Movimenti_Export_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('CSV Movimenti esportato!');
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.accounts && parsed.transactions) {
          setAccounts(parsed.accounts || []);
          setBills(parsed.bills || []);
          setInvestments(parsed.investments || []);
          setTransactions(parsed.transactions || []);
          showToast('Ripristino dati completato con successo!');
          setModalOpen(null);
        } else {
          showToast('Formato file JSON non valido!', 'error');
        }
      } catch (err) {
        showToast('Errore durante la lettura del file JSON', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Main UI Theme Theme Dynamic Classes
  const bgMain = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900';
  const bgCard = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textSub = darkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen ${bgMain} font-sans flex flex-col transition-colors duration-200 pb-20 md:pb-6`}>
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-white font-medium animate-bounce ${
          notification.type === 'error' ? 'bg-red-600' : notification.type === 'warning' ? 'bg-amber-600' : 'bg-emerald-600'
        }`}>
          {notification.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header Bar */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'} px-4 py-3 shadow-sm`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Euro className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight leading-none flex items-center gap-2">
                WealthPulse <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-semibold border border-indigo-500/20">IT</span>
              </h1>
              <p className={`text-xs ${textSub} font-medium mt-0.5`}>Gestione Finanziaria Personale & Famiglia</p>
            </div>
          </div>

          {/* Sync & User Indicators */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className={`hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${
              isCloudSynced 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isCloudSynced ? 'Sincronizzato Cloud' : 'Locale / Offline'}</span>
              {isSyncing && <RefreshCw className="w-3 h-3 animate-spin ml-1" />}
            </div>

            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className={`p-2 rounded-xl border transition-colors ${darkMode ? 'border-slate-700 bg-slate-800 text-amber-400 hover:bg-slate-700' : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              title="Cambia Tema Light/Dark"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setModalOpen('export')}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Backup / Export</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="max-w-7xl mx-auto w-full px-4 pt-6 flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:block md:col-span-3 space-y-2">
          <div className={`p-4 rounded-2xl border ${bgCard} shadow-sm space-y-1`}>
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">Navigazione</div>
            {[
              { id: 'dashboard', label: 'Panoramica', icon: BarChart3 },
              { id: 'accounts', label: 'Conti & Carte', icon: Wallet, badge: accounts.length },
              { id: 'bills', label: 'Scadenziario & Bollette', icon: Receipt, badge: upcomingBills.length > 0 ? upcomingBills.length : null },
              { id: 'investments', label: 'Investimenti & Portafoglio', icon: TrendingUp },
              { id: 'transactions', label: 'Movimenti & Registro', icon: ArrowRightLeft },
              { id: 'backup', label: 'Backup & Cloud', icon: Layers },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold' 
                      : `${textSub} hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white`
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Summary Widget in Sidebar */}
          <div className={`p-4 rounded-2xl border ${bgCard} shadow-sm bg-gradient-to-br from-indigo-900/5 via-transparent to-purple-900/5`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Patrimonio Netto</h3>
            <p className="text-2xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">
              {formatEUR(netWorth)}
            </p>
            <div className="mt-3 space-y-1.5 text-xs font-medium border-t pt-3 border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className={textSub}>Conti Totali:</span>
                <span className="font-semibold">{formatEUR(totalAccountsBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className={textSub}>Investimenti:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatEUR(totalInvestmentsCurrent)}</span>
              </div>
              <div className="flex justify-between">
                <span className={textSub}>Bollette In Scadenza:</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">-{formatEUR(pendingBillsTotal)}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Dynamic Main Content Area */}
        <main className="col-span-1 md:col-span-9 space-y-6">

          {/* TAB 1: DASHBOARD / PANORAMICA */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Top Consolidated Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Net Worth */}
                <div className={`p-5 rounded-2xl border ${bgCard} shadow-sm relative overflow-hidden group`}>
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Wallet className="w-16 h-16 text-indigo-600" />
                  </div>
                  <p className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Patrimonio Netto</p>
                  <p className="text-2xl font-black tracking-tight mt-1 text-indigo-600 dark:text-indigo-400">
                    {formatEUR(netWorth)}
                  </p>
                  <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Consolidato Conti + Investimenti</span>
                  </div>
                </div>

                {/* Liquidity Accounts */}
                <div className={`p-5 rounded-2xl border ${bgCard} shadow-sm`}>
                  <p className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Saldo Conti & Carte</p>
                  <p className="text-2xl font-black tracking-tight mt-1">
                    {formatEUR(totalAccountsBalance)}
                  </p>
                  <p className={`text-xs ${textSub} mt-2`}>{accounts.length} Conti registrati</p>
                </div>

                {/* Investment Portfolio */}
                <div className={`p-5 rounded-2xl border ${bgCard} shadow-sm`}>
                  <p className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Valore Investimenti</p>
                  <p className="text-2xl font-black tracking-tight mt-1 text-emerald-600 dark:text-emerald-400">
                    {formatEUR(totalInvestmentsCurrent)}
                  </p>
                  <div className="mt-2 text-xs font-semibold flex items-center gap-1">
                    <span className={investmentsGainAbs >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
                      {investmentsGainAbs >= 0 ? '+' : ''}{formatEUR(investmentsGainAbs)} ({investmentsGainPct.toFixed(1)}%)
                    </span>
                    <span className={textSub}>Gain totale</span>
                  </div>
                </div>

                {/* Pending Bills */}
                <div className={`p-5 rounded-2xl border ${bgCard} shadow-sm`}>
                  <p className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Bollette da Pagare</p>
                  <p className="text-2xl font-black tracking-tight mt-1 text-amber-600 dark:text-amber-400">
                    {formatEUR(pendingBillsTotal)}
                  </p>
                  <p className={`text-xs ${textSub} mt-2 flex items-center gap-1`}>
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{upcomingBills.length} scadenze nei prossimi 30gg</span>
                  </p>
                </div>
              </div>

              {/* Monthly Cashflow SVG Chart */}
              <div className={`p-5 rounded-2xl border ${bgCard} shadow-sm`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-base">Flusso di Cassa Mensile</h3>
                    <p className={`text-xs ${textSub}`}>Confronto Entrate vs Uscite negli ultimi 6 mesi</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                      <span>Entrate</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-rose-500"></div>
                      <span>Uscite</span>
                    </div>
                  </div>
                </div>

                {/* Responsive SVG Bar Chart */}
                <div className="h-48 w-full pt-4">
                  <div className="h-full flex items-end justify-between gap-2 sm:gap-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                    {monthlyCashflow.map((m, idx) => {
                      const maxVal = Math.max(...monthlyCashflow.flatMap(item => [item.income, item.expense]), 1000);
                      const incHeight = (m.income / maxVal) * 100;
                      const expHeight = (m.expense / maxVal) * 100;

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                          <div className="w-full flex items-end justify-center gap-1 h-36">
                            {/* Income Bar */}
                            <div 
                              style={{ height: `${Math.max(incHeight, 4)}%` }} 
                              className="w-full max-w-[20px] bg-emerald-500/90 rounded-t-md transition-all group-hover:bg-emerald-400 relative"
                              title={`Entrate: ${formatEUR(m.income)}`}
                            />
                            {/* Expense Bar */}
                            <div 
                              style={{ height: `${Math.max(expHeight, 4)}%` }} 
                              className="w-full max-w-[20px] bg-rose-500/90 rounded-t-md transition-all group-hover:bg-rose-400 relative"
                              title={`Uscite: ${formatEUR(m.expense)}`}
                            />
                          </div>
                          <span className={`text-[10px] sm:text-xs font-semibold ${textSub}`}>{m.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Grid: Upcoming Urgent Bills + Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 30-Day Bill Alerts */}
                <div className={`p-5 rounded-2xl border ${bgCard} shadow-sm space-y-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                      <h3 className="font-bold text-base">Scadenze Imminenti (30 Giorni)</h3>
                    </div>
                    <button 
                      onClick={() => setActiveTab('bills')} 
                      className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      Vedi Tutte <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {upcomingBills.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Nessuna bolletta o scadenza imminente nei prossimi 30 giorni! 🎉
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingBills.map(bill => {
                        const daysLeft = Math.ceil((new Date(bill.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
                        const isOverdue = daysLeft < 0;

                        return (
                          <div 
                            key={bill.id} 
                            className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50"
                          >
                            <div className="space-y-0.5">
                              <p className="font-bold text-sm">{bill.title}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span>{bill.category}</span>
                                <span>•</span>
                                <span className={isOverdue ? 'text-red-500 font-bold' : daysLeft <= 5 ? 'text-amber-500 font-bold' : ''}>
                                  {isOverdue ? `Scaduta da ${Math.abs(daysLeft)} giorni` : `Scade in ${daysLeft} giorni (${bill.dueDate})`}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-extrabold text-sm">{formatEUR(bill.amount)}</span>
                              <button
                                onClick={() => toggleBillStatus(bill)}
                                className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors"
                                title="Segna come Pagata"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick Actions & Recent Transactions */}
                <div className={`p-5 rounded-2xl border ${bgCard} shadow-sm space-y-4`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base">Azioni Rapide</h3>
                    <button 
                      onClick={() => { setEditItem(null); setModalOpen('transaction'); }} 
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1 hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Nuovo Movimento
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { setEditItem(null); setModalOpen('bill'); }}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-left transition-all group"
                    >
                      <Receipt className="w-5 h-5 text-indigo-500 mb-1 group-hover:scale-110 transition-transform" />
                      <p className="text-xs font-bold">Aggiungi Bolletta</p>
                      <p className="text-[10px] text-slate-400">Scadenza ricorrente</p>
                    </button>

                    <button
                      onClick={() => { setEditItem(null); setModalOpen('investment'); }}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-left transition-all group"
                    >
                      <TrendingUp className="w-5 h-5 text-emerald-500 mb-1 group-hover:scale-110 transition-transform" />
                      <p className="text-xs font-bold">Nuovo Investimento</p>
                      <p className="text-[10px] text-slate-400">ETF, Azioni, Fondo</p>
                    </button>
                  </div>

                  {/* Mini Recent Transactions */}
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ultimi Movimenti</p>
                    {transactions.slice(0, 3).map(tx => (
                      <div key={tx.id} className="flex items-center justify-between text-xs py-1">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {tx.type === 'income' ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <p className="font-semibold">{tx.title}</p>
                            <p className="text-[10px] text-slate-400">{tx.category} • {tx.date}</p>
                          </div>
                        </div>
                        <span className={`font-bold ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatEUR(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: CONTI & CARTE */}
          {activeTab === 'accounts' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">Conti Correnti & Carte</h2>
                  <p className={`text-xs ${textSub}`}>Gestisci la tua liquidità e modifica i saldi in tempo reale</p>
                </div>
                <button
                  onClick={() => { setEditItem(null); setModalOpen('account'); }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" /> Nuovo Conto
                </button>
              </div>

              {/* Accounts Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {accounts.map(acc => (
                  <div key={acc.id} className={`p-5 rounded-2xl border ${bgCard} shadow-sm space-y-4 relative overflow-hidden`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${acc.color || 'bg-blue-600'} flex items-center justify-center text-white shadow-md`}>
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base">{acc.name}</h3>
                          <span className="text-xs text-slate-400 font-medium">{acc.type}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => { setEditItem(acc); setModalOpen('account'); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteAccount(acc.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400 font-medium">Saldo Disponibile</p>
                      <p className="text-2xl font-black mt-0.5 tracking-tight">{formatEUR(acc.balance)}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                      <span className="font-mono">{acc.iban || 'N/A'}</span>
                      <span className="font-semibold text-indigo-500">Attivo</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SCADENZIARIO & BOLLETTE */}
          {activeTab === 'bills' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">Scadenziario Bollette & Spese Ricorrenti</h2>
                  <p className={`text-xs ${textSub}`}>Tieni traccia delle scadenze mensili, utenze e abbonamenti</p>
                </div>
                <button
                  onClick={() => { setEditItem(null); setModalOpen('bill'); }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" /> Nuova Scadenza
                </button>
              </div>

              {/* Bills List Table / Cards */}
              <div className={`rounded-2xl border ${bgCard} shadow-sm overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="p-4">Stato</th>
                        <th className="p-4">Titolo Scadenza</th>
                        <th className="p-4">Categoria</th>
                        <th className="p-4">Data Scadenza</th>
                        <th className="p-4">Ricorrenza</th>
                        <th className="p-4 text-right">Importo</th>
                        <th className="p-4 text-center">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {bills.map(bill => {
                        const isPaid = bill.status === 'paid';
                        const daysLeft = Math.ceil((new Date(bill.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
                        const isOverdue = !isPaid && daysLeft < 0;

                        return (
                          <tr key={bill.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="p-4">
                              <button
                                onClick={() => toggleBillStatus(bill)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 transition-all ${
                                  isPaid 
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                    : isOverdue
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                }`}
                              >
                                {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                <span>{isPaid ? 'Pagato' : isOverdue ? 'Scaduto' : 'In Scadenza'}</span>
                              </button>
                            </td>
                            <td className="p-4 font-bold text-sm">{bill.title}</td>
                            <td className="p-4 text-slate-400 font-medium">{bill.category}</td>
                            <td className="p-4 font-semibold">
                              {bill.dueDate}
                              {!isPaid && (
                                <span className="block text-[10px] font-normal text-slate-400">
                                  {isOverdue ? `Scaduta da ${Math.abs(daysLeft)} giorni` : `Tra ${daysLeft} giorni`}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-slate-400">{bill.recurrence || 'Mensile'}</td>
                            <td className="p-4 text-right font-extrabold text-sm">{formatEUR(bill.amount)}</td>
                            <td className="p-4 text-center space-x-1">
                              <button 
                                onClick={() => { setEditItem(bill); setModalOpen('bill'); }} 
                                className="p-1.5 text-slate-400 hover:text-indigo-600"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteBill(bill.id)} 
                                className="p-1.5 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INVESTIMENTI & PORTAFOGLIO */}
          {activeTab === 'investments' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">Portafoglio Investimenti</h2>
                  <p className={`text-xs ${textSub}`}>Tracciamento capitale investito vs valore di mercato (ROI)</p>
                </div>
                <button
                  onClick={() => { setEditItem(null); setModalOpen('investment'); }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" /> Nuovo Strumento
                </button>
              </div>

              {/* Investments Summary Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-4 rounded-2xl border ${bgCard} shadow-sm`}>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Capitale Investito (PAC)</p>
                  <p className="text-xl font-black mt-1">{formatEUR(totalInvestmentsCost)}</p>
                </div>
                <div className={`p-4 rounded-2xl border ${bgCard} shadow-sm`}>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Valore Attuale Mercato</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatEUR(totalInvestmentsCurrent)}</p>
                </div>
                <div className={`p-4 rounded-2xl border ${bgCard} shadow-sm`}>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Profitto / Gain Totale</p>
                  <p className={`text-xl font-black mt-1 ${investmentsGainAbs >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {investmentsGainAbs >= 0 ? '+' : ''}{formatEUR(investmentsGainAbs)} ({investmentsGainPct.toFixed(2)}%)
                  </p>
                </div>
              </div>

              {/* Investments List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {investments.map(inv => {
                  const gainAbs = inv.currentValue - inv.costBasis;
                  const gainPct = inv.costBasis > 0 ? (gainAbs / inv.costBasis) * 100 : 0;

                  return (
                    <div key={inv.id} className={`p-5 rounded-2xl border ${bgCard} shadow-sm space-y-3 relative`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 uppercase">
                            {inv.category}
                          </span>
                          <h3 className="font-bold text-base mt-1">{inv.name}</h3>
                          <p className="text-xs text-slate-400 font-mono">{inv.code || 'ISIN N/A'}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => { setEditItem(inv); setModalOpen('investment'); }} 
                            className="p-1.5 text-slate-400 hover:text-indigo-600"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteInvestment(inv.id)} 
                            className="p-1.5 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                        <div>
                          <p className="text-slate-400">Valore Carico:</p>
                          <p className="font-bold">{formatEUR(inv.costBasis)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Valore Attuale:</p>
                          <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatEUR(inv.currentValue)}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-400">Rendimento ROI:</span>
                        <span className={`font-extrabold ${gainAbs >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                          {gainAbs >= 0 ? '+' : ''}{formatEUR(gainAbs)} ({gainPct.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: MOVIMENTI & REGISTRO */}
          {activeTab === 'transactions' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">Registro Entrate & Uscite</h2>
                  <p className={`text-xs ${textSub}`}>Storico transazioni con filtri per categoria e conto</p>
                </div>
                <button
                  onClick={() => { setEditItem(null); setModalOpen('transaction'); }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" /> Registra Movimento
                </button>
              </div>

              {/* Transactions Table */}
              <div className={`rounded-2xl border ${bgCard} shadow-sm overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="p-4">Tipo</th>
                        <th className="p-4">Data</th>
                        <th className="p-4">Descrizione</th>
                        <th className="p-4">Categoria</th>
                        <th className="p-4">Conto</th>
                        <th className="p-4 text-right">Importo</th>
                        <th className="p-4 text-center">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {transactions.map(tx => {
                        const acc = accounts.find(a => a.id === tx.accountId);
                        const isIncome = tx.type === 'income';

                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="p-4">
                              <span className={`p-1.5 rounded-lg inline-block ${isIncome ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                {isIncome ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-slate-400">{tx.date}</td>
                            <td className="p-4">
                              <p className="font-bold text-sm">{tx.title}</p>
                              {tx.notes && <p className="text-[10px] text-slate-400">{tx.notes}</p>}
                            </td>
                            <td className="p-4 font-medium">{tx.category}</td>
                            <td className="p-4 text-slate-400">{acc ? acc.name : 'N/A'}</td>
                            <td className={`p-4 text-right font-extrabold text-sm ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                              {isIncome ? '+' : '-'}{formatEUR(tx.amount)}
                            </td>
                            <td className="p-4 text-center space-x-1">
                              <button 
                                onClick={() => handleDeleteTransaction(tx.id)} 
                                className="p-1.5 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: BACKUP & CLOUD */}
          {activeTab === 'backup' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">Backup & Sincronizzazione Cloud</h2>
                <p className={`text-xs ${textSub}`}>Esporta i tuoi dati, effettua il ripristino o verifica la sincronizzazione Firebase</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Export & Import JSON/CSV */}
                <div className={`p-5 rounded-2xl border ${bgCard} shadow-sm space-y-4`}>
                  <div className="flex items-center gap-2">
                    <FileJson className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-bold text-base">Esportazione & Backup Locale</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Puoi scaricare l'intero database in formato JSON oppure esportare la lista dei movimenti in formato CSV compatibile con Excel.
                  </p>

                  <div className="space-y-2 pt-2">
                    <button
                      onClick={exportAllJSON}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Download className="w-4 h-4" /> Scarica Backup Completo (.JSON)
                    </button>

                    <button
                      onClick={exportTransactionsCSV}
                      className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold text-xs flex items-center justify-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Esporta Movimenti (.CSV)
                    </button>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <p className="text-xs font-bold mb-2">Ripristina da File Backup</p>
                    <label className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 text-indigo-500" /> Carica File Backup JSON
                      <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Cloud & PWA Details */}
                <div className={`p-5 rounded-2xl border ${bgCard} shadow-sm space-y-4`}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-bold text-base">Stato Cloud & PWA Mobile</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 space-y-1">
                      <p className="font-bold text-slate-400">ID Utente Cloud (Firebase UID)</p>
                      <p className="font-mono text-indigo-500 font-semibold break-all">
                        {user ? user.uid : 'Nessuna sessione cloud attiva (Modalità Locale)'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 space-y-1">
                      <p className="font-bold text-slate-400">Stato Progressive Web App (PWA)</p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Pronto per l'installazione mobile & Play Store
                      </p>
                    </div>

                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      La Web App include già il Service Worker offline e il file Manifest per la conversione in APK nativo tramite Google Bubblewrap o Capacitor.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className={`fixed bottom-0 left-0 right-0 z-40 md:hidden border-t backdrop-blur-md ${darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'} px-2 py-2`}>
        <div className="flex items-center justify-around">
          {[
            { id: 'dashboard', label: 'Home', icon: BarChart3 },
            { id: 'accounts', label: 'Conti', icon: Wallet },
            { id: 'bills', label: 'Bollette', icon: Receipt },
            { id: 'investments', label: 'Invest.', icon: TrendingUp },
            { id: 'transactions', label: 'Movimenti', icon: ArrowRightLeft },
            { id: 'backup', label: 'Cloud', icon: Layers },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
                  isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105' : `${textSub}`
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px]">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* --- MODAL FORMS FOR CRUD --- */}

      {/* Modal Transaction */}
      {modalOpen === 'transaction' && (
        <ModalWrapper title="Registra Movimento" onClose={() => setModalOpen(null)} darkMode={darkMode}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleSaveTransaction({
              id: editItem?.id,
              title: formData.get('title'),
              amount: formData.get('amount'),
              type: formData.get('type'),
              category: formData.get('category'),
              accountId: formData.get('accountId'),
              date: formData.get('date'),
              notes: formData.get('notes'),
            });
          }} className="space-y-4 text-xs">
            <div>
              <label className="font-bold block mb-1">Titolo / Descrizione</label>
              <input name="title" defaultValue={editItem?.title} required placeholder="Es. Spesa Supermercato, Stipendio..." className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold block mb-1">Importo (€)</label>
                <input name="amount" type="number" step="0.01" defaultValue={editItem?.amount} required placeholder="0.00" className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent" />
              </div>
              <div>
                <label className="font-bold block mb-1">Tipo</label>
                <select name="type" defaultValue={editItem?.type || 'expense'} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-800 text-white">
                  <option value="expense">Uscita / Spesa</option>
                  <option value="income">Entrata / Guadagno</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold block mb-1">Categoria</label>
                <select name="category" defaultValue={editItem?.category || 'Alimentari'} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-800 text-white">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Conto Addebito/Accredito</label>
                <select name="accountId" defaultValue={editItem?.accountId || accounts[0]?.id} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-800 text-white">
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="font-bold block mb-1">Data</label>
              <input name="date" type="date" defaultValue={editItem?.date || new Date().toISOString().substring(0, 10)} required className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent" />
            </div>
            <div>
              <label className="font-bold block mb-1">Note Opzionali</label>
              <input name="notes" defaultValue={editItem?.notes} placeholder="Note o dettagli aggiuntivi" className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent" />
            </div>
            <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition-colors">
              Salva Movimento
            </button>
          </form>
        </ModalWrapper>
      )}

      {/* Modal Account */}
      {modalOpen === 'account' && (
        <ModalWrapper title={editItem ? 'Modifica Conto' : 'Nuovo Conto'} onClose={() => setModalOpen(null)} darkMode={darkMode}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleSaveAccount({
              id: editItem?.id,
              name: formData.get('name'),
              type: formData.get('type'),
              balance: formData.get('balance'),
              iban: formData.get('iban'),
              color: formData.get('color'),
            });
          }} className="space-y-4 text-xs">
            <div>
              <label className="font-bold block mb-1">Nome Conto / Carta</label>
              <input name="name" defaultValue={editItem?.name} required placeholder="Es. Intesa Sanpaolo, Revolut..." className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold block mb-1">Tipo Conto</label>
                <select name="type" defaultValue={editItem?.type || 'Checking'} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-800 text-white">
                  <option value="Checking">Conto Corrente</option>
                  <option value="Savings">Conto Deposito</option>
                  <option value="Card">Carta Ricaricabile</option>
                  <option value="Cash">Contanti</option>
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Saldo Attuale (€)</label>
                <input name="balance" type="number" step="0.01" defaultValue={editItem?.balance || 0} required className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent" />
              </div>
            </div>
            <div>
              <label className="font-bold block mb-1">IBAN / Identificativo</label>
              <input name="iban" defaultValue={editItem?.iban} placeholder="IT00..." className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent font-mono" />
            </div>
            <div>
              <label className="font-bold block mb-1">Colore Carta</label>
              <select name="color" defaultValue={editItem?.color || 'bg-blue-600'} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-800 text-white">
                <option value="bg-blue-600">Blu Intenso</option>
                <option value="bg-emerald-600">Smeraldo Verde</option>
                <option value="bg-purple-600">Viola Revolut</option>
                <option value="bg-amber-600">Ambra / Contanti</option>
                <option value="bg-rose-600">Rosso Rubino</option>
              </select>
            </div>
            <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition-colors">
              Salva Conto
            </button>
          </form>
        </ModalWrapper>
      )}

      {/* Modal Bill */}
      {modalOpen === 'bill' && (
        <ModalWrapper title={editItem ? 'Modifica Scadenza' : 'Nuova Scadenza / Bolletta'} onClose={() => setModalOpen(null)} darkMode={darkMode}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleSaveBill({
              id: editItem?.id,
              title: formData.get('title'),
              amount: formData.get('amount'),
              category: formData.get('category'),
              dueDate: formData.get('dueDate'),
              recurrence: formData.get('recurrence'),
              status: editItem?.status || 'pending',
            });
          }} className="space-y-4 text-xs">
            <div>
              <label className="font-bold block mb-1">Titolo Bolletta / Spesa</label>
              <input name="title" defaultValue={editItem?.title} required placeholder="Es. Luce Enel, Affitto..." className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold block mb-1">Importo (€)</label>
                <input name="amount" type="number" step="0.01" defaultValue={editItem?.amount} required placeholder="0.00" className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent" />
              </div>
              <div>
                <label className="font-bold block mb-1">Data Scadenza</label>
                <input name="dueDate" type="date" defaultValue={editItem?.dueDate} required className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold block mb-1">Categoria</label>
                <select name="category" defaultValue={editItem?.category || 'Utenze'} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-800 text-white">
                  <option value="Utenze">Utenze (Luce/Gas)</option>
                  <option value="Casa">Casa / Affitto</option>
                  <option value="Trasporti">Trasporti / Auto</option>
                  <option value="Tasse">Tasse / Fisco</option>
                  <option value="Altro">Altro</option>
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Ricorrenza</label>
                <select name="recurrence" defaultValue={editItem?.recurrence || 'Mensile'} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-800 text-white">
                  <option value="Mensile">Mensile</option>
                  <option value="Bimestrale">Bimestrale</option>
                  <option value="Annuale">Annuale</option>
                  <option value="Una tantum">Una tantum</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition-colors">
              Salva Scadenza
            </button>
          </form>
        </ModalWrapper>
      )}

      {/* Modal Investment */}
      {modalOpen === 'investment' && (
        <ModalWrapper title={editItem ? 'Modifica Strumento' : 'Nuovo Investimento'} onClose={() => setModalOpen(null)} darkMode={darkMode}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleSaveInvestment({
              id: editItem?.id,
              name: formData.get('name'),
              code: formData.get('code'),
              category: formData.get('category'),
              costBasis: formData.get('costBasis'),
              currentValue: formData.get('currentValue'),
              units: formData.get('units'),
            });
          }} className="space-y-4 text-xs">
            <div>
              <label className="font-bold block mb-1">Nome Strumento / Ticker</label>
              <input name="name" defaultValue={editItem?.name} required placeholder="Es. Vanguard FTSE All-World..." className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold block mb-1">Codice ISIN / Ticker</label>
                <input name="code" defaultValue={editItem?.code} placeholder="IE00BK..." className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent font-mono" />
              </div>
              <div>
                <label className="font-bold block mb-1">Categoria Asset</label>
                <select name="category" defaultValue={editItem?.category || 'ETF'} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-800 text-white">
                  <option value="ETF">ETF Azionario/Obbligazionario</option>
                  <option value="Azioni">Azioni Singole</option>
                  <option value="Obbligazioni">Titoli di Stato / BTP</option>
                  <option value="Pensione">Fondo Pensione</option>
                  <option value="Crypto">Crypto</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold block mb-1">Valore Carico Totale (€)</label>
                <input name="costBasis" type="number" step="0.01" defaultValue={editItem?.costBasis} required placeholder="Capitale investito" className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent" />
              </div>
              <div>
                <label className="font-bold block mb-1">Valore Attuale Mercato (€)</label>
                <input name="currentValue" type="number" step="0.01" defaultValue={editItem?.currentValue} required placeholder="Valore ad oggi" className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent" />
              </div>
            </div>
            <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition-colors">
              Salva Investimento
            </button>
          </form>
        </ModalWrapper>
      )}

    </div>
  );
}

// Modal Container Wrapper Component
function ModalWrapper({ title, children, onClose, darkMode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'} space-y-4`}>
        <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
          <h3 className="font-extrabold text-base">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}