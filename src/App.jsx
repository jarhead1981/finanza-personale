import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Wallet, CreditCard, TrendingUp, Calendar, Plus, Shield, Check, 
  PieChart, Tag, ArrowUpRight, ArrowDownRight, Car, Home, ShoppingBag, 
  Utensils, Briefcase, Gift, Zap, X, Eye, EyeOff, LayoutDashboard, LogOut, ArrowDown, ArrowUp
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
    { id: '1', name: 'Conto Corrente Principale', type: 'bank', balance: 4250.00, iban: 'IT60X0542811101000000123456' },
    { id: '2', name: 'Carta Prepagata', type: 'card', balance: 350.50, iban: 'IT99Y0300000000000009876543' },
    { id: '3', name: 'Fondo Deposito BBVA', type: 'savings', balance: 12000.00, iban: 'IT12A000000000000000111222' },
  ],
  bills: [
    { id: '1', title: 'Energia Elettrica & Gas', amount: 145.20, dueDate: '2026-11-20', category: 'Utenze', status: 'pending' },
    { id: '2', title: 'Internet Fibra Optica', amount: 29.90, dueDate: '2026-11-25', category: 'Utenze', status: 'pending' },
    { id: '3', title: 'Rata Mutuo Casa', amount: 750.00, dueDate: '2026-12-01', category: 'Casa', status: 'pending' },
  ],
  investments: [
    { id: '1', name: 'Vanguard FTSE All-World (VWCE)', category: 'ETF', invested: 10000.00, currentValue: 11850.00 },
    { id: '2', name: 'iShares Core S&P 500', category: 'ETF', invested: 5000.00, currentValue: 5620.00 },
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
  const totalInvested = useMemo(() => data.investments.reduce((sum, i) => sum + Number(i.currentValue), 0), [data.investments]);
  const pendingBills = useMemo(() => data.bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + Number(b.amount), 0), [data.bills]);
  const netWorth = totalBankBalance + totalInvested - pendingBills;

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

  const formatEuro = (v) => showValues ? `€ ${v.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '••••••';

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
      <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
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
            <span className="text-2xl md:text-3xl font-extrabold text-purple-400">{formatEuro(totalInvested)}</span>
          </div>
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LISTA TRANSAZIONI */}
            <div className="lg:col-span-2 space-y-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-sm font-bold text-white flex items-center justify-between">
                <span>Ultimi Movimenti</span>
                <button onClick={() => setShowAddModal(true)} className="text-xs text-blue-400 hover:underline">+ Aggiungi</button>
              </h2>
              
              <div className="space-y-3">
                {data.transactions.map(tx => {
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

            {/* SIDEBAR CONTI RAPIDA */}
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

      </main>

      {/* BOTTOM NAV MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-2 flex justify-around items-center z-40">
        {[
          { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { id: 'accounts', label: 'Conti', icon: Wallet },
          { id: 'bills', label: 'Scadenze', icon: Calendar },
          { id: 'investments', label: 'Investimenti', icon: TrendingUp },
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