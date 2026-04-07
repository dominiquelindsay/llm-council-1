import React, { useState, useRef, useEffect } from 'react';
import Splash from './Splash';
import Radar from './Radar';

const HudButton = ({ label, onClick, color = '#00f2ff', isActive = false }) => (
  <button 
    onClick={onClick} 
    style={{ 
      background: isActive ? `${color}22` : 'transparent', 
      color: isActive ? '#fff' : color, 
      border: `1px solid ${isActive ? color : color + '44'}`, 
      padding: '5px 15px', 
      fontSize: '10px', 
      cursor: 'pointer', 
      fontWeight: 'bold', 
      textTransform: 'uppercase', 
      letterSpacing: '1px',
      boxShadow: isActive ? `0 0 10px ${color}44` : 'none',
      transition: 'all 0.2s'
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
  
  // V10.0: Multi-Media Parser (Handles Images & YouTube)
  const formatTextWithThumbnails = (text) => {
    if (typeof text !== 'string') return text;
    
    let formattedText = text.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    
    // Helper to extract <img> tags and format HTML backend artifacts
    const processImages = (str) => {
      let cleanStr = str
        .replace(/<hr\/>/g, '\n───────────────────────────────────────────\n')
        .replace(/<br\/>/g, '\n')
        .replace(/<h3>(.*?)<\/h3>/g, '\n[ $1 ]\n');

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

    // Regex to intercept YouTube links
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

  const formattedOutput = formatTextWithThumbnails(rawText);

  return (
    <div style={{ marginBottom: '20px', border: `1px solid ${color}44`, background: '#050508', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ background: `${color}15`, padding: '10px 15px', borderBottom: `1px solid ${color}44`, color: color, fontSize: '10px', fontWeight: 'bold', letterSpacing: '2px', display: 'flex', justifyContent: 'space-between' }}>
        <span>{title}</span>
        {models.length === 1 && <span>{chairmanId.toUpperCase()}</span>}
      </div>
      {models.length > 1 && (
        <div style={{ display: 'flex', borderBottom: '1px solid #1c1c22', background: '#0a0a0f', padding: '0 10px', overflowX: 'auto' }}>
          {models.map(model => (
            <button
              key={model}
              onClick={() => setActiveModel(model)}
              style={{
                padding: '12px 15px',
                background: 'transparent',
                color: activeModel === model ? '#ffb000' : '#666',
                border: 'none',
                borderBottom: activeModel === model ? '2px solid #ffb000' : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: activeModel === model ? 'bold' : 'normal',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {model.toUpperCase()}
            </button>
          ))}
        </div>
      )}
      <div style={{ padding: '25px', color: '#e0e0e0', fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
        {formattedOutput}
      </div>
    </div>
  );
};

const ChatInterface = ({ conversation, onSendMessage, onClearHistory, isLoading }) => {
  const [inputValue, setInputValue] = useState('');
  const [intelligenceTier, setIntelligenceTier] = useState('pro');
  const [showRadar, setShowRadar] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [stagedFiles, setStagedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false); 
  
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  const API_BASE = 'http://localhost:5000';

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [conversation?.messages, isLoading]);

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
    if (onSendMessage) onSendMessage(inputValue, stagedFiles, intelligenceTier);
    setInputValue('');
    setStagedFiles([]);
  };

  const triggerExport = async (format) => {
    if (!conversation?.messages?.length) return alert("NO_DATA_TO_EXTRACT");
    try {
      const response = await fetch(`${API_BASE}/api/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: format,
          title: conversation.title || "UNNAMED_SESSION",
          messages: conversation.messages,
          tier: intelligenceTier
        })
      });
      if (!response.ok) throw new Error("UPLINK_TIMEOUT");
      
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

  return (
    <div className="chat-interface" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#020204', position: 'relative', overflow: 'hidden' }}>
      
      <style>
        {`
          @keyframes coreBreathing {
            0% { opacity: 0.7; text-shadow: 0 0 15px rgba(0,255,65,0.4); letter-spacing: 14px; }
            50% { opacity: 1; text-shadow: 0 0 35px rgba(0,255,65,0.9), 0 0 60px rgba(0,255,65,0.4); letter-spacing: 16px; }
            100% { opacity: 0.7; text-shadow: 0 0 15px rgba(0,255,65,0.4); letter-spacing: 14px; }
          }
          .cinematic-pulse {
            animation: coreBreathing 4s infinite ease-in-out;
            transition: all 0.5s ease;
          }
          .console-drop-zone {
            transition: all 0.3s ease;
            box-shadow: ${isDragging ? '0 0 30px rgba(0, 242, 255, 0.4) inset' : 'none'};
            border-top: ${isDragging ? '2px solid #00f2ff' : '1px solid #1c1c22'};
          }
        `}
      </style>

      <div className="chat-header-bar" style={{ background: '#0e1217', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', borderBottom: '1px solid #1c1c22', zIndex: 100 }}>
        <div style={{ color: '#00f2ff', letterSpacing: '3px', fontSize: '11px', fontWeight: 'bold' }}>COMMAND_MODULE // V10.0 ARBITER</div>
        <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
          <HudButton label={showRadar ? "CLOSE_RADAR" : "SYSTEM_RADAR"} onClick={() => setShowRadar(!showRadar)} color={showRadar ? "#ff3e3e" : "#00f2ff"} />
          
          <div onMouseEnter={() => setShowExportMenu(true)} onMouseLeave={() => setShowExportMenu(false)} style={{ position: 'relative' }}>
            <HudButton label="EXPORT_DOSSIER" isActive={showExportMenu} />
            {showExportMenu && (
              <div style={{ position: 'absolute', top: '100%', left: 0, minWidth: '150px', paddingTop: '8px', zIndex: 200 }}>
                <div style={{ background: '#0e1217', border: '1px solid #00f2ff44', borderRadius: '4px', display: 'flex', flexDirection: 'column', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                  {['pdf', 'docx', 'txt'].map(fmt => (
                    <button 
                      key={fmt} 
                      onClick={() => triggerExport(fmt)} 
                      onMouseEnter={(e) => e.target.style.background = '#00f2ff22'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      style={{ background: 'transparent', color: '#00f2ff', border: 'none', padding: '12px 15px', fontSize: '10px', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #1c1c22', transition: 'background 0.2s', fontWeight: 'bold' }}
                    >
                      &gt; DOWNLOAD_.{fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <HudButton label="PRINT_DOSSIER" onClick={() => window.print()} />
          <HudButton label="PURGE_HISTORY" color="#ff3e3e" onClick={() => onClearHistory && onClearHistory(conversation?.id)} />
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {showRadar && <Radar />}
        {isSplash ? <Splash /> : isUplinkEstablished ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="cinematic-pulse" style={{ color: '#00ff41', fontSize: '38px', fontWeight: 'bold', fontFamily: 'monospace' }}>
              SECURE_UPLINK_ESTABLISHED
            </div>
            <div style={{ color: '#00ff41', fontSize: '12px', letterSpacing: '4px', opacity: 0.6, marginTop: '15px', fontFamily: 'monospace' }}>SYSTEM_IDLE // AWAITING_NEURAL_TRANSMISSION</div>
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
    </div>
  );
};

export default ChatInterface;