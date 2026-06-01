import React, { useState, useRef, useEffect } from 'react';
import Splash from './Splash';
import Radar from './Radar';
import sidebarLogo from '../assets/sidebar_logo.png';

const HudButton = ({ label, onClick, color = '#00f2ff', isActive = false }) => (
  <button 
    type="button"
    onClick={onClick} 
    style={{ 
      background: isActive ? `${color}22` : 'transparent', 
      color: isActive ? '#fff' : color, 
      border: `1px solid ${isActive ? color : color + '44'}`, 
      padding: '8px 20px', 
      fontSize: '11px', 
      cursor: 'pointer', 
      fontWeight: 'bold', 
      textTransform: 'uppercase', 
      letterSpacing: '2px',
      boxShadow: isActive ? `0 0 15px ${color}55, inset 0 0 10px ${color}22` : 'none',
      transition: 'all 0.2s',
      whiteSpace: 'nowrap',
      borderRadius: '2px'
    }}
  >
    [ {label} ]
  </button>
);

const NeuralTimer = ({ timers = {}, loading = {} }) => {
  const [elapsed, setElapsed] = useState("00:00.0");

  useEffect(() => {
    let interval;
    if (loading.stage1 || loading.stage2 || loading.stage3) {
      interval = setInterval(() => {
        const diff = (Date.now() - (timers.start || Date.now())) / 1000;
        setElapsed(diff.toFixed(1) + "s");
      }, 100);
    }
    return () => clearInterval(interval);
  }, [loading, timers.start]);

  const getStageTime = (start, end) => {
    if (!start) return "[ PENDING ]";
    if (!end) return "[ IN_PROGRESS ]";
    return ((end - start) / 1000).toFixed(1) + "s";
  };

  const displayTotal = timers.total ? `${timers.total.toFixed(1)}s` : elapsed;

  return (
    <div style={{ background: '#0a0a0f', border: '1px solid #1c1c22', padding: '20px', marginTop: '15px', fontFamily: 'monospace', fontSize: '11px', color: '#00f2ff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #00f2ff33', paddingBottom: '5px' }}>
        <span style={{ fontWeight: 'bold' }}>NEURAL_PROCESSING_MONITOR</span>
        <span style={{ color: '#00ff41' }}>TOTAL_ELAPSED: {displayTotal}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        <div>STAGE_1 (INDEPENDENT): <span style={{ color: loading.stage1 ? '#00ff41' : '#fff' }}>{getStageTime(timers.s1_start, timers.s1_end)}</span></div>
        <div>STAGE_2 (PEER_REVIEW): <span style={{ color: loading.stage2 ? '#00ff41' : '#fff' }}>{getStageTime(timers.s2_start, timers.s2_end)}</span></div>
        <div>STAGE_3 (SYNTHESIS): <span style={{ color: loading.stage3 ? '#00ff41' : '#fff' }}>{getStageTime(timers.s3_start, timers.s3_end)}</span></div>
      </div>
    </div>
  );
};

const shortModelName = (model = 'UNKNOWN') => {
  const cleaned = String(model).split('/').pop() || String(model);
  return cleaned.replace(/[-_:]/g, ' ').toUpperCase();
};

const getStageStatus = (assistant, key) => {
  if (assistant?.loading?.[key]) return 'ACTIVE';
  if (assistant?.[key]) return 'LOCKED';
  return 'PENDING';
};

const getConversationStats = (conversation) => {
  const messages = conversation?.messages || [];
  const userTurns = messages.filter(msg => msg.role === 'user').length;
  const assistantTurns = messages.filter(msg => msg.role === 'assistant').length;
  const latestAssistant = [...messages].reverse().find(msg => msg.role === 'assistant') || null;
  const stage1Count = Array.isArray(latestAssistant?.stage1) ? latestAssistant.stage1.length : 0;
  const stage2Count = Array.isArray(latestAssistant?.stage2) ? latestAssistant.stage2.length : 0;
  const stage3Ready = Boolean(latestAssistant?.stage3 || latestAssistant?.content);
  return { messages, userTurns, assistantTurns, latestAssistant, stage1Count, stage2Count, stage3Ready };
};

