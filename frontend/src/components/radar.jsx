import React, { useState, useEffect } from 'react';

const Radar = () => {
  const [providers, setProviders] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // V8.3: UPDATED COUNCIL SEATS (Qwen-VL Multi-Vision & Stable IDs)
  const TARGET_PROVIDERS = ["openai", "google", "anthropic", "x-ai", "perplexity", "qwen"];

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/models');
        const data = await response.json();
        const grouped = {};
        
        TARGET_PROVIDERS.forEach(p => {
          const providerModels = data.data
            .filter(m => m.id.startsWith(p))
            .slice(0, 5); 
          
          const displayLabel = p === "qwen" ? "QWEN_VL" : p.toUpperCase();
          
          grouped[displayLabel] = providerModels.map(m => ({
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

  const customStyles = `
    @keyframes flashlight-pulse { 
      0%, 100% { background: rgba(2, 2, 4, 0.98); } 
      50% { background: rgba(10, 15, 25, 0.92); } 
    }
    .radar-card {
      background: #050508;
      border: 1px solid #1c1c22;
      border-radius: 4px;
      padding: 15px;
      margin-bottom: 15px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .radar-card:hover { 
      border-color: #00f2ff; 
      box-shadow: 0 0 15px rgba(0, 242, 255, 0.1); 
      transform: translateY(-2px); 
    }
    .qwen-accent { border-left: 3px solid #bc13fe; } /* Electric Purple accent */
  `;

  if (isLoading) return (
    <div style={{ position: 'fixed', top: '60px', left: '340px', right: 0, bottom: 0, background: '#020204', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00f2ff', fontFamily: 'monospace', letterSpacing: '5px' }}>
      SYNCHRONIZING_QWEN_VL_DATABASE...
    </div>
  );

  return (
    <div style={{ position: 'fixed', top: '60px', left: '340px', right: 0, bottom: 0, zIndex: 1000, overflowY: 'auto', backdropFilter: 'blur(10px)', animation: 'flashlight-pulse 8s infinite ease-in-out' }}>
      <style>{customStyles}</style>
      
      <div style={{ padding: '40px 60px 20px', textAlign: 'center' }}>
        <div style={{ color: '#00ff41', fontSize: '10px', letterSpacing: '8px', marginBottom: '10px', opacity: 0.6 }}>SYSTEM_STATUS: OMNISCIENT</div>
        <div style={{ color: '#fff', fontSize: '24px', fontWeight: '900', letterSpacing: '12px', textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>COUNCIL_RADAR_V8.3</div>
      </div>

      <div style={{ 
        padding: '20px 60px 60px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '40px',
        maxWidth: '1600px',
        margin: '0 auto' 
      }}>
        {Object.entries(providers).map(([provider, models]) => (
          <div key={provider} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ 
              color: provider === "QWEN_VL" ? "#bc13fe" : "#00f2ff", 
              fontSize: '13px', 
              fontWeight: '900', 
              letterSpacing: '4px', 
              marginBottom: '25px', 
              borderBottom: `1px solid ${provider === "QWEN_VL" ? "#bc13fe66" : "#00f2ff33"}`, 
              paddingBottom: '10px', 
              textAlign: 'center' 
            }}>
              {provider}
            </div>
            {models.map(m => (
              <div key={m.slug} className={`radar-card ${provider === "QWEN_VL" ? "qwen-accent" : ""}`}>
                <div style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>{m.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: provider === "QWEN_VL" ? "#bc13fe" : "#00f2ff", fontSize: '9px', opacity: 0.6, fontFamily: 'monospace' }}>{m.slug}</span>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(m.slug); alert('ID_COPIED'); }} 
                    style={{ background: 'transparent', border: `1px solid ${provider === "QWEN_VL" ? "#bc13fe66" : "#00f2ff44"}`, color: provider === "QWEN_VL" ? "#bc13fe" : "#00f2ff", fontSize: '8px', cursor: 'pointer', padding: '3px 8px' }}
                  >
                    COPY ID
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
export default Radar;