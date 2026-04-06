import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  Plus, 
  Minus, 
  ArrowRight, 
  Table, 
  Target, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  RefreshCcw,
  ChevronRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  AlertTriangle,
  History,
  LogOut,
  LogIn,
  Trash2,
  Clock
} from 'lucide-react';
import { analyzeDecision, type AnalysisType, type AnalysisResult } from './services/geminiService';
import { cn } from './lib/utils';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc,
  Timestamp,
  type User
} from './firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [decision, setDecision] = useState('');
  const [type, setType] = useState<AnalysisType>('pros-cons');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const q = query(
      collection(db, 'decisions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistory(docs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'decisions');
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      setError('Failed to login with Google.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      reset();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalyze = async () => {
    if (!decision.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeDecision(decision, type);
      setResult(res);
    } catch (err) {
      console.error(err);
      setError('Failed to analyze decision. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveToHistory = async () => {
    if (!user || !result) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'decisions'), {
        userId: user.uid,
        decision,
        type,
        result,
        createdAt: Timestamp.now()
      });
      // Optionally show a success state
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'decisions');
    } finally {
      setSaving(false);
    }
  };

  const deleteFromHistory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'decisions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `decisions/${id}`);
    }
  };

  const reset = () => {
    setResult(null);
    setDecision('');
    setError(null);
  };

  const loadFromHistory = (item: any) => {
    setDecision(item.decision);
    setType(item.type);
    setResult(item.result);
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen font-sans bg-slate-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="flex items-center gap-2 font-display font-bold text-xl text-slate-900">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Brain className="w-5 h-5" />
          </div>
          The Death of Decisions
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600 font-medium"
              >
                <History className="w-4 h-4" />
                History
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-slate-200" />
                <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[70] p-8 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-6 h-6 text-indigo-600" />
                  Past Decisions
                </h2>
                <button onClick={() => setShowHistory(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="space-y-4">
                {history.length === 0 ? (
                  <div className="text-center py-12 px-4 border-2 border-dashed border-slate-100 rounded-3xl">
                    <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">No saved decisions yet.</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="group relative">
                      <button
                        onClick={() => loadFromHistory(item)}
                        className="w-full text-left p-5 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group-hover:shadow-sm"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                            {item.type.replace('-', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {item.createdAt?.toDate().toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 line-clamp-2 leading-snug">
                          {item.decision}
                        </h3>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFromHistory(item.id);
                        }}
                        className="absolute top-4 right-4 p-2 rounded-lg bg-white shadow-sm border border-slate-100 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <header className="relative pt-32 pb-12 px-4 overflow-hidden">
        <div className="absolute inset-0 decision-gradient opacity-5 blur-3xl -z-10" />
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium mb-6 shadow-sm"
          >
            <Brain className="w-4 h-4 text-indigo-600" />
            <span>AI-Powered Decision Intelligence</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-display font-bold tracking-tight text-slate-900 mb-6"
          >
            The Death of <span className="text-transparent bg-clip-text decision-gradient">Decisions</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-600 max-w-2xl mx-auto"
          >
            Overcome analysis paralysis. Let AI dissect your choices through objective analysis and strategic frameworks.
          </motion.p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-24">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-3xl p-8 md:p-12"
            >
              <div className="space-y-8">
                <div>
                  <label className="block text-lg font-semibold text-slate-800 mb-4">
                    What decision are you facing?
                  </label>
                  <textarea
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                    placeholder="e.g., Should I quit my job to start a bakery? or Should we move to a new city?"
                    className="w-full h-40 p-6 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-lg resize-none"
                  />
                </div>

                <div>
                  <label className="block text-lg font-semibold text-slate-800 mb-4">
                    Choose Analysis Framework
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <AnalysisTypeButton
                      active={type === 'pros-cons'}
                      onClick={() => setType('pros-cons')}
                      icon={<CheckCircle2 className="w-5 h-5" />}
                      title="Pros & Cons"
                      description="Simple, effective list of advantages and disadvantages."
                    />
                    <AnalysisTypeButton
                      active={type === 'comparison'}
                      onClick={() => setType('comparison')}
                      icon={<Table className="w-5 h-5" />}
                      title="Comparison Table"
                      description="Side-by-side evaluation based on key criteria."
                    />
                    <AnalysisTypeButton
                      active={type === 'swot'}
                      onClick={() => setType('swot')}
                      icon={<Target className="w-5 h-5" />}
                      title="SWOT Analysis"
                      description="Strategic look at Strengths, Weaknesses, Opportunities, and Threats."
                    />
                  </div>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={loading || !decision.trim()}
                  className={cn(
                    "w-full py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all",
                    loading || !decision.trim() 
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                      : "decision-gradient text-white shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6" />
                      Kill the Decision
                    </>
                  )}
                </button>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                    <AlertCircle className="w-5 h-5" />
                    <p className="font-medium">{error}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={reset}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Start New Analysis
                </button>
                <div className="flex items-center gap-4">
                  {user && (
                    <button
                      onClick={saveToHistory}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Save to History
                    </button>
                  )}
                  <div className="px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold uppercase tracking-wider">
                    {type.replace('-', ' ')}
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-3xl p-8 md:p-12">
                <h2 className="text-3xl font-display font-bold text-slate-900 mb-4">
                  {result.title}
                </h2>
                <p className="text-lg text-slate-600 mb-12 leading-relaxed">
                  {result.summary}
                </p>

                {type === 'pros-cons' && <ProsConsView data={result.data} />}
                {type === 'swot' && <SWOTView data={result.data} />}
                {type === 'comparison' && <ComparisonView data={result.data} />}

                <div className="mt-16 p-8 rounded-3xl bg-indigo-50 border border-indigo-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles className="w-24 h-24 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                    <Zap className="w-6 h-6" />
                    Final Recommendation
                  </h3>
                  <p className="text-lg text-indigo-800 leading-relaxed relative z-10">
                    {result.recommendation}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function AnalysisTypeButton({ active, onClick, icon, title, description }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-6 rounded-2xl border-2 text-left transition-all group",
        active 
          ? "border-indigo-600 bg-indigo-50/50 shadow-sm" 
          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors",
        active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
      )}>
        {icon}
      </div>
      <h3 className={cn("font-bold mb-1", active ? "text-indigo-900" : "text-slate-700")}>
        {title}
      </h3>
      <p className="text-sm text-slate-500 leading-snug">
        {description}
      </p>
    </button>
  );
}

function ProsConsView({ data }: { data: { pros: string[], cons: string[] } }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg mb-6">
          <Plus className="w-6 h-6" />
          Pros
        </div>
        {data.pros.map((pro, i) => (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i}
            className="flex gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-900"
          >
            <div className="mt-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="font-medium">{pro}</p>
          </motion.div>
        ))}
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-rose-600 font-bold text-lg mb-6">
          <Minus className="w-6 h-6" />
          Cons
        </div>
        {data.cons.map((con, i) => (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i}
            className="flex gap-3 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-900"
          >
            <div className="mt-1">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            </div>
            <p className="font-medium">{con}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SWOTView({ data }: { data: { strengths: string[], weaknesses: string[], opportunities: string[], threats: string[] } }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <SWOTCard 
        title="Strengths" 
        items={data.strengths} 
        icon={<ShieldCheck className="w-6 h-6" />} 
        color="bg-blue-50 border-blue-100 text-blue-900"
        iconColor="text-blue-600"
      />
      <SWOTCard 
        title="Weaknesses" 
        items={data.weaknesses} 
        icon={<TrendingUp className="rotate-180 w-6 h-6" />} 
        color="bg-amber-50 border-amber-100 text-amber-900"
        iconColor="text-amber-600"
      />
      <SWOTCard 
        title="Opportunities" 
        items={data.opportunities} 
        icon={<TrendingUp className="w-6 h-6" />} 
        color="bg-emerald-50 border-emerald-100 text-emerald-900"
        iconColor="text-emerald-600"
      />
      <SWOTCard 
        title="Threats" 
        items={data.threats} 
        icon={<AlertTriangle className="w-6 h-6" />} 
        color="bg-rose-50 border-rose-100 text-rose-900"
        iconColor="text-rose-600"
      />
    </div>
  );
}

function SWOTCard({ title, items, icon, color, iconColor }: any) {
  return (
    <div className={cn("p-6 rounded-2xl border", color)}>
      <div className="flex items-center gap-3 mb-4">
        <div className={iconColor}>{icon}</div>
        <h3 className="font-bold text-lg uppercase tracking-wider">{title}</h3>
      </div>
      <ul className="space-y-3">
        {items.map((item: string, i: number) => (
          <li key={i} className="flex gap-2 text-sm font-medium leading-relaxed">
            <ChevronRight className="w-4 h-4 mt-0.5 shrink-0 opacity-50" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonView({ data }: { data: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-800">Criteria</th>
            {data.map((opt, i) => (
              <th key={i} className="text-center p-4 bg-slate-50 border-b border-slate-200 font-bold text-indigo-600">
                {opt.option}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data[0].criteria.map((criterion: any, i: number) => (
            <tr key={i} className="group">
              <td className="p-4 border-b border-slate-100 font-semibold text-slate-700 group-hover:bg-slate-50 transition-colors">
                {criterion.name}
              </td>
              {data.map((opt, j) => {
                const c = opt.criteria.find((cr: any) => cr.name === criterion.name);
                return (
                  <td key={j} className="p-4 border-b border-slate-100 text-center group-hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col items-center gap-1">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-1",
                        c.score >= 8 ? "bg-emerald-100 text-emerald-700" :
                        c.score >= 5 ? "bg-amber-100 text-amber-700" :
                        "bg-rose-100 text-rose-700"
                      )}>
                        {c.score}
                      </div>
                      <p className="text-xs text-slate-500 max-w-[150px] leading-tight">
                        {c.comment}
                      </p>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
