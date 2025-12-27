"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  BookOpen,
  Sparkles,
  MapPin,
  Search,
  AlertCircle,
  FileText,
  Globe,
  ImageIcon,
  Volume2,
  StopCircle,
  Mic,
  HelpCircle,
  History,
  LogOut,
  User,
  XCircle,
  Eye,
  EyeOff,
  Languages,
  Youtube,
  ScrollText,
  Trophy,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

// --- 1. FONTS IMPORT ---
import { Outfit, JetBrains_Mono, Tinos, Caladea } from "next/font/google";

// Main App Font
const mainFont = Outfit({ 
  subsets: ["latin"], 
  weight: ["300", "400", "500", "700", "800"] 
});

// UI Label Font
const monoFont = JetBrains_Mono({ 
  subsets: ["latin"], 
  weight: ["400"] 
});

// Context Text Font (Times New Roman Style)
const serifFont = Tinos({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

// Explanation Font (Cambria Style)
const explanationFont = Caladea({
  subsets: ["latin"],
  weight: ["400", "700"],
});

// --- 2. SETUP SUPABASE CLIENT ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- HELPER: RANK CALCULATION ---
const getRank = (points: number) => {
  if (points < 50) return "JJC (Johnny Just Come) 👶";
  if (points < 100) return "Aspirant 📝";
  if (points < 500) return "Efiko (Bookworm) 🤓";
  if (points < 1000) return "Scholar 🎓";
  if (points < 5000) return "Idan (The Boss) 🕶️";
  return "Ancestor 👑";
};

// Helper to clean source text
const parseSource = (rawText: string) => {
  if (!rawText) return { content: "", source: "", region: "", isUrl: false };
  let cleanText = rawText
    .replace("Use this local metaphor:", "")
    .replace("Use this general African wisdom:", "")
    .trim();
  const regionMatch = cleanText.match(/\(Region: (.*?)\)/);
  const region = regionMatch ? regionMatch[1] : "General";
  let source = "Unknown Source";
  const urlMatch = cleanText.match(/\(Source: (https?:\/\/[^\s]+)\)/);
  const textMatch = cleanText.match(/\(Source: (.*?)\)/);
  if (urlMatch) {
    source = urlMatch[1].replace(/\)$/, "");
  } else if (textMatch) {
    source = textMatch[1];
  }
  const isUrl = source.startsWith("http");
  cleanText = cleanText
    .replace(/\(Source: .*?\)/g, "")
    .replace(/\(Region: .*?\)/g, "")
    .trim();
  return { content: cleanText, source, region, isUrl };
};

export default function Home() {
  // --- STATES ---
  const [subject, setSubject] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pidginMode, setPidginMode] = useState(false);
  const [griotMode, setGriotMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Quiz States
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizData, setQuizData] = useState<any[] | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState("");

  // Auth & User States
  const [session, setSession] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [userPoints, setUserPoints] = useState(0);

  // Login Form States
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  // Audio Refs
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // --- INITIALIZATION ---
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchHistory(session.user.id);
        fetchPoints(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setShowAuth(false);
        fetchHistory(session.user.id);
        fetchPoints(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
    };
  }, []);

  // --- DATABASE FUNCTIONS ---
  const fetchHistory = async (userId: string) => {
    const { data } = await supabase
      .from("learning_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setHistory(data);
  };

  const fetchPoints = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", userId)
      .single();
    if (data) setUserPoints(data.points);
  };

  const saveToHistory = async (topic: string) => {
    if (!session) return;
    const isDuplicate = history.length > 0 && history[0].subject.toLowerCase() === topic.toLowerCase();
    if (isDuplicate) return;

    await supabase.from("learning_history").insert({
      user_id: session.user.id,
      subject: topic,
    });
    fetchHistory(session.user.id);
  };

  const deleteHistoryItem = async (itemId: string) => {
    if (!session) return;
    setHistory(current => current.filter(item => item.id !== itemId));
    const { error } = await supabase
        .from("learning_history")
        .delete()
        .eq("id", itemId);
    if (error) {
        console.error("Delete failed:", error);
        fetchHistory(session.user.id);
    }
  };

  const updatePoints = async (addedPoints: number) => {
    if (!session) return;
    const newTotal = userPoints + addedPoints;
    setUserPoints(newTotal);
    await supabase.from("profiles").update({ points: newTotal }).eq("id", session.user.id);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");
    try {
      if (authMode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}` } });
        if (error) throw error;
        setAuthMessage("Check your email for the confirmation link!");
      }
    } catch (err: any) {
      setAuthMessage(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // --- AUDIO & AI LOGIC ---
  const handleListen = () => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = "en-NG";
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => setSubject(event.results[0][0].transcript);
      recognition.start();
    } else {
      alert("Browser does not support Speech Recognition.");
    }
  };

  const stopAudio = () => {
    window.speechSynthesis.cancel();
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
      bgMusicRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  };

  const handleSpeak = (text: string) => {
    if (isSpeaking) {
      stopAudio();
      return;
    }
    if (!bgMusicRef.current) {
      bgMusicRef.current = new Audio("/piano.mp3");
      bgMusicRef.current.loop = true;
      bgMusicRef.current.volume = 0.05;
    }
    bgMusicRef.current.play().catch((e) => console.log("Audio play failed:", e));

    const cleanText = text.replace(/[*#]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const nigerianVoice = availableVoices.find(v => v.lang === "en-NG" || v.name.includes("Nigeria") || v.name.includes("African"));
    if (nigerianVoice) utterance.voice = nigerianVoice;

    if (pidginMode) { utterance.rate = 1.1; utterance.pitch = 1.1; }
    else if (griotMode) { utterance.rate = 0.85; utterance.pitch = 0.8; }
    else { utterance.rate = 0.9; utterance.pitch = 1.0; }

    utterance.onend = () => {
      setIsSpeaking(false);
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current.currentTime = 0;
      }
    };
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // --- MAIN SEARCH (UPDATED URL) ---
  const handleSearch = async (overrideSubject?: string) => {
    const topicToSearch = overrideSubject || subject;
    if (!topicToSearch) return;
    setLoading(true);
    setError("");
    setResponse(null);
    setQuizData(null);
    setShowResults(false);
    stopAudio();

    const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
    
    // 👇 UPDATED: Uses your NEW Render URL
    const API_URL = isLocal ? "http://127.0.0.1:8000" : "https://tutorb-wtys.onrender.com";

    try {
      const res = await fetch(`${API_URL}/teach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: topicToSearch,
          language: pidginMode ? "pidgin" : "english",
          mode: griotMode ? "griot" : "standard",
        }),
      });
      if (!res.ok) throw new Error("Could not reach the AI Tutor.");
      const data = await res.json();
      setResponse(data);
      saveToHistory(topicToSearch);
    } catch (err) {
      setError("Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  // --- QUIZ GENERATION (UPDATED URL) ---
  const handleGenerateQuiz = async () => {
    if (!subject) return;
    setQuizLoading(true);
    const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
    
    // 👇 UPDATED: Uses your NEW Render URL
    const API_URL = isLocal ? "http://127.0.0.1:8000" : "https://tutorb-wtys.onrender.com";

    try {
      const res = await fetch(`${API_URL}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject }),
      });
      const data = await res.json();
      const rawText = data.quiz;
      const questions = rawText.split("Q").slice(1).map((block: string) => {
        const lines = block.split("\n").map((l) => l.trim()).filter((l) => l);
        return {
          question: lines[0].replace(/^\d+:\s*/, ""),
          options: [lines[1], lines[2], lines[3]],
          correct: lines.find((l) => l.startsWith("Answer:"))?.split(":")[1].trim(),
        };
      });
      setQuizData(questions);
    } catch (e) { console.error(e); } finally { setQuizLoading(false); }
  };

  const checkQuiz = () => {
    setShowResults(true);
    if (!quizData) return;
    const score = quizData.reduce((acc, q, idx) => (q.correct === selectedAnswers[idx] ? acc + 1 : acc), 0);
    const pointsEarned = score * 10;
    if (pointsEarned > 0) updatePoints(pointsEarned);
  };

  const sourceData = response ? parseSource(response.source_data) : null;

  return (
    <main className={`min-h-screen relative flex flex-col items-center justify-center p-4 md:p-6 overflow-hidden ${mainFont.className}`}>
      {/* NAVBAR */}
      <nav className="absolute top-0 left-0 w-full p-4 flex flex-col md:flex-row justify-between items-center z-50 gap-4 md:gap-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-green-400" />
          <span className="font-bold text-white text-lg hidden md:block">AI Tutor NG</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 items-center">
          {session && (
            <div className="flex items-center gap-2 bg-gradient-to-r from-purple-900 to-slate-900 border border-purple-500/30 px-3 py-1.5 rounded-full shadow-lg">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <div className="flex flex-col leading-none">
                <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Rank</span>
                <span className="text-xs font-bold text-white">{getRank(userPoints)}</span>
              </div>
              <div className="bg-slate-800 px-2 py-0.5 rounded text-xs font-mono text-green-400 ml-1 border border-slate-700">{userPoints} BP</div>
            </div>
          )}
          <button onClick={() => { setGriotMode(!griotMode); if (!griotMode) setPidginMode(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${griotMode ? "bg-orange-600/30 border-orange-500 text-orange-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"}`}>
            <ScrollText className="w-3 h-3" /><span className="hidden md:inline">{griotMode ? "Griot: ON" : "Story Mode"}</span><span className="md:hidden">Story</span>
          </button>
          <button onClick={() => { setPidginMode(!pidginMode); if (!pidginMode) setGriotMode(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${pidginMode ? "bg-yellow-500/20 border-yellow-500 text-yellow-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"}`}>
            <Languages className="w-3 h-3" /><span className="hidden md:inline">{pidginMode ? "Pidgin: ON" : "English"}</span><span className="md:hidden">Pidgin</span>
          </button>
          {session ? (
            <>
              <button onClick={() => setShowHistory(!showHistory)} className="bg-slate-800 text-slate-300 px-3 py-2 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-slate-700 transition"><History className="w-4 h-4" /></button>
              <button onClick={() => supabase.auth.signOut()} className="bg-red-500/10 text-red-400 px-3 py-2 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-red-500/20 transition"><LogOut className="w-4 h-4" /></button>
            </>
          ) : (
            <button onClick={() => setShowAuth(true)} className="bg-green-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-green-900/20 hover:bg-green-500 transition">Sign In</button>
          )}
        </div>
      </nav>

      {/* HISTORY MODAL */}
      {showHistory && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[55] md:hidden" onClick={() => setShowHistory(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm z-[60] md:absolute md:top-24 md:right-4 md:left-auto md:translate-x-0 md:translate-y-0 md:w-64 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl p-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Recent Lessons</h3>
              <button onClick={() => setShowHistory(false)} className="md:hidden text-slate-500 hover:text-white"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {history.length === 0 && <p className="text-slate-600 text-sm italic">No history yet.</p>}
              {history.map((item) => (
                <div key={item.id} className="group flex items-center gap-2">
                    <button onClick={() => { setSubject(item.subject); setShowHistory(false); handleSearch(item.subject); }} className="flex-1 text-left text-sm text-slate-300 hover:text-white hover:bg-slate-800 p-2 rounded transition truncate">
                    {item.subject}
                    </button>
                    <button onClick={() => deleteHistoryItem(item.id)} className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded transition">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* AUTH MODAL */}
      {showAuth && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl w-full max-w-sm shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setShowAuth(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><XCircle className="w-6 h-6" /></button>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">{authMode === "signin" ? "Welcome Back" : "Create Account"}</h2>
              <p className="text-slate-400 text-sm">{authMode === "signin" ? "Sign in to save your progress!" : "Join to start earning Brain Points!"}</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 mt-1 focus:outline-none focus:border-green-500 transition-colors" placeholder="student@example.com" /></div>
              <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label><div className="relative mt-1"><input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-green-500 transition-colors" placeholder="••••••••" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button></div></div>
              {authMessage && <div className={`text-sm p-3 rounded-lg ${authMessage.includes("Check") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{authMessage}</div>}
              <button type="submit" disabled={authLoading} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed">{authLoading ? <Sparkles className="w-5 h-5 animate-spin mx-auto" /> : authMode === "signin" ? "Sign In" : "Sign Up"}</button>
            </form>
            <div className="mt-6 text-center text-sm text-slate-500">{authMode === "signin" ? <>Don't have an account? <button onClick={() => { setAuthMode("signup"); setAuthMessage(""); }} className="text-green-400 hover:text-green-300 font-bold">Sign Up</button></> : <>Already have an account? <button onClick={() => { setAuthMode("signin"); setAuthMessage(""); }} className="text-green-400 hover:text-green-300 font-bold">Sign In</button></>}</div>
          </div>
        </div>
      )}

      {/* BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=2070&auto=format&fit=crop" alt="AI Background" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-900/80 to-slate-950/90" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}></div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 w-full max-w-2xl mt-48 md:mt-24">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-6 md:p-12">
          {/* HEADER */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl mb-4 shadow-lg shadow-green-500/20"><BookOpen className="w-8 h-8 text-white" /></div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-2"><span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">AI Tutor</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">NG</span></h1>
            <p className="text-sm md:text-lg text-slate-400 font-light">Master complex topics using local African metaphors.</p>
          </div>

          {/* SEARCH BOX */}
          <div className="relative group mb-8">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl opacity-30 group-hover:opacity-100 transition duration-500 blur"></div>
            <div className="relative flex bg-slate-900 rounded-xl p-1 items-center gap-1">
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder={griotMode ? "Ask Baba Agba (e.g. Gravity)" : "Topic (e.g. Kinetic Energy)"} className="w-full bg-transparent text-white placeholder-slate-500 px-4 py-3 md:px-6 md:py-4 text-base md:text-lg focus:outline-none min-w-0" />
              <button onClick={handleListen} className={`p-3 rounded-lg transition-all ${isListening ? "bg-red-500 text-white animate-pulse" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}><Mic className="w-5 h-5" /></button>
              <button onClick={() => handleSearch()} disabled={loading} className="shrink-0 bg-green-600 hover:bg-green-500 text-white px-4 py-2 text-sm rounded-lg mx-1 md:px-8 md:py-3 md:text-base md:mx-0 font-semibold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg">{loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}<span className="hidden md:inline">{loading ? "Thinking..." : "Teach Me"}</span></button>
            </div>
          </div>

          {error && <div className="text-red-300 bg-red-900/20 p-4 rounded-xl mb-6 text-sm text-center">{error}</div>}

          {/* RESULTS CARD */}
          {response && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-slate-800/90 border border-slate-600/50 shadow-2xl rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-green-400 to-blue-500" />
                <div className="flex items-start gap-4">
                  <div className="hidden md:block p-3 bg-slate-700/80 rounded-xl shrink-0 border border-white/5"><Sparkles className="w-6 h-6 text-yellow-400" /></div>
                  <div className="space-y-3 w-full min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{griotMode ? "The Tale" : "The Explanation"}</h3>
                      <div className="flex gap-2">
                        <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(subject + " physics explanation")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors bg-red-400/10 px-3 py-1.5 rounded-full border border-red-400/20"><Youtube className="w-3 h-3" /><span className="hidden md:inline">Watch Video</span></a>
                        <button onClick={() => handleSpeak(response.response)} className="flex items-center gap-2 text-xs font-bold text-green-400 hover:text-green-300 transition-colors bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20">{isSpeaking ? <><StopCircle className="w-3 h-3 animate-pulse" /> Stop</> : <><Volume2 className="w-3 h-3" /> Listen</>}</button>
                      </div>
                    </div>
                    {/* 👇 APPLIED "CALADEA" (CAMBRIA-STYLE) FONT HERE */}
                    <div className={`prose prose-invert prose-lg max-w-none text-slate-200 text-justify ${explanationFont.className}`}>
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={{ p: ({ node, ...props }) => <div className="mb-4 leading-relaxed" {...props} />, img: ({ node, ...props }) => <div className="my-6 rounded-xl overflow-hidden border border-slate-700 shadow-lg bg-slate-900/50"><img {...props} className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500" alt={props.alt || "Explanation Diagram"} />{props.alt && <div className="p-2 text-center text-xs text-slate-400 border-t border-slate-800 bg-slate-900/80 italic">Diagram: {props.alt}</div>}</div> }}>{response.response}</ReactMarkdown>
                    </div>
                    {!quizData && <button onClick={handleGenerateQuiz} disabled={quizLoading} className="w-full mt-4 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all">{quizLoading ? <Sparkles className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4" />}{quizLoading ? "Generating Questions..." : "Quiz Me on This!"}</button>}
                  </div>
                </div>
              </div>

              {quizData && (
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4"><HelpCircle className="w-6 h-6 text-purple-400" /><h2 className="text-xl font-bold text-white">Knowledge Check</h2></div>
                  <div className="space-y-8">{quizData.map((q, idx) => (<div key={idx} className="space-y-3"><p className="text-white font-medium">{idx + 1}. {q.question}</p><div className="grid gap-2">{q.options.map((opt: string, optIdx: number) => { const letter = ["A", "B", "C"][optIdx]; const isSelected = selectedAnswers[idx] === letter; const isCorrect = q.correct === letter; let btnClass = "text-left p-3 rounded-lg border text-sm transition-all "; if (showResults) { if (isCorrect) btnClass += "bg-green-500/20 border-green-500 text-green-200"; else if (isSelected && !isCorrect) btnClass += "bg-red-500/20 border-red-500 text-red-200"; else btnClass += "bg-slate-800 border-slate-700 text-slate-400 opacity-50"; } else { btnClass += isSelected ? "bg-purple-500 text-white border-purple-400" : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"; } return <button key={optIdx} onClick={() => !showResults && setSelectedAnswers((prev) => ({ ...prev, [idx]: letter }))} className={btnClass}>{opt}</button>; })}</div></div>))}</div>
                  {!showResults ? <button onClick={checkQuiz} className="mt-8 w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-900/20">Submit Answers</button> : <div className="mt-8 p-6 bg-slate-800 rounded-xl text-center animate-in zoom-in-95 duration-300">{(() => { const score = quizData.reduce((acc, q, idx) => q.correct === selectedAnswers[idx] ? acc + 1 : acc, 0); return <><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Your Result</p><div className="text-4xl font-extrabold text-white mb-4">{score} / 5</div>{score >= 3 ? <div className="space-y-2"><p className="text-green-400 font-bold text-lg">🎉 Fantastic work!</p>{score > 0 && session && <div className="text-purple-300 text-sm font-bold bg-purple-900/30 inline-block px-3 py-1 rounded-full border border-purple-500/30">+{score * 10} Brain Points Earned! 🚀</div>}</div> : <div className="space-y-2"><p className="text-yellow-400 font-bold text-lg">💪 Good effort!</p></div>}<button onClick={() => { setSelectedAnswers({}); setShowResults(false); }} className="mt-6 text-sm text-slate-400 hover:text-white underline">Try Again</button></>; })()}</div>}
                </div>
              )}

              {response.visual_aid && <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 overflow-hidden"><div className="flex items-center gap-2 mb-3 text-blue-400 font-bold text-xs uppercase tracking-wider"><ImageIcon className="w-4 h-4" /> <span>Visual Illustration</span></div><img src={response.visual_aid} alt="Visual" className="w-full h-auto object-cover rounded-lg" /></div>}

              {/* CONTEXT CARD - UPDATED FONTS & STYLES */}
              {sourceData && (
                <div className="bg-slate-950/40 backdrop-blur-md rounded-xl p-6 border border-slate-700/50 shadow-inner group transition-all hover:bg-slate-900/60 mt-8">
                  <div className="flex items-start gap-4">
                    <div className="hidden md:flex shrink-0 p-3 bg-green-500/10 rounded-lg border border-green-500/20"><MapPin className="w-5 h-5 text-green-400" /></div>
                    <div className="w-full min-w-0">
                      <div className="flex items-center justify-between mb-3">
                        {/* 1. UPDATED FONT & REMOVED BOLD */}
                        <span className={`text-green-400 text-xs uppercase tracking-widest flex items-center gap-2 ${monoFont.className}`}>
                          <MapPin className="w-4 h-4 md:hidden" />
                          Local Context Source
                        </span>
                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700 shrink-0 ml-2">{sourceData.region}</span>
                      </div>
                      
                      {/* 2. BODY TEXT WITH NEW SERIF FONT (TINOS) */}
                      <div className="relative pl-4 border-l-2 border-slate-700 mb-4">
                        <p className={`text-sm md:text-base text-slate-200 text-justify leading-relaxed ${serifFont.className}`}>
                          "{sourceData.content}"
                        </p>
                      </div>

                      <div className="flex items-center gap-3 pt-3 border-t border-slate-800/50 w-full">
                        <span className="text-xs text-slate-500 font-semibold uppercase shrink-0">Reference:</span>
                        {sourceData.isUrl ? <a href={`${sourceData.source}#:~:text=${encodeURIComponent(sourceData.content.substring(0, 200))}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors min-w-0 flex-1 group/link"><Globe className="w-3 h-3 shrink-0" /><span className="truncate block w-full text-left">{sourceData.source}</span></a> : <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 min-w-0 flex-1"><FileText className="w-3 h-3 shrink-0" /><span className="truncate">{sourceData.source}</span></span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
