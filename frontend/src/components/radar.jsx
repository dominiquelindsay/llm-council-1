import React, { useState, useEffect } from 'react';
import { useCouncil } from '../CouncilContext';

const Radar = () => {
  const { councilConfig, toggleTierMember, updateTierChairman } = useCouncil();
  const [providers, setProviders] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  
  // V11: Quarantine Persistent State
  const [quarantined, setQuarantined] = useState(() => {
    const saved = localStorage.getItem('quarantineList');
    return saved ? JSON.parse(saved) : [];
  });

  const TIERS = ['fast', 'pro', 'omega', 'god'];
  const TARGET_PROVIDERS = ["openai", "google", "anthropic", "x-ai", "perplexity", "qwen", "nvidia", "openrouter"];

  useEffect(() => {
    localStorage.setItem('quarantineList', JSON.stringify(quarantined));
  }, [quarantined]);

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
          
          const displayLabel = p === "qwen" ? "QWEN_VL" : p.toUpperCase();
          
          grouped[displayLabel] = providerModels.slice(0, 5).map(m => ({
            name: m.name.toUpperCase(),
            slug: m.id
          }));
        });
        setProviders(grouped);
        setIsLoading(false);
      } catch (error) {
        console.error("RADAR_SYNC_ERROR:", error);
        setIsLoading(false);
      }
    };
    fetchModels();
  }, []);

  const handleToggle = (tier, modelId) => {
    if (quarantined.includes(modelId)) {
      setToast("Cannot activate quarantined node.");
      setTimeout(() => setToast(null), 3500);
      return;
    }
    const res = toggleTierMember(tier, modelId);
    if (!res.success) {
      setToast(res.error);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const toggleQuarantine = (slug) => {
    setQuarantined(prev => {
      if (prev.includes(slug)) {
        return prev.filter(id => id !== slug);
      } else {
        return [...prev, slug];
      }
    });
  };

  const setGlobalArbiter = (slug) => {
    if (quarantined.includes(slug)) {
       setToast("Cannot assign Arbiter role to a quarantined node.");
       setTimeout(() => setToast(null), 3500);
       return;
    }
    TIERS.forEach(t => updateTierChairman(t, slug));
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
      border: 1px solid #1c1c22;
      border-radius: 4px;
      padding: 15px;
      margin-bottom: 15px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }
    .radar-card:hover { 
      border-color: #00f2ff; 
      box-shadow: 0 0 15px rgba(0, 242, 255, 0.1); 
      transform: translateY(-2px); 
    }
    .radar-card.active-in-tier {
      border-color: #bc13fe;
      box-shadow: 0 0 20px rgba(188, 19, 254, 0.2);
    }
    .radar-card.quarantined-card {
      border-color: #ff3e3e !important;
      background: #1a0505 !important;
      box-shadow: 0 0 15px rgba(255, 62, 62, 0.1) !important;
    }
    .quarantined-card .tier-radio-btn { opacity: 0.2; pointer-events: none; }
    
    .qwen-accent { border-left: 3px solid #bc13fe; }

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
  `;

  if (isLoading) return (
    <div style={{ position: 'fixed', top: '60px', left: '340px', right: 0, bottom: 0, background: '#020204', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00f2ff', fontFamily: 'monospace', letterSpacing: '5px' }}>
      SYNCHRONIZING_QWEN_VL_DATABASE...
    </div>
  );

  return (
    <div style={{ position: 'fixed', top: '60px', left: '340px', right: 0, bottom: 0, zIndex: 1000, overflowY: 'auto', backdropFilter: 'blur(10px)', animation: 'flashlight-pulse 8s infinite ease-in-out', paddingBottom: '100px' }}>
      <style>{customStyles}</style>

      {toast && (
        <div className="toast-notification">
          [ COMMAND ] {toast}
        </div>
      )}
      
      <div style={{ padding: '40px 60px 20px', textAlign: 'center' }}>
        <div style={{ color: '#00ff41', fontSize: '12px', letterSpacing: '8px', marginBottom: '10px', opacity: 0.6 }}>SYSTEM_STATUS: OMNISCIENT</div>
        <div style={{ color: '#fff', fontSize: '28px', fontWeight: '900', letterSpacing: '12px', textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>COUNCIL_RADAR_V11.0</div>
        
        {/* TIER FILTER HUD */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px' }}>
          {['ALL', 'FAST', 'PRO', 'OMEGA', 'GOD', 'ARBITER', 'QUARANTINE'].map(f => (
            <button 
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                background: activeFilter === f ? (f === 'QUARANTINE' ? 'rgba(255, 62, 62, 0.2)' : 'rgba(188, 19, 254, 0.2)') : 'transparent',
                color: activeFilter === f ? '#fff' : (f === 'QUARANTINE' ? '#ff3e3e' : '#00f2ff'),
                border: `1px solid ${activeFilter === f ? (f === 'QUARANTINE' ? '#ff3e3e' : '#bc13fe') : (f === 'QUARANTINE' ? '#ff3e3e44' : '#00f2ff44')}`,
                padding: '8px 20px',
                fontSize: '12px',
                fontWeight: 'bold',
                letterSpacing: '3px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeFilter === f ? (f === 'QUARANTINE' ? '0 0 15px rgba(255, 62, 62, 0.4)' : '0 0 15px rgba(188, 19, 254, 0.4)') : 'none'
              }}
            >
              [ {f} ]
            </button>
          ))}
        </div>

        {/* CAPACITY NODE MATRIX */}
        <div style={{ marginTop: '25px', height: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {(activeFilter === 'ALL' || activeFilter === 'ARBITER' || activeFilter === 'QUARANTINE') ? (
            <div style={{ color: '#00f2ff', fontSize: '12px', letterSpacing: '4px', opacity: 0.6, fontWeight: 'bold' }}>[ GLOBAL_VIEW ]</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: '#bc13fe', fontSize: '10px', letterSpacing: '3px', fontWeight: 'bold' }}>[ SEAT_ALLOCATION ]</div>
              <div style={{ display: 'flex', gap: '12px' }}>
                {[...Array(5)].map((_, i) => {
                  const currentTierCount = councilConfig[activeFilter.toLowerCase()].council.length;
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

      <div style={{ padding: '20px 60px', maxWidth: '95vw', margin: '0 auto' }}>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '40px'
        }}>
          {Object.entries(providers).map(([provider, models]) => (
            <div key={provider} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ 
                color: provider === "QWEN_VL" ? "#bc13fe" : "#00f2ff", 
                fontSize: '16px', 
                fontWeight: '900', 
                letterSpacing: '4px', 
                marginBottom: '25px', 
                borderBottom: `1px solid ${provider === "QWEN_VL" ? "#bc13fe66" : "#00f2ff33"}`, 
                paddingBottom: '10px', 
                textAlign: 'center' 
              }}>
                {provider}
              </div>
              {models.map(m => {
                const isActiveInAnyTier = TIERS.some(t => councilConfig[t].council.includes(m.slug));
                const isArbiterInAnyTier = TIERS.some(t => councilConfig[t].chairman === m.slug);
                const isQuarantined = quarantined.includes(m.slug);
                
                let cardOpacity = 0.3;
                if (activeFilter === 'ALL') {
                  cardOpacity = 1;
                } else if (activeFilter === 'ARBITER') {
                  if (isArbiterInAnyTier) cardOpacity = 1;
                } else if (activeFilter === 'QUARANTINE') {
                  if (isQuarantined) cardOpacity = 1;
                } else {
                  if (councilConfig[activeFilter.toLowerCase()].council.includes(m.slug)) cardOpacity = 1;
                }

                return (
                  <div key={m.slug} className={`radar-card ${provider === "QWEN_VL" ? "qwen-accent" : ""} ${isActiveInAnyTier ? 'active-in-tier' : ''} ${isQuarantined ? 'quarantined-card' : ''}`} style={{ opacity: cardOpacity }}>
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
                      <div style={{ color: provider === "QWEN_VL" ? "#bc13fe" : "#00f2ff", fontSize: '11px', opacity: 0.6, fontFamily: 'monospace' }}>
                        {m.slug}
                      </div>
                      <button 
                        className={`quarantine-btn ${isQuarantined ? 'restorer' : ''}`}
                        onClick={() => toggleQuarantine(m.slug)}
                      >
                        {isQuarantined ? 'RESTORE_NODE' : 'QUARANTINE'}
                      </button>
                    </div>

                    <div className="tier-radio-group">
                      {TIERS.map(t => {
                        const isActive = councilConfig[t].council.includes(m.slug);
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
    </div>
  );
};
export default Radar;