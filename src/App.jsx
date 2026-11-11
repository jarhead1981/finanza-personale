import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, doc, setDoc, onSnapshot 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  Wallet, CreditCard, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight, 
  Plus, Download, Upload, Shield, Tag, Sparkles, Eye, EyeOff,
  ChevronLeft, ChevronRight, PieChart, Layers, Check, X,
  Search, Filter, ShoppingBag, Home, Car, GraduationCap, Gift, DollarSign,
  Zap, Heart, Paperclip, CheckCircle2, Clock
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

// Categorie con Colori ed Icone personalizzate (Stile Screenshot Reference)
const CATEGORY_CONFIG = {
  'Alimentari': { color: '#8E24AA', bg: 'bg-purple-100 text-purple-600', icon: ShoppingBag },
  'Trasporti': { color: '#E91E63', bg: 'bg-pink-100 text-pink-600', icon: Car },
  'Affitto': { color: '#FB8C00', bg: 'bg-amber-100 text-amber-600', icon: Home },
  'Casa': { color: '#FB8C00', bg: 'bg-amber-100 text-amber-600', icon: Home },
  'Istruzione': { color: '#4CAF50', bg: 'bg-emerald-100 text-emerald-600', icon: GraduationCap },
  'Regali': { color: '#9C27B0', bg: 'bg-purple-100 text-purple-600', icon: Gift },
  'Lavoro': { color: '#2E7D32', bg: 'bg-green-100 text-green-700', icon: DollarSign },
  'Utenze': { color: '#0288D1', bg: 'bg-sky-100 text-sky-600', icon: Zap },
  'Altro': { color: '#78909C', bg: 'bg-slate-100 text-slate-600', icon: Tag }
};