const MissionHeader = ({ conversation, intelligenceTier, visualEngine, isLoading, briefingMode, setBriefingMode, setShowCommandPalette, setShowDossierPreview }) => {
  const stats = getConversationStats(conversation);
  const title = conversation?.title || (conversation?.id ? 'ACTIVE DELIBERATION' : 'NO ACTIVE SESSION');
  const sessionId = conversation?.id && conversation.id !== 'new' ? conversation.id.slice(0, 8).toUpperCase() : 'UNASSIGNED';
  const readiness = stats.stage3Ready ? 'DOSSIER_READY' : isLoading ? 'COUNCIL_ACTIVE' : stats.messages.length ? 'ANALYSIS_HELD' : 'STANDBY';

  return (
    <div className="mission-header">
      <div className="mission-title-block">
        <div className="mission-eyebrow">COMMAND_MODULE // V12.0 ARBITER</div>
        <div className="mission-title">{title.toUpperCase()}</div>
      </div>
      <div className="mission-status-grid">
        <div><span>SESSION</span>{sessionId}</div>
        <div><span>TIER</span>{intelligenceTier.toUpperCase()}</div>
        <div><span>COUNCIL</span>{stats.stage1Count || 'STBY'}</div>
        <div><span>PEERS</span>{stats.stage2Count || 'STBY'}</div>
        <div><span>ENGINE</span>{visualEngine === 'none' ? 'OFFLINE' : 'VISUAL_ON'}</div>
        <div className={isLoading ? 'status-hot' : ''}><span>STATE</span>{readiness}</div>
      </div>
      <div className="mission-actions">
        <button type="button" onClick={() => setBriefingMode(!briefingMode)}>{briefingMode ? 'EXIT_BRIEF' : 'BRIEFING'}</button>
        <button type="button" onClick={() => setShowDossierPreview(true)}>DOSSIER</button>
        <button type="button" onClick={() => setShowCommandPalette(true)}>CMD</button>
      </div>
    </div>
  );
};

