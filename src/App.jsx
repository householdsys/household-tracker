import React, { useState, useEffect } from 'react';
import { IndianRupee, Loader2, UserRound, LogOut, Plus } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// --- CONFIGURATION ---
// IMPORTANT: Replace the placeholders below with your actual Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- COMPONENT: AUTH SCREEN ---
const AuthScreen = ({ authStep, householdId, setHouseholdId, pin, setPin, setAuthStep, onUnlock }) => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm border border-gray-200">
      {authStep === 1 ? (
        <div className="space-y-6">
          <div className="text-center">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UserRound className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold">Household ID</h1>
          </div>
          <input type="text" value={householdId} onChange={(e) => setHouseholdId(e.target.value)} className="w-full p-4 border rounded-xl" placeholder="e.g. MyHome" />
          <button onClick={() => {if(householdId.length>=4) setAuthStep(2)}} className="w-full bg-blue-600 text-white p-4 rounded-xl">Next</button>
        </div>
      ) : (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-center">PIN</h1>
          <input type="password" maxLength="4" value={pin} onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))} className="w-full p-4 border rounded-xl text-center text-3xl" placeholder="••••" />
          <button onClick={onUnlock} className="w-full bg-indigo-600 text-white p-4 rounded-xl">Unlock</button>
        </div>
      )}
    </div>
  </div>
);

// --- COMPONENT: DASHBOARD ---
const Dashboard = ({ entries, onAdd, onDelete, onLogout, total }) => (
  <div className="max-w-md mx-auto bg-white shadow-xl rounded-3xl p-6">
    <div className="text-center mb-6">
       <h1 className="text-xl font-bold">Dashboard</h1>
       <button onClick={onLogout} className="text-sm text-gray-400 flex items-center justify-center gap-1 mx-auto"><LogOut size={14}/> Logout</button>
    </div>
    <div className="text-center py-4 text-5xl font-extrabold text-blue-600">
         <IndianRupee className="inline" size={32} /> {total}
    </div>
    <button onClick={() => onAdd('laundry')} className="w-full bg-blue-600 text-white p-4 rounded-xl mb-2 flex items-center justify-center gap-2"><Plus size={20}/> Add Laundry</button>
    <button onClick={() => onAdd('water')} className="w-full bg-cyan-600 text-white p-4 rounded-xl mb-6 flex items-center justify-center gap-2"><Plus size={20}/> Add Water</button>
    
    <div className="space-y-2">
        {entries.map(e => (
            <div key={e.id} className="flex justify-between p-3 bg-gray-50 rounded-lg text-sm border">
                <span>{e.type} ({e.date})</span>
                <button onClick={() => onDelete(e.type, e.id, e.creatorId)} className="text-red-500 font-bold hover:underline">Delete</button>
            </div>
        ))}
    </div>
  </div>
);

// --- MAIN APP (ORCHESTRATOR) ---
export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authStep, setAuthStep] = useState(1);
  const [householdId, setHouseholdId] = useState('');
  const [pin, setPin] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthorized || !householdId || pin.length !== 4) return;
    const lCol = collection(db, 'artifacts', householdId, 'secure', pin, 'laundry');
    const wCol = collection(db, 'artifacts', householdId, 'secure', pin, 'water');
    const unsubL = onSnapshot(lCol, (s) => setEntries(prev => [...prev.filter(i => i.type !== 'laundry'), ...s.docs.map(d => ({id:d.id, type:'laundry', ...d.data()}))]));
    const unsubW = onSnapshot(wCol, (s) => setEntries(prev => [...prev.filter(i => i.type !== 'water'), ...s.docs.map(d => ({id:d.id, type:'water', ...d.data()}))]));
    return () => { unsubL(); unsubW(); };
  }, [isAuthorized, householdId, pin]);

  const handleAdd = async (type) => {
    const colRef = collection(db, 'artifacts', householdId, 'secure', pin, type);
    await addDoc(colRef, { count: 1, date: new Date().toISOString().split('T')[0], creatorId: user.uid });
  };

  const handleDelete = async (type, id, creatorId) => {
    if (user.uid !== creatorId) return alert("Only the creator can delete this.");
    await deleteDoc(doc(db, 'artifacts', householdId, 'secure', pin, type, id));
  };

  const total = entries.reduce((sum, e) => sum + (e.type === 'laundry' ? 10 : 30), 0);

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return !isAuthorized ? (
    <AuthScreen authStep={authStep} householdId={householdId} setHouseholdId={setHouseholdId} pin={pin} setPin={setPin} setAuthStep={setAuthStep} onUnlock={() => setIsAuthorized(true)} />
  ) : (
    <div className="min-h-screen bg-gray-100 p-4">
      <Dashboard entries={entries} onAdd={handleAdd} onDelete={handleDelete} onLogout={() => setIsAuthorized(false)} total={total} />
    </div>
  );
}
