import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Wallet, CreditCard, TrendingUp, Calendar, Plus, Shield, Check, Clock,
  PieChart, Tag, ArrowUpRight, ArrowDownRight, Car, Home, ShoppingBag, 
  Utensils, Briefcase, Gift, Zap, X, Eye, EyeOff, LayoutDashboard, Download, Upload, Layers
} from 'lucide-react';

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
    { id: '1', name: 'Vanguard FTSE All-World (VWCE)', category: 'ETF', invested: 10000.00, currentValue: 11850.00 },
    { id: '2', name: 'iShares Core S&P 500', category: 'ETF', invested: 5000.00, currentValue: 5620.00 },
    { id: '3', name: 'BTP Valore 2028', category: 'Titoli', invested: 4000.00, currentValue: 4080.00 },
  ],
  transactions: [
    { id: '1', date: '2026-11-10', title: 'Stipendio Accreditato', amount: 2650.00, type: 'income', category: 'Lavoro', accountId: '1' },
    { id: '2', date: '2026-11-09', title: 'Spesa Esselunga', amount: 84.30, type: 'expense', category: 'Alimentari', accountId: '2' },
    { id: '3', date: '2026-11-08', title: 'Rifornimento Eni Station', amount: 65.00, type: 'expense', category: 'Trasporti', accountId: '2' },
    { id: '4', date: '2026-11-07', title: 'Affitto Mese', amount: 750.00, type: 'expense', category: 'Casa', accountId: '1' },
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

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [data, setData] = useState(() => {
    const local = localStorage.getItem('finanza_app_data');
    return local ? JSON.parse(local) : initialData;
  });
  const [showValues, setShowValues] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTx, setNewTx] = useState({ title: '', amount: '', type: 'expense', category: 'Alimentari', accountId: '1', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const userDocRef = doc(db, 'users', u.uid);
        onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setData(docSnap.data());
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

  const handleAddTx = (e) => {
    e.preventDefault();
    if (!newTx.title || !newTx.amount) return;
    const amt = parseFloat(newTx.amount);
    const updatedAccs = data.accounts.map(acc => acc.id === newTx.accountId ? { ...acc, balance: acc.balance + (newTx.type === 'income' ? amt : -amt) } : acc);
    const updatedTx = [{ ...newTx, id: Date.now().toString(), amount: amt }, ...data.transactions];
    updateData({ ...data, accounts: updatedAccs, transactions: updatedTx });
    setShowAddModal(false);
    setNewTx({ title: '', amount: '', type: 'expense', category: 'Alimentari', accountId: '1', date: new Date().toISOString().split('T')[0] });
  };

  const handleToggleBillStatus = (id) => {
    const updatedBills = data.bills.map(b => b.id === id ? { ...b, status: b.status === 'paid' ? 'pending' : 'paid' } : b);
    updateData({ ...data, bills: updatedBills });
  };

  const formatEuro = (v) => showValues ? `€ ${v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-900/50 p-6 space-y-8">
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
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'accounts', label: 'Conti & Carte', icon: Wallet },
            { id: 'bills', label: 'Scadenziario', icon: Calendar },
            { id: 'investments', label: 'Investimenti', icon: TrendingUp },
            { id: 'transactions', label: 'Movimenti', icon: Layers },
            { id: 'backup', label: 'Backup & Cloud', icon: Shield },
          ].map(item => {
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
      <main className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto max-w-6xl mx-auto w-full pb-24 md:pb-8">
        
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
              <h2 className="text-sm font-bold text-white">Conti & Saldi</h2>
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
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Conti Correnti e Carte</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.accounts.map(acc => (
                <div key={acc.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{acc.type}</span>
                    <Wallet className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{acc.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{acc.iban || 'Nessun IBAN'}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-xs text-slate-400">Saldo</span>
                    <span className="text-base font-extrabold text-emerald-400">{formatEuro(acc.balance)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. SCADENZIARIO TAB */}
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

        {/* 4. INVESTIMENTI TAB */}
        {activeTab === 'investments' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Portafoglio Investimenti</h2>
              <span className={`text-xs font-bold px-3 py-1 rounded-xl ${totalGainAbs >= 0 ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20' : 'text-rose-400 bg-rose-400/10 border border-rose-400/20'}`}>
                Profitto: {totalGainAbs >= 0 ? '+' : ''}{formatEuro(totalGainAbs)} ({totalROI.toFixed(2)}%)
              </span>
            </div>
            <div className="space-y-3">
              {data.investments.map(inv => {
                const gain = inv.currentValue - inv.invested;
                const roi = inv.invested > 0 ? (gain / inv.invested) * 100 : 0;
                return (
                  <div key={inv.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">{inv.category}</span>
                      <h4 className="text-sm font-bold text-white mt-1">{inv.name}</h4>
                      <p className="text-xs text-slate-500">Capitale investito: {formatEuro(inv.invested)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-white block">{formatEuro(inv.currentValue)}</span>
                      <span className={`text-xs font-semibold ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {gain >= 0 ? '+' : ''}{formatEuro(gain)} ({roi.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. MOVIMENTI COMPLETI TAB */}
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

        {/* 6. BACKUP & CLOUD TAB */}
        {activeTab === 'backup' && (
          <div className="space-y-4 max-w-lg mx-auto py-6 text-center">
            <Shield className="w-12 h-12 text-blue-500 mx-auto" />
            <h2 className="text-lg font-bold text-white">Sincronizzazione Cloud e Backup</h2>
            <p className="text-xs text-slate-400">I tuoi dati finanziari sono sincronizzati automaticamente con il database cloud di Firebase e conservati nel dispositivo.</p>
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-2 flex justify-around items-center z-40">
        {[
          { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { id: 'accounts', label: 'Conti', icon: Wallet },
          { id: 'bills', label: 'Scadenze', icon: Calendar },
          { id: 'investments', label: 'Investimenti', icon: TrendingUp },
          { id: 'transactions', label: 'Movimenti', icon: Layers },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 ${activeTab === item.id ? 'text-blue-500' : 'text-slate-500'}`}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* MODALE INSERIMENTO */}
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
                <select value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white">
                  {Object.keys(categoryConfig).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 rounded-xl font-bold text-xs text-white shadow-lg shadow-blue-600/30">Salva Movimento</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}