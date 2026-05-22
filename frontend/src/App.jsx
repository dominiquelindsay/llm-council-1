import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { api } from './api';
import { useCouncil } from './CouncilContext';
import './App.css';

function App() {
  const { councilConfig } = useCouncil();
  const [conversations, setConversations] = useState([]);
  
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar_width');
    return saved ? parseInt(saved, 10) : 340;
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 260 && newWidth <= 550) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem('sidebar_width', sidebarWidth);
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);
  const [trashedIds, setTrashedIds] = useState(() => {
    const saved = localStorage.getItem('llm_quarantine');
    return saved ? JSON.parse(saved) : [];
  });
  const [trashedConversations, setTrashedConversations] = useState([]);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [currentConversationId, setCurrentConversationId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const chatParam = params.get('chat');
    return (chatParam === 'null' || !chatParam) ? null : chatParam;
  });
  
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isFetching, setIsFetching] = useState(false);

  const [activeStreams, setActiveStreams] = useState({});

  useEffect(() => { loadConversations(); }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const chatParam = params.get('chat');
      setCurrentConversationId((chatParam === 'null' || !chatParam) ? null : chatParam);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (currentConversationId) {
      if (currentConversationId === 'new') {
        setCurrentConversation({ id: 'new', title: 'NEW DELIBERATION', messages: [] });
        setIsFetching(false);
        return;
      }
      if (!activeStreams[currentConversationId]) {
        setCurrentConversation(null); 
        setIsFetching(true);
        api.getConversation(currentConversationId)
          .then(conv => { setCurrentConversation(conv); setIsFetching(false); })
          .catch(err => { 
            console.error('Uplink error:', err); 
            setIsFetching(false); 
            window.history.pushState({}, '', window.location.pathname);
            setCurrentConversationId(null);
          });
      } else {
         api.getConversation(currentConversationId)
           .then(conv => setCurrentConversation(conv))
           .catch(() => {});
      }
    } else {
      setCurrentConversation(null);
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    try {
      const convs = await api.listConversations();
      const currentTrashIds = JSON.parse(localStorage.getItem('llm_quarantine') || '[]');
      setConversations(convs.filter(c => !currentTrashIds.includes(c.id)));
      setTrashedConversations(convs.filter(c => currentTrashIds.includes(c.id)));
    } catch (error) { console.error('Archive retrieval failed:', error); }
  };

  const handleNewConversation = () => {
    window.history.pushState({}, '', `?chat=new`);
    setCurrentConversationId('new');
  };

  const handleRenameConversation = async (id, newTitle) => {
    if (!newTitle || newTitle.trim() === '') return;
    const cleanTitle = newTitle.trim().toUpperCase();
    
    try {
      await fetch(`${API_BASE}/api/conversations/${id}/title`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: cleanTitle })
      });
      
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title: cleanTitle } : c));
      if (currentConversationId === id) setCurrentConversation(prev => ({ ...prev, title: cleanTitle }));
    } catch (error) { console.error('Rename failed:', error); }
  };

  const triggerAutoTitle = async (id, firstPrompt) => {
    try {
      const response = await fetch(`${API_BASE}/api/conversations/${id}/auto-title`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: firstPrompt })
      });
      const data = await response.json();
      
      if (data.success && data.title) {
        setConversations(prev => prev.map(c => c.id === id ? { ...c, title: data.title } : c));
        if (currentConversationId === id) {
          setCurrentConversation(prev => ({ ...prev, title: data.title }));
        }
      }
    } catch (error) {
      console.error("AUTO_TITLE_ERROR:", error);
    }
  };

  const handleSoftDelete = (id) => {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    const newTrashIds = [...trashedIds, id];
    setTrashedIds(newTrashIds);
    localStorage.setItem('llm_quarantine', JSON.stringify(newTrashIds));
    setConversations(prev => prev.filter(c => c.id !== id));
    setTrashedConversations(prev => [conv, ...prev]);
    if (currentConversationId === id) {
      setCurrentConversationId(null);
      window.history.pushState({}, '', window.location.pathname); 
    }
  };

  const handleRestore = (id) => {
    const conv = trashedConversations.find(c => c.id === id);
    if (!conv) return;
    const newTrashIds = trashedIds.filter(tId => tId !== id);
    setTrashedIds(newTrashIds);
    localStorage.setItem('llm_quarantine', JSON.stringify(newTrashIds));
    setTrashedConversations(prev => prev.filter(c => c.id !== id));
    setConversations(prev => [conv, ...prev]);
  };

  const handlePermanentDelete = async (id) => {
    const newTrashIds = trashedIds.filter(tId => tId !== id);
    setTrashedIds(newTrashIds);
    localStorage.setItem('llm_quarantine', JSON.stringify(newTrashIds));
    setTrashedConversations(prev => prev.filter(c => c.id !== id));
    try { await api.deleteConversation(id); } catch (error) { loadConversations(); }
  };

  const handleClearHistory = async (id) => {
    try { 
      await api.clearMessages(id); 
      setCurrentConversation(prev => ({ ...prev, messages: [] })); 
      setActiveStreams(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
      });
    } catch (error) { console.error("Purge failed:", error); }
  };

  const handleSendMessage = async (content, files = [], tier = 'pro', visualEngine = 'dall-e-3') => {
    let targetId = currentConversationId;

    if (targetId && activeStreams[targetId]?.isThinking) {
       console.warn("This council is already deliberating.");
       return;
    }

    if (!targetId || targetId === 'new') {
      try {
        const newConv = await api.createConversation();
        setConversations(prev => [{ id: newConv.id, title: "NEW DELIBERATION", created_at: new Date().toISOString() }, ...prev]);
        window.history.pushState({}, '', `?chat=${newConv.id}`);
        setCurrentConversationId(newConv.id);
        targetId = newConv.id;
        setCurrentConversation({ id: newConv.id, title: "NEW DELIBERATION", messages: [] });
      } catch (error) {
        console.error('Failed to auto-initiate session:', error);
        alert("UPLINK_FAILURE: Core refused to generate new session ID.");
        return;
      }
    }

    const baseMessages = activeStreams[targetId]?.messages || currentConversation?.messages || [];
    const isFirstMessage = baseMessages.length === 0;

    const imagePreviews = files
      .filter(f => f.type.startsWith('image/'))
      .map(f => URL.createObjectURL(f));

    const userMessage = { 
      role: 'user', 
      content: `${content}\n\n[ OVERRIDE: TIER_${tier.toUpperCase()} ]`,
      attachments: imagePreviews 
    };

    const assistantMessage = {
      role: 'assistant', stage1: null, stage2: null, stage3: null,
      loading: { stage1: false, stage2: false, stage3: false },
      timers: { start: Date.now(), s1_start: null, s1_end: null, s2_start: null, s2_end: null, s3_start: null, s3_end: null, total: 0 }
    };

    const newMessages = [...baseMessages, userMessage, assistantMessage];

    setActiveStreams(prev => ({
      ...prev,
      [targetId]: { isThinking: true, messages: newMessages }
    }));

    if (isFirstMessage && content) {
      triggerAutoTitle(targetId, content); 
    }

    await api.sendMessageStream(targetId, content, files, tier, (eventType, event) => {
      setActiveStreams(prev => {
        const streamState = prev[targetId];
        if (!streamState) return prev;

        const messages = [...streamState.messages];
        
        if (messages.length === 0 || messages[messages.length - 1].role !== 'assistant') {
           messages.push({
             role: 'assistant', stage1: null, stage2: null, stage3: null,
             loading: { stage1: false, stage2: false, stage3: false },
             timers: { start: Date.now(), s1_start: null, s1_end: null, s2_start: null, s2_end: null, s3_start: null, s3_end: null, total: 0 }
           });
        }

        const lastMsg = { ...messages[messages.length - 1] };
        let isThinking = true;
        
        switch (eventType) {
          case 'stage1_start': lastMsg.loading.stage1 = true; lastMsg.timers.s1_start = Date.now(); break;
          case 'stage1_complete': lastMsg.stage1 = event.data; lastMsg.loading.stage1 = false; lastMsg.timers.s1_end = Date.now(); break;
          case 'stage2_start': lastMsg.loading.stage2 = true; lastMsg.timers.s2_start = Date.now(); break;
          case 'stage2_complete': lastMsg.stage2 = event.data; lastMsg.loading.stage2 = false; lastMsg.timers.s2_end = Date.now(); break;
          case 'stage3_start': lastMsg.loading.stage3 = true; lastMsg.timers.s3_start = Date.now(); break;
          case 'stage3_complete': 
            lastMsg.stage3 = event.data; lastMsg.loading.stage3 = false; lastMsg.timers.s3_end = Date.now();
            lastMsg.timers.total = (Date.now() - (lastMsg.timers.start || Date.now())) / 1000;
            isThinking = false; break;
          case 'complete': isThinking = false; break;
          case 'error': isThinking = false; break;
        }
        
        messages[messages.length - 1] = lastMsg;
        return { ...prev, [targetId]: { isThinking, messages } };
      });
    }, councilConfig[tier].council, councilConfig[tier].chairman, visualEngine);
  };

  const activeStream = activeStreams[currentConversationId];
  const displayConversation = activeStream && currentConversation
      ? { ...currentConversation, messages: activeStream.messages }
      : activeStream
        ? { id: currentConversationId, title: "ACTIVE DELIBERATION", messages: activeStream.messages }
        : currentConversation;

  const displayLoading = activeStream ? activeStream.isThinking : isFetching;

  return (
    <div className="app" style={{ '--sidebar-width': `${sidebarWidth}px` }}>
      <Sidebar
        conversations={conversations}
        trashedConversations={trashedConversations}
        currentConversationId={currentConversationId}
        activeStreams={activeStreams} /* V9.9.6: DATA FEED CONNECTED */
        onSelectConversation={(id) => { window.history.pushState({}, '', `?chat=${id}`); setCurrentConversationId(id); }}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleSoftDelete}
        onRestoreConversation={handleRestore}
        onPermanentDelete={handlePermanentDelete}
        onRenameConversation={handleRenameConversation}
      />
      
      {/* DRAGGABLE SCI-FI DIVIDER */}
      <div 
        onMouseDown={startResizing}
        style={{
          width: '6px',
          cursor: 'col-resize',
          background: 'transparent',
          borderLeft: '1px solid #1c1c22',
          zIndex: 150,
          position: 'relative',
          userSelect: 'none',
          transition: 'all 0.2s',
          alignSelf: 'stretch'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#00f2ff';
          e.target.style.boxShadow = '0 0 10px #00f2ff, 0 0 20px #00f2ff';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'transparent';
          e.target.style.boxShadow = 'none';
        }}
      />

      <ChatInterface
        conversation={displayConversation}
        onSendMessage={handleSendMessage}
        onClearHistory={handleClearHistory}
        isLoading={displayLoading}
      />
    </div>
  );
}

export default App;