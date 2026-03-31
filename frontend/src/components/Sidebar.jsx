import React, { useState } from 'react';
import sidebarLogo from '../assets/sidebar_logo.png'; 

const Sidebar = ({ 
  conversations, 
  trashedConversations = [], // Restored
  onSelectConversation, 
  currentConversationId, 
  onNewConversation,
  onDeleteConversation, // Soft Delete
  onRestoreConversation, // Restore logic
  onPermanentDelete // Hard Delete
}) => {
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  return (
    <div className="sidebar" style={{ 
      width: '340px', 
      background: '#020204', 
      borderRight: '1px solid #1c1c22', 
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
          background: #0a0505;
          border: 1px solid #311;
          opacity: 0.6;
          transition: all 0.2s;
          margin-bottom: 8px;
          padding: 12px 15px;
          font-size: 11px;
        }
        .trash-card:hover {
          opacity: 1;
          border-color: #ff3e3e44;
        }
      `}</style>

      {/* COMMAND HEADER: THE HOME BUTTON */}
      <div style={{ padding: '45px 30px 30px', textAlign: 'center', borderBottom: '1px solid #1c1c22' }}>
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
          style={{ 
            width: '100%', 
            background: '#050508', 
            border: '1px solid #00f2ff', 
            color: '#00f2ff', 
            padding: '16px', 
            fontSize: '11px', 
            cursor: 'pointer', 
            letterSpacing: '4px', 
            fontWeight: '900',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}
        >
          <span style={{ fontSize: '18px' }}>&gt;</span> INITIATE_NEW_SESSION
          <div style={{ width: '10px', height: '10px', background: '#00f2ff', boxShadow: '0 0 10px #00f2ff' }} />
        </button>
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        
        {/* ACTIVE ARCHIVES */}
        <div style={{ fontSize: '9px', color: '#444', letterSpacing: '3px', fontWeight: 'bold', marginBottom: '15px' }}>
          /// ACTIVE_ARCHIVES_INDEX
        </div>
        
        {conversations.map(c => (
          <div 
            key={c.id} 
            className={`archive-card ${currentConversationId === c.id ? 'active' : ''}`}
            style={{ padding: '18px', position: 'relative' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div onClick={() => onSelectConversation(c.id)} style={{ flex: 1, cursor: 'pointer' }}>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '900', 
                  color: currentConversationId === c.id ? '#00f2ff' : '#00e5ffcc',
                  letterSpacing: '0.5px'
                }}>
                  <span style={{ opacity: 0.5 }}>LOG_</span> {c.title?.toUpperCase() || 'NEW_DELIBERATION'}
                </div>
                <div style={{ fontSize: '9px', color: '#333', marginTop: '6px', fontFamily: 'monospace' }}>
                  2026.03.30 // SYSTEM_AUTH_EST
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', fontSize: '11px', fontFamily: 'monospace' }}>
                <span style={{ color: '#444', cursor: 'help' }} title="Rename Archive">[E]</span>
                <span 
                  onClick={(e) => { e.stopPropagation(); onDeleteConversation(c.id); }} 
                  style={{ color: '#ff3e3e', opacity: 0.7, cursor: 'pointer' }}
                  title="Move to Quarantine"
                >[X]</span>
              </div>
            </div>
            {currentConversationId === c.id && (
              <div style={{ position: 'absolute', right: '55px', bottom: '15px', color: '#00ff41', fontSize: '8px', fontWeight: 'bold' }}>[ACTIVE]</div>
            )}
          </div>
        ))}

        {/* QUARANTINE SECTOR (RESTORED) */}
        {trashedConversations.length > 0 && (
          <div style={{ marginTop: '40px' }}>
            <div style={{ fontSize: '9px', color: '#ff3e3e', letterSpacing: '3px', fontWeight: 'bold', marginBottom: '15px', opacity: 0.6 }}>
              /// QUARANTINE_SECTOR
            </div>
            {trashedConversations.map(c => (
              <div key={c.id} className="trash-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#844', fontFamily: 'monospace' }}>
                    <span style={{ opacity: 0.4 }}>VOID_</span> {c.title?.toUpperCase() || 'NULL_LOG'}
                  </span>
                  <div style={{ display: 'flex', gap: '10px', fontFamily: 'monospace', fontSize: '10px' }}>
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

      {/* FOOTER */}
      <div style={{ padding: '20px 30px', borderTop: '1px solid #1c1c22', fontSize: '9px', color: '#222', fontFamily: 'monospace', letterSpacing: '2px' }}>
        ACCESS_LEVEL: DIRECTOR // ENCRYPTION: AES_256_SIGMA
      </div>
    </div>
  );
};

export default Sidebar;