// Dati Iniziali Demo
const initialData = {
  accounts: [
    { id: '1', name: 'Wallet / Contabile', type: 'bank', balance: 4250.00, projected: 4250.00 },
    { id: '2', name: 'Carta Prepagata', type: 'card', balance: 350.50, projected: 350.50 },
    { id: '3', name: 'Fondo Deposito', type: 'savings', balance: 12000.00, projected: 12000.00 },
  ],
  bills: [
    { id: '1', title: 'Energia Elettrica & Gas', amount: 145.20, dueDate: '2026-11-20', category: 'Utenze', status: 'pending' },
    { id: '2', title: 'Internet Fibra', amount: 29.90, dueDate: '2026-11-25', category: 'Utenze', status: 'pending' },
    { id: '3', title: 'Rata Mutuo / Affitto', amount: 750.00, dueDate: '2026-12-01', category: 'Affitto', status: 'pending' },
  ],
  investments: [
    { id: '1', name: 'Vanguard FTSE All-World (VWCE)', category: 'ETF', invested: 10000.00, currentValue: 11850.00, shares: 112 },
    { id: '2', name: 'iShares Core S&P 500 (CSSPX)', category: 'ETF', invested: 5000.00, currentValue: 5620.00, shares: 11 },
  ],
  transactions: [
    { id: '1', date: '2026-11-11', title: 'Stipendio', amount: 2650.00, type: 'income', category: 'Lavoro', accountId: '1' },
    { id: '2', date: '2026-11-11', title: 'Trasporti', amount: 30.00, type: 'expense', category: 'Trasporti', accountId: '1' },
    { id: '3', date: '2026-11-11', title: 'Affitto Casa', amount: 25.00, type: 'expense', category: 'Affitto', accountId: '1' },
    { id: '4', date: '2026-11-10', title: 'Corsi Formazione', amount: 20.00, type: 'expense', category: 'Istruzione', accountId: '1' },
    { id: '5', date: '2026-11-10', title: 'Abbigliamento', amount: 50.00, type: 'expense', category: 'Alimentari', accountId: '1' },
    { id: '6', date: '2026-11-09', title: 'Regalo Compleanno', amount: 100.00, type: 'expense', category: 'Regali', accountId: '1' },
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions', 'analytics', 'accounts', 'bills', 'backup'
  const [user, setUser] = useState(null);
  const [data, setData] = useState(() => {
    const local = localStorage.getItem('finanza_app_data');
    return local ? JSON.parse(local) : initialData;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formType, setFormType] = useState('expense'); // 'expense' | 'income'

  // Form State (Stile Screen 1)
  const [newEntry, setNewEntry] = useState({
    title: '',
    amount: '',
    dateOption: 'Today', // 'Today', 'Yesterday', 'Others'
    customDate: new Date().toISOString().split('T')[0],
    category: 'Alimentari',
    accountId: '1',
    description: ''
  });

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
    return onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        setData(cloudData);
        localStorage.setItem('finanza_app_data', JSON.stringify(cloudData));
      } else {
        saveDataToFirestore(uid, data);
      }
      setIsSyncing(false);
    }, () => setIsSyncing(false));
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
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Calcoli Finanziari
  const totalBalance = useMemo(() => data.accounts.reduce((sum, a) => sum + Number(a.balance), 0), [data.accounts]);
  
  const monthlyExpenses = useMemo(() => 
    data.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0),
  [data.transactions]);

  const monthlyIncomes = useMemo(() => 
    data.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
  [data.transactions]);

  // Categorie distribuite per il grafico Donut (Stile Screen 3)
  const categoryChartData = useMemo(() => {
    const expenses = data.transactions.filter(t => t.type === 'expense');
    const totalExp = expenses.reduce((sum, t) => sum + Number(t.amount), 0) || 1;
    const catMap = {};

    expenses.forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
    });

    return Object.keys(catMap).map(cat => {
      const amount = catMap[cat];
      const percentage = (amount / totalExp) * 100;
      const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG['Altro'];
      return {
        category: cat,
        amount,
        percentage,
        color: config.color,
        bg: config.bg,
        icon: config.icon
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [data.transactions]);

  // Gestione Salva Movimento
  const handleSaveEntry = (e) => {
    e.preventDefault();
    if (!newEntry.amount) return;

    const amountNum = parseFloat(newEntry.amount);
    const dateFinal = newEntry.dateOption === 'Today' 
      ? new Date().toISOString().split('T')[0]
      : newEntry.dateOption === 'Yesterday'
      ? new Date(Date.now() - 86400000).toISOString().split('T')[0]
      : newEntry.customDate;

    const updatedAccs = data.accounts.map(acc => {
      if (acc.id === newEntry.accountId) {
        const delta = formType === 'income' ? amountNum : -amountNum;
        return { ...acc, balance: acc.balance + delta, projected: acc.projected + delta };
      }
      return acc;
    });

    const newTx = {
      id: Date.now().toString(),
      title: newEntry.title || (formType === 'income' ? 'Entrata' : newEntry.category),
      amount: amountNum,
      type: formType,
      category: newEntry.category,
      accountId: newEntry.accountId,
      date: dateFinal
    };

    updateStateAndPersist({
      ...data,
      accounts: updatedAccs,
      transactions: [newTx, ...data.transactions]
    });

    setShowFormModal(false);
    setNewEntry({ title: '', amount: '', dateOption: 'Today', customDate: new Date().toISOString().split('T')[0], category: 'Alimentari', accountId: '1', description: '' });
  };

  const formatMoney = (val) => showValues ? `$${val.toFixed(2)}` : '••••';

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 font-sans pb-24 md:pb-12 select-none">
      
      {/* ----------------- INTESTAZIONE SUPERIORE MATERIA BLUE/GREEN ----------------- */}
      <div className={`transition-colors duration-300 shadow-md ${
        activeTab === 'analytics' ? 'bg-[#1E88E5]' :
        activeTab === 'accounts' ? 'bg-[#1E88E5]' : 'bg-[#1976D2]'
      }`}>
        <div className="max-w-md mx-auto px-4 pt-4 pb-14 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-wide capitalize">
                {activeTab === 'transactions' && 'Movimenti'}
                {activeTab === 'analytics' && 'Analisi Spese'}
                {activeTab === 'accounts' && 'I miei Conti'}
                {activeTab === 'bills' && 'Scadenziario & Investimenti'}
                {activeTab === 'backup' && 'Impostazioni Backup'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowValues(!showValues)} className="p-1.5 rounded-full hover:bg-white/10">
                {showValues ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              <Search className="w-5 h-5 cursor-pointer opacity-90" />
              <Filter className="w-5 h-5 cursor-pointer opacity-90" />
            </div>
          </div>

          {/* Selettore Mese (Stile Screenshot Reference) */}
          <div className="flex items-center justify-center gap-6 text-sm font-medium opacity-95">
            <ChevronLeft className="w-5 h-5 cursor-pointer" />
            <span>Novembre 2026</span>
            <ChevronRight className="w-5 h-5 cursor-pointer" />
          </div>
        </div>
      </div>

      {/* ----------------- CARD RIASSUNTIVA SOVRAPPOSTA (Stile Screen 2 & 4) ----------------- */}
      <div className="max-w-md mx-auto px-4 -mt-10">
        <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center justify-around border border-slate-100 text-center">
          <div>
            <span className="text-xs text-slate-400 font-medium block mb-0.5">Saldo Attuale</span>
            <span className="text-base font-bold text-rose-500">{formatMoney(totalBalance)}</span>
          </div>
          <div className="w-[1px] h-8 bg-slate-100" />
          <div>
            <span className="text-xs text-slate-400 font-medium block mb-0.5">Spese Mensili</span>
            <span className="text-base font-bold text-rose-500">-{formatMoney(monthlyExpenses)}</span>
          </div>
        </div>
      </div>

      {/* ----------------- CONTENUTO PRINCIPALE TAB ----------------- */}
      <main className="max-w-md mx-auto px-4 mt-5">

        {/* TAB 1: TRANSAZIONI (Stile Screen 2) */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              <span>Oggi</span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
              {data.transactions.map((t) => {
                const catConf = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG['Altro'];
                const IconComponent = catConf.icon;
                const isExpense = t.type === 'expense';
                return (
                  <div key={t.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      {/* Icona circolare colorata */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${catConf.bg}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">{t.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{t.category} | Wallet</p>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-2">
                      <span className={`text-sm font-bold ${isExpense ? 'text-rose-500' : 'text-emerald-600'}`}>
                        {isExpense ? '-' : '+'}{formatMoney(t.amount)}
                      </span>
                      <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: ANALISI & DONUT CHART (Stile Screen 3) */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">
            {/* Pilloli di filtro categoria */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button className="px-4 py-1.5 rounded-full bg-sky-100 text-sky-700 font-semibold text-xs whitespace-nowrap shadow-sm">Spese per categoria</button>
              <button className="px-4 py-1.5 rounded-full bg-white text-slate-500 font-semibold text-xs whitespace-nowrap border border-slate-200">Spese per conto</button>
            </div>

            {/* Grafico Donut */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center">
              <DonutChart data={categoryChartData} total={monthlyExpenses} />
            </div>

            {/* Lista Percentuali Categorie (Stile Screen 3) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
              {categoryChartData.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div key={idx} className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${item.bg}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">{item.category}</h4>
                        <div className="w-24 bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-rose-500 block">{formatMoney(item.amount)}</span>
                      <span className="text-xs text-slate-400 font-medium">{item.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: CONTI & CARTE (Stile Screen 4) */}
        {activeTab === 'accounts' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs text-slate-400 font-semibold">Proiezione Saldo Finale</span>
                <span className="text-sm font-bold text-emerald-600">{formatMoney(totalBalance)}</span>
              </div>

              {data.accounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                      <Wallet className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">{acc.name}</h4>
                      <span className="text-xs text-slate-400">Saldo Disponibile</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-600 block">{formatMoney(acc.balance)}</span>
                    <span className="text-xs text-slate-400">{formatMoney(acc.projected)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SCADENZIARIO & INVESTIMENTI */}
        {activeTab === 'bills' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> Scadenze Utenze
              </h3>
              {data.bills.map(b => (
                <div key={b.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{b.title}</p>
                    <p className="text-[11px] text-slate-400">Scadenza: {b.dueDate}</p>
                  </div>
                  <span className="text-xs font-bold text-amber-600">{formatMoney(b.amount)}</span>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Portafoglio ETF
              </h3>
              {data.investments.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{inv.name}</p>
                    <p className="text-[11px] text-slate-400">Investito: {formatMoney(inv.invested)}</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">{formatMoney(inv.currentValue)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: BACKUP & DATI */}
        {activeTab === 'backup' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4 text-center">
            <Shield className="w-10 h-10 text-sky-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Gestione Dati & Cloud</h3>
            <p className="text-xs text-slate-500">I dati sono salvati nel browser ed in Firebase Cloud.</p>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => {
                  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
                  const link = document.createElement("a");
                  link.href = jsonString;
                  link.download = `backup_finanza_${new Date().toISOString().split('T')[0]}.json`;
                  link.click();
                }}
                className="w-1/2 py-2.5 rounded-xl bg-sky-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Esporta JSON
              </button>

              <label className="w-1/2 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload className="w-4 h-4" /> Ripristina
                <input 
                  type="file" accept=".json" className="hidden" 
                  onChange={(e) => {
                    const reader = new FileReader();
                    reader.readAsText(e.target.files[0]);
                    reader.onload = (event) => {
                      const parsed = JSON.parse(event.target.result);
                      if (parsed.accounts) updateStateAndPersist(parsed);
                    };
                  }} 
                />
              </label>
            </div>
          </div>
        )}

      </main>

      {/* ----------------- BOTTONE AZIONE FLUTTUANTE (+) STILE SCREENSHOT ----------------- */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-40">
        <button 
          onClick={() => setShowFormModal(true)}
          className="w-14 h-14 rounded-full bg-[#1976D2] hover:bg-blue-700 text-white flex items-center justify-center shadow-xl shadow-blue-500/30 transition active:scale-95"
        >
          <Plus className="w-8 h-8 stroke-[2.5]" />
        </button>
      </div>

      {/* ----------------- BOTTOM BAR DI NAVIGAZIONE ----------------- */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-2 px-6">
        <div className="max-w-md mx-auto flex items-center justify-between text-slate-400">
          <button 
            onClick={() => setActiveTab('transactions')} 
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium ${activeTab === 'transactions' ? 'text-sky-600' : ''}`}
          >
            <Layers className="w-5 h-5" /> Movimenti
          </button>

          <button 
            onClick={() => setActiveTab('analytics')} 
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium ${activeTab === 'analytics' ? 'text-sky-600' : ''}`}
          >
            <PieChart className="w-5 h-5" /> Analisi
          </button>

          <div className="w-10" /> {/* Spazio per il pulsante centrale + */}

          <button 
            onClick={() => setActiveTab('accounts')} 
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium ${activeTab === 'accounts' ? 'text-sky-600' : ''}`}
          >
            <Wallet className="w-5 h-5" /> Conti
          </button>

          <button 
            onClick={() => setActiveTab('backup')} 
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium ${activeTab === 'backup' ? 'text-sky-600' : ''}`}
          >
            <Shield className="w-5 h-5" /> Cloud
          </button>
        </div>
      </div>

      {/* ----------------- SCHERMATA FORM INSERIMENTO (Stile Screen 1) ----------------- */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Header Colorato Form */}
          <div className={`${formType === 'income' ? 'bg-[#43A047]' : 'bg-[#1976D2]'} text-white p-4 pb-8 transition-colors`}>
            <div className="flex items-center justify-between">
              <button onClick={() => setShowFormModal(false)} className="p-1">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h2 className="text-base font-semibold">
                {formType === 'income' ? 'Nuova Entrata' : 'Nuova Uscita'}
              </h2>
              <div className="w-6" />
            </div>

            {/* Input Importo Grande */}
            <div className="mt-6 text-center">
              <span className="text-xs uppercase tracking-wider opacity-80 block mb-1">Importo</span>
              <div className="flex items-center justify-center gap-1 text-4xl font-extrabold">
                <span>$</span>
                <input 
                  type="number" step="0.01" placeholder="0.00" 
                  value={newEntry.amount} onChange={e => setNewEntry({...newEntry, amount: e.target.value})}
                  className="bg-transparent text-white placeholder-white/60 text-center outline-none w-48"
                  autoFocus
                />
              </div>
            </div>
          </div>

          {/* Form Inserimento Bianco */}
          <div className="flex-1 bg-white p-5 space-y-5 overflow-y-auto">
            {/* Toggle Tipo (Entrata/Uscita) */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-sm font-medium text-slate-600">Tipo Operazione</span>
              <div className="flex bg-slate-100 rounded-full p-1">
                <button 
                  onClick={() => setFormType('expense')}
                  className={`px-4 py-1 rounded-full text-xs font-semibold ${formType === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500'}`}
                >
                  Uscita
                </button>
                <button 
                  onClick={() => setFormType('income')}
                  className={`px-4 py-1 rounded-full text-xs font-semibold ${formType === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'}`}
                >
                  Entrata
                </button>
              </div>
            </div>

            {/* Pilloli Data */}
            <div className="space-y-2">
              <span className="text-xs text-slate-400 font-semibold uppercase">Data</span>
              <div className="flex items-center gap-2">
                {['Today', 'Yesterday', 'Others'].map(opt => (
                  <button 
                    key={opt}
                    onClick={() => setNewEntry({...newEntry, dateOption: opt})}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${
                      newEntry.dateOption === opt 
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    {opt === 'Today' ? 'Oggi' : opt === 'Yesterday' ? 'Ieri' : 'Altro'}
                  </button>
                ))}
              </div>
            </div>

            {/* Descrizione */}
            <div className="flex items-center gap-3 py-2 border-b border-slate-100">
              <Tag className="w-5 h-5 text-slate-400" />
              <input 
                type="text" placeholder="Descrizione (es. Spesa, Benzina)"
                value={newEntry.title} onChange={e => setNewEntry({...newEntry, title: e.target.value})}
                className="w-full text-sm text-slate-800 outline-none"
              />
            </div>

            {/* Selezione Categoria */}
            <div className="space-y-2">
              <span className="text-xs text-slate-400 font-semibold uppercase">Categoria</span>
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(CATEGORY_CONFIG).map(cat => (
                  <button 
                    type="button" key={cat}
                    onClick={() => setNewEntry({...newEntry, category: cat})}
                    className={`p-2 rounded-xl text-xs font-medium border text-center truncate ${
                      newEntry.category === cat 
                        ? 'bg-sky-50 border-sky-400 text-sky-700 font-bold' 
                        : 'border-slate-100 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Botton Registra Spunta Verde */}
          <div className="p-4 bg-white border-t border-slate-100 flex justify-center">
            <button 
              onClick={handleSaveEntry}
              className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95"
            >
              <Check className="w-8 h-8 stroke-[3]" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// COMPONENTE GRAFICO DONUT SVG
function DonutChart({ data, total }) {
  let cumulativePercent = 0;
  return (
    <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#F1F5F9"
          strokeWidth="4"
        />
        {data.map((item, index) => {
          const strokeDasharray = `${item.percentage} ${100 - item.percentage}`;
          const strokeDashoffset = 100 - cumulativePercent + 25;
          cumulativePercent += item.percentage;
          return (
            <path
              key={index}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={item.color}
              strokeWidth="4.5"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-bold text-slate-800">${total.toFixed(2)}</span>
        <span className="text-xs font-semibold text-slate-400">Totale Spese</span>
      </div>
    </div>
  );
}