const DeliberationCore = ({ assistant }) => {
  if (!assistant) return null;
  const stages = [
    { key: 'stage1', label: 'S1', name: 'INDEPENDENT' },
    { key: 'stage2', label: 'S2', name: 'PEER REVIEW' },
    { key: 'stage3', label: 'S3', name: 'SYNTHESIS' }
  ];
  const active = assistant.loading?.stage1 || assistant.loading?.stage2 || assistant.loading?.stage3;
  if (!active && !assistant.stage1) return null;

  return (
    <div className={`deliberation-core ${active ? 'core-active' : ''}`}>
      <div className="core-rings">
        {stages.map((stage, index) => (
          <div key={stage.key} className={`core-ring core-ring-${index + 1} core-${getStageStatus(assistant, stage.key).toLowerCase()}`}>
            <span>{stage.label}</span>
          </div>
        ))}
        <div className="core-center">COUNCIL</div>
      </div>
      <div className="core-stage-readout">
        {stages.map(stage => (
          <div key={stage.key}>
            <span>{stage.name}</span>
            <strong>{getStageStatus(assistant, stage.key)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const PeerReviewMatrix = ({ data }) => {
  if (!Array.isArray(data) || data.length === 0) return null;
  const rows = data.map((item, index) => ({
    reviewer: shortModelName(item.model || `REVIEWER ${index + 1}`),
    ranking: item.parsed_ranking || item.parsedRanking || []
  })).filter(row => row.ranking.length);

  if (!rows.length) return null;
  const columns = [...new Set(rows.flatMap(row => row.ranking))];

  return (
    <div className="war-room-matrix">
      <div className="matrix-title">PEER REVIEW WAR ROOM // ANONYMIZED RANK MATRIX</div>
      <div className="matrix-grid" style={{ gridTemplateColumns: `minmax(140px, 1.2fr) repeat(${columns.length}, minmax(70px, .7fr))` }}>
        <div className="matrix-cell matrix-head">REVIEWER</div>
        {columns.map(col => <div key={col} className="matrix-cell matrix-head">{col.replace('Response ', 'RESP_')}</div>)}
        {rows.map(row => (
          <React.Fragment key={row.reviewer}>
            <div className="matrix-cell matrix-reviewer">{row.reviewer}</div>
            {columns.map(col => {
              const rank = row.ranking.indexOf(col);
              return <div key={`${row.reviewer}-${col}`} className={rank === 0 ? 'matrix-cell matrix-win' : 'matrix-cell'}>{rank >= 0 ? `#${rank + 1}` : '-'}</div>;
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const CinematicStage = ({ title, data, color }) => {
  const [activeModel, setActiveModel] = useState('');

  let parsedData = {};
  let chairmanId = "ARBITER";

  if (typeof data === 'string') {
    parsedData['RESPONSE'] = data;
  } else if (Array.isArray(data)) {
    data.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        const modelName = item.model || `MODEL_AGENT_${index + 1}`;
        parsedData[modelName] = item.response || JSON.stringify(item);
      } else {
        parsedData[`RESPONSE_${index + 1}`] = String(item);
      }
    });
  } else if (typeof data === 'object' && data !== null) {
    if (data.response && Object.keys(data).length <= 4) {
      chairmanId = data.model || 'ARBITER';
      parsedData[chairmanId] = data.response;
    } else {
      Object.entries(data).forEach(([key, val]) => {
        if (typeof val === 'string') parsedData[key] = val;
        else if (val && val.response) {
          const modelName = val.model || key;
          parsedData[modelName] = val.response;
        } else {
          parsedData[key] = JSON.stringify(val);
        }
      });
    }
  }

  const models = Object.keys(parsedData);
  useEffect(() => {
    if (models.length > 0 && !activeModel) setActiveModel(models[0]);
  }, [models]);

  if (models.length === 0) return null;

  const rawText = parsedData[activeModel] || "";

  const suggestionRegex = /(?:\[\s*)?SUGGESTED PROMPT IMPROVEMENT(?:\]|:)\s*([\s\S]*?)(?=<hr\/>|<h3>|<\/br>|$)/i;
  const suggestionMatch = rawText.match(suggestionRegex);
  
  let mainContent = rawText;
  let suggestionContent = null;

  if (suggestionMatch) {
      suggestionContent = suggestionMatch[1].trim();
      mainContent = rawText.replace(suggestionMatch[0], '').trim();
  }
  
  const formatTextWithThumbnails = (text) => {
    if (typeof text !== 'string') return text;
    
    let formattedText = text.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    
    const processImages = (str) => {
      let cleanStr = str
        .replace(/<hr\/>/g, '\n───────────────────────────────────────────\n')
        .replace(/<br\/>/g, '\n')
        .replace(/<h3>(.*?)<\/h3>/g, '\n[ $1 ]\n')
        .replace(/^#{1,4}\s+(.*)$/gm, '\n[ $1 ]\n')
        // V12.1: Intercept Markdown images and convert them to HTML for the parser
        .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, "<img src='$2' alt='$1'/>");

      const imgParts = cleanStr.split(/(<img src='[^']+'[^>]*\/>)/g);
      
      return imgParts.map((part, i) => {
        const match = part.match(/<img src='([^']+)'/);
        if (match) {
          return (
            <img 
              key={`img-${i}`} 
              src={match[1]} 
              alt="Generated Asset" 
              style={{ 
                display: 'block', 
                maxWidth: '100%', 
                borderRadius: '8px', 
                margin: '20px 0', 
                border: `1px solid ${color}44`, 
                boxShadow: `0 0 20px ${color}22` 
              }} 
            />
          );
        }
        return part;
      });
    };

    const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
    const parts = formattedText.split(ytRegex);
    
    if (parts.length === 1) return processImages(formattedText);

    return parts.map((part, index) => {
      if (index % 2 !== 0) {
        const videoId = part;
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        return (
          <a key={index} href={videoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', margin: '15px 0' }}>
            <div style={{ position: 'relative', display: 'inline-block', border: `1px solid ${color}`, borderRadius: '4px', overflow: 'hidden', boxShadow: `0 0 15px ${color}44`, transition: 'all 0.2s' }} className="yt-thumbnail-hover">
              <img src={thumbnailUrl} alt="YouTube Video Thumbnail" style={{ display: 'block', maxWidth: '300px', width: '100%' }} />
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <div style={{ width: '40px', height: '30px', background: '#ff0000', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '10px solid white' }}></div>
                 </div>
              </div>
            </div>
          </a>
        );
      }
      return <span key={index}>{processImages(part)}</span>;
    });
  };

  return (
    <div style={{ marginBottom: '20px', border: `1px solid ${color}44`, background: '#050508', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ background: `${color}15`, padding: '10px 15px', borderBottom: `1px solid ${color}44`, color: color, fontSize: '10px', fontWeight: 'bold', letterSpacing: '2px', display: 'flex', justifyContent: 'space-between' }}>
        <span>{title}</span>
        {models.length === 1 && <span>{chairmanId.toUpperCase()}</span>}
      </div>
      {models.length > 1 && (
        <div className="agent-chip-row">
          {models.map(model => (
            <button
              key={model}
              onClick={() => setActiveModel(model)}
              className={`agent-chip ${activeModel === model ? 'active' : ''}`}
            >
              <span>{shortModelName(model)}</span>
              <small>LOCKED // {String(parsedData[model] || '').length}B</small>
            </button>
          ))}
        </div>
      )}
      {title.includes('PEER REVIEW') && <PeerReviewMatrix data={Array.isArray(data) ? data : []} />}
      <div style={{ padding: '25px', color: '#e0e0e0', fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
        {formatTextWithThumbnails(mainContent)}
        
        {suggestionContent && (
          <div style={{ 
            background: 'rgba(255, 176, 0, 0.05)', 
            borderLeft: '3px solid #ffb000', 
            padding: '15px 20px', 
            marginTop: '25px', 
            fontFamily: 'monospace', 
            fontSize: '13px', 
            color: '#ffb000',
            boxShadow: '0 0 15px rgba(255, 176, 0, 0.1)'
          }}>
            <div style={{ fontWeight: '900', letterSpacing: '2px', marginBottom: '8px' }}>[ SUGGESTED PROMPT IMPROVEMENT ]</div>
            <div style={{ opacity: 0.9 }}>{suggestionContent}</div>
          </div>
        )}
      </div>
    </div>
  );
};

const stripOperatorOverride = (text = '') => String(text).split("\n\n[ OVERRIDE:")[0].trim();

const cleanPrintableText = (text = '') => String(text)
  .replace(/<img[^>]*>/g, '[ Visual asset omitted from print dossier ]')
  .replace(/<hr\/>/g, '\n')
  .replace(/<br\/>/g, '\n')
  .replace(/<h3>(.*?)<\/h3>/g, '\n$1\n')
  .replace(/^#{1,6}\s+/gm, '')
  .replace(/\*\*(.*?)\*\*/g, '$1')
  .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '[ Visual asset: $1 ]')
  .replace(/\\n/g, '\n')
  .replace(/\\"/g, '"')
  .trim();

const getPrintableEntries = (data, fallbackLabel = 'RESPONSE') => {
  if (!data) return [];

  if (typeof data === 'string') {
    return [{ label: fallbackLabel, text: data }];
  }

  if (Array.isArray(data)) {
    return data.map((item, index) => ({
      label: item?.model || `${fallbackLabel}_${index + 1}`,
      text: item?.response || item?.ranking || JSON.stringify(item)
    }));
  }

  if (typeof data === 'object') {
    if (data.response) {
      return [{ label: data.model || fallbackLabel, text: data.response }];
    }
    return Object.entries(data).map(([key, value]) => ({
      label: value?.model || key,
      text: value?.response || value?.ranking || (typeof value === 'string' ? value : JSON.stringify(value))
    }));
  }

  return [{ label: fallbackLabel, text: String(data) }];
};

const PrintSection = ({ title, tone = 'cyan', entries }) => {
  if (!entries?.length) return null;

  return (
    <section className={`print-section print-section-${tone}`}>
      <div className="print-section-header">
        <span>{title}</span>
        <span>CONTROLLED COPY</span>
      </div>
      {entries.map((entry, index) => (
        <article className="print-entry" key={`${title}-${entry.label}-${index}`}>
          <div className="print-entry-label">{entry.label}</div>
          <pre className="print-entry-body">{cleanPrintableText(entry.text)}</pre>
        </article>
      ))}
    </section>
  );
};

const PrintDossier = ({ conversation, tier = 'pro' }) => {
  const messages = conversation?.messages || [];
  if (!messages.length) return null;

  const firstPrompt = stripOperatorOverride(messages.find(msg => msg.role === 'user')?.content || 'NO ACTIVE INQUIRY REGISTERED');
  const title = conversation?.title || 'UNNAMED SESSION';
  const extracted = new Date().toLocaleString();
  const caseId = Array.from(title).reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) >>> 0, 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 8);

  return (
    <div className="print-dossier" aria-hidden="true">
      <section className="print-cover">
        <div className="print-cover-border">
          <div className="print-cover-meta">
            <div><span>No:</span> COUNCIL-{caseId}</div>
            <div><span>Tier:</span> {tier.toUpperCase()}</div>
          </div>
          <div className="print-stamp print-stamp-top">TOP SECRET</div>
          <div className="print-stamp print-stamp-eye">EYES ONLY</div>
          <h1>CLASSIFIED</h1>
          <div className="print-cover-subtitle">LLM COUNCIL // PRINT DOSSIER</div>
          <div className="print-restriction-box">
            <div>ALL INTELLIGENCE, RANKINGS, REASONING, AND SYNTHESIS ARE RESTRICTED</div>
            <strong>SESSION TITLE: {title.toUpperCase()}</strong>
          </div>
          <img className="print-cover-logo" src={sidebarLogo} alt="Council seal" />
          <div className="print-prompt-label">/// TARGET INQUIRY SIGNAL DIRECTIVE ///</div>
          <div className="print-prompt-box">{firstPrompt}</div>
          <div className="print-cover-footer">
            <span>EXTRACTED: {extracted}</span>
            <span>WHITE-STOCK FIELD COPY</span>
          </div>
        </div>
      </section>

      {messages.map((msg, index) => {
        if (msg.role === 'user') {
          return (
            <PrintSection
              key={`print-user-${index}`}
              title="UPLINK INITIATED: USER OVERRIDE"
              tone="gold"
              entries={[{ label: 'OPERATOR QUERY', text: stripOperatorOverride(msg.content) }]}
            />
          );
        }

        if (msg.role === 'assistant') {
          return (
            <React.Fragment key={`print-assistant-${index}`}>
              <PrintSection title="STAGE 1: INDEPENDENT ANALYSIS" tone="cyan" entries={getPrintableEntries(msg.stage1, 'COUNCIL_AGENT')} />
              <PrintSection title="STAGE 2: PEER REVIEW & CRITIQUE" tone="red" entries={getPrintableEntries(msg.stage2, 'PEER_REVIEW')} />
              <PrintSection title="STAGE 3: FINAL SYNTHESIS" tone="black" entries={getPrintableEntries(msg.stage3 || msg.content, 'ARBITER')} />
            </React.Fragment>
          );
        }

        return null;
      })}
    </div>
  );
};

const CommandPalette = ({ open, onClose, commands }) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  if (!open) return null;
  const filtered = commands.filter(cmd => `${cmd.label} ${cmd.meta}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="command-palette-backdrop" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="palette-header">
          <span>COMMAND PALETTE</span>
          <button type="button" onClick={onClose}>CLOSE</button>
        </div>
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="TYPE COMMAND..." />
        <div className="palette-list">
          {filtered.map(cmd => (
            <button key={cmd.label} type="button" onClick={() => { cmd.run(); onClose(); }}>
              <span>{cmd.label}</span>
              <small>{cmd.meta}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const DossierPreview = ({ open, onClose, conversation, tier, onExport }) => {
  if (!open) return null;
  const stats = getConversationStats(conversation);
  const prompt = stripOperatorOverride(stats.messages.find(msg => msg.role === 'user')?.content || 'NO ACTIVE INQUIRY REGISTERED');
  const estimatedPages = Math.max(2, 1 + stats.userTurns + stats.stage1Count + stats.stage2Count + (stats.stage3Ready ? 1 : 0));

  return (
    <div className="dossier-preview-backdrop" onClick={onClose}>
      <div className="dossier-preview" onClick={(e) => e.stopPropagation()}>
        <div className="preview-cover-card">
          <div className="preview-stamp">TOP SECRET</div>
          <img src={sidebarLogo} alt="Council seal" />
          <strong>CLASSIFIED</strong>
          <span>COUNCIL DOSSIER // {tier.toUpperCase()}</span>
        </div>
        <div className="preview-control-panel">
          <div className="preview-header">
            <span>DOSSIER PREVIEW</span>
            <button type="button" onClick={onClose}>CLOSE</button>
          </div>
          <div className="preview-title">{(conversation?.title || 'UNNAMED SESSION').toUpperCase()}</div>
          <p>{prompt}</p>
          <div className="preview-stats">
            <div><span>PAGES</span>{estimatedPages}</div>
            <div><span>STAGE 1</span>{stats.stage1Count}</div>
            <div><span>STAGE 2</span>{stats.stage2Count}</div>
            <div><span>FINAL</span>{stats.stage3Ready ? 'READY' : 'PENDING'}</div>
          </div>
          <div className="preview-actions">
            <button type="button" onClick={() => { onExport('pdf'); onClose(); }}>EXPORT PDF</button>
            <button type="button" onClick={() => { window.print(); onClose(); }}>PRINT FIELD COPY</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatInterface = ({ conversation, onSendMessage, onClearHistory, isLoading, splashKey, onOpenMobileSidebar, showRadar, setShowRadar, visualEngine, setVisualEngine }) => {
  const [inputValue, setInputValue] = useState('');
  const [intelligenceTier, setIntelligenceTier] = useState('pro');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showDossierPreview, setShowDossierPreview] = useState(false);
  const [briefingMode, setBriefingMode] = useState(false);
  const [stagedFiles, setStagedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false); 
  
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  const API_BASE = 'http://localhost:5000';

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [conversation?.messages, isLoading]);

  useEffect(() => {
    const handleKeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowDossierPreview(false);
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  const isSplash = (!conversation || conversation.id === undefined);
  const isUplinkEstablished = (conversation && (!conversation.messages || conversation.messages.length === 0) && !isLoading);
  const CONSOLE_HEIGHT = '110px';

  const addFilesToStage = (newFiles) => {
    const files = Array.from(newFiles);
    setStagedFiles(prev => [...prev, ...files]);
  };

  const handleFileChange = (e) => addFilesToStage(e.target.files);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToStage(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const removeStagedFile = (indexToRemove) => {
    setStagedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() && stagedFiles.length === 0) return;
    if (onSendMessage) onSendMessage(inputValue, stagedFiles, intelligenceTier, visualEngine);
    setInputValue('');
    setStagedFiles([]);
  };

  const triggerExport = async (format) => {
    if (!conversation?.messages?.length) return alert("NO_DATA_TO_EXTRACT");
    const coverPrompt = conversation.messages.find(msg => msg.role === 'user')?.content?.split("\n\n[ OVERRIDE:")?.[0]?.trim() || "";
    try {
      const response = await fetch(`${API_BASE}/api/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: format,
          title: conversation.title || "UNNAMED_SESSION",
          messages: conversation.messages,
          cover_prompt: coverPrompt,
          tier: intelligenceTier
        })
      });
      if (!response.ok) throw new Error("UPLINK_TIMEOUT");
      
      // V12.1: Route Email specifically so it doesn't trigger a file download crash
      if (format === 'email') {
        alert("TRANSMISSION SUCCESSFUL: Dossier queued for secure email dispatch.");
        setShowExportMenu(false);
        return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `LOG_${conversation.title?.replace(/\s+/g, '_')}.${format}`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      setShowExportMenu(false);
    } catch (err) {
      alert("EXPORT_PROTOCOL_CRITICAL_FAILURE: Backend unreachable.");
    }
  };

  const stats = getConversationStats(conversation);
  const latestAssistant = stats.latestAssistant;
  const commands = [
    { label: 'Open System Radar', meta: 'MODEL ROSTER // CAPACITY', run: () => setShowRadar(true) },
    { label: briefingMode ? 'Exit Briefing Mode' : 'Enter Briefing Mode', meta: 'FOCUS READING SURFACE', run: () => setBriefingMode(prev => !prev) },
    { label: 'Preview Dossier', meta: 'EXPORT // PRINT CONTROL', run: () => setShowDossierPreview(true) },
    { label: 'Export PDF Dossier', meta: 'CINEMATIC MANILA FILE', run: () => triggerExport('pdf') },
    { label: 'Print Field Copy', meta: 'LOW INK WHITE STOCK', run: () => window.print() },
    { label: visualEngine === 'none' ? 'Enable Visual Engine' : 'Disable Visual Engine', meta: 'DALL-E IMAGE HANDOFF', run: () => setVisualEngine(prev => prev === 'dall-e-3' ? 'none' : 'dall-e-3') }
  ];

  return (
    <div className={`chat-interface ${briefingMode ? 'briefing-mode' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#020204', position: 'relative', overflow: 'hidden' }}>
      <PrintDossier conversation={conversation} tier={intelligenceTier} />
      <CommandPalette open={showCommandPalette} onClose={() => setShowCommandPalette(false)} commands={commands} />
      <DossierPreview open={showDossierPreview} onClose={() => setShowDossierPreview(false)} conversation={conversation} tier={intelligenceTier} onExport={triggerExport} />
      
      <style>
        {`
          @keyframes systemBoot {
            0% { transform: scale(0.98) translateY(10px); opacity: 0; filter: brightness(2) contrast(1.5); }
            5% { opacity: 1; filter: brightness(1.5) contrast(1.2); box-shadow: 0 0 50px rgba(0, 242, 255, 0.4); }
            10% { opacity: 0.4; }
            15% { opacity: 1; transform: scale(1) translateY(0); filter: brightness(1) contrast(1); box-shadow: 0 0 30px rgba(0, 242, 255, 0.1); }
            100% { transform: scale(1) translateY(0); opacity: 1; box-shadow: 0 0 30px rgba(0, 242, 255, 0.1); }
          }
          @keyframes scanlineSweep {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(600px); }
          }
          .console-drop-zone {
            transition: all 0.3s ease;
            box-shadow: ${isDragging ? '0 0 30px rgba(0, 242, 255, 0.4) inset' : 'none'};
            border-top: ${isDragging ? '2px solid #00f2ff' : '1px solid #1c1c22'};
          }
          .tech-input:focus {
            box-shadow: inset 0 0 20px rgba(0, 242, 255, 0.05);
            border-color: rgba(0, 242, 255, 0.4) !important;
          }
        `}
      </style>

      <MissionHeader
        conversation={conversation}
        intelligenceTier={intelligenceTier}
        visualEngine={visualEngine}
        isLoading={isLoading}
        briefingMode={briefingMode}
        setBriefingMode={setBriefingMode}
        setShowCommandPalette={setShowCommandPalette}
        setShowDossierPreview={setShowDossierPreview}
      />

      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {showRadar && <Radar onClose={() => setShowRadar(false)} />}
        {!isSplash && latestAssistant && <DeliberationCore assistant={latestAssistant} />}
        {isSplash ? <Splash key={splashKey} onOpenMobileSidebar={onOpenMobileSidebar} /> : isUplinkEstablished ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            
            <form 
              className="briefing-injector" 
              onSubmit={handleSubmit} 
              style={{ 
                animation: 'systemBoot 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards', 
                border: '1px solid rgba(0, 242, 255, 0.15)', 
                background: 'linear-gradient(135deg, rgba(5,5,8,0.95) 0%, rgba(10,14,20,0.95) 100%)',
                backdropFilter: 'blur(10px)',
                borderRadius: '8px', 
                padding: '45px 50px', 
                width: '100%', 
                maxWidth: '900px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '15px',
                zIndex: 10,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, width: '30px', height: '30px', borderTop: '2px solid rgba(0, 242, 255, 0.6)', borderLeft: '2px solid rgba(0, 242, 255, 0.6)' }}></div>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '30px', height: '30px', borderTop: '2px solid rgba(0, 242, 255, 0.6)', borderRight: '2px solid rgba(0, 242, 255, 0.6)' }}></div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '30px', height: '30px', borderBottom: '2px solid rgba(0, 242, 255, 0.6)', borderLeft: '2px solid rgba(0, 242, 255, 0.6)' }}></div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '30px', height: '30px', borderBottom: '2px solid rgba(0, 242, 255, 0.6)', borderRight: '2px solid rgba(0, 242, 255, 0.6)' }}></div>

              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '15px', background: 'linear-gradient(to bottom, transparent, rgba(0, 242, 255, 0.1), transparent)', animation: 'scanlineSweep 4s linear infinite', zIndex: 1, pointerEvents: 'none' }}></div>

              <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div>
                  <div style={{ color: '#00f2ff', fontSize: '18px', fontWeight: 'bold', letterSpacing: '8px', textAlign: 'center', marginBottom: '15px', textShadow: '0 0 15px rgba(0, 242, 255, 0.4)' }}>
                    SECURE_UPLINK_ESTABLISHED
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                    {['fast', 'pro', 'omega', 'god'].map(tier => (
                      <HudButton key={tier} label={`TIER-${tier.toUpperCase()}`} isActive={intelligenceTier === tier} onClick={() => setIntelligenceTier(tier)} />
                    ))}
                  </div>
                </div>
                
                {stagedFiles.length > 0 && (
                  <div style={{ display: 'flex', gap: '15px', padding: '15px', background: 'rgba(10, 10, 15, 0.8)', border: '1px solid rgba(28, 28, 34, 0.8)', borderRadius: '4px' }}>
                    {stagedFiles.map((file, idx) => {
                      const isImage = file.type.startsWith('image/');
                      return (
                        <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', background: '#111', borderRadius: '4px', border: '1px solid #00f2ff44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isImage ? (
                            <img src={URL.createObjectURL(file)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                          ) : (
                            <div style={{ color: '#00f2ff', fontSize: '10px', textAlign: 'center', wordBreak: 'break-all', padding: '5px' }}>{file.name.substring(0, 8)}...</div>
                          )}
                          <button type="button" onClick={() => removeStagedFile(idx)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ff3e3e', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>X</button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <textarea 
                  className="tech-input"
                  value={inputValue} 
                  onChange={(e) => setInputValue(e.target.value)} 
                  placeholder="Enter initial briefing protocol..."
                  rows={4}
                  style={{ 
                    width: '100%',
                    background: 'rgba(2, 2, 4, 0.7)', 
                    color: '#fff', 
                    border: '1px solid rgba(28, 28, 34, 0.8)', 
                    padding: '25px', 
                    fontFamily: 'monospace', 
                    fontSize: '16px', 
                    resize: 'vertical', 
                    outline: 'none', 
                    borderRadius: '4px',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box',
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
                  }} 
                />
                
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '5px' }}>
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current.click()} 
                    style={{ 
                      background: 'rgba(0, 242, 255, 0.05)', 
                      color: '#00f2ff', 
                      border: '1px solid rgba(0, 242, 255, 0.3)', 
                      padding: '0 30px', 
                      height: '45px',
                      fontSize: '12px', 
                      fontWeight: 'bold', 
                      letterSpacing: '2px', 
                      cursor: 'pointer', 
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      whiteSpace: 'nowrap',
                      boxShadow: 'inset 0 0 10px rgba(0,242,255,0.05)',
                      borderRadius: '2px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(0, 242, 255, 0.1)';
                      e.target.style.boxShadow = '0 0 15px rgba(0,242,255,0.2), inset 0 0 15px rgba(0,242,255,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(0, 242, 255, 0.05)';
                      e.target.style.boxShadow = 'inset 0 0 10px rgba(0,242,255,0.05)';
                    }}
                  >
                    [ ATTACH_DATA ]
                  </button>
                  
                  <button 
                    type="submit" 
                    style={{ 
                      background: 'linear-gradient(90deg, #ffb000, #ff8c00)', 
                      color: '#050508', 
                      border: '1px solid #ffe600', 
                      padding: '0 40px', 
                      height: '45px',
                      fontSize: '13px', 
                      fontWeight: '900', 
                      letterSpacing: '3px', 
                      cursor: 'pointer', 
                      boxShadow: '0 0 20px rgba(255, 176, 0, 0.3)', 
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      whiteSpace: 'nowrap',
                      borderRadius: '2px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.boxShadow = '0 0 35px rgba(255, 176, 0, 0.6)';
                      e.target.style.transform = 'scale(1.02)';
                      e.target.style.filter = 'brightness(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.boxShadow = '0 0 20px rgba(255, 176, 0, 0.3)';
                      e.target.style.transform = 'scale(1)';
                      e.target.style.filter = 'brightness(1)';
                    }}
                  >
                    [ INITIATE_UPLINK ]
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="messages-area" ref={scrollRef} style={{ flex: 1, padding: '50px', overflowY: 'auto' }}>
            {conversation?.messages?.map((msg, i) => (
              <div key={i} style={{ marginBottom: '60px' }}>
                <div style={{ fontSize: '10px', opacity: 0.5, color: msg.role === 'user' ? '#fff' : '#00f2ff', letterSpacing: '3px', marginBottom: '15px' }}>
                  /// {msg.role.toUpperCase()}
                </div>
                
                {msg.attachments && (
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                    {msg.attachments.map((url, idx) => (
                      <img key={idx} src={url} alt="uplink attachment" style={{ width: '200px', border: '1px solid #00f2ff44', borderRadius: '4px', boxShadow: '0 0 15px rgba(0,242,255,0.1)' }} />
                    ))}
                  </div>
                )}

                {msg.role === 'user' ? (
                  <div style={{ color: '#fff', fontSize: '15px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </div>
                ) : (
                  <div>
                    {msg.stage1 && <CinematicStage title="STAGE 1: INDEPENDENT ANALYSIS" data={msg.stage1} color="#a0a0b0" />}
                    {msg.stage2 && <CinematicStage title="STAGE 2: PEER REVIEW & CRITIQUE" data={msg.stage2} color="#ffb000" />}
                    {(msg.stage3 || msg.content) && <CinematicStage title="STAGE 3: FINAL SYNTHESIS" data={msg.stage3 || msg.content} color="#00f2ff" />}
                  </div>
                )}

                {msg.role === 'assistant' && msg.timers && (msg.loading?.stage1 || msg.stage1) && (
                  <NeuralTimer timers={msg.timers} loading={msg.loading || {}} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {!isSplash && !isUplinkEstablished && (
        <div 
          className="console-wrapper console-drop-zone" 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ padding: '30px 40px 40px', background: '#050508', zIndex: 50 }}
        >
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {['fast', 'pro', 'omega', 'god'].map(tier => (
              <HudButton key={tier} label={`TIER-${tier.toUpperCase()}`} isActive={intelligenceTier === tier} onClick={() => setIntelligenceTier(tier)} />
            ))}
          </div>

        {stagedFiles.length > 0 && (
          <div style={{ display: 'flex', gap: '15px', padding: '15px', background: '#0a0a0f', border: '1px solid #1c1c22', borderBottom: 'none', borderRadius: '4px 4px 0 0' }}>
            {stagedFiles.map((file, idx) => {
              const isImage = file.type.startsWith('image/');
              return (
                <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', background: '#111', borderRadius: '4px', border: '1px solid #00f2ff44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isImage ? (
                    <img src={URL.createObjectURL(file)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                  ) : (
                    <div style={{ color: '#00f2ff', fontSize: '10px', textAlign: 'center', wordBreak: 'break-all', padding: '5px' }}>{file.name.substring(0, 8)}...</div>
                  )}
                  <button 
                    type="button" 
                    onClick={() => removeStagedFile(idx)} 
                    style={{ 
                      position: 'absolute', 
                      top: '-8px', 
                      right: '-8px', 
                      background: '#ff3e3e', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '50%', 
                      width: '18px', 
                      height: '18px', 
                      fontSize: '10px', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: 'bold' 
                    }}
                  >
                    X
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '15px', alignItems: 'stretch' }}>
          <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
          
          <button 
            type="button"
            onClick={() => fileInputRef.current.click()}
            style={{ 
              background: stagedFiles.length > 0 ? '#00ff4122' : '#0a0a0f', 
              border: `1px solid ${stagedFiles.length > 0 ? '#00ff41' : '#1c1c22'}`, 
              color: stagedFiles.length > 0 ? '#00ff41' : '#00f2ff', 
              width: '70px', 
              height: CONSOLE_HEIGHT, 
              fontSize: stagedFiles.length > 0 ? '36px' : '24px', 
              fontWeight: stagedFiles.length > 0 ? '900' : 'normal',
              cursor: 'pointer',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              textShadow: stagedFiles.length > 0 ? '0 0 15px rgba(0,255,65,0.6)' : 'none',
              transition: 'all 0.3s'
            }}
          > 
            {stagedFiles.length > 0 ? stagedFiles.length : '+'} 
          </button>

          <textarea 
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)} 
            placeholder={isDragging ? "RELEASE_TO_INTAKE_DATA" : `Neural input for ${intelligenceTier.toUpperCase()} tier...`}
            style={{ 
              flex: 1, 
              background: isDragging ? '#001111' : '#000', 
              color: '#fff', 
              border: '1px solid #1c1c22', 
              padding: '20px', 
              fontFamily: 'monospace', 
              fontSize: '14px', 
              height: CONSOLE_HEIGHT, 
              resize: 'none', 
              outline: 'none', 
              borderRadius: stagedFiles.length > 0 ? '0 0 4px 4px' : '4px',
              transition: 'background 0.3s ease'
            }} 
          />

          <button 
            type="submit" 
            style={{ 
              width: '200px', 
              height: CONSOLE_HEIGHT, 
              background: '#00f2ff', 
              color: '#000', 
              border: 'none', 
              fontWeight: '900', 
              letterSpacing: '3px', 
              cursor: 'pointer', 
              textTransform: 'uppercase', 
              boxShadow: '0 0 20px rgba(0,242,255,0.3)' 
            }}
          >
            TRANSMIT
          </button>
        </form>
      </div>
      )}
    </div>
  );
};

export default ChatInterface;
