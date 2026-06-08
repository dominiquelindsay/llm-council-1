import React, { useState, useEffect } from 'react';
import { useCouncil } from '../CouncilContext';

const formatDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};

const Radar = ({ onClose }) => {
  const { councilConfig, globalRoster, toggleTierMember, updateTierChairman, toggleQuarantine, purgeTierData } = useCouncil();
  const isMobile = window.innerWidth <= 768;
  const [providers, setProviders] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [lastSync, setLastSync] = useState(() => localStorage.getItem('radar_last_sync') || null);
  const [purgeTarget, setPurgeTarget] = useState(null);
  const [radarPassword, setRadarPassword] = useState(() => sessionStorage.getItem('radar_command_seal') || '');
  const [isRadarUnlocked, setIsRadarUnlocked] = useState(() => sessionStorage.getItem('radar_unlocked') === 'true');
  const [unlockPrompt, setUnlockPrompt] = useState(null);
  const [unlockInput, setUnlockInput] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const TIERS = ['fast', 'pro', 'omega', 'god'];
  const TARGET_PROVIDERS = ["openai", "google", "anthropic", "x-ai", "perplexity", "qwen", "deepseek", "moonshotai", "nvidia", "openrouter"];
  const PROVIDER_LABELS = {
    qwen: "QWEN_VL",
    moonshotai: "KIMI",
    deepseek: "DEEPSEEK"
  };
  const PROVIDER_ACCENTS = {
    OPENAI: "#dffcff",
    GOOGLE: "#4285f4",
    ANTHROPIC: "#ff7a3d",
    "X-AI": "#f5f7ff",
    PERPLEXITY: "#20e0c4",
    QWEN_VL: "#bc13fe",
    KIMI: "#ffb000",
    DEEPSEEK: "#00ff41",
    NVIDIA: "#76ff03",
    OPENROUTER: "#00f2ff"
  };
  const getProviderAccent = (provider) => PROVIDER_ACCENTS[provider] || "#00f2ff";

  const requestRadarUnlock = (reason, action) => {
    if (isMobile) {
      setToast("TACTICAL LOCK: Visit operations_control_panel to modify radar settings.");
      setTimeout(() => setToast(null), 3500);
      return;
    }
    if (isRadarUnlocked && radarPassword) {
      action(radarPassword);
      return;
    }
    setUnlockError('');
    setUnlockInput('');
    setUnlockPrompt({ reason, action });
  };

  const submitRadarUnlock = async (e) => {
    e.preventDefault();
    const password = unlockInput.trim();
    if (!password) {
      setUnlockError('COMMAND SEAL REQUIRED.');
      return;
    }
    try {
      const SERVER_URL = import.meta.env.VITE_API_URL || window.location.origin;
      const response = await fetch(`${SERVER_URL}/api/radar-auth`, {
        method: 'POST',
        headers: { 'X-Radar-Password': password }
      });
      if (!response.ok) throw new Error('AUTH_REJECTED');
      sessionStorage.setItem('radar_command_seal', password);
      sessionStorage.setItem('radar_unlocked', 'true');
      setRadarPassword(password);
      setIsRadarUnlocked(true);
      const action = unlockPrompt?.action;
      setUnlockPrompt(null);
      setUnlockInput('');
      setUnlockError('');
      if (action) action(password);
      setToast("RADAR COMMAND SEAL ACCEPTED.");
      setTimeout(() => setToast(null), 2500);
    } catch (error) {
      setUnlockError('ACCESS DENIED // INVALID COMMAND SEAL.');
    }
  };

  const lockRadar = () => {
    sessionStorage.removeItem('radar_command_seal');
    sessionStorage.removeItem('radar_unlocked');
    setRadarPassword('');
    setIsRadarUnlocked(false);
    setToast("RADAR SETTINGS LOCKED.");
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/models');
        const data = await response.json();
        const grouped = {};
        
        TARGET_PROVIDERS.forEach(p => {
          const providerModels = data.data
            .filter(m => m.id.startsWith(p + '/'))
            .slice(0, 5); 
          
          if (p === 'nvidia' && !providerModels.find(m => m.id === 'nvidia/nemotron-3-super')) {
            providerModels.unshift({ id: 'nvidia/nemotron-3-super', name: 'NVIDIA Nemotron 3 Super' });
          }
          if (p === 'openrouter' && !providerModels.find(m => m.id === 'openrouter/hunter-alpha')) {
            providerModels.unshift({ id: 'openrouter/hunter-alpha', name: 'OpenRouter Hunter Alpha' });
          }
          
          const displayLabel = PROVIDER_LABELS[p] || p.toUpperCase();
          
          const finalModels = providerModels.slice(0, 5);
          
          // Ensure all active models in globalRoster for this provider are always visible so they don't cause "phantom seats"!
          if (Array.isArray(globalRoster)) {
            globalRoster.forEach(gr => {
              if (gr.modelId.startsWith(p + '/') && (gr.tier || gr.isArbiter || gr.isQuarantined)) {
                if (!finalModels.some(m => m.id === gr.modelId)) {
                  finalModels.push({ id: gr.modelId, name: gr.name });
                }
              }
            });
          }

          grouped[displayLabel] = finalModels.map(m => ({
            name: (m.name || m.id.split('/').pop()).toUpperCase(),
            slug: m.id
          }));
        });
        setProviders(grouped);
        const now = new Date();
        const formatted = formatDate(now);
        localStorage.setItem('radar_last_sync', formatted);
        setLastSync(formatted);
        setIsLoading(false);
      } catch (error) {
        console.error("RADAR_SYNC_ERROR:", error);
        setIsLoading(false);
      }
    };
    fetchModels();
  }, []);

  const handleToggle = (tier, modelId) => {
    if (isMobile) {
      setToast("TACTICAL LOCK: Visit operations_control_panel to allocate seats.");
      setTimeout(() => setToast(null), 3500);
      return;
    }
    const isQuarantined = globalRoster.some(item => item.modelId === modelId && item.isQuarantined);
    if (isQuarantined) {
      setToast("Cannot activate quarantined node.");
      setTimeout(() => setToast(null), 3500);
      return;
    }
    if (!isRadarUnlocked || !radarPassword) {
      requestRadarUnlock(`ALLOCATE ${tier.toUpperCase()} SEAT`, (password) => {
        const res = toggleTierMember(tier, modelId, password);
        if (!res.success) {
          setToast(res.error);
          setTimeout(() => setToast(null), 3500);
        }
      });
      return;
    }
    const res = toggleTierMember(tier, modelId, radarPassword);
    if (!res.success) {
      setToast(res.error);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const setGlobalArbiter = (slug) => {
    if (isMobile) {
      setToast("TACTICAL LOCK: Visit operations_control_panel to assign Arbiter.");
      setTimeout(() => setToast(null), 3500);
      return;
    }
    const isQuarantined = globalRoster.some(item => item.modelId === slug && item.isQuarantined);
    if (isQuarantined) {
       setToast("Cannot assign Arbiter role to a quarantined node.");
       setTimeout(() => setToast(null), 3500);
       return;
    }
    if (!isRadarUnlocked || !radarPassword) {
      requestRadarUnlock("ASSIGN GLOBAL ARBITER", (password) => {
        TIERS.forEach(t => updateTierChairman(t, slug, password));
        setToast(`GLOBAL ARBITER LOCKED: ${slug}`);
        setTimeout(() => setToast(null), 2500);
      });
      return;
    }
    TIERS.forEach(t => updateTierChairman(t, slug, radarPassword));
    setToast(`GLOBAL ARBITER LOCKED: ${slug}`);
    setTimeout(() => setToast(null), 2500);
  };

  const customStyles = `
    @keyframes flashlight-pulse { 
      0%, 100% { background: rgba(2, 2, 4, 0.98); } 
      50% { background: rgba(10, 15, 25, 0.92); } 
    }
    @keyframes slideDown {
      from { transform: translate(-50%, -20px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
    .radar-card {
      background: #050508;
      border: 1px solid color-mix(in srgb, var(--provider-accent) 34%, #1c1c22);
      border-left: 3px solid var(--provider-accent);
      border-radius: 4px;
      padding: 15px;
      margin-bottom: 15px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      box-shadow: inset 0 0 16px color-mix(in srgb, var(--provider-accent) 8%, transparent);
    }
    .radar-card:hover { 
      border-color: var(--provider-accent);
      box-shadow: 0 0 18px color-mix(in srgb, var(--provider-accent) 22%, transparent), inset 0 0 18px color-mix(in srgb, var(--provider-accent) 10%, transparent);
      transform: translateY(-2px); 
    }
    .radar-card.active-in-tier {
      border-color: #bc13fe;
      border-left-color: var(--provider-accent);
      box-shadow: 0 0 20px rgba(188, 19, 254, 0.28), inset 0 0 18px color-mix(in srgb, var(--provider-accent) 12%, transparent);
    }
    .radar-card.quarantined-card {
      border-color: #ff3e3e !important;
      background: #1a0505 !important;
      box-shadow: 0 0 15px rgba(255, 62, 62, 0.1) !important;
    }
    .quarantined-card .tier-radio-btn { opacity: 0.2; pointer-events: none; }
    
    .tier-radio-group {
      display: flex;
      gap: 12px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #1c1c22;
      justify-content: space-around;
    }
    .tier-toggle-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      padding: 10px 15px;
      border-radius: 6px;
      transition: background 0.2s;
    }
    .tier-toggle-wrapper:hover {
      background: rgba(188, 19, 254, 0.1);
    }
    .tier-radio-btn {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid #555;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .tier-radio-btn.active {
      border-color: #bc13fe;
      background: #bc13fe;
      box-shadow: 0 0 12px #bc13fe;
    }
    .tier-label {
      font-size: 14px;
      font-weight: 900;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 8px;
      transition: color 0.2s;
    }
    .tier-toggle-wrapper.active .tier-label {
      color: #fff;
      text-shadow: 0 0 8px rgba(188, 19, 254, 0.8);
    }
    .arbiter-btn {
      background: #bc13fe;
      color: #fff;
      border: none;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 900;
      cursor: pointer;
      letter-spacing: 1px;
      border-radius: 2px;
      transition: all 0.2s;
    }
    .arbiter-btn:hover { background: #df1cff; box-shadow: 0 0 15px #bc13fe; }
    .arbiter-btn.active { background: #00ff41; box-shadow: 0 0 15px #00ff41; }
    
    .quarantine-btn {
      background: transparent;
      color: #ff3e3e;
      border: 1px solid #ff3e3e;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: bold;
      cursor: pointer;
      letter-spacing: 1px;
      transition: all 0.2s;
    }
    .quarantine-btn:hover { background: rgba(255, 62, 62, 0.2); }
    .quarantine-btn.restorer { color: #00f2ff; border-color: #00f2ff; }
    
    .toast-notification {
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 62, 62, 0.15);
      border: 1px solid #ff3e3e;
      color: #ff3e3e;
      padding: 15px 30px;
      border-radius: 4px;
      font-family: monospace;
      font-weight: bold;
      font-size: 14px;
      letter-spacing: 2px;
      z-index: 2000;
      box-shadow: 0 0 20px rgba(255, 62, 62, 0.3);
      backdrop-filter: blur(5px);
      animation: slideDown 0.3s ease-out forwards;
    }
    .purge-btn {
      color: #ff003c;
      border: 1px solid #ff003c44;
      background: transparent;
      font-size: 0.7rem;
      padding: 5px 10px;
      cursor: pointer;
      font-family: monospace;
      transition: all 0.2s;
      letter-spacing: 1px;
    }
    .purge-btn:hover {
      background: rgba(255, 0, 60, 0.15);
      border-color: #ff003c;
      box-shadow: 0 0 10px rgba(255, 0, 60, 0.3);
    }
    .radar-auth-btn {
      background: rgba(0, 242, 255, 0.06);
      color: #00f2ff;
      border: 1px solid #00f2ff66;
      padding: 9px 14px;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 2px;
      cursor: pointer;
      font-family: monospace;
      border-radius: 2px;
      transition: all 0.2s;
    }
    .radar-auth-btn.unlocked {
      color: #00ff41;
      border-color: #00ff41;
      background: rgba(0, 255, 65, 0.08);
      box-shadow: 0 0 12px rgba(0, 255, 65, 0.18);
    }
    .radar-auth-modal {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.82);
      backdrop-filter: blur(8px);
    }
    .radar-auth-panel {
      width: min(520px, calc(100vw - 36px));
      background: #050508;
      border: 1px solid #00f2ff88;
      box-shadow: 0 0 35px rgba(0, 242, 255, 0.2), inset 0 0 30px rgba(0, 242, 255, 0.05);
      padding: 28px;
      font-family: monospace;
      color: #dffcff;
    }
    .radar-auth-panel h3 {
      color: #00f2ff;
      letter-spacing: 4px;
      margin: 0 0 12px;
      font-size: 16px;
    }
    .radar-auth-panel p {
      color: #ffb000;
      line-height: 1.6;
      margin: 0 0 18px;
      font-size: 11px;
      letter-spacing: 1px;
    }
    .radar-auth-panel input {
      width: 100%;
      background: #000;
      border: 1px solid #1c1c22;
      color: #fff;
      font-family: monospace;
      font-size: 15px;
      padding: 14px;
      outline: none;
      box-sizing: border-box;
      margin-bottom: 12px;
    }
    .radar-auth-panel input:focus {
      border-color: #00f2ff;
      box-shadow: 0 0 12px rgba(0, 242, 255, 0.2);
    }
    .radar-auth-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 14px;
    }
    .radar-auth-actions button {
      background: transparent;
      color: #00f2ff;
      border: 1px solid #00f2ff66;
      padding: 10px 16px;
      cursor: pointer;
      font-family: monospace;
      font-weight: 900;
      letter-spacing: 2px;
    }
    .radar-auth-actions button.confirm {
      color: #050508;
      background: #00f2ff;
      border-color: #00f2ff;
    }
    .radar-auth-error {
      color: #ff3e3e;
      font-size: 11px;
      letter-spacing: 1px;
      min-height: 18px;
    }
    .radar-control-tile.close-tile {
      border-color: #ff3e3e44;
      background: rgba(255, 62, 62, 0.04);
      box-shadow: 0 4px 10px rgba(255, 62, 62, 0.05);
    }
    .radar-control-tile.close-tile:hover {
      border-color: rgba(255, 62, 62, 0.7);
      box-shadow: 0 0 15px rgba(255, 62, 62, 0.25);
      transform: translateY(-1px);
    }
    .radar-control-grid {
      display: flex;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-top: 30px;
      max-width: 1200px;
      margin-left: auto;
      margin-right: auto;
      padding: 0 20px;
    }
    .radar-control-tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      background: rgba(5, 5, 8, 0.95);
      border: 1px solid #1c1c22;
      border-radius: 4px;
      padding: 12px 15px;
      min-width: 140px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
      transition: all 0.25s ease;
      box-sizing: border-box;
    }
    .radar-control-tile.active-tile {
      border-color: #bc13fe;
      background: rgba(188, 19, 254, 0.08);
      box-shadow: 0 0 15px rgba(188, 19, 254, 0.2);
    }
    .radar-control-tile.quarantine-tile.active-tile {
      border-color: #ff3e3e;
      background: rgba(255, 62, 62, 0.08);
      box-shadow: 0 0 15px rgba(255, 62, 62, 0.2);
    }
    .radar-control-tile:hover {
      border-color: rgba(0, 242, 255, 0.5);
      box-shadow: 0 0 10px rgba(0, 242, 255, 0.15);
      transform: translateY(-1px);
    }
    @media (max-width: 768px) {
      .radar-control-grid {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 10px !important;
        padding: 0 10px !important;
      }
      .radar-control-tile {
        min-width: 0 !important;
        padding: 8px !important;
        gap: 6px !important;
      }
      .radar-control-tile:first-child,
      .radar-control-tile.close-tile {
        grid-column: span 2 !important;
      }
    }
  `;

  if (isLoading) return (
    <div className="radar-container" style={{ position: 'fixed', top: '60px', left: 'var(--sidebar-width, 340px)', right: 0, bottom: 0, background: '#020204', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00f2ff', fontFamily: 'monospace', letterSpacing: '5px' }}>
      SYNCHRONIZING_QWEN_VL_DATABASE...
    </div>
  );

  return (
    <div className="radar-container" style={{ position: 'fixed', top: '60px', left: 'var(--sidebar-width, 340px)', right: 0, bottom: 0, zIndex: 1000, overflowY: 'auto', backdropFilter: 'blur(10px)', animation: 'flashlight-pulse 8s infinite ease-in-out', paddingBottom: '100px' }}>
      <style>{customStyles}</style>

      {toast && (
        <div className="toast-notification">
          [ COMMAND ] {toast}
        </div>
      )}

      {unlockPrompt && (
        <div className="radar-auth-modal">
          <form className="radar-auth-panel" onSubmit={submitRadarUnlock}>
            <h3>RADAR COMMAND SEAL</h3>
            <p>
              AUTHORIZATION REQUIRED TO MODIFY SYSTEM_RADAR SETTINGS.
              <br />
              REQUESTED ACTION: {unlockPrompt.reason}
            </p>
            <input
              type="password"
              autoFocus
              value={unlockInput}
              onChange={(e) => setUnlockInput(e.target.value)}
              placeholder="ENTER_COMMAND_SEAL..."
            />
            <div className="radar-auth-error">{unlockError}</div>
            <div className="radar-auth-actions">
              <button type="button" onClick={() => setUnlockPrompt(null)}>[ ABORT ]</button>
              <button type="submit" className="confirm">[ UNLOCK_RADAR ]</button>
            </div>
          </form>
        </div>
      )}
      
      <div className="radar-header-block" style={{ padding: '40px 60px 20px', textAlign: 'center', position: 'relative' }}>
        <div className="radar-status-text" style={{ color: '#00ff41', fontSize: '12px', letterSpacing: '8px', marginBottom: '10px', opacity: 0.6 }}>SYSTEM_STATUS: OMNISCIENT</div>
        <div className="radar-title" style={{ color: '#fff', fontSize: '28px', fontWeight: '900', letterSpacing: '12px', textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>COUNCIL_RADAR_V11.0</div>
        {lastSync && (
        <div className="last-sync-timestamp">
          [ LAST_SYNC: {lastSync} ]
        </div>
        )}
        {!isMobile && (
          <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`radar-auth-btn ${isRadarUnlocked ? 'unlocked' : ''}`}
              onClick={() => isRadarUnlocked ? lockRadar() : requestRadarUnlock('UNLOCK RADAR SETTINGS', () => {})}
            >
              {isRadarUnlocked ? '[ RADAR_UNLOCKED // LOCK ]' : '[ SETTINGS_LOCKED // UNLOCK ]'}
            </button>
            <div style={{ color: isRadarUnlocked ? '#00ff41' : '#ffb000', fontFamily: 'monospace', fontSize: '10px', letterSpacing: '2px', fontWeight: 'bold' }}>
              {isRadarUnlocked ? 'COMMAND_SEAL: ACCEPTED' : 'COMMAND_SEAL: REQUIRED_FOR_CHANGES'}
            </div>
          </div>
        )}
        
        {/* TIER CONTROL PANEL (FILTER HUD + PURGE GRID) */}
        <div className="radar-control-grid">
          {['ALL', 'FAST', 'PRO', 'OMEGA', 'GOD', 'ARBITER', 'QUARANTINE', 'CLOSE'].map(f => {
            if (f === 'CLOSE') {
              return (
                <div key="CLOSE" className="radar-control-tile close-tile">
                  <button 
                    onClick={onClose}
                    style={{
                      background: 'rgba(255, 62, 62, 0.1)',
                      color: '#ff3e3e',
                      border: '1px solid #ff3e3e',
                      padding: '8px 16px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      letterSpacing: '2px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 0 10px rgba(255, 62, 62, 0.2)',
                      whiteSpace: 'nowrap',
                      width: '100%',
                      borderRadius: '2px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255, 62, 62, 0.25)';
                      e.target.style.boxShadow = '0 0 15px rgba(255, 62, 62, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(255, 62, 62, 0.1)';
                      e.target.style.boxShadow = '0 0 10px rgba(255, 62, 62, 0.2)';
                    }}
                  >
                    [ CLOSE_RADAR ]
                  </button>
                  <div style={{ height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff3e3e', fontSize: '9px', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '1px' }}>
                    [ SYSTEM_EXIT ]
                  </div>
                </div>
              );
            }

            const isQuarantine = f === 'QUARANTINE';
            const isFilterActive = activeFilter === f;
            const tileClass = `radar-control-tile ${isQuarantine ? 'quarantine-tile' : ''} ${isFilterActive ? 'active-tile' : ''}`;
            
            return (
              <div key={f} className={tileClass}>
                <button 
                  onClick={() => setActiveFilter(f)}
                  style={{
                    background: isFilterActive ? (isQuarantine ? 'rgba(255, 62, 62, 0.2)' : 'rgba(188, 19, 254, 0.2)') : 'transparent',
                    color: isFilterActive ? '#fff' : (isQuarantine ? '#ff3e3e' : '#00f2ff'),
                    border: `1px solid ${isFilterActive ? (isQuarantine ? '#ff3e3e' : '#bc13fe') : (isQuarantine ? '#ff3e3e44' : '#00f2ff44')}`,
                    padding: '8px 16px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    letterSpacing: '2px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isFilterActive ? (isQuarantine ? '0 0 10px rgba(255, 62, 62, 0.3)' : '0 0 10px rgba(188, 19, 254, 0.3)') : 'none',
                    whiteSpace: 'nowrap',
                    width: '100%',
                    borderRadius: '2px'
                  }}
                >
                  [ {f} ]
                </button>
                <button
                  className="purge-btn"
                  onClick={() => {
                    if (isMobile) {
                      setToast("TACTICAL LOCK: Visit operations_control_panel to purge.");
                      setTimeout(() => setToast(null), 3500);
                      return;
                    }
                    requestRadarUnlock(`PURGE ${f}`, () => setPurgeTarget(f));
                  }}
                  style={{ whiteSpace: 'nowrap', width: '100%', borderRadius: '2px', fontSize: '8px', padding: '4px 6px' }}
                >
                  [ PURGE {f} ]
                </button>
              </div>
            );
          })}
        </div>

        {/* CAPACITY NODE MATRIX */}
        <div className="radar-capacity-matrix" style={{ marginTop: '20px', height: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          {(activeFilter === 'ALL' || activeFilter === 'ARBITER' || activeFilter === 'QUARANTINE') ? (
            <div style={{ color: '#00f2ff', fontSize: '12px', letterSpacing: '4px', opacity: 0.6, fontWeight: 'bold', textAlign: 'center', width: '100%' }}>[ GLOBAL_VIEW ]</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'center' }}>
              <div style={{ color: '#bc13fe', fontSize: '10px', letterSpacing: '3px', fontWeight: 'bold', textAlign: 'center', width: '100%' }}>[ SEAT_ALLOCATION ]</div>
              <div style={{ display: 'flex', gap: '12px' }}>
                {[...Array(5)].map((_, i) => {
                  const activeTier = activeFilter.toLowerCase();
                  const currentTierCount = globalRoster.filter(item => (item.tiers || (item.tier ? [item.tier] : [])).includes(activeTier)).length;
                  const isFilled = i < currentTierCount;
                  return (
                    <div key={i} style={{
                      width: '24px',
                      height: '8px',
                      borderRadius: '2px',
                      background: isFilled ? '#bc13fe' : 'transparent',
                      border: `1px solid ${isFilled ? '#bc13fe' : '#444'}`,
                      boxShadow: isFilled ? '0 0 10px #bc13fe' : 'none',
                      transition: 'all 0.3s'
                    }} />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {isMobile && (
        <div style={{
          margin: '20px auto 10px',
          maxWidth: 'calc(100% - 40px)',
          background: 'rgba(255, 62, 62, 0.05)',
          border: '1px solid rgba(255, 62, 62, 0.3)',
          borderLeft: '4px solid #ff3e3e',
          padding: '20px',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#ff3e3e',
          textAlign: 'center',
          boxShadow: '0 0 15px rgba(255, 62, 62, 0.1)',
          boxSizing: 'border-box'
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px', letterSpacing: '2px', marginBottom: '8px', textShadow: '0 0 10px rgba(255, 62, 62, 0.4)' }}>
            ⚠️ [ SECURITY_PROTOCOL: MOBILE_READ_ONLY_ACCESS ]
          </div>
          <div style={{ opacity: 0.9, lineHeight: '1.6', letterSpacing: '0.5px' }}>
            COUNCIL ROSTER SEATS ARE STABLE AND LOCKED. TO CONFIGURE ALLOCATIONS, 
            ACCESS THE <span style={{ color: '#00f2ff', fontWeight: 'bold', textShadow: '0 0 8px rgba(0, 242, 255, 0.4)' }}>OPERATIONS_CONTROL_PANEL</span> VIA A DESKTOP TERMINAL.
          </div>
        </div>
      )}

      <div className="radar-cards-grid" style={{ padding: '20px 60px', maxWidth: '95vw', margin: '0 auto' }}>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '40px'
        }}>
          {Object.entries(providers).map(([provider, models]) => (
            <div key={provider} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ 
                color: getProviderAccent(provider),
                fontSize: '16px', 
                fontWeight: '900', 
                letterSpacing: '4px', 
                marginBottom: '25px', 
                borderBottom: `1px solid ${getProviderAccent(provider)}66`,
                paddingBottom: '10px', 
                textAlign: 'center' 
              }}>
                {provider}
              </div>
              {models.map(m => {
                const rosterItem = globalRoster.find(item => item.modelId === m.slug);
                const itemTiers = rosterItem ? (rosterItem.tiers || (rosterItem.tier ? [rosterItem.tier] : [])) : [];
                const isActiveInAnyTier = itemTiers.length > 0;
                const isArbiterInAnyTier = !!(rosterItem && rosterItem.isArbiter);
                const isQuarantined = !!(rosterItem && rosterItem.isQuarantined);
                
                const activeTier = activeFilter.toLowerCase();
                const isAssignedToActiveTier = itemTiers.includes(activeTier);
                
                const isCurrentlyActive = (activeFilter === 'ALL')
                  ? isActiveInAnyTier
                  : (activeFilter === 'ARBITER' ? isArbiterInAnyTier : (activeFilter === 'QUARANTINE' ? isQuarantined : isAssignedToActiveTier));

                let cardOpacity = 0.75;
                if (activeFilter === 'ALL') {
                  cardOpacity = 1;
                } else if (activeFilter === 'ARBITER') {
                  if (isArbiterInAnyTier) cardOpacity = 1;
                } else if (activeFilter === 'QUARANTINE') {
                  if (isQuarantined) cardOpacity = 1;
                } else {
                  if (isAssignedToActiveTier) cardOpacity = 1;
                }

                return (
                  <div
                    key={m.slug}
                    className={`radar-card ${isCurrentlyActive ? 'active-in-tier' : ''} ${isQuarantined ? 'quarantined-card' : ''}`}
                    style={{ opacity: cardOpacity, '--provider-accent': getProviderAccent(provider) }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>{m.name}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <button 
                          className="arbiter-btn"
                          onClick={() => setGlobalArbiter(m.slug)}
                          style={{ background: isArbiterInAnyTier ? '#00ff41' : '#bc13fe' }}
                        >
                          {isArbiterInAnyTier ? 'ARBITER_ACTIVE' : 'SET_ARBITER'}
                        </button>
                        <a 
                          href={`https://openrouter.ai/models/${m.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '14px', color: '#00f2ff', opacity: 0.5, marginTop: '12px', textDecoration: 'none', fontWeight: 'bold', letterSpacing: '1px', transition: 'opacity 0.2s' }}
                          onMouseEnter={(e) => e.target.style.opacity = 1}
                          onMouseLeave={(e) => e.target.style.opacity = 0.5}
                        >
                          [ VIEW_INTEL ]
                        </a>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ color: getProviderAccent(provider), fontSize: '11px', opacity: 0.6, fontFamily: 'monospace' }}>
                        {m.slug}
                      </div>
                      <button 
                        className={`quarantine-btn ${isQuarantined ? 'restorer' : ''}`}
                        onClick={() => {
                          if (isMobile) {
                            setToast("TACTICAL LOCK: Visit operations_control_panel to quarantine/restore.");
                            setTimeout(() => setToast(null), 3500);
                            return;
                          }
                          requestRadarUnlock(isQuarantined ? "RESTORE NODE" : "QUARANTINE NODE", (password) => {
                            toggleQuarantine(m.slug, password);
                          });
                        }}
                      >
                        {isQuarantined ? 'RESTORE_NODE' : 'QUARANTINE'}
                      </button>
                    </div>

                    <div className="tier-radio-group">
                      {TIERS.map(t => {
                        const isActive = globalRoster.some(item => item.modelId === m.slug && (item.tiers || (item.tier ? [item.tier] : [])).includes(t));
                        return (
                          <div 
                            key={t} 
                            className={`tier-toggle-wrapper ${isActive ? 'active' : ''}`}
                            onClick={() => handleToggle(t, m.slug)}
                          >
                            <div className="tier-label">{t.substring(0, 1)}</div>
                            <div className={`tier-radio-btn ${isActive ? 'active' : ''}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {purgeTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ border: '1px solid #ff003c', background: '#050505', padding: '40px', textAlign: 'center', boxShadow: '0 0 20px rgba(255,0,60,0.2)' }}>
            <h3 style={{ color: '#ff003c', letterSpacing: '2px', marginBottom: '20px' }}>SYSTEM WARNING: PERMANENTLY PURGE {purgeTarget} DATA?</h3>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '20px' }}>
              <button 
                onClick={() => setPurgeTarget(null)}
                style={{
                  background: 'transparent',
                  color: '#00f2ff',
                  border: '1px solid #00f2ffaa',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  letterSpacing: '2px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(0, 242, 255, 0.15)';
                  e.target.style.boxShadow = '0 0 10px rgba(0, 242, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.boxShadow = 'none';
                }}
              >
                [ ABORT ]
              </button>
              <button 
                onClick={() => {
                  requestRadarUnlock(`CONFIRM PURGE ${purgeTarget}`, (password) => {
                    purgeTierData(purgeTarget, password);
                    setPurgeTarget(null);
                  });
                }}
                style={{
                  background: '#ff003c',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  letterSpacing: '2px',
                  fontWeight: 'bold',
                  boxShadow: '0 0 12px rgba(255, 0, 60, 0.4)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = '0 0 20px rgba(255, 0, 60, 0.7)';
                  e.target.style.background = '#ff2a5b';
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = '0 0 12px rgba(255, 0, 60, 0.4)';
                  e.target.style.background = '#ff003c';
                }}
              >
                [ CONFIRM_PURGE ]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Radar;
