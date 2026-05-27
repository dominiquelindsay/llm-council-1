import React, { useState, useRef, useEffect } from 'react';
import sidebarLogo from '../assets/sidebar_logo.png'; 

const Sidebar = ({ 
  conversations, 
  trashedConversations = [], 
  onSelectConversation, 
  currentConversationId, 
  activeStreams = {}, // V9.9.6: Retrieving the live thread data
  onNewConversation,
  onDeleteConversation, 
  onRestoreConversation, 
  onPermanentDelete,
  onRenameConversation,
  mobileOpen,
  onCloseMobile
}) => {
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleEditSubmit = (id) => {
    if (editValue.trim() !== '') {
      onRenameConversation(id, editValue);
    }
    setEditingId(null);
  };

  const filteredActive = conversations.filter(c => 
    (c.title || 'NEW DELIBERATION').toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredTrashed = trashedConversations.filter(c => 
    (c.title || 'NULL_LOG').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`sidebar ${mobileOpen ? 'open' : ''}`} style={{ 
      width: 'var(--sidebar-width, 340px)', 
      background: '#020204', 
      borderRight: 'none', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      zIndex: 100,
      position: 'relative'
    }}>
      <style>{`
        @keyframes neural-green-glow {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(0, 255, 65, 0.3)); }
          50% { filter: drop-shadow(0 0 30px rgba(0, 255, 65, 0.8)); transform: scale(1.02); }
        }
        @keyframes deliberating-pulse {
          0% { opacity: 0.3; text-shadow: 0 0 5px rgba(255, 176, 0, 0.2); }
          50% { opacity: 1; text-shadow: 0 0 15px rgba(255, 176, 0, 0.9), 0 0 25px rgba(255, 176, 0, 0.4); }
          100% { opacity: 0.3; text-shadow: 0 0 5px rgba(255, 176, 0, 0.2); }
        }
        .deliberating-badge {
          color: #ffb000;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
          animation: deliberating-pulse 1.5s infinite ease-in-out;
        }
        .archive-card {
          background: #050508;
          border: 1px solid #111;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 12px;
          border-radius: 4px;
        }
        .archive-card:hover {
          border: 1px solid #00f2ff44 !important;
          background: #08080c !important;
          transform: translateX(4px);
        }
        .archive-card.active {
          border: 1px solid #00f2ff !important;
          background: #00f2ff08 !important;
        }
        .trash-card {
          background: #140707;
          border: 1px solid #ff3e3e33;
          opacity: 0.85;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 8px;
          padding: 12px 15px;
          font-size: 13px;
          box-shadow: 0 0 5px rgba(255, 62, 62, 0.05);
        }
        .trash-card:hover {
          opacity: 1.0;
          background: #1c0a0a;
          border-color: #ff3e3e88;
          box-shadow: 0 0 10px rgba(255, 62, 62, 0.2);
          transform: translateX(2px);
        }
      `}</style>

      {/* COMMAND HEADER */}
      <div style={{ padding: '45px clamp(8px, calc(var(--sidebar-width) * 0.05), 24px) 30px', textAlign: 'center', borderBottom: '1px solid #1c1c22', position: 'relative' }}>
        {/* MOBILE CLOSE HUD TRIGGER */}
        <button 
          className="mobile-close-sidebar-btn"
          onClick={onCloseMobile}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'transparent',
            border: '1px solid #ff3e3e66',
            color: '#ff3e3e',
            padding: '6px 12px',
            fontSize: '9px',
            fontFamily: 'monospace',
            letterSpacing: '1px',
            cursor: 'pointer',
            borderRadius: '4px',
            transition: 'all 0.2s',
            fontWeight: 'bold',
            display: 'none', /* Handled in CSS */
            boxShadow: '0 0 10px rgba(255, 62, 62, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 62, 62, 0.15)';
            e.currentTarget.style.borderColor = '#ff3e3e';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 62, 62, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = '#ff3e3e66';
            e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 62, 62, 0.1)';
          }}
        >
          [ X ] // CLOSE_HUD
        </button>
        <div 
          onClick={() => onSelectConversation(null)} 
          onMouseEnter={() => setIsLogoHovered(true)}
          onMouseLeave={() => setIsLogoHovered(false)}
          style={{ 
            width: '160px', 
            height: '160px', 
            margin: '0 auto 30px', 
            cursor: 'pointer',
            borderRadius: '50%',
            overflow: 'hidden',
            border: isLogoHovered ? '2px solid #00ff41' : '1px solid #00ff4122',
            animation: isLogoHovered ? 'neural-green-glow 3s infinite ease-in-out' : 'none',
            transition: 'all 0.4s ease',
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img 
            src={sidebarLogo} 
            alt="Council Home" 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
          />
        </div>
        
        <button 
          onClick={onNewConversation} 
          className="new-session-btn"
        >
          <span style={{ fontSize: '1.25em' }}>&gt;</span> INITIATE_NEW_SESSION
          <div style={{ width: '10px', height: '10px', background: '#00f2ff', boxShadow: '0 0 10px #00f2ff' }} />
        </button>

        {/* HUD SEARCH BOX */}
        <div style={{ marginTop: '20px', position: 'relative' }}>
          <input 
            type="text"
            placeholder="SEARCH_ARCHIVES..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: '#000',
              border: '1px solid #1c1c22',
              color: '#00f2ff',
              padding: '12px 15px',
              fontSize: '11px',
              fontFamily: 'monospace',
              letterSpacing: '2px',
              outline: 'none',
              borderRadius: '2px',
              transition: 'all 0.3s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#00f2ff';
              e.target.style.boxShadow = '0 0 10px rgba(0, 242, 255, 0.25)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#1c1c22';
              e.target.style.boxShadow = 'none';
            }}
          />
          {searchQuery && (
            <span 
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '15px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#ff3e3e',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                userSelect: 'none'
              }}
            >
              [X]
            </span>
          )}
        </div>
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        
        <div style={{ fontSize: '9px', color: 'rgba(0, 242, 255, 0.5)', letterSpacing: '3px', fontWeight: 'bold', marginBottom: '15px' }}>
          /// ACTIVE_ARCHIVES_INDEX
        </div>
        
        {filteredActive.map(c => (
          <div 
            key={c.id} 
            className={`archive-card ${currentConversationId === c.id ? 'active' : ''}`}
            style={{ padding: '18px', position: 'relative' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div onClick={() => { if(editingId !== c.id) onSelectConversation(c.id) }} style={{ flex: 1, cursor: 'pointer' }}>
                
                {editingId === c.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ opacity: 0.5, color: '#00e5ffcc', fontSize: '12px', fontWeight: '900', marginRight: '4px' }}>LOG_</span>
                    <input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleEditSubmit(c.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSubmit(c.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: '#000',
                        color: '#00f2ff',
                        border: '1px solid #00f2ff',
                        outline: 'none',
                        fontSize: '12px',
                        fontWeight: '900',
                        fontFamily: 'monospace',
                        width: 'calc(100% - 30px)',
                        padding: '2px 5px',
                        textTransform: 'uppercase',
                        boxShadow: '0 0 10px rgba(0, 242, 255, 0.2)'
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: '900', 
                    color: currentConversationId === c.id ? '#00f2ff' : '#00e5ffcc',
                    letterSpacing: '0.5px'
                  }}>
                    <span style={{ opacity: 0.5 }}>LOG_</span> {c.title?.toUpperCase() || 'NEW_DELIBERATION'}
                  </div>
                )}

                <div style={{ fontSize: '9px', color: '#333', marginTop: editingId === c.id ? '0' : '6px', fontFamily: 'monospace' }}>
                  2026.03.30 // SYSTEM_AUTH_EST
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', fontSize: '11px', fontFamily: 'monospace' }}>
                <span 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setEditingId(c.id);
                    setEditValue(c.title || '');
                  }}
                  style={{ color: '#00f2ff', cursor: 'pointer', opacity: 0.8 }} 
                  title="Rename Archive"
                >[E]</span>
                <span 
                  onClick={(e) => { e.stopPropagation(); onDeleteConversation(c.id); }} 
                  style={{ color: '#ff3e3e', opacity: 0.7, cursor: 'pointer' }}
                  title="Move to Quarantine"
                >[X]</span>
              </div>
            </div>
            
            {/* V9.9.6: ACTIVE & DELIBERATING STATUS ROW */}
            <div style={{ position: 'absolute', right: '55px', bottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              {activeStreams?.[c.id]?.isThinking && (
                <div className="deliberating-badge">[ DELIBERATING ]</div>
              )}
              {currentConversationId === c.id && (
                <div style={{ color: '#00ff41', fontSize: '8px', fontWeight: 'bold' }}>[ACTIVE]</div>
              )}
            </div>

          </div>
        ))}

        {/* QUARANTINE SECTOR */}
        {filteredTrashed.length > 0 && (
          <div style={{ marginTop: '40px' }}>
            <div style={{ fontSize: '11px', color: '#ff3e3e', letterSpacing: '3px', fontWeight: 'bold', marginBottom: '15px', opacity: 0.85, textShadow: '0 0 5px rgba(255, 62, 62, 0.3)' }}>
              /// QUARANTINE_SECTOR
            </div>
            {filteredTrashed.map(c => (
              <div key={c.id} className="trash-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#ff6b6b', fontFamily: 'monospace', fontWeight: 'bold', textShadow: '0 0 5px rgba(255, 107, 107, 0.25)' }}>
                    <span style={{ opacity: 0.6, color: '#ff3e3e' }}>VOID_</span> {c.title?.toUpperCase() || 'NULL_LOG'}
                  </span>
                  <div style={{ display: 'flex', gap: '10px', fontFamily: 'monospace', fontSize: '12px' }}>
                    <span 
                      onClick={() => onRestoreConversation(c.id)} 
                      style={{ color: '#00ff41', cursor: 'pointer' }}
                      title="Restore to Mainframe"
                    >[R]</span>
                    <span 
                      onClick={() => onPermanentDelete(c.id)} 
                      style={{ color: '#ff3e3e', cursor: 'pointer' }}
                      title="Permanent Purge"
                    >[P]</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '20px 30px', borderTop: '1px solid #1c1c22', fontSize: '9px', color: 'rgba(255, 255, 255, 0.3)', fontFamily: 'monospace', letterSpacing: '2px' }}>
        ACCESS_LEVEL: DIRECTOR // ENCRYPTION: AES_256_SIGMA
      </div>
    </div>
  );
};

export default Sidebar;