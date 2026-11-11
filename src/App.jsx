import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Wallet, CreditCard, TrendingUp, Calendar, Plus, Shield, Check, Clock,
  PieChart, Tag, ArrowUpRight, ArrowDownRight, Car, Home, ShoppingBag, 
  Utensils, Briefcase, Gift, Zap, X, Eye, EyeOff, LayoutDashboard, Download, 
  Layers, Calculator, BarChart3, Pencil, Trash2
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

const initialData = {
  salaryInput: 2650,
  accounts: [
    { id: '1', name: 'Conto Corrente Principale', type: 'banca', balance: 4250.00, iban: 'IT60X0542811101000000123456' },
    { id: '2', name: 'Carta Prepagata', type: 'carta', balance: 350.50, iban: 'IT99Y0300000000000009876543' },
    { id: '3', name: 'Fondo Deposito BBVA', type: 'risparmio', balance: 12000.00, iban: 'IT12A000000000000000111222' },
  ],
  bills: [
    { id: '1', title: 'Energia Elettrica & Gas', amount: 145.20, dueDate: '2026-11-20', category: 'Utenze', status: 'pending' },
    { id: '2', title: 'Internet Fibra', amount: 29.90, dueDate: '2026-11-25', category: 'Utenze', status: 'pending' },
    { id: '3', title: 'Rata Mutuo Casa', amount: 750.00, dueDate: '2026-12-01', category: 'Casa', status: 'pending' },
  ],
  investments: [
    { id: '1', name: 'Vanguard FTSE All-World (VWCE)', category: 'ETF Azionari', invested: 10000.00, currentValue: 11850.00 },
    { id: '2', name: 'iShares Core S&P 500', category: 'ETF Azionari', invested: 5000.00, currentValue: 5620.00 },
    { id: '3', name: 'BTP Valore 2028', category: 'Obbligazioni', invested: 4000.00, currentValue: 4080.00 },
    { id: '4', name: 'Oro / Commodity', category: 'Materie Prime', invested: 1500.00, currentValue: 1720.00 },
  ],
  transactions: [
    { id: '1', date: '2026-11-10', title: 'Stipendio Accreditato', amount: 2650.00, type: 'income', category: 'Lavoro', accountId: '1' },
    { id: '2', date: '2026-11-09', title: 'Spesa Supermercato', amount: 84.30, type: 'expense', category: 'Alimentari', accountId: '2' },
    { id: '3', date: '2026-11-08', title: 'Rifornimento Carburante', amount: 65.00, type: 'expense', category: 'Trasporti', accountId: '2' },
    { id: '4', date: '2026-11-07', title: 'Rata Mutuo / Affitto', amount: 750.00, type: 'expense', category: 'Casa', accountId: '1' },
  ]
};

