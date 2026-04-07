import React from 'react';
import councilLogo from '../assets/council-logo.jpg';

const Splash = () => {
  return (
    <div className="empty-state-container" style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden', background: '#010102' }}>
      <style>{`
        @keyframes cyber-glitch { 
            0%, 93%, 100% { text-shadow: 0 0 15px rgba(255,62,62,0.8); transform: skewX(0deg); opacity: 1; } 
            94% { text-shadow: -5px 0px #00f2ff; transform: skewX(10deg); opacity: 0.8; } 
            96% { text-shadow: 5px 0px #ffffff; transform: skewX(-15deg); opacity: 0.9; } 
        }
        @keyframes neon-flicker { 0%, 100% { opacity: 1; text-shadow: 0 0 20px #00f2ff; } 50% { opacity: 0.6; } 52% { opacity: 1; } }
        @keyframes flash-arrow { 0%, 100% { opacity: 1; text-shadow: 0 0 10px #00f2ff; } 50% { opacity: 0; } }
        @keyframes scan-sweep { 0% { top: -100%; } 100% { top: 200%; } }
        @keyframes subtle-star-pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
      `}</style>

      {/* SCI-FI OVERLAY: SCANLINES */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%)', backgroundSize: '100% 4px', zIndex: 10, pointerEvents: 'none', opacity: 0.5 }} />

      {/* CORE LOGO: MASK CALIBRATED TO PROTECT TYPOGRAPHY */}
      <img 
        src={councilLogo} 
        alt="Council Core" 
        style={{ 
          position: 'absolute', top: '55%', left: '50%', 
          transform: 'translate(-50%, -50%) scale(1.4)', 
          width: '1200px', opacity: 0.8, 
          mixBlendMode: 'screen', pointerEvents: 'none', zIndex: 0,
          maskImage: 'radial-gradient(circle, black 30%, transparent 68%)',
          WebkitMaskImage: 'radial-gradient(circle, black 30%, transparent 68%)'
        }} 
      />

      {/* SENSORY SCAN SWEEP */}
      <div style={{ position: 'absolute', width: '100%', height: '50px', background: 'rgba(0, 242, 255, 0.05)', boxShadow: '0 0 20px rgba(0, 242, 255, 0.1)', top: '-100px', zIndex: 5, animation: 'scan-sweep 12s infinite linear' }} />

      {/* HEADER HUD */}
      <div style={{ position: 'absolute', top: '30px', right: '40px', color: '#00f2ff', fontFamily: 'monospace', fontSize: '13px', letterSpacing: '3px', zIndex: 15, opacity: 0.7 }}>
        USER_UPLINK: DR_LINDSAY // AUTH: DIRECTOR
      </div>

      <div style={{ position: 'absolute', top: '7%', width: '100%', textAlign: 'center', zIndex: 15 }}>
        <span className="dynamic-title" style={{ fontSize: '46px', fontWeight: '900', letterSpacing: '18px', fontFamily: '"Arial Black", sans-serif', color: '#e0ffff', textShadow: '0 0 20px rgba(0, 242, 255, 0.5)' }}>THE COUNCIL</span><br/>
        <span className="neon-ghost-title" style={{ animation: 'neon-flicker 5s infinite', color: '#00f2ff', fontSize: '24px', fontWeight: 'bold', letterSpacing: '8px', fontFamily: 'monospace' }}>NEON_GHOST</span>
      </div>

      {/* SCI-FI DATA STREAMS (CORNERS) */}
      <div style={{ position: 'absolute', top: '30px', left: '40px', color: '#00f2ff', fontFamily: 'monospace', fontSize: '10px', opacity: 0.4, lineHeight: '1.5', zIndex: 15 }}>
        UPLINK_STABILITY: 99.8%<br/>
        HEX_OFFSET: 0x4F2A<br/>
        COORD: 36.1699° N, 115.1398° W
      </div>

      {/* FOOTER HUD */}
      <div style={{ position: 'absolute', bottom: '8%', width: '100%', textAlign: 'center', zIndex: 15 }}>
        <span className="sigma-glitch-text" style={{ animation: 'cyber-glitch 4s infinite', color: '#ff3e3e', fontSize: '24px', fontWeight: 'bold', letterSpacing: '4px' }}>PRIORITY: SIGMA // ACCESS: CLASSIFIED</span>
      </div>

      <div style={{ position: 'absolute', bottom: '8%', left: '40px', color: '#00ff41', fontFamily: 'monospace', fontSize: '20px', letterSpacing: '2px', textShadow: '0 0 10px rgba(0,255,65,0.4)', zIndex: 15, animation: 'subtle-star-pulse 3s infinite' }}>
        STATUS: ONLINE
      </div>

      <div style={{ position: 'absolute', bottom: '8%', right: '40px', color: '#e0e0e0', fontFamily: 'monospace', fontSize: '18px', letterSpacing: '2px', zIndex: 15, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span className="flashing-arrow" style={{ animation: 'flash-arrow 1s step-end infinite', color: '#00f2ff', fontWeight: 'bold' }}>&gt;</span> AWAITING INPUT...
      </div>
    </div>
  );
};
export default Splash;