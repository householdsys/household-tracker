import React, { useState, useEffect } from 'react';
import { IndianRupee, Loader2, LogOut, LogIn, UserCircle, AlertCircle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';

const firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG);
const MASTER_EMAIL = "your-email@gmail.com"; // CHANGE THIS TO YOUR EMAIL
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const AuthScreen = ({ onLogin, loading }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="bg-white p-8 rounded-3xl shadow-lg w-full max-w-xs text-center border border-gray-100">
      <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <UserCircle className="text-blue-600" size={32} />
      </div>
      <h1 className="text-2xl font-bold mb-2">Household Tracker</h1>
      <p className="text-gray-500 mb-8 text-sm">Please sign in to access your data.</p>
      <button 
        onClick={onLogin}
        disabled={loading}
        className="w-full bg-black text-white p-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-800 transition disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" size={20}/> : <LogIn size={20}/>} 
        Sign in with Google
      </button>
    </div>
  </div>
);

const AccessDenied = ({ onLogout }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="bg-white p-8 rounded-3xl shadow-lg w-full max-w-xs text-center border border-red-100">
      <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
      <h1 className="text-xl font-bold mb-2">Access Denied</h1>
      <p className="text-gray-500 mb-6 text-sm">This account is not authorized to access this tracker.</p>
      <button onClick={onLogout} className="w-full bg-gray-100 p-3 rounded-xl text-sm font-medium">Back to Login</button>
    </div>
  </div>
);

const Dashboard = ({ entries, onAdd, onDelete, onLogout, total, user }) => (
  <div className="max-w-md mx-auto bg-white shadow-xl rounded-3xl p-6 min-h-[500px]">
    <div className="flex justify-between items-center mb-8">
       <div>
         <h1 className="text-lg font-bold">Tracker</h1>
         <p className="text-xs text-gray-400 truncate w-32">{user.email}</p>
       </div>
       <button onClick={onLogout} className="text-gray-400 p-2 hover:bg-gray-100 rounded-full"><LogOut size={20}/></button>
    </div>
    
    <div className="text-center py-8 text-5xl font-extrabold text-blue-600 tracking-tight">
         <IndianRupee className="inline" size={32} /> {total}
    </div>

    <div className="grid grid-cols-2 gap-3 mb-8">
      <button onClick={() => onAdd('laundry')} className="bg-blue-600 text-white p-4 rounded-2xl flex flex-col items-center gap-1 hover:bg-blue-700 transition">
        <span className="font-bold">Laundry</span>
        <span className="text-xs opacity-80">₹10</span>
      </button>
      <button onClick={() => onAdd('water')} className="bg-cyan-600 text-white p-4 rounded-2xl flex flex-col items-center gap-1 hover:bg-cyan-700 transition">
        <span className="font-bold">Water</span>
        <span className="text-xs opacity-80">₹30</span>
      </button>
    </div>
    
    <div className="space-y-3">
        {entries.sort((a,b) => b.date.localeCompare(a.date)).map(e => (
            <div key={e.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-sm font-medium">{e.type.charAt(0).toUpperCase() + e.type.slice(1)}</span>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">{e.date}</span>
                    <button onClick={() => onDelete(e.id)} className="text-red-400 hover:text-red-600 font-bold">×</button>
                </div>
            </div>
        ))}
    </div>
  </div>
);

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || user.email !== MASTER_EMAIL) return;
    const q = query(collection(db, 'expenses'), where('uid', '==', user.uid));
    return onSnapshot(q, (s) => setEntries(s.docs.map(d => ({id:d.id, ...d.data()}))));
  }, [user]);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, provider); } 
    catch (e) { console.error(e); }
  };

  const handleAdd = async (type) => {
    await addDoc(collection(db, 'expenses'), { 
      type, 
      date: new Date().toISOString().split('T')[0], 
      uid: user.uid 
    });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'expenses', id));
  };

  const total = entries.reduce((sum, e) => sum + (e.type === 'laundry' ? 10 : 30), 0);

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  if (!user) return <AuthScreen onLogin={handleLogin} />;
  if (user.email !== MASTER_EMAIL) return <AccessDenied onLogout={() => signOut(auth)} />;

  return (
    <div className="min-h-screen bg-gray-100 p-4 pt-10">
      <Dashboard entries={entries} onAdd={handleAdd} onDelete={handleDelete} onLogout={() => signOut(auth)} total={total} user={user} />
    </div>
  );
}