const categoryConfig = {
  'Alimentari': { icon: Utensils, bg: 'bg-amber-500/10', text: 'text-amber-500' },
  'Trasporti': { icon: Car, bg: 'bg-purple-500/10', text: 'text-purple-500' },
  'Casa': { icon: Home, bg: 'bg-orange-500/10', text: 'text-orange-500' },
  'Lavoro': { icon: Briefcase, bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  'Shopping': { icon: ShoppingBag, bg: 'bg-blue-500/10', text: 'text-blue-500' },
  'Utenze': { icon: Zap, bg: 'bg-rose-500/10', text: 'text-rose-500' },
  'Altro': { icon: Tag, bg: 'bg-slate-500/10', text: 'text-slate-500' },
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
  const [user, setUser] = useState(null);
  const [data, setData] = useState(() => {
    const local = localStorage.getItem('finanza_app_data');
    return local ? JSON.parse(local) : initialData;
  });
  const [showValues, setShowValues] = useState(true);

  // Modale Transazione
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTx, setNewTx] = useState({ title: '', amount: '', type: 'expense', category: 'Alimentari', accountId: '1', date: new Date().toISOString().split('T')[0] });

  // Modale Conti (CRUD)
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountForm, setAccountForm] = useState({ name: '', type: 'banca', balance: '', iban: '' });

  // Modale Investimenti (CRUD)
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [investmentForm, setInvestmentForm] = useState({ name: '', category: 'ETF Azionari', invested: '', currentValue: '' });

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

  const totalBankBalance = useMemo(() => data.accounts.reduce((sum, a) => sum + Number(a.balance), 0), [data.accounts]);
  const totalInvestedCarico = useMemo(() => data.investments.reduce((sum, i) => sum + Number(i.invested), 0), [data.investments]);
  const totalInvestedCurrent = useMemo(() => data.investments.reduce((sum, i) => sum + Number(i.currentValue), 0), [data.investments]);
  const pendingBills = useMemo(() => data.bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + Number(b.amount), 0), [data.bills]);
  const netWorth = totalBankBalance + totalInvestedCurrent - pendingBills;
  const totalGainAbs = totalInvestedCurrent - totalInvestedCarico;
  const totalROI = totalInvestedCarico > 0 ? (totalGainAbs / totalInvestedCarico) * 100 : 0;

  const investmentCategories = useMemo(() => {
    const groups = {};
    data.investments.forEach(inv => {
      groups[inv.category] = (groups[inv.category] || 0) + Number(inv.currentValue);
    });
    const total = totalInvestedCurrent || 1;
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'];
    return Object.keys(groups).map((cat, idx) => ({
      name: cat,
      amount: groups[cat],
      pct: (groups[cat] / total) * 100,
      color: colors[idx % colors.length]
    })).sort((a,b) => b.amount - a.amount);
  }, [data.investments, totalInvestedCurrent]);

  // --- TRANSAZIONI ---
  const handleAddTx = (e) => {
    e.preventDefault();
    if (!newTx.title || !newTx.amount) return;
    const amt = parseFloat(newTx.amount);
    const updatedAccs = data.accounts.map(acc => acc.id === newTx.accountId ? { ...acc, balance: acc.balance + (newTx.type === 'income' ? amt : -amt) } : acc);
    const updatedTx = [{ ...newTx, id: Date.now().toString(), amount: amt }, ...data.transactions];
    updateData({ ...data, accounts: updatedAccs, transactions: updatedTx });
    setShowAddModal(false);
    setNewTx({ title: '', amount: '', type: 'expense', category: 'Alimentari', accountId: data.accounts[0]?.id || '1', date: new Date().toISOString().split('T')[0] });
  };

  // --- CRUD CONTI ---
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

  // --- CRUD INVESTIMENTI ---
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

  const handleToggleBillStatus = (id) => {
    const updatedBills = data.bills.map(b => b.id === id ? { ...b, status: b.status === 'paid' ? 'pending' : 'paid' } : b);
    updateData({ ...data, bills: updatedBills });
  };

  const formatEuro = (v) => showValues ? `€ ${v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'accounts', label: 'Conti & Carte', icon: Wallet },
    { id: 'investments', label: 'Investimenti & Grafici', icon: TrendingUp },
    { id: 'simulator', label: 'Simulatore Stipendio', icon: Calculator },
    { id: 'bills', label: 'Scadenziario', icon: Calendar },
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
          onClick={() => setShowAddModal(true)}
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
            <span className="text-xs text-slate-400 font-semibold block mb-1">Portafoglio Investito</span>
            <span className="text-2xl md:text-3xl font-extrabold text-purple-400">{formatEuro(totalInvestedCurrent)}</span>
          </div>
        </div>

        {/* 1. DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
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

        {/* 3. INVESTIMENTI TAB */}
        {activeTab === 'investments' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Gestione Investimenti & Grafici</h2>
                <p className="text-xs text-slate-400">Traccia ETF, Titoli, Crypto e aggiorna il valore di mercato attuale.</p>
              </div>
              <div className="flex items-center gap-3">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-purple-400" /> Ripartizione Asset Class
                </h3>

                <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
                  <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
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
                      <span className="text-[10px] text-slate-400 uppercase">Valore Totale</span>
                      <span className="text-sm font-bold text-white">{formatEuro(totalInvestedCurrent)}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5 w-full">
                    {investmentCategories.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-slate-300 font-medium">{cat.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-white block">{formatEuro(cat.amount)}</span>
                          <span className="text-[10px] text-slate-500">{cat.pct.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" /> Rendimento per Strumento
                </h3>

                <div className="space-y-4 pt-2">
                  {data.investments.map(inv => {
                    const maxVal = Math.max(inv.invested, inv.currentValue);
                    const pctInvested = (inv.invested / maxVal) * 100;
                    const pctCurrent = (inv.currentValue / maxVal) * 100;
                    const isProfit = inv.currentValue >= inv.invested;

                    return (
                      <div key={inv.id} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-200">{inv.name}</span>
                          <span className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfit ? '+' : ''}{formatEuro(inv.currentValue - inv.invested)}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden flex">
                            <div className="bg-slate-600 h-full rounded-full transition-all duration-500" style={{ width: `${pctInvested}%` }} />
                          </div>
                          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden flex">
                            <div className={`${isProfit ? 'bg-emerald-500' : 'bg-rose-500'} h-full rounded-full transition-all duration-500`} style={{ width: `${pctCurrent}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Elenco Strumenti in Portafoglio</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.investments.map(inv => {
                  const gain = inv.currentValue - inv.invested;
                  const roi = inv.invested > 0 ? (gain / inv.invested) * 100 : 0;
                  return (
                    <div key={inv.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">{inv.category}</span>
                          <h4 className="text-sm font-bold text-white">{inv.name}</h4>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Investito: {formatEuro(inv.invested)}</p>
                      </div>

                      <div className="text-right space-y-1">
                        <span className="text-sm font-bold text-white block">{formatEuro(inv.currentValue)}</span>
                        <span className={`text-xs font-semibold ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {gain >= 0 ? '+' : ''}{formatEuro(gain)} ({roi.toFixed(1)}%)
                        </span>

                        <div className="flex items-center justify-end gap-1 pt-1">
                          <button 
                            onClick={() => handleOpenEditInvestment(inv)}
                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Modifica Valore"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteInvestment(inv.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                            title="Elimina Strumento"
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

        {/* 4. SIMULATORE STIPENDIO TAB */}
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

        {/* 5. SCADENZIARIO TAB */}
        {activeTab === 'bills' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Scadenziario Bollette & Rate</h2>
              <span className="text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-xl">
                Totale da pagare: {formatEuro(pendingBills)}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.bills.map(bill => {
                const isPaid = bill.status === 'paid';
                return (
                  <div key={bill.id} className={`p-4 rounded-2xl border flex justify-between items-center transition ${isPaid ? 'bg-slate-950/40 border-slate-800/50 opacity-60' : 'bg-slate-900 border-slate-800'}`}>
                    <div>
                      <h4 className="text-sm font-bold text-white">{bill.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Scadenza: {bill.dueDate} • {bill.category}</p>
                    </div>
                    <div className="text-right space-y-1.5">
                      <span className="text-sm font-bold text-white block">{formatEuro(bill.amount)}</span>
                      <button 
                        onClick={() => handleToggleBillStatus(bill.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${isPaid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}
                      >
                        {isPaid ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {isPaid ? 'Pagato' : 'Segna Pagato'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. MOVIMENTI TAB */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Tutti i Movimenti</h2>
              <button onClick={() => setShowAddModal(true)} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-xs font-bold text-white flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Aggiungi
              </button>
            </div>
            <div className="space-y-2">
              {data.transactions.map(tx => {
                const cat = categoryConfig[tx.category] || categoryConfig['Altro'];
                const Icon = cat.icon;
                const isInc = tx.type === 'income';
                return (
                  <div key={tx.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
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
        )}

        {/* 7. BACKUP TAB */}
        {activeTab === 'backup' && (
          <div className="space-y-4 max-w-lg mx-auto py-6 text-center">
            <Shield className="w-12 h-12 text-blue-500 mx-auto" />
            <h2 className="text-lg font-bold text-white">Sincronizzazione Cloud e Backup</h2>
            <p className="text-xs text-slate-400">I dati sono sincronizzati con Firebase e conservati in locale.</p>
            <div className="pt-4 flex justify-center gap-3">
              <button onClick={() => {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `backup_finanza_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
              }} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-lg flex items-center gap-2">
                <Download className="w-4 h-4" /> Esporta Backup JSON
              </button>
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

      {/* MODALE NUOVO MOVIMENTO */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-base">Nuova Transazione</h3>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddTx} className="space-y-3">
              <input 
                type="text" placeholder="Titolo movimento" 
                value={newTx.title} onChange={e => setNewTx({...newTx, title: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500" required 
              />
              <input 
                type="number" step="0.01" placeholder="Importo €" 
                value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})}
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500" required 
              />
              <div className="grid grid-cols-2 gap-2">
                <select value={newTx.type} onChange={e => setNewTx({...newTx, type: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white">
                  <option value="expense">Uscita</option>
                  <option value="income">Entrata</option>
                </select>
                <select value={newTx.accountId} onChange={e => setNewTx({...newTx, accountId: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white">
                  {data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 rounded-xl font-bold text-xs text-white shadow-lg shadow-blue-600/30">Salva Movimento</button>
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
                  type="text" placeholder="Es. VWCE, S&P 500, BTP 2028..." 
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
                  <option value="ETF Azionari">ETF Azionari</option>
                  <option value="Obbligazioni">Obbligazioni / Titoli di Stato</option>
                  <option value="Materie Prime">Materie Prime / Oro</option>
                  <option value="Crypto">Crypto Assets</option>
                  <option value="Fondo Pensione">Fondo Pensione / Altro</option>
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

    </div>
  );
}