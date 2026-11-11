import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, doc, setDoc, onSnapshot, enableIndexedDbPersistence 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  Wallet, CreditCard, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight, 
  Plus, Download, Upload, AlertTriangle, CheckCircle2, Clock, 
  PieChart, Shield, Tag, Trash2, DollarSign, Layers, Sparkles, RefreshCw,
  Eye, EyeOff, ChevronRight, Activity, Zap
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

// Dati Iniziali Demo
const initialData = {
  accounts: [
    { id: '1', name: 'Conto Corrente Principale', type: 'bank', balance: 4250.00, iban: 'IT60X0542811101000000123456' },
    { id: '2', name: 'Carta Prepagata', type: 'card', balance: 350.50, iban: 'IT99Y0300000000000009876543' },
    { id: '3', name: 'Fondo di Emergenza', type: 'savings', balance: 12000.00, iban: 'BBVA Deposito' },
  ],
  bills: [
    { id: '1', title: 'Energia Elettrica & Gas', amount: 145.20, dueDate: '2026-11-20', category: 'Utenze', status: 'pending' },
    { id: '2', title: 'Internet Fibra', amount: 29.90, dueDate: '2026-11-25', category: 'Utenze', status: 'pending' },
    { id: '3', title: 'Rata Mutuo / Affitto', amount: 750.00, dueDate: '2026-12-01', category: 'Casa', status: 'pending' },
    { id: '4', title: 'Assicurazione Auto', amount: 480.00, dueDate: '2026-11-05', category: 'Trasporti', status: 'paid' },
  ],
  investments: [
    { id: '1', name: 'Vanguard FTSE All-World (VWCE)', category: 'ETF', invested: 10000.00, currentValue: 11850.00, shares: 112 },
    { id: '2', name: 'iShares Core S&P 500 (CSSPX)', category: 'ETF', invested: 5000.00, currentValue: 5620.00, shares: 11 },
    { id: '3', name: 'BTP Valore 2028', category: 'Titoli di Stato', invested: 4000.00, currentValue: 4080.00, shares: 4000 },
  ],
  transactions: [
    { id: '1', date: '2026-11-10', title: 'Stipendio', amount: 2650.00, type: 'income', category: 'Lavoro', accountId: '1' },
    { id: '2', date: '2026-11-09', title: 'Spesa Supermercato', amount: 84.30, type: 'expense', category: 'Alimentari', accountId: '2' },
    { id: '3', date: '2026-11-07', title: 'Rifornimento Carburante', amount: 65.00, type: 'expense', category: 'Trasporti', accountId: '2' },
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [data, setData] = useState(() => {
    const local = localStorage.getItem('finanza_app_data');
    return local ? JSON.parse(local) : initialData;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [showValues, setShowValues] = useState(true);

  // Modal States
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Form States
  const [newTx, setNewTx] = useState({ title: '', amount: '', type: 'expense', category: 'Alimentari', accountId: '1', date: new Date().toISOString().split('T')[0] });
  const [newBill, setNewBill] = useState({ title: '', amount: '', dueDate: '', category: 'Utenze' });
  const [newInv, setNewInv] = useState({ name: '', category: 'ETF', invested: '', currentValue: '', shares: '' });
  const [newAcc, setNewAcc] = useState({ name: '', type: 'bank', balance: '', iban: '' });

  // Autenticazione & Firestore Sync
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        subscribeToFirestore(u.uid);
      } else {
        await signInAnonymously(auth);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const subscribeToFirestore = (uid) => {
    setIsSyncing(true);
    const userDocRef = doc(db, 'users', uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        setData(cloudData);
        localStorage.setItem('finanza_app_data', JSON.stringify(cloudData));
      } else {
        saveDataToFirestore(uid, data);
      }
      setIsSyncing(false);
    }, (err) => {
      console.warn("Firestore sync offline fallback:", err);
      setIsSyncing(false);
    });
    return unsubscribe;
  };

  const updateStateAndPersist = (newData) => {
    setData(newData);
    localStorage.setItem('finanza_app_data', JSON.stringify(newData));
    if (user && isFirebaseConfigured) {
      saveDataToFirestore(user.uid, newData);
    }
  };

  const saveDataToFirestore = async (uid, dataToSave) => {
    try {
      setIsSyncing(true);
      await setDoc(doc(db, 'users', uid), dataToSave);
    } catch (e) {
      console.error("Errore salvataggio cloud:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Calcoli Finanziari Consolidated
  const totalBankBalance = useMemo(() => data.accounts.reduce((sum, a) => sum + Number(a.balance), 0), [data.accounts]);
  const totalInvestedCarico = useMemo(() => data.investments.reduce((sum, i) => sum + Number(i.invested), 0), [data.investments]);
  const totalInvestedCurrent = useMemo(() => data.investments.reduce((sum, i) => sum + Number(i.currentValue), 0), [data.investments]);
  const pendingBillsTotal = useMemo(() => data.bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + Number(b.amount), 0), [data.bills]);
  
  const totalNetWorth = totalBankBalance + totalInvestedCurrent - pendingBillsTotal;
  const totalROI = totalInvestedCarico > 0 ? ((totalInvestedCurrent - totalInvestedCarico) / totalInvestedCarico) * 100 : 0;
  const totalGainAbs = totalInvestedCurrent - totalInvestedCarico;

  // Filtri Scadenze (Prossimi 30 giorni)
  const upcomingBills = useMemo(() => {
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);
    return data.bills.filter(b => {
      const d = new Date(b.dueDate);
      return d >= today && d <= in30Days && b.status === 'pending';
    }).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [data.bills]);

  // Gestione Form
  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!newTx.title || !newTx.amount) return;
    const amountNum = parseFloat(newTx.amount);
    const updatedAccs = data.accounts.map(acc => {
      if (acc.id === newTx.accountId) {
        const delta = newTx.type === 'income' ? amountNum : -amountNum;
        return { ...acc, balance: acc.balance + delta };
      }
      return acc;
    });
    const updatedTx = [{ ...newTx, id: Date.now().toString(), amount: amountNum }, ...data.transactions];
    updateStateAndPersist({ ...data, accounts: updatedAccs, transactions: updatedTx });
    setShowTransactionModal(false);
    setNewTx({ title: '', amount: '', type: 'expense', category: 'Alimentari', accountId: '1', date: new Date().toISOString().split('T')[0] });
  };

  const handleAddBill = (e) => {
    e.preventDefault();
    if (!newBill.title || !newBill.amount || !newBill.dueDate) return;
    const updatedBills = [...data.bills, { ...newBill, id: Date.now().toString(), amount: parseFloat(newBill.amount), status: 'pending' }];
    updateStateAndPersist({ ...data, bills: updatedBills });
    setShowBillModal(false);
    setNewBill({ title: '', amount: '', dueDate: '', category: 'Utenze' });
  };

  const handleAddInvestment = (e) => {
    e.preventDefault();
    if (!newInv.name || !newInv.invested) return;
    const updatedInv = [...data.investments, {
      ...newInv,
      id: Date.now().toString(),
      invested: parseFloat(newInv.invested),
      currentValue: parseFloat(newInv.currentValue || newInv.invested),
      shares: parseFloat(newInv.shares || 0)
    }];
    updateStateAndPersist({ ...data, investments: updatedInv });
    setShowInvestmentModal(false);
    setNewInv({ name: '', category: 'ETF', invested: '', currentValue: '', shares: '' });
  };

  const handleToggleBillStatus = (id) => {
    const updatedBills = data.bills.map(b => b.id === id ? { ...b, status: b.status === 'paid' ? 'pending' : 'paid' } : b);
    updateStateAndPersist({ ...data, bills: updatedBills });
  };

  // Import / Export JSON
  const handleExportJSON = () => {
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `backup_finanza_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleImportJSON = (e) => {
    const fileReader = new FileReader();
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.accounts && parsed.bills && parsed.investments) {
          updateStateAndPersist(parsed);
          alert("Backup ripristinato con successo!");
        }
      } catch (err) {
        alert("File JSON non valido.");
      }
    };
  };

  const formatEuro = (val) => showValues ? `€ ${val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••';

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-24 md:pb-10">
      
      {/* Sfondi ed effetti Luce Ambientali */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-10 right-10 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* HEADER SUPERIORE */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-[#090d16]/80 border-b border-slate-800/80 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Finanza & Famiglia
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
                {isSyncing ? 'Sincronizzazione Cloud...' : 'Cloud Sincronizzato'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowValues(!showValues)}
              className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition"
              title="Mostra/Nascondi Importi"
            >
              {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => setShowTransactionModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuovo Movimento</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTENUTO PRINCIPALE */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
        
        {/* NAVIGAZIONE TAB (Desktop & Mobile Scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-6 border-b border-slate-800/60">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
            { id: 'accounts', label: 'Conti & Carte', icon: CreditCard },
            { id: 'bills', label: 'Scadenziario', icon: Calendar },
            { id: 'investments', label: 'Investimenti', icon: TrendingUp },
            { id: 'transactions', label: 'Movimenti', icon: Layers },
            { id: 'backup', label: 'Backup & Cloud', icon: Shield }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                  active 
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-lg shadow-indigo-500/10' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 1. DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* HERO NET WORTH CARD */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-950 border border-indigo-500/20 p-6 md:p-8 shadow-2xl">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2 space-y-2">
                  <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Patrimoni Netto Consolidato
                  </span>
                  <div className="text-3xl md:text-5xl font-black text-white tracking-tight">
                    {formatEuro(totalNetWorth)}
                  </div>
                  <p className="text-xs text-slate-400 pt-1">
                    Calcolato da Liquidità ({formatEuro(totalBankBalance)}) + Investimenti Attuali ({formatEuro(totalInvestedCurrent)}) - Bollette Imminenti ({formatEuro(pendingBillsTotal)})
                  </p>
                </div>

                {/* STATS RAPIDE */}
                <div className="grid grid-cols-2 gap-3 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-800/80 md:pl-6">
                  <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">Rendimento Investimenti</span>
                    <span className={`text-base font-bold flex items-center gap-1 ${totalGainAbs >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {totalGainAbs >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {totalROI.toFixed(2)}%
                    </span>
                    <span className="text-[11px] text-slate-500 block">{formatEuro(totalGainAbs)}</span>
                  </div>

                  <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">Bollette da Pagare</span>
                    <span className="text-base font-bold text-amber-400 block">{formatEuro(pendingBillsTotal)}</span>
                    <span className="text-[11px] text-slate-500 block">{upcomingBills.length} scadenze a breve</span>
                  </div>
                </div>
              </div>
            </div>

            {/* GRID SEZIONI RAPIDE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* SCADENZIARIO IMMINENTE */}
              <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-800 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" /> Scadenze Prossimi 30 Giorni
                  </h3>
                  <button onClick={() => setActiveTab('bills')} className="text-xs text-indigo-400 hover:underline flex items-center">
                    Vedi tutte <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {upcomingBills.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">Nessuna bolletta o spesa in scadenza nei prossimi 30 giorni 🎉</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingBills.slice(0, 3).map(bill => (
                      <div key={bill.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700/60 transition">
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{bill.title}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3 h-3" /> Scadenza: {bill.dueDate}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-amber-400">{formatEuro(bill.amount)}</p>
                          <button 
                            onClick={() => handleToggleBillStatus(bill.id)} 
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium mt-0.5"
                          >
                            Segna Pagata
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RIEPILOGO LIQUIDITA' E PORTAFOGLIO */}
              <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-800 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-400" /> Liquidità & Saldi Conti
                  </h3>
                  <button onClick={() => setActiveTab('accounts')} className="text-xs text-indigo-400 hover:underline flex items-center">
                    Gestisci Conti <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {data.accounts.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <CreditCard className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{acc.name}</p>
                          <p className="text-xs text-slate-500 capitalize">{acc.type}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-emerald-400">{formatEuro(acc.balance)}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 2. GESTIONE CONTI & CARTE */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Conti Correnti & Carte</h2>
                <p className="text-xs text-slate-400">Monitora e aggiorna la tua liquidità disponbile.</p>
              </div>
              <button 
                onClick={() => setShowAccountModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold hover:bg-slate-800"
              >
                <Plus className="w-3.5 h-3.5" /> Aggiungi Conto
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.accounts.map(acc => (
                <div key={acc.id} className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 capitalize">
                      {acc.type}
                    </span>
                    <Wallet className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{acc.name}</h3>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{acc.iban || 'Nessun IBAN salvato'}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Saldo Attuale</span>
                    <span className="text-lg font-extrabold text-emerald-400">{formatEuro(acc.balance)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. SCADENZIARIO & BOLLETTE */}
        {activeTab === 'bills' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Scadenziario & Spese Ricorrenti</h2>
                <p className="text-xs text-slate-400">Gestisci bollette, abbonamenti e rate in scadenza.</p>
              </div>
              <button 
                onClick={() => setShowBillModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold hover:bg-slate-800"
              >
                <Plus className="w-3.5 h-3.5" /> Aggiungi Scadenza
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.bills.map(bill => {
                const isPaid = bill.status === 'paid';
                return (
                  <div key={bill.id} className={`rounded-3xl border p-5 flex items-center justify-between transition ${
                    isPaid ? 'bg-slate-950/40 border-slate-800/50 opacity-60' : 'bg-slate-900/80 border-slate-800'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                        <h3 className="text-sm font-bold text-white">{bill.title}</h3>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-slate-500" /> {bill.category} • Scadenza: {bill.dueDate}
                      </p>
                    </div>

                    <div className="text-right space-y-2">
                      <div className="text-base font-extrabold text-white">{formatEuro(bill.amount)}</div>
                      <button 
                        onClick={() => handleToggleBillStatus(bill.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                          isPaid 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                        }`}
                      >
                        {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {isPaid ? 'Pagato' : 'Segna Pagato'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. TRACCIAMENTO INVESTIMENTI */}
        {activeTab === 'investments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Portafoglio Investimenti</h2>
                <p className="text-xs text-slate-400">Traccia ETF, Azioni e Titoli di Stato con calcolo del ROI.</p>
              </div>
              <button 
                onClick={() => setShowInvestmentModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold hover:bg-slate-800"
              >
                <Plus className="w-3.5 h-3.5" /> Aggiungi Strumento
              </button>
            </div>

            {/* PERFORMANCE BAR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4">
                <span className="text-xs text-slate-400">Capitale Investito (PAC)</span>
                <p className="text-xl font-bold text-white mt-1">{formatEuro(totalInvestedCarico)}</p>
              </div>
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4">
                <span className="text-xs text-slate-400">Valore Attuale Mercato</span>
                <p className="text-xl font-bold text-indigo-400 mt-1">{formatEuro(totalInvestedCurrent)}</p>
              </div>
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4">
                <span className="text-xs text-slate-400">Profitto / Perdita (ROI)</span>
                <p className={`text-xl font-bold mt-1 flex items-center gap-1 ${totalGainAbs >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {totalGainAbs >= 0 ? '+' : ''}{formatEuro(totalGainAbs)} ({totalROI.toFixed(2)}%)
                </p>
              </div>
            </div>

            {/* LISTA STRUMENTI */}
            <div className="space-y-3">
              {data.investments.map(inv => {
                const gain = inv.currentValue - inv.invested;
                const roi = inv.invested > 0 ? (gain / inv.invested) * 100 : 0;
                return (
                  <div key={inv.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{inv.category}</span>
                        <h4 className="text-sm font-bold text-white">{inv.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Capitale Investito: {formatEuro(inv.invested)}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{formatEuro(inv.currentValue)}</p>
                      <p className={`text-xs font-semibold ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {gain >= 0 ? '+' : ''}{formatEuro(gain)} ({roi.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. MOVIMENTI & TRANSAZIONI */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Registro Movimenti</h2>
                <p className="text-xs text-slate-400">Tutti i movimenti di entrata e uscita registrati.</p>
              </div>
              <button 
                onClick={() => setShowTransactionModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20"
              >
                <Plus className="w-3.5 h-3.5" /> Nuovo Movimento
              </button>
            </div>

            <div className="space-y-2">
              {data.transactions.map(tx => (
                <div key={tx.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between hover:border-slate-700/60 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {tx.type === 'income' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200">{tx.title}</p>
                      <p className="text-xs text-slate-500">{tx.date} • Tag: {tx.category}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-extrabold ${tx.type === 'income' ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatEuro(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. BACKUP & CLOUD */}
        {activeTab === 'backup' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-400" /> Backup Dati e Ripristino Local/Cloud
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  I tuoi dati sono sincronizzati automaticamente su Firebase Firestore e salvati nel LocalStorage. Puoi scaricare o caricare un file JSON di backup in qualsiasi momento.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={handleExportJSON}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/40 flex flex-col items-center justify-center gap-2 text-center transition group"
                >
                  <Download className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition" />
                  <span className="text-sm font-bold text-white">Esporta Backup JSON</span>
                  <span className="text-[11px] text-slate-500">Salva una copia offline di tutti i tuoi dati</span>
                </button>

                <label className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/40 flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer group">
                  <Upload className="w-6 h-6 text-purple-400 group-hover:scale-110 transition" />
                  <span className="text-sm font-bold text-white">Ripristina da File</span>
                  <span className="text-[11px] text-slate-500">Carica un file di backup JSON esistente</span>
                  <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODAL NUOVO MOVIMENTO */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white">Nuova Transazione</h3>
            <form onSubmit={handleAddTransaction} className="space-y-3">
              <input 
                type="text" placeholder="Descrizione (es. Spesa, Stipendio)" 
                value={newTx.title} onChange={e => setNewTx({...newTx, title: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500" required
              />
              <input 
                type="number" step="0.01" placeholder="Importo €" 
                value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500" required
              />
              <div className="grid grid-cols-2 gap-2">
                <select 
                  value={newTx.type} onChange={e => setNewTx({...newTx, type: e.target.value})}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white"
                >
                  <option value="expense">Uscita</option>
                  <option value="income">Entrata</option>
                </select>
                <select 
                  value={newTx.accountId} onChange={e => setNewTx({...newTx, accountId: e.target.value})}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white"
                >
                  {data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowTransactionModal(false)} className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold">Annulla</button>
                <button type="submit" className="w-1/2 py-2.5 rounded-xl bg-indigo-600 text-xs font-semibold text-white">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUOVA SCADENZA */}
      {showBillModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white">Aggiungi Bolletta / Spesa Ricorrente</h3>
            <form onSubmit={handleAddBill} className="space-y-3">
              <input 
                type="text" placeholder="Nome Spesa (es. Luce, Mutuo)" 
                value={newBill.title} onChange={e => setNewBill({...newBill, title: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white" required
              />
              <input 
                type="number" step="0.01" placeholder="Importo €" 
                value={newBill.amount} onChange={e => setNewBill({...newBill, amount: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white" required
              />
              <input 
                type="date" 
                value={newBill.dueDate} onChange={e => setNewBill({...newBill, dueDate: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white" required
              />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowBillModal(false)} className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold">Annulla</button>
                <button type="submit" className="w-1/2 py-2.5 rounded-xl bg-indigo-600 text-xs font-semibold text-white">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUOVO INVESTIMENTO */}
      {showInvestmentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white">Nuovo Strumento Finanziario</h3>
            <form onSubmit={handleAddInvestment} className="space-y-3">
              <input 
                type="text" placeholder="Nome Strumento (es. VWCE, BTP 2030)" 
                value={newInv.name} onChange={e => setNewInv({...newInv, name: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white" required
              />
              <input 
                type="number" step="0.01" placeholder="Capitale Investito € (Prezzo di carico)" 
                value={newInv.invested} onChange={e => setNewInv({...newInv, invested: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white" required
              />
              <input 
                type="number" step="0.01" placeholder="Valore Attuale Mercato €" 
                value={newInv.currentValue} onChange={e => setNewInv({...newInv, currentValue: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white"
              />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowInvestmentModal(false)} className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold">Annulla</button>
                <button type="submit" className="w-1/2 py-2.5 rounded-xl bg-indigo-600 text-xs font-semibold text-white">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Icona Dashboard Custom
function LayoutDashboardIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1"/>
      <rect width="7" height="5" x="14" y="3" rx="1"/>
      <rect width="7" height="9" x="14" y="12" rx="1"/>
      <rect width="7" height="5" x="3" y="16" rx="1"/>
    </svg>
  );
}