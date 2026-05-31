import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { 
  Compass, MapPin, BookOpen, Users, MessageSquare, ShieldAlert, Sun, Moon, 
  Bell, Award, CheckCircle, ArrowRight, Upload, Search, Download, Star, 
  Check, ArrowUp, ArrowDown, Trash2, X, Plus, Play, ExternalLink, Calendar,
  Clock, Shield, AlertTriangle, Cpu, Terminal, RefreshCw, BarChart2,
  Camera, Music, Trophy, Film
} from 'lucide-react';

import CampusMap from './components/CampusMap';

const API_BASE = 'http://localhost:5000/api';
const SOCKET_BASE = 'http://localhost:5000';

export default function App() {
  // --- Core Client States ---
  const [theme, setTheme] = useState(localStorage.getItem('cc_theme') || 'dark');
  const [activeView, setActiveView] = useState('home');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('cc_user')) || null);
  const [token, setToken] = useState(localStorage.getItem('cc_token') || null);
  
  // App Relational Datasets
  const [locations, setLocations] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [resources, setResources] = useState([]);
  const [forumQuestions, setForumQuestions] = useState([]);
  
  // Active UI Selection States
  const [selectedBuilding, setSelectedBuilding] = useState('acad_a');
  const [selectedClub, setSelectedClub] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [activeClubTab, setActiveClubTab] = useState('overview');
  
  // Modals & Panels Toggles
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [showAskQModal, setShowAskQModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoginView, setIsLoginView] = useState(true);
  
  // Filter parameters
  const [resTypeFilter, setResTypeFilter] = useState('All');
  const [resBranchFilter, setResBranchFilter] = useState('All');
  const [resQuery, setResQuery] = useState('');
  
  const [clubCategoryFilter, setClubCategoryFilter] = useState('All');
  const [forumFilter, setForumFilter] = useState('All');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  
  // Input Form binds
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authBranch, setAuthBranch] = useState('CSE (AI)');
  const [authSemester, setAuthSemester] = useState('Semester 1');
  
  const [askQTitle, setAskQTitle] = useState('');
  const [askQCategory, setAskQCategory] = useState('Academics');
  const [askQBody, setAskQBody] = useState('');
  
  const [newAnswerText, setNewAnswerText] = useState('');
  
  // Resource uploader form
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadBranch, setUploadBranch] = useState('CSE');
  const [uploadSemester, setUploadSemester] = useState('Semester 1');
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadType, setUploadType] = useState('Notes');
  const [uploadFile, setUploadFile] = useState(null);
  
  // Admin dynamic map form
  const [adminLocName, setAdminLocName] = useState('');
  const [adminLocDesc, setAdminLocDesc] = useState('');
  const [adminLocType, setAdminLocType] = useState('academic');
  const [adminLocX, setAdminLocX] = useState(300);
  const [adminLocY, setAdminLocY] = useState(200);
  const [adminLocFloors, setAdminLocFloors] = useState(3);
  const [adminLocWifi, setAdminLocWifi] = useState('Amrita_WiFi');
  const [adminLocAccess, setAdminLocAccess] = useState('Ramps & Elevators');
  const [adminActiveTab, setAdminActiveTab] = useState('Dashboard');
  const [adminStats, setAdminStats] = useState(null);
  
  // Real-time notification lists
  const [notifications, setNotifications] = useState([
    { id: 'initial-1', title: 'Orientation Portal Active', body: 'Your registration verification pass is verified under Block A desk 2.', is_read: false }
  ]);
  const [activePopupAlert, setActivePopupAlert] = useState(null);
  
  // Quiz parameters
  const [quizStep, setQuizStep] = useState(0);
  const [quizScores, setQuizScores] = useState([]);
  const [quizMatchedClub, setQuizMatchedClub] = useState(null);
  
  const socketRef = useRef(null);

  // --- Theme Toggle handler ---
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cc_theme', theme);
  }, [theme]);

  // --- Initial Data Fetch & Sockets Binding ---
  useEffect(() => {
    fetchLocations();
    fetchClubs();
    fetchResources();
    fetchForum();
    
    // Connect WebSockets for Real-time tickers
    socketRef.current = io(SOCKET_BASE);
    socketRef.current.on('new_announcement', (alert) => {
      setNotifications(prev => [alert, ...prev]);
      setActivePopupAlert(alert);
      setTimeout(() => setActivePopupAlert(null), 5000);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Bind WebSocket user-specific channels upon login
  useEffect(() => {
    if (user && socketRef.current) {
      const channel = `notify_${user.id}`;
      socketRef.current.on(channel, (alert) => {
        setNotifications(prev => [alert, ...prev]);
        setActivePopupAlert(alert);
        setTimeout(() => setActivePopupAlert(null), 5000);
      });
      fetchAdminStats();
    }
  }, [user]);

  // --- API SERVICE HELPERS ---
  const fetchLocations = () => {
    fetch(`${API_BASE}/map/locations`)
      .then(res => res.json())
      .then(data => setLocations(data))
      .catch(err => console.error('Map loading error:', err));
  };
  
  const fetchClubs = () => {
    fetch(`${API_BASE}/clubs`)
      .then(res => res.json())
      .then(data => setClubs(data))
      .catch(err => console.error('Clubs loading error:', err));
  };
  
  const fetchResources = () => {
    const queryParams = new URLSearchParams({
      branch: resBranchFilter,
      type: resTypeFilter,
      q: resQuery
    });
    fetch(`${API_BASE}/resources?${queryParams}`)
      .then(res => res.json())
      .then(data => setResources(data))
      .catch(err => console.error('Resources loading error:', err));
  };
  
  const fetchForum = () => {
    fetch(`${API_BASE}/forum/questions`)
      .then(res => res.json())
      .then(data => setForumQuestions(data))
      .catch(err => console.error('Forum loading error:', err));
  };
  
  const fetchAdminStats = () => {
    if (!token) return;
    fetch(`${API_BASE}/admin/analytics`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setAdminStats(data))
      .catch(err => console.error('Admin loading error:', err));
  };

  // Trigger search filters refresh
  useEffect(() => {
    fetchResources();
  }, [resTypeFilter, resBranchFilter, resQuery]);

  // --- AUTHENTICATION ACTIONS ---
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    const endpoint = isLoginView ? 'login' : 'register';
    const body = isLoginView 
      ? { email: authEmail, password: authPassword }
      : { email: authEmail, password: authPassword, name: authName, branch: authBranch, semester: authSemester };
      
    fetch(`${API_BASE}/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(res => {
        if (!res.ok) return res.json().then(e => { throw new Error(e.error); });
        return res.json();
      })
      .then(data => {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('cc_user', JSON.stringify(data.user));
        localStorage.setItem('cc_token', data.token);
        setShowAuthModal(false);
        setAuthEmail('');
        setAuthPassword('');
        setAuthName('');
        alert(isLoginView ? 'Welcome back to Campus Compass!' : 'Student account registered! Welcome to Amrita.');
      })
      .catch(err => alert(`Auth Failure: ${err.message}`));
  };

  const handleSimulatedGoogleLogin = () => {
    const mockEmail = prompt('Enter your verified @am.students.amrita.edu student address:', 'fresher.student2026@am.students.amrita.edu');
    if (!mockEmail) return;
    
    if (!mockEmail.endsWith('@am.students.amrita.edu') && !mockEmail.endsWith('@amrita.edu')) {
      alert('Authentication denied: Google OAuth requires verified Amrita domain credentials.');
      return;
    }
    
    const mockName = mockEmail.split('@')[0].split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    fetch(`${API_BASE}/auth/google-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mockEmail, name: mockName })
    })
      .then(res => res.json())
      .then(data => {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('cc_user', JSON.stringify(data.user));
        localStorage.setItem('cc_token', data.token);
        setShowAuthModal(false);
        alert(`OAuth Success! Authenticated via Google as: ${mockName}`);
      })
      .catch(err => alert(`Google login error: ${err.message}`));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('cc_user');
    localStorage.removeItem('cc_token');
    setActiveView('home');
    alert('Logged out. Session terminated safely.');
  };

  // --- FORUM ACTIONS ---
  const handleVote = (entityType, entityId, direction) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    fetch(`${API_BASE}/forum/votes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ entityType, entityId, direction })
    })
      .then(res => res.json())
      .then(() => {
        fetchForum();
        if (selectedQuestion) {
          // Refresh open thread details
          const updatedQ = forumQuestions.find(q => q.id === selectedQuestion.id);
          if (updatedQ) setSelectedQuestion(updatedQ);
        }
      })
      .catch(err => console.error(err));
  };

  const handleAskQuestion = (e) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    fetch(`${API_BASE}/forum/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title: askQTitle, body: askQBody, category: askQCategory })
    })
      .then(res => {
        if (!res.ok) return res.json().then(e => { throw new Error(e.error); });
        return res.json();
      })
      .then(() => {
        fetchForum();
        setShowAskQModal(false);
        setAskQTitle('');
        setAskQBody('');
        alert('Question broadcast successfully to all student corridors!');
      })
      .catch(err => alert(err.message));
  };

  const handlePostAnswer = (e) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    fetch(`${API_BASE}/forum/questions/${selectedQuestion.id}/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ body: newAnswerText })
    })
      .then(res => res.json())
      .then(() => {
        setNewAnswerText('');
        fetchForum();
        // Reset selected question state to fetch replies
        setTimeout(() => {
          fetch(`${API_BASE}/forum/questions`)
            .then(r => r.json())
            .then(qs => {
              setForumQuestions(qs);
              const updatedQ = qs.find(q => q.id === selectedQuestion.id);
              if (updatedQ) setSelectedQuestion(updatedQ);
            });
        }, 150);
      });
  };

  const handleAcceptAnswer = (ansId) => {
    fetch(`${API_BASE}/forum/answers/${ansId}/accept`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(() => {
        fetchForum();
        setTimeout(() => {
          fetch(`${API_BASE}/forum/questions`)
            .then(r => r.json())
            .then(qs => {
              setForumQuestions(qs);
              const updatedQ = qs.find(q => q.id === selectedQuestion.id);
              if (updatedQ) setSelectedQuestion(updatedQ);
            });
        }, 150);
        alert('Solution badge accepted and verified successfully!');
      });
  };

  // --- RESOURCES & DIGITAL LOCKER UPLOADS ---
  const handleResourceUpload = (e) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    const formData = new FormData();
    formData.append('title', uploadTitle);
    formData.append('branch', uploadBranch);
    formData.append('semester', uploadSemester);
    formData.append('subject', uploadSubject);
    formData.append('type', uploadType);
    if (uploadFile) {
      formData.append('file', uploadFile);
    }
    
    fetch(`${API_BASE}/resources/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        setUploadTitle('');
        setUploadSubject('');
        setUploadFile(null);
        fetchResources();
      })
      .catch(err => alert(`Locker error: ${err.message}`));
  };

  const handleResourceDownload = (resId, fileUrl) => {
    fetch(`${API_BASE}/resources/download/${resId}`, { method: 'POST' })
      .then(() => {
        fetchResources();
        // Trigger file download
        const blob = new Blob([`CAMPUS COMPASS LOCKER RESOURCE\nAsset ID: ${resId}\nFile fallback: Local uploads`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `amrita_syllabus_locker_${resId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
  };

  // --- CLUBS & MEMBERSHIP ACTIONS ---
  const handleJoinClub = (clubName) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    fetch(`${API_BASE}/clubs/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ clubName })
    })
      .then(res => res.json())
      .then(data => {
        const updatedUser = { ...user, joined_clubs: data.clubs };
        setUser(updatedUser);
        localStorage.setItem('cc_user', JSON.stringify(updatedUser));
        fetchClubs();
        alert(data.joined ? `Success! Applied to ${clubName}.` : `Left club ${clubName}.`);
      });
  };

  const handleJoinActivity = (activityTitle) => {
    if (!user) {
      alert('Please authenticate to register for session rosters.');
      return;
    }
    
    // Optimistic UI update
    const isJoined = user.joined_activities && user.joined_activities.includes(activityTitle);
    const updatedActivities = isJoined 
      ? user.joined_activities.filter(a => a !== activityTitle)
      : [...(user.joined_activities || []), activityTitle];
      
    const updatedUser = { ...user, joined_activities: updatedActivities };
    setUser(updatedUser);
    localStorage.setItem('cc_user', JSON.stringify(updatedUser));
    
    fetch(`${API_BASE}/clubs/activities/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ activityTitle })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const syncedUser = { ...user, joined_activities: data.activities };
          setUser(syncedUser);
          localStorage.setItem('cc_user', JSON.stringify(syncedUser));
          fetchClubs(); // Sync slot count dynamically
        }
      })
      .catch(err => console.error('Roster registration failure:', err));
  };

  // --- QUIZ ACTIONS ---
  const handleQuizAnswer = (score) => {
    const updatedScores = [...quizScores, score];
    setQuizScores(updatedScores);
    
    if (quizStep < 2) {
      setQuizStep(prev => prev + 1);
    } else {
      // Calculate top category
      const counts = {};
      updatedScores.forEach(s => counts[s] = (counts[s] || 0) + 1);
      
      let topCategory = 'Technical';
      let maxVal = 0;
      for (const cat in counts) {
        if (counts[cat] > maxVal) {
          maxVal = counts[cat];
          topCategory = cat;
        }
      }
      
      const matched = clubs.find(c => c.category === topCategory) || clubs[0];
      setQuizMatchedClub(matched);
      setQuizStep(3);
    }
  };

  const resetQuiz = () => {
    setQuizStep(0);
    setQuizScores([]);
    setQuizMatchedClub(null);
  };

  // --- MAP ACTIONS & DIRECTIONS ---
  const handleAdminCreateLocation = (e) => {
    e.preventDefault();
    fetch(`${API_BASE}/map/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: adminLocName,
        desc: adminLocDesc,
        type: adminLocType,
        x: parseInt(adminLocX),
        y: parseInt(adminLocY),
        floors: parseInt(adminLocFloors),
        wifi: adminLocWifi,
        accessibility: adminLocAccess
      })
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        setAdminLocName('');
        setAdminLocDesc('');
        fetchLocations();
        fetchAdminStats();
      });
  };

  // --- FAQ ADMINISTRATOR PROMOTION ---
  const handlePromoteFAQ = (qId) => {
    fetch(`${API_BASE}/admin/questions/${qId}/promote`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        fetchForum();
        fetchAdminStats();
      });
  };

  const handleAdminDeleteQuestion = (qId) => {
    fetch(`${API_BASE}/admin/questions/${qId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(() => {
        fetchForum();
        fetchAdminStats();
        alert('Question moderator deleted.');
      });
  };

  // --- FUZZY GLOBAL SEARCH TRIGGERS ---
  const handleGlobalSearch = (val) => {
    setGlobalSearchQuery(val);
    const q = val.toLowerCase().trim();
    if (q === '') {
      setGlobalSearchResults([]);
      return;
    }
    
    const results = [];
    
    // Search Map Coords
    locations.forEach(l => {
      if (l.name.toLowerCase().includes(q) || l.desc.toLowerCase().includes(q)) {
        results.push({ type: 'Location', title: l.name, sub: l.desc, act: () => { setActiveView('map'); setSelectedBuilding(l.id || 'acad_a'); } });
      }
    });
    
    // Search Clubs
    clubs.forEach(c => {
      if (c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)) {
        results.push({ type: 'Club', title: c.name, sub: c.description, act: () => { setSelectedClub(c); setActiveClubTab('overview'); } });
      }
    });
    
    // Search Locker Files
    resources.forEach(r => {
      if (r.title.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q)) {
        results.push({ type: 'Resource File', title: r.title, sub: `${r.subject} • ${r.type}`, act: () => { setActiveView('resources'); } });
      }
    });
    
    // Search Forum
    forumQuestions.forEach(f => {
      if (f.title.toLowerCase().includes(q) || f.body.toLowerCase().includes(q)) {
        results.push({ type: 'Forum Q&A', title: f.title, sub: f.body, act: () => { setSelectedQuestion(f); } });
      }
    });
    
    setGlobalSearchResults(results.slice(0, 6));
  };

  const currentBuilding = locations.find(l => l.id === selectedBuilding) || locations[0] || {
    name: 'Academic Block A', desc: ' क्लास रूम, लैब्स, HOD ऑफिस', floors: 4, wifi: 'Amrita_Guest_5G', accessibility: 'Elevator & ramps'
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-body antialiased selection:bg-accent-primary/20 selection:text-accent-primary">
      
      {/* Real-time Toast Notifications */}
      <AnimatePresence>
        {activePopupAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-4 right-4 z-[9999] max-w-sm bg-bg-elevated border border-accent-primary/30 rounded-xl p-4 shadow-glow-lg flex gap-3 items-start"
          >
            <div className="p-2 bg-accent-primary/10 rounded-lg text-accent-primary">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-text-primary">{activePopupAlert.title}</h4>
              <p className="text-xs text-text-secondary mt-1">{activePopupAlert.body}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div id="app-container" className="os-layout-root">
        
        {/* --- HEADER (Sticky 72px) --- */}
        <header className="h-[72px] sticky top-0 z-50 flex items-center justify-between px-8 bg-[var(--bg-secondary)]/80 backdrop-blur-md border-b border-[var(--border-color)] grid-in-header">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 font-bold text-lg tracking-tight cursor-pointer" onClick={() => setActiveView('home')}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[var(--accent-primary)] to-indigo-500 flex items-center justify-center text-white shadow-[0_0_15px_var(--accent-glow)]">
                <Compass className="w-4 h-4" />
              </div>
              <span>Pallet<span className="font-serif italic font-normal text-[var(--text-secondary)]">Compass</span></span>
            </div>
            
            {/* Centralized Search Architecture Bar */}
            <div className="relative w-[340px] group hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input 
                type="text" 
                placeholder="Search rooms, clubs, resources, questions..." 
                className="saas-input pl-10"
                value={globalSearchQuery}
                onChange={(e) => handleGlobalSearch(e.target.value)}
              />
              {globalSearchResults.length > 0 && (
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-2 shadow-lg z-[110] max-h-80 overflow-y-auto">
                  {globalSearchResults.map((res, i) => (
                    <div 
                      key={i} 
                      className="p-2.5 border-b border-[var(--border-color)]/50 last:border-b-0 cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors rounded-lg flex flex-col gap-0.5"
                      onClick={() => { res.act(); setGlobalSearchQuery(''); setGlobalSearchResults([]); }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-[var(--bg-secondary)] text-[var(--accent-primary)] rounded-md">{res.type}</span>
                        <span className="text-xs font-semibold text-[var(--text-primary)]">{res.title}</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-secondary)] truncate">{res.sub}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Global Action Tools Layer */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                const nextTheme = theme === 'dark' ? 'light' : 'dark';
                setTheme(nextTheme);
                document.documentElement.setAttribute('data-theme', nextTheme);
              }}
              className="w-10 h-10 rounded-lg flex items-center justify-center border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-all"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            
            <button 
              className="relative w-10 h-10 rounded-lg flex items-center justify-center border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-all"
              onClick={() => alert(`Notifications Queue:\n\n${notifications.map((n, i) => `[${i+1}] ${n.title}: ${n.body}`).join('\n')}`)}
            >
              <Bell className="w-4 h-4" />
              {notifications.some(n => !n.is_read) && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[var(--color-danger)] rounded-full border border-[var(--bg-secondary)]"></span>}
            </button>
            
            {user ? (
              <button className="flex items-center gap-3 p-1.5 hover:bg-[var(--bg-elevated)] border border-transparent hover:border-[var(--border-color)] rounded-lg transition-all text-left" onClick={() => setActiveView('profile')}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 flex items-center justify-center font-bold text-xs text-white">
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="hidden md:block">
                  <span className="block text-xs font-bold text-[var(--text-primary)]">{user.name}</span>
                  <span className="block text-[10px] text-[var(--text-secondary)]">{user.branch} • Sem 1</span>
                </div>
              </button>
            ) : (
              <button className="btn-premium btn-premium-primary px-4 py-1.5 text-xs rounded-lg" onClick={() => { setIsLoginView(true); setShowAuthModal(true); }}>
                Connect Portal
              </button>
            )}
          </div>
        </header>

        {/* --- WORKSPACE BODY GRID --- */}
        <div className="workspace-body-grid">

          {/* --- SIDEBAR (Desktop) --- */}
          <aside className="sidebar-container hidden lg:flex">
          <nav className="flex flex-col gap-1.5">
            {[
              { id: 'home', label: 'Home Portal', icon: Compass },
              { id: 'academics', label: 'Academic OS', icon: BookOpen },
              { id: 'map', label: 'Interactive Map', icon: MapPin },
              { id: 'resources', label: 'Resource Bank', icon: Download },
              { id: 'clubs', label: 'Club Ecosystem', icon: Users },
              { id: 'forum', label: 'Forum Discourse', icon: MessageSquare },
            ].map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-lg transition-all text-left w-full ${
                    activeView === item.id
                      ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] font-semibold border-l-4 border-[var(--accent-primary)] rounded-l-none pl-3 shadow-sm'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            {user && (
              <button
                onClick={() => setActiveView('profile')}
                className={`flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-lg transition-all text-left w-full ${
                  activeView === 'profile'
                    ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] font-semibold border-l-4 border-[var(--accent-primary)] rounded-l-none pl-3 shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>My Dashboard</span>
              </button>
            )}
            {user && (
              <button
                onClick={() => setActiveView('admin')}
                className={`flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-lg transition-all text-left w-full ${
                  activeView === 'admin'
                    ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] font-semibold border-l-4 border-[var(--accent-primary)] rounded-l-none pl-3 shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Operator Terminal</span>
              </button>
            )}
          </nav>

          <div className="pt-4 border-t border-[var(--border-color)]">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] block mb-1">System Environment</span>
            <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-full bg-[var(--color-success)] block" />
              v2.0-Production Stable
            </div>
            {user && (
              <button className="btn-premium btn-premium-secondary py-2 text-xs w-full text-[var(--color-danger)] border-[var(--color-danger)]/15 hover:bg-[var(--color-danger)]/5 mt-4" onClick={handleLogout}>
                Disconnect Portal
              </button>
            )}
          </div>
        </aside>

        {/* --- MAIN ROUTER VIEWPORT --- */}
        <main className="canvas-viewport-scroll">
          
          <AnimatePresence mode="wait">
            
            {/* 1. HOME VIEW */}
            {activeView === 'home' && (
              <motion.div key="home" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="flex flex-col gap-10">
                <div className="relative min-h-[45vh] flex flex-col justify-center items-start p-10 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
                  <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-gradient-to-bl from-[var(--accent-primary)]/10 to-transparent blur-3xl pointer-events-none"></div>
                  
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--accent-primary)] mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
                    Cycle Intake Active: July 2026 Batch
                  </span>
                  
                  <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-none font-display text-[var(--text-primary)]">
                    A premium place to map out your <br />
                    <span className="font-serif italic font-normal text-[var(--text-secondary)]">academic masterworks.</span>
                  </h1>
                  
                  <p className="text-[var(--text-secondary)] text-sm max-w-xl mt-5 leading-relaxed">
                    Welcome to the professional Academic OS platform. Seamlessly navigate classrooms, verified notes banks, student discourse forums, and real-time walk timelines.
                  </p>
                  
                  <div className="flex flex-wrap gap-3.5 mt-8">
                    <button className="btn-premium btn-premium-primary px-6 py-3" onClick={() => setActiveView('map')}>
                      <span>Explore Interactive Map</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button className="btn-premium btn-premium-secondary px-6 py-3" onClick={() => setShowAskQModal(true)}>
                      Ask a Senior
                    </button>
                    <button className="btn-premium btn-premium-secondary border-amber-500/20 text-amber-500 hover:bg-amber-500/5 px-6 py-3" onClick={() => { resetQuiz(); setShowQuizModal(true); }}>
                      ⚡ Club Finder Quiz
                    </button>
                  </div>
                </div>

                {/* Quick Tips Ticker */}
                <div className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-5 py-2.5 flex items-center gap-4 overflow-hidden text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--accent-primary)] whitespace-nowrap flex-shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                    <span>SENIOR TIPS:</span>
                  </div>
                  <div className="overflow-hidden w-full relative">
                    <div className="animate-ticker font-semibold flex gap-12 text-[var(--text-secondary)]">
                      <span>Always carry your physical ID card - security gate checks are absolute!</span>
                      <span>WSL2 or Linux dual-boot setup is highly preferred for engineering lab practicals.</span>
                      <span>The Central Mess serves delicious hot tea and evening snacks daily at 4:30 PM.</span>
                      <span>Maintain your attendance strictly above 75% in all subjects to pass ERP audits!</span>
                    </div>
                  </div>
                </div>

                {/* Grid of Bento Info Boxes */}
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1 font-display">One Click Closer Onboarding</h3>
                  <p className="text-xs text-[var(--text-secondary)] mb-6">Ergonomic student dashboards responding in real time.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bento-surface cursor-pointer flex flex-col justify-between min-h-[180px]" onClick={() => setActiveView('map')}>
                      <div className="w-9 h-9 bg-[var(--accent-glow)] text-[var(--accent-primary)] rounded-lg flex items-center justify-center"><MapPin className="w-4 h-4" /></div>
                      <div>
                        <h4 className="font-semibold text-sm text-[var(--text-primary)] mb-1">Find Classrooms & Amenities</h4>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">SVG layout mapping rooms, wifi hubs, mess dining halls, and walking coordinates.</p>
                      </div>
                    </div>
                    
                    <div className="bento-surface cursor-pointer flex flex-col justify-between min-h-[180px]" onClick={() => setActiveView('academics')}>
                      <div className="w-9 h-9 bg-[var(--accent-glow)] text-[var(--accent-primary)] rounded-lg flex items-center justify-center"><BookOpen className="w-4 h-4" /></div>
                      <div>
                        <h4 className="font-semibold text-sm text-[var(--text-primary)] mb-1">Understand CIA & Grading</h4>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">Deconstruct Continuous Internal Assessments, mid-semester, and grading indexes.</p>
                      </div>
                    </div>
                    
                    <div className="bento-surface cursor-pointer flex flex-col justify-between min-h-[180px]" onClick={() => setActiveView('clubs')}>
                      <div className="w-9 h-9 bg-[var(--accent-glow)] text-[var(--accent-primary)] rounded-lg flex items-center justify-center"><Users className="w-4 h-4" /></div>
                      <div>
                        <h4 className="font-semibold text-sm text-[var(--text-primary)] mb-1">Explore Student Clubs</h4>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">Explore tech bootcamps by *Chakravyuha*, Naadam Jam sessions, and Sports meets.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. ACADEMIC LIFE VIEW */}
            {activeView === 'academics' && (
              <motion.div key="academics" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="flex flex-col gap-10">
                <div>
                  <h2 className="text-3xl font-bold font-display text-[var(--text-primary)] mb-2">Academic Life Guidelines</h2>
                  <p className="text-[var(--text-secondary)] text-sm">Secure high GPAs and maintain clean attendance records from Day 1.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bento-surface flex flex-col justify-between min-h-60">
                    <div>
                      <span className="text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-wider block mb-1">Branch Code: CSE</span>
                      <h4 className="font-bold text-md text-[var(--text-primary)] mb-3">Computer Science</h4>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">Focuses on software engineering paradigms, databases, computer networks, shell scripts, and operational system layers.</p>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] pt-3 border-t border-[var(--border-color)]"><strong>Day 1 Focus:</strong> Python, Calculus, Computational Logic</span>
                  </div>
                  
                  <div className="bento-surface flex flex-col justify-between min-h-60 border-[var(--accent-primary)]/40 shadow-[0_0_20px_var(--accent-glow)]">
                    <div>
                      <span className="text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-wider block mb-1">Branch Code: CSE-AI</span>
                      <h4 className="font-bold text-md text-[var(--text-primary)] mb-3">Artificial Intelligence</h4>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">Specialized pathway covering computational linear algebra, neural network modeling, Python ML, and deep learning algorithms.</p>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] pt-3 border-t border-[var(--border-color)]"><strong>Day 1 Focus:</strong> Probability, PyTorch, Linear Algebra</span>
                  </div>
                  
                  <div className="bento-surface flex flex-col justify-between min-h-60">
                    <div>
                      <span className="text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-wider block mb-1">Branch Code: ECE</span>
                      <h4 className="font-bold text-md text-[var(--text-primary)] mb-3">Electronics & Comm</h4>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">Combines hardware & software structures. Covers semiconductors, circuit theory, IoT signal telemetries, and microchips.</p>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] pt-3 border-t border-[var(--border-color)]"><strong>Day 1 Focus:</strong> Basic Electrical, Physics, Graphics</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bento-surface border-l-4 border-[var(--color-danger)] leading-relaxed flex flex-col justify-start">
                    <div className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 mb-4">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Strict 75% Attendance Regulation</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Attendance is logged by professors daily on the Amrita ERP portal. If a student falls below 75% in any course, HODs will deny hall tickets for the End Semester Exam (ESE).
                      <br /><br />
                      <strong>Condonation exception:</strong> Under extreme medical emergencies, HODs can condone down to 65% with official medical records, but it requires fee clearances and damages evaluation matrices.
                    </p>
                  </div>
                  
                  <div className="bento-surface border-l-4 border-[var(--accent-primary)] leading-relaxed flex flex-col justify-start">
                    <div className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent-glow)] text-[var(--accent-primary)] mb-4">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Continuous Assessments Formula</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Your semester scores are split exactly 50-50:
                      <br /><br />
                      • <strong>Continuous Internal Assessment (CIA) [50%]:</strong> Consists of CIA-1 exam (15 marks), CIA-2 exam (15 marks), and 20 marks internally gathered from quizzes, record notebooks, and lab reports.
                      <br />• <strong>End Semester Exam (ESE) [50%]:</strong> A final written scale paper of 100 marks.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
            {/* 3. CAMPUS MAP VIEW */}
            {activeView === 'map' && (
              <motion.div key="map" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="flex flex-col gap-6">
                <CampusMap selectedBuilding={selectedBuilding} setSelectedBuilding={setSelectedBuilding} />
              </motion.div>
            )}

            {/* 4. RESOURCES LOCKER VIEW */}
            {activeView === 'resources' && (
              <motion.div key="resources" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="flex flex-col gap-6">
                <div>
                  <h2 className="text-3xl font-bold font-display text-text-primary mb-2">Digital Academic Locker</h2>
                  <p className="text-text-secondary text-sm">Download verified lecture sheets, lab codes, and previous year exam questions.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  
                  {/* Left Sidebar Filters */}
                  <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="bg-bg-card border border-border-color rounded-xl p-5 shadow-sm">
                      <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3">Format Filters</h4>
                      <div className="flex flex-col gap-1">
                        {['All', 'Notes', 'PYQs', 'Assignments', 'Books'].map((type) => (
                          <button 
                            key={type} 
                            className={`flex justify-between items-center px-2.5 py-2 rounded-lg text-xs font-semibold text-left transition-all ${resTypeFilter === type ? 'bg-bg-elevated text-accent-primary' : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'}`}
                            onClick={() => setResTypeFilter(type)}
                          >
                            <span>{type === 'All' ? 'All Formats' : type}</span>
                            <span className="text-[10px] text-text-muted px-1.5 py-0.5 bg-bg-secondary rounded-full">
                              {type === 'All' ? resources.length : resources.filter(r => r.type === type).length}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-bg-card border border-border-color rounded-xl p-5 shadow-sm">
                      <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3">Branch Filters</h4>
                      <div className="flex flex-col gap-1.5">
                        {['All', 'CSE', 'ECE'].map((br) => (
                          <button 
                            key={br} 
                            className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all ${resBranchFilter === br ? 'bg-bg-elevated text-accent-primary border border-border-color' : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'}`}
                            onClick={() => setResBranchFilter(br)}
                          >
                            {br === 'All' ? 'All Branches' : `${br} Branch`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Upload resource panel form */}
                    <div className="bg-bg-card border border-border-color rounded-xl p-5 shadow-sm flex flex-col gap-4">
                      <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Contribute Note PDF</h4>
                      <form onSubmit={handleResourceUpload} className="flex flex-col gap-3">
                        <input 
                          type="text" 
                          placeholder="Note Title..."
                          className="w-full px-3 py-2 text-xs bg-bg-secondary border border-border-color rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent-primary outline-none"
                          required
                          value={uploadTitle}
                          onChange={(e) => setUploadTitle(e.target.value)}
                        />
                        <input 
                          type="text" 
                          placeholder="Subject Name (e.g. OOP)"
                          className="w-full px-3 py-2 text-xs bg-bg-secondary border border-border-color rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent-primary outline-none"
                          required
                          value={uploadSubject}
                          onChange={(e) => setUploadSubject(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <select className="flex-1 px-2.5 py-1.5 text-xs bg-bg-secondary border border-border-color rounded-lg text-text-primary focus:border-accent-primary outline-none" value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
                            <option value="Notes">Notes</option>
                            <option value="PYQs">PYQs</option>
                            <option value="Assignments">Assignments</option>
                            <option value="Books">Books</option>
                          </select>
                          <select className="flex-1 px-2.5 py-1.5 text-xs bg-bg-secondary border border-border-color rounded-lg text-text-primary focus:border-accent-primary outline-none" value={uploadBranch} onChange={(e) => setUploadBranch(e.target.value)}>
                            <option value="CSE">CSE</option>
                            <option value="ECE">ECE</option>
                          </select>
                        </div>
                        <input 
                          type="file" 
                          className="text-[10px] text-text-secondary file:mr-2.5 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-accent-primary/10 file:text-accent-primary file:cursor-pointer"
                          onChange={(e) => setUploadFile(e.target.files[0])}
                        />
                        <button type="submit" className="btn btn-primary py-2 text-xs w-full flex items-center justify-center gap-1">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Request Verification</span>
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Right resources grid */}
                  <div className="lg:col-span-3 flex flex-col gap-4">
                    <div className="flex justify-between items-center bg-bg-card border border-border-color p-3 px-5 rounded-xl text-xs font-semibold">
                      <span className="text-text-secondary">{resources.length} Verified guides online</span>
                      <input 
                        type="text" 
                        placeholder="Filter subject..." 
                        className="px-3 py-1.5 text-xs bg-bg-primary border border-border-color rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent-primary outline-none w-44"
                        value={resQuery}
                        onChange={(e) => setResQuery(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {resources.map((res) => (
                        <div key={res.id} className="bg-bg-card border border-border-color hover:border-border-hover rounded-xl p-5 flex flex-col justify-between min-h-[220px] transition-all group shadow-sm">
                          <div className="flex justify-between items-start">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded bg-accent-primary/10 text-accent-primary uppercase tracking-wider`}>{res.type}</span>
                            <button className="text-text-muted hover:text-warning transition-colors" onClick={() => alert('Starred item added to dashboard lockers.')}>
                              <Star className="w-4.5 h-4.5" />
                            </button>
                          </div>
                          <div className="my-4">
                            <h4 className="font-bold text-sm text-text-primary line-clamp-2 leading-snug group-hover:text-accent-primary transition-colors">{res.title}</h4>
                            <span className="text-[10px] text-text-secondary mt-2 block">{res.subject} • {res.branch} • {res.semester}</span>
                          </div>
                          <div className="pt-3.5 border-t border-border-color flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-bg-secondary flex items-center justify-center text-[8px] font-bold text-text-secondary border border-border-color">U</div>
                              <span className="text-[10px] text-text-secondary font-medium">{res.uploader_name || 'Senior'}</span>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] text-text-secondary">
                              <span className="flex items-center gap-0.5"><Star className="w-3.5 h-3.5 text-warning fill-warning" /> {res.rating || '4.8'}</span>
                              <button className="btn btn-secondary px-3 py-1.5 text-[10px] flex items-center gap-1" onClick={() => handleResourceDownload(res.id, res.file_url)}>
                                <Download className="w-3 h-3" />
                                <span>{res.downloads} dl</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* 5. CLUBS VIEW */}
            {activeView === 'clubs' && (
              <motion.div key="clubs" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-color pb-4">
                  <div>
                    <h2 className="text-2xl font-bold font-display tracking-tight text-text-primary">Beyond Code: Campus Operations</h2>
                    <p className="text-xs text-text-secondary mt-0.5">Explore creative sets, acoustic sessions, and athletic rosters live across Amrita Amaravati.</p>
                  </div>

                  {/* Filter Tab Array & Restricted Conditional Action Trigger */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex gap-1.5 bg-bg-secondary p-1 rounded-xl border border-border-color">
                      {[
                        { id: 'All', label: 'All Life' },
                        { id: 'Creative', label: 'Media Production' },
                        { id: 'Cultural', label: 'Cultural Arts' },
                        { id: 'Sports', label: 'Athletics' },
                        { id: 'Technical', label: 'Technical' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setClubCategoryFilter(tab.id)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-200 ${
                            clubCategoryFilter === tab.id
                              ? 'bg-bg-card text-accent-primary shadow-sm font-bold border border-border-color'
                              : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* THE UI FIX: Dynamic Restricted Button Injection */}
                    {user && ['coordinator', 'senior', 'admin'].includes(user.role) && (
                      <button
                        onClick={() => setIsActivityModalOpen(true)}
                        className="btn btn-primary text-xs !py-1.5 !px-3.5 flex items-center gap-1.5 shadow-glow"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Activity</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Clubs Grid Display Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {clubs.filter(c => clubCategoryFilter === 'All' || c.category === clubCategoryFilter).map((club) => {
                    const isJoined = user && user.joined_clubs.includes(club.name);
                    
                    // Determine HSL styling and metadata dynamically
                    const getStyles = (category) => {
                      if (category === 'Creative') return { color: 'border-amber-500/30 text-amber-400', tag: 'Media Production', icon: Film, bgImg: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=600' };
                      if (category === 'Cultural') return { color: 'border-fuchsia-500/30 text-fuchsia-400', tag: 'Music & Fine Arts', icon: Music, bgImg: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=600' };
                      if (category === 'Sports') return { color: 'border-emerald-500/30 text-emerald-400', tag: 'Athletics & Fitness', icon: Trophy, bgImg: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=600' };
                      return { color: 'border-accent-primary/30 text-accent-primary', tag: 'Engineering Tech', icon: Cpu, bgImg: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=600' };
                    };
                    
                    const meta = getStyles(club.category);
                    const ClubIcon = meta.icon;

                    return (
                      <div key={club.id} className="bg-bg-card border border-border-color rounded-2xl p-5 flex flex-col justify-between gap-5 group hover:border-border-hover transition-all relative overflow-hidden shadow-sm" onClick={() => { setSelectedClub(club); setActiveClubTab('overview'); }}>
                        
                        {club.name.includes('Chakravyuha') && (
                          <span className="absolute top-4 right-4 px-2.5 py-0.5 bg-accent-primary text-white font-bold text-[8px] uppercase tracking-wider rounded border border-accent-primary z-20 shadow-glow">featured</span>
                        )}

                        <div className="space-y-4">
                          {/* Header Meta Parameters */}
                          <div className="flex items-center justify-between">
                            <span className={`text-[9px] font-bold uppercase tracking-widest bg-bg-secondary px-2.5 py-0.5 rounded border ${meta.color}`}>
                              {meta.tag}
                            </span>
                            <div className={`w-8 h-8 rounded-lg bg-bg-secondary border flex items-center justify-center ${meta.color}`}>
                              <ClubIcon className="w-4 h-4" />
                            </div>
                          </div>

                          <div>
                            <h3 className="text-md font-bold text-text-primary group-hover:text-accent-primary transition-colors">{club.name}</h3>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {(club.recruitment_roles || []).slice(0, 3).map((role, rIdx) => (
                                <span key={rIdx} className="text-[9px] bg-bg-secondary text-text-secondary px-2 py-0.5 rounded border border-border-color/60 font-medium">
                                  ✦ {role}
                                </span>
                              ))}
                              {(club.recruitment_roles || []).length > 3 && (
                                <span className="text-[9px] bg-bg-secondary text-text-muted px-2 py-0.5 rounded border border-border-color/60 font-medium">
                                  +{(club.recruitment_roles || []).length - 3} more
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Media Reel / Aspect Ratio visual block */}
                          <div className="relative aspect-video rounded-xl bg-gradient-to-br from-bg-secondary to-bg-primary border border-border-color/60 overflow-hidden group/reel my-2" onClick={(e) => e.stopPropagation()}>
                            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 mix-blend-screen scale-105 group-hover/reel:scale-100 transition-transform duration-700" style={{ backgroundImage: `url('${meta.bgImg}')` }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent opacity-90" />
                            
                            <div className="absolute inset-0 p-3.5 flex flex-col justify-between z-10">
                              <span className="text-[8px] font-bold tracking-widest text-accent-primary uppercase bg-bg-primary/90 backdrop-blur-md px-2 py-0.5 rounded border border-border-color w-max">
                                {club.category === 'Creative' ? '🎬 Live Preview' : club.category === 'Cultural' ? '🎵 Live Jam' : club.category === 'Sports' ? '⚽ Highlights' : '💻 Project Demo'}
                              </span>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-accent-primary/15 backdrop-blur-sm border border-accent-primary/30 flex items-center justify-center group-hover/reel:bg-accent-primary group-hover/reel:text-white transition-all cursor-pointer" onClick={() => alert(`Launching ${club.name} visual preview stream...`)}>
                                  <Play className="w-3.5 h-3.5 text-accent-primary group-hover/reel:text-white transition-colors translate-x-0.5" />
                                </div>
                                <div>
                                  <h5 className="text-[11px] font-bold text-text-primary line-clamp-1">
                                    {club.category === 'Creative' ? 'Drishya Trailer (Finding My Pace)' : club.category === 'Cultural' ? 'Aarambh Induction Jam Room' : club.category === 'Sports' ? 'Scrimmage Practice Highlights' : 'Chakravyuha Hackfest Briefing'}
                                  </h5>
                                  <p className="text-[8px] text-text-muted">Aspect Ratio: 16:9 HD Broadcast</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Roster Metrics / Equipment setup */}
                          <div className="flex flex-wrap items-center justify-between text-[10px] text-text-muted pt-2 border-t border-border-color/30">
                            <span>👥 Active Roster: <strong className="text-text-primary">{club.members_count} members</strong></span>
                            {club.club_amenities && club.club_amenities.length > 0 && (
                              <span className="truncate max-w-[200px]">🛠 Setup: <strong className="text-text-secondary">{club.club_amenities[0]}</strong></span>
                            )}
                          </div>

                          {/* Sub-widget: Specific Operations Session */}
                          {club.nextActivity && (
                            <div className="bg-bg-secondary border border-border-color rounded-xl p-4 space-y-3 relative overflow-hidden group/session" onClick={(e) => e.stopPropagation()}>
                              <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-accent-primary/5 blur-2xl group-hover/session:bg-accent-primary/10 transition-colors" />
                              
                              <div className="flex items-center gap-2 text-[9px] font-bold text-accent-primary uppercase tracking-wider">
                                <Calendar className="w-3 h-3" />
                                <span>Active Session: {club.nextActivity.type}</span>
                              </div>
                              <h4 className="text-xs font-semibold text-text-primary leading-tight line-clamp-1">{club.nextActivity.title}</h4>
                              
                              <div className="flex flex-col gap-1 text-[10px] text-text-secondary pt-1">
                                <span>🕒 Timeline Parameters: <strong className="text-text-primary">{club.nextActivity.time}</strong></span>
                                <span>📍 Geographic Asset: <strong className="text-text-primary">{club.nextActivity.venue}</strong></span>
                              </div>

                              {/* Registration Slot Bar */}
                              <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-border-color/40 mt-2">
                                <span className="text-[9px] text-text-muted font-medium">Available Slots: <strong className="text-accent-primary">{club.nextActivity.slots_available} seats</strong></span>
                                
                                {(() => {
                                  const isRegistered = user && user.joined_activities && user.joined_activities.includes(club.nextActivity.title);
                                  return (
                                    <button 
                                      onClick={() => handleJoinActivity(club.nextActivity.title)}
                                      className={`px-3 py-1.5 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all ${
                                        isRegistered 
                                          ? 'bg-success/10 text-success border border-success/30 hover:bg-success/20' 
                                          : 'bg-accent-primary hover:bg-accent-primary/95 text-white'
                                      }`}
                                    >
                                      {isRegistered ? (
                                        <>
                                          <CheckCircle className="w-3 h-3" />
                                          <span>Roster Entry Confirmed</span>
                                        </>
                                      ) : (
                                        <span>Register for Action</span>
                                      )}
                                    </button>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions Tier */}
                        <div className="flex items-center gap-3 pt-2 border-t border-border-color">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleJoinClub(club.name); }}
                            className={`btn px-4.5 py-2 text-[10px] font-bold flex-1 ${isJoined ? 'btn-secondary text-success border-success/15 bg-success/5' : 'btn-primary'}`}
                          >
                            {isJoined ? 'Joined Club' : 'Explore Community'}
                          </button>
                          <button 
                            className="btn btn-secondary text-[10px] font-bold !py-2"
                            onClick={() => { setSelectedClub(club); setActiveClubTab('overview'); }}
                          >
                            View Portfolios
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* 6. STUDENT FORUM VIEW */}
            {activeView === 'forum' && (
              <motion.div key="forum" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="flex flex-col gap-6">
                <div>
                  <h2 className="text-3xl font-bold font-display text-text-primary mb-2">Student Q&A Forum</h2>
                  <p className="text-text-secondary text-sm">Relational Reddit + StackOverflow platform. Post queries, write accepted answers, and build student FAQs.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  
                  {/* Left forum main feeds */}
                  <div className="lg:col-span-3 flex flex-col gap-5">
                    <div className="bg-bg-card border border-border-color p-4.5 rounded-xl flex justify-between items-center shadow-sm">
                      <div className="flex gap-1 bg-bg-secondary p-1 border border-border-color rounded-lg">
                        {['All', 'Trending', 'Recent', 'Solved'].map((f) => (
                          <button 
                            key={f} 
                            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${forumFilter === f ? 'bg-bg-elevated text-accent-primary' : 'text-text-secondary hover:text-text-primary'}`}
                            onClick={() => setForumFilter(f)}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                      <button className="btn btn-primary px-5 py-2 text-xs flex items-center gap-1.5 shadow-glow" onClick={() => setShowAskQModal(true)}>
                        <Plus className="w-4 h-4" />
                        <span>Broadcast Query</span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-4">
                      {forumQuestions.map((q) => (
                        <div key={q.id} className="bg-bg-card border border-border-color hover:border-border-hover rounded-xl p-5 flex gap-5 transition-all shadow-sm">
                          
                          {/* Voting Widget */}
                          <div className="flex flex-col items-center justify-start gap-1 p-1 bg-bg-secondary border border-border-color rounded-lg w-11 h-max">
                            <button className="text-text-muted hover:text-accent-primary active:scale-95 transition-all" onClick={() => handleVote('question', q.id, 'up')}>
                              <ArrowUp className="w-4.5 h-4.5" />
                            </button>
                            <span className="text-xs font-bold text-text-primary">{q.votes}</span>
                            <button className="text-text-muted hover:text-danger active:scale-95 transition-all" onClick={() => handleVote('question', q.id, 'down')}>
                              <ArrowDown className="w-4.5 h-4.5" />
                            </button>
                          </div>

                          <div className="flex-1 flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-text-muted">
                              <span className="bg-bg-elevated text-text-secondary px-2 py-0.5 rounded font-bold">{q.category}</span>
                              <span className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[8px] ${q.status === 'solved' ? 'bg-success/10 text-success' : 'bg-bg-elevated text-text-muted'}`}>{q.status}</span>
                              <span>Asked by @{q.author_name}</span>
                              <span>•</span>
                              <span>{new Date(q.created_at).toLocaleDateString()}</span>
                            </div>
                            <h4 className="font-bold text-md text-text-primary leading-tight cursor-pointer hover:text-accent-primary transition-colors" onClick={() => setSelectedQuestion(q)}>{q.title}</h4>
                            <p className="text-xs text-text-secondary leading-relaxed line-clamp-2 mt-1">{q.body}</p>
                            
                            <div className="flex gap-4 border-t border-border-color/50 pt-3 mt-3 text-[10px] text-text-muted">
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {q.views} views</span>
                              <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {q.replies.length} replies</span>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right FAQ sidebar */}
                  <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="bg-bg-card border border-border-color rounded-xl p-5 shadow-sm">
                      <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3">Verified FAQ Library</h4>
                      <p className="text-[10px] text-text-muted leading-relaxed mb-4">Promoted directly from active student corridors by HODs.</p>
                      
                      <div className="flex flex-col gap-3.5">
                        {forumQuestions.filter(q => q.status === 'pinned').map((faq) => (
                          <div key={faq.id} className="pb-3 border-b border-border-color last:border-b-0 cursor-pointer" onClick={() => setSelectedQuestion(faq)}>
                            <h5 className="font-bold text-xs text-text-primary hover:text-accent-primary transition-colors line-clamp-2 leading-snug">{faq.title}</h5>
                            <span className="text-[9px] text-text-muted mt-1 block">{faq.category} • Pinned FAQ</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* 7. STUDENT PROFILE DASHBOARD */}
            {activeView === 'profile' && user && (
              <motion.div key="profile" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="flex flex-col gap-8">
                <div>
                  <h2 className="text-3xl font-bold font-display text-text-primary mb-2">My Student Operating System</h2>
                  <p className="text-text-secondary text-sm">Monitor class schedules, track grades, and inspect your digital note collections.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left profile widget */}
                  <div className="lg:col-span-1 bg-bg-card border border-border-color rounded-xl p-6 text-center flex flex-col items-center gap-5 shadow-sm">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-primary to-accent-hover text-white flex items-center justify-center font-bold text-2xl shadow-glow">
                      {user.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-text-primary font-display">{user.name}</h3>
                      <p className="text-xs text-text-secondary mt-1">{user.branch} • Batch of 2026</p>
                    </div>

                    <div className="flex gap-2 flex-wrap justify-center mt-2">
                      <span className="px-2.5 py-1 bg-warning/15 border border-warning/20 text-warning text-[9px] font-bold uppercase rounded-full">Early Bird 🚀</span>
                      <span className="px-2.5 py-1 bg-success/15 border border-success/20 text-success text-[9px] font-bold uppercase rounded-full">Scholar 🎓</span>
                    </div>

                    <div className="w-full border-t border-border-color pt-4 text-left">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-3">Joined Clubs</span>
                      <ul className="list-disc pl-5 text-xs text-text-secondary flex flex-col gap-1.5">
                        {user.joined_clubs.map((c, i) => <li key={i} className="font-semibold text-accent-primary">{c}</li>)}
                      </ul>
                    </div>
                  </div>

                  {/* Right Trackers */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-bg-card border border-border-color rounded-xl p-4.5 text-center shadow-sm">
                        <span className="text-[9px] font-bold text-text-muted uppercase block mb-1">Simulated CGPA</span>
                        <span className="text-xl font-bold text-text-primary">{user.cgpa || '9.0'}</span>
                      </div>
                      <div className="bg-bg-card border border-border-color rounded-xl p-4.5 text-center shadow-sm">
                        <span className="text-[9px] font-bold text-text-muted uppercase block mb-1">Questions Asked</span>
                        <span className="text-xl font-bold text-text-primary">
                          {forumQuestions.filter(q => q.author_name === user.name).length}
                        </span>
                      </div>
                      <div className="bg-bg-card border border-border-color rounded-xl p-4.5 text-center shadow-sm">
                        <span className="text-[9px] font-bold text-text-muted uppercase block mb-1">Answer Solutions</span>
                        <span className="text-xl font-bold text-text-primary">
                          {forumQuestions.reduce((acc, q) => acc + q.replies.filter(r => r.author_name === user.name && r.is_accepted).length, 0)}
                        </span>
                      </div>
                      <div className="bg-bg-card border border-border-color rounded-xl p-4.5 text-center shadow-sm">
                        <span className="text-[9px] font-bold text-text-muted uppercase block mb-1">Locker Bookmarks</span>
                        <span className="text-xl font-bold text-text-primary">2</span>
                      </div>
                    </div>

                    {/* CGPA Planner */}
                    <div className="bg-bg-card border border-border-color rounded-xl p-6 shadow-sm">
                      <h4 className="font-bold text-sm text-text-primary mb-1">Target CGPA Target Planner</h4>
                      <p className="text-[10px] text-text-muted mb-4">Slide targeted grades to monitor continuous internal assessment requirements.</p>
                      
                      <div className="flex items-center gap-4">
                        <input 
                          type="range" 
                          min="7" 
                          max="10" 
                          step="0.1" 
                          value={user.cgpa || 9.0}
                          className="flex-1 accent-accent-primary"
                          onChange={(e) => {
                            const newCGPA = parseFloat(e.target.value);
                            setUser({ ...user, cgpa: newCGPA });
                            localStorage.setItem('cc_user', JSON.stringify({ ...user, cgpa: newCGPA }));
                          }}
                        />
                        <span className="w-12 text-center font-bold text-accent-primary border border-border-color py-1 rounded bg-bg-secondary text-sm">{user.cgpa || '9.0'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 8. ADMIN PANEL */}
            {activeView === 'admin' && user && (
              <motion.div key="admin" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="flex flex-col gap-6">
                <div>
                  <h2 className="text-3xl font-bold font-display text-text-primary mb-2">Academic Security & Moderator Panel</h2>
                  <p className="text-text-secondary text-sm">HOD Admin control deck. Monitor activity streams, verify resources, and promote FAQs.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  
                  {/* Left navigation sidebar */}
                  <div className="lg:col-span-1 flex flex-col gap-2">
                    <button className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${adminActiveTab === 'Dashboard' ? 'bg-bg-elevated text-accent-primary border border-border-color' : 'text-text-secondary hover:bg-bg-elevated'}`} onClick={() => setAdminActiveTab('Dashboard')}>
                      Analytics Overview
                    </button>
                    <button className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${adminActiveTab === 'Forum' ? 'bg-bg-elevated text-accent-primary border border-border-color' : 'text-text-secondary hover:bg-bg-elevated'}`} onClick={() => setAdminActiveTab('Forum')}>
                      Moderate Q&As
                    </button>
                    <button className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${adminActiveTab === 'Map' ? 'bg-bg-elevated text-accent-primary border border-border-color' : 'text-text-secondary hover:bg-bg-elevated'}`} onClick={() => setAdminActiveTab('Map')}>
                      Add Map Location
                    </button>
                  </div>

                  {/* Right panel panel container */}
                  <div className="lg:col-span-3 bg-bg-card border border-border-color rounded-xl p-6 min-h-[50vh] shadow-sm">
                    {adminActiveTab === 'Dashboard' && adminStats && (
                      <div className="flex flex-col gap-6 animate-fadeIn">
                        <div className="grid grid-cols-3 gap-5">
                          <div className="bg-bg-secondary border border-border-color p-4.5 rounded-lg flex justify-between items-center">
                            <div>
                              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Freshers Online</span>
                              <span className="text-2xl font-bold text-text-primary mt-1 block">{adminStats.onlineUsers}</span>
                            </div>
                            <span className="text-2xl text-accent-primary">👥</span>
                          </div>
                          <div className="bg-bg-secondary border border-border-color p-4.5 rounded-lg flex justify-between items-center">
                            <div>
                              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Verified Notes</span>
                              <span className="text-2xl font-bold text-text-primary mt-1 block">{adminStats.verifiedAssets}</span>
                            </div>
                            <span className="text-2xl text-accent-primary">📚</span>
                          </div>
                          <div className="bg-bg-secondary border border-border-color p-4.5 rounded-lg flex justify-between items-center">
                            <div>
                              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Pending Queries</span>
                              <span className="text-2xl font-bold text-text-primary mt-1 block">{adminStats.pendingQueries}</span>
                            </div>
                            <span className="text-2xl text-accent-primary">❓</span>
                          </div>
                        </div>

                        {/* Recent Admin Activity Streams */}
                        <div>
                          <h4 className="font-bold text-sm text-text-primary mb-3">Live System Activity Streams</h4>
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="bg-bg-secondary text-text-muted font-bold">
                                <th className="p-3 rounded-l-lg border-b border-border-color">Log Type</th>
                                <th className="p-3 border-b border-border-color">Action</th>
                                <th className="p-3 border-b border-border-color">Target Name</th>
                                <th className="p-3 rounded-r-lg border-b border-border-color">Moderator</th>
                              </tr>
                            </thead>
                            <tbody>
                              {adminStats.activityStream.map((log) => (
                                <tr key={log.id} className="hover:bg-bg-secondary/40 border-b border-border-color/30">
                                  <td className="p-3"><span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-warning/10 text-warning">{log.log_type}</span></td>
                                  <td className="p-3 text-text-primary">{log.action}</td>
                                  <td className="p-3 text-text-secondary max-w-[150px] truncate">{log.target}</td>
                                  <td className="p-3 text-text-muted">@{log.username}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {adminActiveTab === 'Forum' && (
                      <div className="flex flex-col gap-4 animate-fadeIn">
                        <h4 className="font-bold text-sm text-text-primary mb-1">Moderate Forum Threads</h4>
                        <p className="text-[10px] text-text-muted mb-4">Verify answers, promote key topics to FAQ announcements, or moderate violation records.</p>
                        
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-bg-secondary text-text-muted font-bold">
                              <th className="p-3 border-b border-border-color rounded-l-lg">Title</th>
                              <th className="p-3 border-b border-border-color">Category</th>
                              <th className="p-3 border-b border-border-color">Views</th>
                              <th className="p-3 border-b border-border-color rounded-r-lg">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {forumQuestions.map((q) => (
                              <tr key={q.id} className="hover:bg-bg-secondary/40 border-b border-border-color/30">
                                <td className="p-3 text-text-primary font-medium max-w-[200px] truncate" title={q.title}>{q.title}</td>
                                <td className="p-3 text-text-secondary">{q.category}</td>
                                <td className="p-3 text-text-muted">{q.views} views</td>
                                <td className="p-3 flex gap-2">
                                  <button className="px-2.5 py-1 text-[9px] font-bold border border-warning/15 text-warning bg-warning/5 rounded hover:bg-warning/10 transition-colors" onClick={() => handlePromoteFAQ(q.id)}>Promote to FAQ</button>
                                  <button className="px-2.5 py-1 text-[9px] font-bold border border-danger/15 text-danger bg-danger/5 rounded hover:bg-danger/10 transition-colors" onClick={() => handleAdminDeleteQuestion(q.id)}>Delete</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {adminActiveTab === 'Map' && (
                      <div className="flex flex-col gap-4 animate-fadeIn">
                        <h4 className="font-bold text-sm text-text-primary mb-1">Add Location Coordinates</h4>
                        <p className="text-[10px] text-text-muted mb-6">Create dynamic interactive points linked relational to the SVG blueprint blueprint.</p>
                        
                        <form onSubmit={handleAdminCreateLocation} className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-text-secondary block mb-1">Location Title</label>
                            <input type="text" className="w-full px-3.5 py-2.5 text-xs bg-bg-secondary border border-border-color rounded-lg text-text-primary outline-none focus:border-accent-primary" required value={adminLocName} onChange={(e) => setAdminLocName(e.target.value)} placeholder="e.g. Block C Classrooms" />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-text-secondary block mb-1">Description</label>
                            <textarea className="w-full h-16 px-3.5 py-2 text-xs bg-bg-secondary border border-border-color rounded-lg text-text-primary outline-none focus:border-accent-primary resize-none" required value={adminLocDesc} onChange={(e) => setAdminLocDesc(e.target.value)} placeholder="Detail floors, Wi-Fi connectivity, or counter access..."></textarea>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-text-secondary block mb-1">Coordinate X (%)</label>
                            <input type="number" className="w-full px-3.5 py-2 text-xs bg-bg-secondary border border-border-color rounded-lg text-text-primary outline-none focus:border-accent-primary" required value={adminLocX} onChange={(e) => setAdminLocX(e.target.value)} />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-text-secondary block mb-1">Coordinate Y (%)</label>
                            <input type="number" className="w-full px-3.5 py-2 text-xs bg-bg-secondary border border-border-color rounded-lg text-text-primary outline-none focus:border-accent-primary" required value={adminLocY} onChange={(e) => setAdminLocY(e.target.value)} />
                          </div>
                          <div className="col-span-2 flex justify-end gap-3 mt-4">
                            <button type="submit" className="btn btn-primary px-6 py-2.5 text-xs flex items-center gap-1 shadow-glow">
                              <Plus className="w-4 h-4" />
                              <span>Create Dynamic Marker</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
        
        {/* --- MOBILE BOTTOM NAVIGATIONBAR --- */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-bg-secondary border-t border-border-color z-50 flex lg:hidden items-center justify-around px-2 shadow-lg">
          <button className={`flex flex-col items-center justify-center gap-1 flex-1 h-full text-[10px] font-semibold transition-all ${activeView === 'home' ? 'text-accent-primary' : 'text-text-secondary'}`} onClick={() => setActiveView('home')}>
            <Compass className="w-5 h-5" />
            <span>Home</span>
          </button>
          <button className={`flex flex-col items-center justify-center gap-1 flex-1 h-full text-[10px] font-semibold transition-all ${activeView === 'map' ? 'text-accent-primary' : 'text-text-secondary'}`} onClick={() => setActiveView('map')}>
            <MapPin className="w-5 h-5" />
            <span>Map</span>
          </button>
          <button className={`flex flex-col items-center justify-center gap-1 flex-1 h-full text-[10px] font-semibold transition-all ${activeView === 'forum' ? 'text-accent-primary' : 'text-text-secondary'}`} onClick={() => setActiveView('forum')}>
            <MessageSquare className="w-5 h-5" />
            <span>Forum</span>
          </button>
          <button className={`flex flex-col items-center justify-center gap-1 flex-1 h-full text-[10px] font-semibold transition-all ${activeView === 'clubs' ? 'text-accent-primary' : 'text-text-secondary'}`} onClick={() => setActiveView('clubs')}>
            <Users className="w-5 h-5" />
            <span>Clubs</span>
          </button>
          <button className={`flex flex-col items-center justify-center gap-1 flex-1 h-full text-[10px] font-semibold transition-all ${activeView === 'profile' ? 'text-accent-primary' : 'text-text-secondary'}`} onClick={() => { if (!user) setShowAuthModal(true); else setActiveView('profile'); }}>
            <Award className="w-5 h-5" />
            <span>Profile</span>
          </button>
        </div>
      </div>
    </div>

      {/* --- OVERLAY MODALS --- */}
      <AnimatePresence>
        
        {/* 1. AUTHENTICATION PORTAL MODAL */}
        {showAuthModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              className="bg-bg-secondary border border-border-color w-full max-w-sm rounded-2xl overflow-hidden shadow-glow-lg p-6 relative"
            >
              <button className="absolute top-4 right-4 p-1.5 bg-bg-elevated border border-border-color rounded-full hover:text-danger transition-colors cursor-pointer" onClick={() => setShowAuthModal(false)}>
                <X className="w-4 h-4" />
              </button>

              <div className="text-center mb-6">
                <h3 className="font-bold text-lg text-text-primary font-display">{isLoginView ? 'Access Student Portal' : 'Register Student Credentials'}</h3>
                <p className="text-[10px] text-text-muted mt-1 leading-relaxed">JWT secure authorization barrier check.</p>
              </div>

              <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                {!isLoginView && (
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary block mb-1">Full Student Name</label>
                    <input type="text" className="w-full px-3.5 py-2 bg-bg-primary border border-border-color rounded-lg text-xs text-text-primary focus:border-accent-primary outline-none" required value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="e.g. Varun Kapoor" />
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-text-secondary block mb-1">University Student Email</label>
                  <input type="email" className="w-full px-3.5 py-2 bg-bg-primary border border-border-color rounded-lg text-xs text-text-primary focus:border-accent-primary outline-none" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="e.g. varun@am.students.amrita.edu" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-secondary block mb-1">Cryptographic Password</label>
                  <input type="password" className="w-full px-3.5 py-2 bg-bg-primary border border-border-color rounded-lg text-xs text-text-primary focus:border-accent-primary outline-none" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••" />
                </div>
                {!isLoginView && (
                  <div className="flex gap-2.5">
                    <select className="flex-1 px-2.5 py-2 bg-bg-primary border border-border-color rounded-lg text-xs text-text-primary focus:border-accent-primary outline-none" value={authBranch} onChange={(e) => setAuthBranch(e.target.value)}>
                      <option value="CSE">CSE</option>
                      <option value="CSE (AI)">CSE (AI)</option>
                      <option value="ECE">ECE</option>
                    </select>
                    <select className="flex-1 px-2.5 py-2 bg-bg-primary border border-border-color rounded-lg text-xs text-text-primary focus:border-accent-primary outline-none" value={authSemester} onChange={(e) => setAuthSemester(e.target.value)}>
                      <option value="Semester 1">Sem 1</option>
                      <option value="Semester 2">Sem 2</option>
                    </select>
                  </div>
                )}
                <button type="submit" className="btn btn-primary py-2.5 text-xs w-full font-bold shadow-glow mt-2">
                  {isLoginView ? 'Connect Securely' : 'Generate Student Token'}
                </button>
              </form>

              <div className="relative my-5 flex items-center justify-center text-[10px] text-text-muted uppercase">
                <span className="absolute bg-bg-secondary px-3 z-10">or connect via oauth</span>
                <span className="w-full h-px bg-border-color"></span>
              </div>

              {/* Simulated Google login triggers directly */}
              <button className="btn btn-secondary py-2.5 text-xs w-full flex items-center justify-center gap-1.5 hover:bg-bg-elevated transition-colors" onClick={handleSimulatedGoogleLogin}>
                <ExternalLink className="w-4 h-4 text-accent-primary" />
                <span>Simulated Amrita Google Login</span>
              </button>

              <button className="text-[10px] text-accent-primary hover:text-accent-hover font-bold text-center block w-full mt-4 cursor-pointer" onClick={() => setIsLoginView(!isLoginView)}>
                {isLoginView ? 'New fresher? Create token account' : 'Already have credentials? Access Portal'}
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* 2. CLUB DETAIL MODAL */}
        {selectedClub && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-bg-secondary border border-border-color w-full max-w-2xl rounded-2xl overflow-hidden shadow-glow-lg max-h-[85vh] overflow-y-auto relative"
            >
              <button className="absolute top-4 right-4 p-1.5 bg-bg-elevated border border-border-color rounded-full hover:text-danger transition-colors cursor-pointer z-[110]" onClick={() => setSelectedClub(null)}>
                <X className="w-4 h-4" />
              </button>

              <div className="h-44 bg-gradient-to-r from-indigo-950 to-purple-950 p-6 flex items-end relative border-b border-border-color">
                <div className="flex items-center gap-4.5 z-10">
                  <span className="text-4xl p-2 bg-bg-card rounded-xl border border-border-color shadow-sm w-16 h-16 flex items-center justify-center">{selectedClub.logo}</span>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white font-display leading-tight">{selectedClub.name}</h2>
                    <p className="text-xs text-text-secondary mt-1">{selectedClub.category} Club • {selectedClub.members_count} Members</p>
                  </div>
                </div>
              </div>

              {/* Tab Navbar */}
              <div className="flex bg-bg-card border-b border-border-color px-6">
                {['overview', 'recruitment', 'coordinators'].map((tab) => (
                  <button 
                    key={tab} 
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${activeClubTab === tab ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                    onClick={() => setActiveClubTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Bodies */}
              <div className="p-6">
                {activeClubTab === 'overview' && (
                  <div className="flex flex-col gap-4 animate-fadeIn">
                    <h3 className="font-bold text-sm text-text-primary">About our community</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">{selectedClub.detailed_desc}</p>
                    
                    {/* Gear / Equipment Setup */}
                    {selectedClub.club_amenities && selectedClub.club_amenities.length > 0 && (
                      <div className="space-y-2 mt-2">
                        <h3 className="font-bold text-xs text-text-primary uppercase tracking-wider">⚙ Equipment & Assets</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedClub.club_amenities.map((amenity, index) => (
                            <span key={index} className="text-[10px] bg-bg-primary text-text-secondary px-3 py-1 rounded-lg border border-border-color font-medium">
                              🛠 {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Active Live Session Details */}
                    {selectedClub.nextActivity && (
                      <div className="bg-bg-primary border border-border-color rounded-xl p-4 space-y-3 mt-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-accent-primary uppercase tracking-wider">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Active Session: {selectedClub.nextActivity.type}</span>
                        </div>
                        <h4 className="text-xs font-bold text-text-primary leading-tight">{selectedClub.nextActivity.title}</h4>
                        <div className="flex flex-col gap-1 text-[10px] text-text-secondary pt-1">
                          <span>🕒 Timeline: <strong className="text-text-primary">{selectedClub.nextActivity.time}</strong></span>
                          <span>📍 Location Venue: <strong className="text-text-primary">{selectedClub.nextActivity.venue}</strong></span>
                          <span>👥 Roster Capacity: <strong className="text-accent-primary">{selectedClub.nextActivity.slots_available} slots left</strong></span>
                        </div>
                      </div>
                    )}

                    <h3 className="font-bold text-sm text-text-primary mt-3">Visual Club Gallery</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedClub.gallery.map((g, i) => (
                        <div key={i} className="h-16 rounded bg-bg-primary border border-border-color text-[9px] font-bold text-text-muted flex items-center justify-center shadow-inner text-center">{g}</div>
                      ))}
                    </div>
                  </div>
                )}

                {activeClubTab === 'recruitment' && (
                  <div className="flex flex-col gap-4 animate-fadeIn leading-relaxed">
                    <h3 className="font-bold text-sm text-text-primary">Audition & Recruitment guidelines</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">{selectedClub.recruitment_info}</p>
                    
                    {/* Open Recruitment Auditions Roles */}
                    {selectedClub.recruitment_roles && selectedClub.recruitment_roles.length > 0 && (
                      <div className="space-y-2 mt-2">
                        <h3 className="font-bold text-xs text-text-primary uppercase tracking-wider">✨ Open Audition Roles</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedClub.recruitment_roles.map((role, rIdx) => (
                            <span key={rIdx} className="text-[10px] bg-bg-primary text-accent-primary px-3 py-1 rounded-lg border border-accent-primary/20 font-semibold">
                              ✦ {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-bg-primary border border-border-color rounded-lg text-[10px] text-text-muted flex items-start gap-2.5 leading-relaxed mt-2">
                      <Terminal className="w-5 h-5 text-accent-primary flex-shrink-0" />
                      <div>
                        <strong className="text-text-secondary block mb-0.5">Career Guidance Note:</strong>
                        "Joining a club early like {selectedClub.name} triggers peer engineering workflows and builds industry-standard portfolios. class-based records are standard, but hackathon project builds differentiate you in 3rd-year placement drives." - Rohan S.
                      </div>
                    </div>
                  </div>
                )}

                {activeClubTab === 'coordinators' && (
                  <div className="flex flex-col gap-3 animate-fadeIn">
                    <h3 className="font-bold text-sm text-text-primary mb-2">Verified Senior Coordinators</h3>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {selectedClub.coordinators.map((c) => (
                        <div key={c.id} className="min-w-44 bg-bg-primary border border-border-color rounded-xl p-3.5 text-center relative flex-shrink-0 shadow-inner">
                          <span className="absolute top-2.5 right-2.5 text-success text-[10px] font-bold">✔</span>
                          <div className="w-12 h-12 rounded-full bg-accent-primary/15 text-accent-primary flex items-center justify-center font-bold text-xs mx-auto mb-2">
                            {c.name.substring(0, 2).toUpperCase()}
                          </div>
                          <h4 className="font-bold text-xs text-text-primary">{c.name}</h4>
                          <span className="text-[9px] text-accent-primary font-bold block mt-0.5">{c.role}</span>
                          <span className="text-[9px] text-text-muted block mt-0.5">{c.year}</span>
                          
                          <div className="flex justify-center gap-1.5 mt-3">
                            <button className="px-2 py-1 text-[8px] font-bold border border-border-color bg-bg-secondary hover:bg-bg-elevated rounded transition-colors" onClick={() => alert(`Coordinator email coordinates: ${c.contact}`)}>Email</button>
                            <a href={c.linkedin} className="px-2 py-1 text-[8px] font-bold border border-border-color bg-bg-secondary hover:bg-bg-elevated rounded transition-colors">LinkedIn</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-5 border-t border-border-color/50 mt-6">
                  <button className="btn btn-secondary px-5 py-2 text-xs" onClick={() => setSelectedClub(null)}>Close Portal</button>
                  <button className="btn btn-primary px-5 py-2 text-xs" onClick={() => handleJoinClub(selectedClub.name)}>
                    {user && user.joined_clubs.includes(selectedClub.name) ? 'Resign Membership' : 'Request Membership'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 2.5 CLUB ACTIVITY CREATION MODAL */}
        {isActivityModalOpen && (
          <CreationModalForm 
            onClose={() => setIsActivityModalOpen(false)} 
            user={user}
            token={token}
            fetchClubs={fetchClubs}
          />
        )}

        {/* 3. CLUB FINDER QUIZ MODAL */}
        {showQuizModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              className="bg-bg-secondary border border-border-color w-full max-w-md rounded-2xl overflow-hidden shadow-glow-lg p-6 relative"
            >
              <button className="absolute top-4 right-4 p-1.5 bg-bg-elevated border border-border-color rounded-full hover:text-danger transition-colors cursor-pointer" onClick={() => setShowQuizModal(false)}>
                <X className="w-4 h-4" />
              </button>

              <div className="mb-5 border-b border-border-color pb-3">
                <h3 className="font-bold text-md text-text-primary font-display">Student Club Matcher</h3>
                <p className="text-[10px] text-text-muted mt-1 leading-relaxed">Answer questions to identify matches inside Amrita.</p>
              </div>

              {quizStep < 3 ? (
                <div className="flex flex-col gap-4">
                  {/* Progress Tracker bar */}
                  <div className="w-full h-1 bg-bg-primary rounded overflow-hidden">
                    <div className="h-full bg-accent-primary transition-all duration-300" style={{ width: `${(quizStep / 3) * 100}%` }}></div>
                  </div>
                  
                  <span className="text-[9px] font-bold text-accent-primary uppercase tracking-wider block">Question {quizStep + 1} of 3</span>
                  
                  {quizStep === 0 && (
                    <div className="flex flex-col gap-3">
                      <h4 className="font-bold text-sm text-text-primary mb-2">Which activity logs your high-focus zone on weekends?</h4>
                      <button className="quiz-option-btn text-left p-3 border border-border-color rounded-lg text-xs font-semibold hover:border-accent-primary" onClick={() => handleQuizAnswer('Technical')}>Debugging code systems or building ML model scripts.</button>
                      <button className="quiz-option-btn text-left p-3 border border-border-color rounded-lg text-xs font-semibold hover:border-accent-primary" onClick={() => handleQuizAnswer('Creative')}>Writing scripts, painting, or sketching UI layouts.</button>
                      <button className="quiz-option-btn text-left p-3 border border-border-color rounded-lg text-xs font-semibold hover:border-accent-primary" onClick={() => handleQuizAnswer('Sports')}>Outdoor soccer drills or basketball tournaments.</button>
                      <button className="quiz-option-btn text-left p-3 border border-border-color rounded-lg text-xs font-semibold hover:border-accent-primary" onClick={() => handleQuizAnswer('Social Impact')}>Planting saplings or running recycling operations.</button>
                    </div>
                  )}

                  {quizStep === 1 && (
                    <div className="flex flex-col gap-3">
                      <h4 className="font-bold text-sm text-text-primary mb-2">What described your dream milestone at Amrita?</h4>
                      <button className="quiz-option-btn text-left p-3 border border-border-color rounded-lg text-xs font-semibold hover:border-accent-primary" onClick={() => handleQuizAnswer('Technical')}>Winning national-level hackathons.</button>
                      <button className="quiz-option-btn text-left p-3 border border-border-color rounded-lg text-xs font-semibold hover:border-accent-primary" onClick={() => handleQuizAnswer('Cultural')}>Performing on stage at the Aarambh induction night.</button>
                      <button className="quiz-option-btn text-left p-3 border border-border-color rounded-lg text-xs font-semibold hover:border-accent-primary" onClick={() => handleQuizAnswer('Sports')}>Bringing home university sports fests trophies.</button>
                      <button className="quiz-option-btn text-left p-3 border border-border-color rounded-lg text-xs font-semibold hover:border-accent-primary" onClick={() => handleQuizAnswer('Social Impact')}>Leading waste-management campaigns in adopted villages.</button>
                    </div>
                  )}

                  {quizStep === 2 && (
                    <div className="flex flex-col gap-3">
                      <h4 className="font-bold text-sm text-text-primary mb-2">How do you prefer to collaborate with classmates?</h4>
                      <button className="quiz-option-btn text-left p-3 border border-border-color rounded-lg text-xs font-semibold hover:border-accent-primary" onClick={() => handleQuizAnswer('Technical')}>Through peer coding blocks and git repository pulls.</button>
                      <button className="quiz-option-btn text-left p-3 border border-border-color rounded-lg text-xs font-semibold hover:border-accent-primary" onClick={() => handleQuizAnswer('Creative')}>Coordinating script reviews and design moodboards.</button>
                      <button className="quiz-option-btn text-left p-3 border border-border-color rounded-lg text-xs font-semibold hover:border-accent-primary" onClick={() => handleQuizAnswer('Sports')}>Engaging in high-intensity team play drills.</button>
                      <button className="quiz-option-btn text-left p-3 border border-border-color rounded-lg text-xs font-semibold hover:border-accent-primary" onClick={() => handleQuizAnswer('Social Impact')}>Running real-world village outreach camps.</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center flex flex-col gap-4 py-4 animate-fadeIn">
                  <span className="text-5xl display-block">{quizMatchedClub?.logo || '⚡'}</span>
                  <h4 className="font-bold text-md text-text-primary font-display">Matched Club: {quizMatchedClub?.name}</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Based on your focus scoring, your absolute community matches <strong>{quizMatchedClub?.name}</strong> ({quizMatchedClub?.category}).
                  </p>
                  <div className="flex justify-center gap-3 mt-4">
                    <button className="btn btn-secondary py-2 text-xs" onClick={resetQuiz}>Re-Test</button>
                    <button className="btn btn-primary py-2 text-xs shadow-glow" onClick={() => { setShowQuizModal(false); setSelectedClub(quizMatchedClub); setActiveClubTab('overview'); }}>Explore Portal</button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* 4. FORUM DETAILS MODAL (Reddit + Stack Overflow solution acceptance modal) */}
        {selectedQuestion && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-bg-secondary border border-border-color w-full max-w-2xl rounded-2xl overflow-hidden shadow-glow-lg max-h-[85vh] overflow-y-auto relative"
            >
              <button className="absolute top-4 right-4 p-1.5 bg-bg-elevated border border-border-color rounded-full hover:text-danger transition-colors cursor-pointer z-50" onClick={() => setSelectedQuestion(null)}>
                <X className="w-4 h-4" />
              </button>

              {/* Question Header */}
              <div className="p-6 bg-bg-card border-b border-border-color flex gap-5">
                <div className="flex flex-col items-center justify-start gap-1 p-1 bg-bg-primary border border-border-color rounded-lg w-10 h-max">
                  <button className="text-text-muted hover:text-accent-primary active:scale-95 transition-all" onClick={() => handleVote('question', selectedQuestion.id, 'up')}>
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-text-primary">{selectedQuestion.votes}</span>
                  <button className="text-text-muted hover:text-danger active:scale-95 transition-all" onClick={() => handleVote('question', selectedQuestion.id, 'down')}>
                    <ArrowDown className="w-4.5 h-4.5" />
                  </button>
                </div>

                <div className="flex-1">
                  <div className="flex gap-2.5 items-center text-[10px] text-text-muted mb-2">
                    <span className="bg-bg-elevated text-text-secondary px-2 py-0.5 rounded font-bold">{selectedQuestion.category}</span>
                    <span className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[8px] ${selectedQuestion.status === 'solved' ? 'bg-success/10 text-success' : 'bg-bg-elevated text-text-muted'}`}>{selectedQuestion.status}</span>
                    <span>Asked by @{selectedQuestion.author_name}</span>
                  </div>
                  <h3 className="font-bold text-md sm:text-lg text-text-primary leading-snug font-display">{selectedQuestion.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed mt-4 whitespace-pre-wrap">{selectedQuestion.body}</p>
                </div>
              </div>

              {/* Answers Feed */}
              <div className="p-6">
                <h4 className="font-bold text-xs text-text-muted uppercase tracking-wider mb-4">Answers & Solutions ({selectedQuestion.replies.length})</h4>
                
                <div className="flex flex-col gap-4">
                  {selectedQuestion.replies.map((ans) => (
                    <div key={ans.id} className={`p-4 border rounded-xl flex gap-4 ${ans.is_accepted ? 'border-success bg-success/5' : 'border-border-color bg-bg-card'}`}>
                      <div className="flex flex-col items-center justify-start gap-1 p-1 bg-bg-primary border border-border-color rounded-lg w-10 h-max">
                        <button className="text-text-muted hover:text-accent-primary" onClick={() => handleVote('answer', ans.id, 'up')}>
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold text-text-primary">{ans.votes}</span>
                        <button className="text-text-muted hover:text-danger" onClick={() => handleVote('answer', ans.id, 'down')}>
                          <ArrowDown className="w-4.5 h-4.5" />
                        </button>
                      </div>

                      <div className="flex-1 flex flex-col gap-2">
                        {ans.is_accepted && <div className="text-[10px] font-bold text-success flex items-center gap-1">✔ Verified Solution Accepted by Senior</div>}
                        <div className="flex justify-between items-center text-[10px] text-text-muted">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-accent-primary/15 text-accent-primary flex items-center justify-center font-bold text-[8px]">{ans.author_avatar || 'S'}</div>
                            <div>
                              <span className="font-semibold text-text-primary block leading-none">{ans.author_name}</span>
                              <span className="text-[8px] text-text-muted block mt-0.5">{ans.author_role}</span>
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            {user && !ans.is_accepted && (
                              <button className="px-2 py-0.5 text-[8px] font-bold border border-success/15 text-success hover:bg-success/10 rounded transition-colors" onClick={() => handleAcceptAnswer(ans.id)}>Accept Solution</button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed mt-2 whitespace-pre-wrap">{ans.body}</p>
                        
                        {/* Comments loop */}
                        <div className="mt-3 border-t border-border-color/40 pt-3">
                          <div className="flex flex-col gap-2">
                            {ans.comments.map((comm, idx) => (
                              <div key={idx} className="bg-bg-primary rounded p-2 text-[10px] text-text-secondary leading-relaxed">
                                <strong className="text-text-primary">@{comm.author_name}</strong>: {comm.body}
                              </div>
                            ))}
                          </div>
                          
                          {/* Write comment */}
                          <div className="flex gap-2 mt-2">
                            <input 
                              type="text" 
                              placeholder="Comment..." 
                              className="flex-1 px-3 py-1.5 text-[10px] bg-bg-primary border border-border-color rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent-primary outline-none"
                              id={`comm-in-${ans.id}`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.target.value.trim() !== '') {
                                  fetch(`${API_BASE}/forum/answers/${ans.id}/comments`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                    body: JSON.stringify({ body: e.target.value.trim() })
                                  })
                                    .then(r => r.json())
                                    .then(() => {
                                      e.target.value = '';
                                      fetchForum();
                                    });
                                }
                              }}
                            />
                            <button className="btn btn-secondary px-3.5 text-[9px]" onClick={() => {
                              const input = document.getElementById(`comm-in-${ans.id}`);
                              if (input && input.value.trim() !== '') {
                                fetch(`${API_BASE}/forum/answers/${ans.id}/comments`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                  body: JSON.stringify({ body: input.value.trim() })
                                })
                                  .then(r => r.json())
                                  .then(() => {
                                    input.value = '';
                                    fetchForum();
                                  });
                              }
                            }}>Reply</button>
                          </div>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>

                {/* Write answer form */}
                <form onSubmit={handlePostAnswer} className="mt-6 bg-bg-card border border-border-color rounded-xl p-4 flex flex-col gap-3">
                  <h5 className="font-bold text-xs text-text-primary">Provide your verified solution</h5>
                  <textarea 
                    placeholder="Contribute your solution here. Keep it structured and polite..."
                    className="w-full h-20 px-3 py-2 text-xs bg-bg-primary border border-border-color rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent-primary outline-none resize-none"
                    required
                    value={newAnswerText}
                    onChange={(e) => setNewAnswerText(e.target.value)}
                  ></textarea>
                  <div className="flex justify-end">
                    <button type="submit" className="btn btn-primary px-4 py-2 text-xs">Submit Answer</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 5. CREATE NEW QUESTION MODAL */}
        {showAskQModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              className="bg-bg-secondary border border-border-color w-full max-w-md rounded-2xl overflow-hidden shadow-glow-lg p-6 relative"
            >
              <button className="absolute top-4 right-4 p-1.5 bg-bg-elevated border border-border-color rounded-full hover:text-danger transition-colors cursor-pointer" onClick={() => setShowAskQModal(false)}>
                <X className="w-4 h-4" />
              </button>

              <div className="mb-5 border-b border-border-color pb-3">
                <h3 className="font-bold text-md text-text-primary font-display">Broadcast a Student Query</h3>
                <p className="text-[10px] text-text-muted mt-1 leading-relaxed">Broadcast queries immediately to senior coordinators and HOD dashboards.</p>
              </div>

              <form onSubmit={handleAskQuestion} className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-bold text-text-secondary block mb-1">Question Title</label>
                  <input type="text" className="w-full px-3.5 py-2.5 bg-bg-primary border border-border-color rounded-lg text-xs text-text-primary focus:border-accent-primary outline-none" required value={askQTitle} onChange={(e) => setAskQTitle(e.target.value)} placeholder="e.g. How strict is attendance in lab courses?" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-secondary block mb-1">Topic Category</label>
                  <select className="w-full px-3.5 py-2.5 bg-bg-primary border border-border-color rounded-lg text-xs text-text-primary focus:border-accent-primary outline-none" value={askQCategory} onChange={(e) => setAskQCategory(e.target.value)}>
                    <option value="Academics">Academics & Branches</option>
                    <option value="Campus & Hostel">Hostel Survival</option>
                    <option value="Must-Have Tools">Must-Have Tools</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-secondary block mb-1">Detailed Context</label>
                  <textarea className="w-full h-24 px-3.5 py-2.5 bg-bg-primary border border-border-color rounded-lg text-xs text-text-primary focus:border-accent-primary outline-none resize-none" required value={askQBody} onChange={(e) => setAskQBody(e.target.value)} placeholder="Elaborate branch details or specific hostel numbers to get precise solutions..."></textarea>
                </div>
                <div className="flex justify-end gap-3 mt-2">
                  <button type="button" className="btn btn-secondary px-5 py-2 text-xs" onClick={() => setShowAskQModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary px-5 py-2 text-xs shadow-glow">Broadcast Question</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}

// PREMIUM MINIMALIST MODAL POPUP COMPONENT (STAFF USE ONLY)
function CreationModalForm({ onClose, user, token, fetchClubs }) {
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [type, setType] = useState('Film Set');
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState(20);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !venue || !time) {
      alert('Please fill out all fields.');
      return;
    }
    setSubmitting(true);

    // Determine managed club context
    let clubContext = 'chakravyuha';
    if (user && user.joined_clubs && user.joined_clubs.length > 0) {
      const c = user.joined_clubs[0];
      if (c.includes('Drishya')) clubContext = 'drsya-media';
      else if (c.includes('Naadam')) clubContext = 'naadam-arts';
      else if (c.includes('Avisruta')) clubContext = 'avisruta-athletics';
    }

    fetch('http://localhost:5000/api/clubs/activities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        club_id: clubContext,
        activity_title: title,
        activity_type: type,
        scheduled_time: time,
        venue_location: venue,
        slots_available: parseInt(slots)
      })
    })
      .then(res => res.json())
      .then(data => {
        setSubmitting(false);
        if (data.error) {
          alert(`Error: ${data.error}`);
        } else {
          alert('Success! Session event committed live.');
          fetchClubs();
          onClose();
        }
      })
      .catch(err => {
        setSubmitting(false);
        console.error('Failed to commit live activity:', err);
        alert('Server connection error. Failed to commit session.');
      });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border-color w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 relative animate-fadeIn">
        <button className="absolute top-4 right-4 p-1.5 bg-bg-elevated border border-border-color rounded-full hover:text-danger transition-colors cursor-pointer" onClick={onClose}>
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-bold font-display text-text-primary mb-1">Broadcast New Club Action</h3>
        <p className="text-xs text-text-secondary mb-4">This session will route straight to the live operational data layer.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">Session Event Title</label>
            <input 
              type="text" 
              required
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Short Film Cinematography Set" 
              className="w-full px-3.5 py-2 text-xs bg-bg-secondary border border-border-color rounded-lg text-text-primary outline-none focus:border-accent-primary" 
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">Activity Type / Category</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-bg-secondary border border-border-color rounded-lg text-text-primary outline-none focus:border-accent-primary"
            >
              <option value="Film Set">🎬 Film Set (Creative)</option>
              <option value="Acoustic Jam">🎵 Acoustic Jam (Cultural)</option>
              <option value="Match Scrimmage">⚽ Match Scrimmage (Sports)</option>
              <option value="Hackathon Info Session">💻 Hackathon Session (Technical)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">Geographic Asset Location</label>
            <input 
              type="text" 
              required
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g., Academic Block B Horizon Lawn" 
              className="w-full px-3.5 py-2 text-xs bg-bg-secondary border border-border-color rounded-lg text-text-primary outline-none focus:border-accent-primary" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">Scheduled Time Parameters</label>
              <input 
                type="text" 
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="e.g., 4:30 PM Today" 
                className="w-full px-3.5 py-2 text-xs bg-bg-secondary border border-border-color rounded-lg text-text-primary outline-none focus:border-accent-primary" 
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">Slots Limit</label>
              <input 
                type="number" 
                required
                value={slots}
                onChange={(e) => setSlots(e.target.value)}
                placeholder="20" 
                className="w-full px-3.5 py-2 text-xs bg-bg-secondary border border-border-color rounded-lg text-text-primary outline-none focus:border-accent-primary" 
              />
            </div>
          </div>
          <div className="flex gap-4 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1 text-xs py-2">Cancel</button>
            <button type="submit" disabled={submitting} className="btn btn-primary flex-1 text-xs py-2 shadow-glow">
              {submitting ? 'Committing...' : 'Commit Live'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
