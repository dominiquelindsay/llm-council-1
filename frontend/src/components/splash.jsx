import React, { useState, useEffect, useRef } from 'react';

const ScrambledText = ({ text, speed = 35, delay = 0 }) => {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    let isMounted = true;
    const chars = '01XYZ$#@!%&?[]{}<>/\\+_';
    const targetText = text;
    let frame = 0;
    const maxFrames = targetText.length * 3;

    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (!isMounted) return;

        let current = '';
        for (let i = 0; i < targetText.length; i++) {
          if (targetText[i] === ' ') {
            current += ' ';
            continue;
          }
          const settledIndex = Math.floor(frame / 3);
          if (i < settledIndex) {
            current += targetText[i];
          } else {
            current += chars[Math.floor(Math.random() * chars.length)];
          }
        }

        setDisplayText(current);
        frame++;

        if (frame > maxFrames) {
          setDisplayText(targetText);
          clearInterval(interval);
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [text, speed, delay]);

  // Use non-breaking spaces to perfectly preserve title layouts before the scramble starts
  return <span>{displayText || text.replace(/./g, '\u00a0')}</span>;
};

const Splash = ({ onOpenMobileSidebar }) => {
  const logLines = [
    "[  0.01 ] INITIALIZING SECURE UPLINK NODE...",
    "[  0.15 ] ESTABLISHING VPN TUNNEL // PROTOCOL: IPSEC_AES_256",
    "[  0.32 ] HANDSHAKE ESTABLISHED WITH PROTO-ROUTER",
    "[  0.48 ] RETRIEVING ARCHIVE INDEX... SUCCESS (32 ACTIVE SECTORS)",
    "[  0.64 ] DECRYPTING COUNCIL CRYPTO-KEY: 0x4F2A_SIGMA",
    "[  0.80 ] INITIALIZING COGNITIVE TIERS [PRO / BASE / EXPERT]",
    "[  0.95 ] CORRELATING NEURAL WEAVE PATHS...",
    "[  1.12 ] ALL COUNCILS STANDING BY.",
    "[  1.20 ] CORE MONOLITH ONLINE. WELCOME BACK, DR. LINDSAY."
  ];

  const [visibleLogs, setVisibleLogs] = useState([]);
  const [activeMobileTab, setActiveMobileTab] = useState('matrix');
  const [decryptionLogs, setDecryptionLogs] = useState([]);
  const [cpuUsage, setCpuUsage] = useState(68);
  const [netWeave, setNetWeave] = useState(94.2);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeTheme, setActiveTheme] = useState('holo_deck');
  const canvasRef = useRef(null);
  const mouseCanvasPosRef = useRef({ x: -1000, y: -1000 });

  // Staggered boot logs
  useEffect(() => {
    let isMounted = true;
    setVisibleLogs([]);
    const timeouts = [];
    
    logLines.forEach((line, index) => {
      const delay = index * 170 + 100;
      const t = setTimeout(() => {
        if (!isMounted) return;
        setVisibleLogs(prev => [...prev, line]);
      }, delay);
      timeouts.push(t);
    });

    return () => {
      isMounted = false;
      timeouts.forEach(clearTimeout);
    };
  }, []);

  // Scrolling encryption feed (Right HUD) & diagnostic fluctuation
  useEffect(() => {
    const hexLines = [
      "UPLINK_ESTABLISHED: 0x4F2A",
      "READING SECTOR_01: [OK]",
      "DECRYPTING HASH: 9e3f_c4",
      "PULLING NEURAL WEAVE...",
      "COGNITIVE GATEWAY: SECURE",
      "VERIFYING INTEGRITY...",
      "COUNCIL_ROSTER: ONLINE",
      "TIER_FAST: STABLE_READY",
      "TIER_PRO: TUNING_WEIGHTS",
      "TIER_OMEGA: SYNAPSE_READY",
      "FETCHING ARCHIVE SUMMARY...",
      "INDEXING 32 ACTIVE SECTORS..."
    ];

    let currentIdx = 0;
    const interval = setInterval(() => {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });
      const hex = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
      const randomLine = hexLines[currentIdx % hexLines.length];
      
      setDecryptionLogs(prev => {
        const updated = [...prev, `[${time}] 0x${hex} // ${randomLine}`];
        if (updated.length > 7) {
          updated.shift();
        }
        return updated;
      });

      setCpuUsage(prev => {
        const delta = Math.floor(Math.random() * 7) - 3;
        const next = prev + delta;
        return next > 95 ? 90 : next < 55 ? 60 : next;
      });
      setNetWeave(prev => {
        const delta = (Math.random() * 0.4) - 0.2;
        const next = prev + delta;
        return next > 99 ? 98 : next < 88 ? 90 : Number(next.toFixed(1));
      });

      currentIdx++;
    }, 850);

    return () => clearInterval(interval);
  }, []);

  // Canvas particle stream effect (Space Dust / Cybernetic code particles)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    let width = (canvas.width = canvas.parentElement.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement.clientHeight || window.innerHeight);
    let coreX = width / 2;
    let coreY = height / 2;
    let coreRotation = 0;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement.clientHeight || window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Dynamic initializations based on activeTheme
    let particles = [];
    let matrixDrops = [];
    let matrixSpeeds = [];
    // Menacing, unrecognizable alchemical, astrological, and runic glyphs
    const matrixChars = '☠☣☢⛥⛧⚰☩☨☦✙✚✛✜✟✞✠✢✣✤✥✦✧⚡⚠🛸👽☄☽☾☉☿♀♂♃♄♅♆♇♈♉♊♋♌♍♎♏♐♑♒♓⛎⚕⚜🜏🜔🜕🜖🜗🜘ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛞᛟ';
    const colWidth = 18;
    const matrixCols = Math.floor(width / colWidth) + 1;

    if (activeTheme === 'holo_deck') {
      const particleCount = 45;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.5 + 0.5,
          color: Math.random() > 0.4 ? 'rgba(0, 242, 255, 0.45)' : 'rgba(0, 255, 65, 0.35)',
          vx: (Math.random() - 0.5) * 0.3,
          vy: -(Math.random() * 0.25 + 0.08), // Upward float
          amplitude: Math.random() * 2,
          frequency: Math.random() * 0.02 + 0.005,
          phase: Math.random() * Math.PI * 2
        });
      }
    } else if (activeTheme === 'matrix_rain') {
      for (let i = 0; i < matrixCols; i++) {
        matrixDrops[i] = Math.random() * -height; // Staggered start offsets
        matrixSpeeds[i] = Math.random() * 2 + 1.2;
      }
    } else if (activeTheme === 'singularity') {
      const particleCount = 120;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * Math.max(width, height) * 0.8 + 50,
          angle: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.008 + 0.003,
          radialSpeed: Math.random() * 1.2 + 0.4,
          radius: Math.random() * 1.6 + 0.6,
          color: Math.random() > 0.45 ? 'rgba(0, 242, 255, 0.8)' : 'rgba(0, 255, 65, 0.7)',
          trail: []
        });
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      const mouse = mouseCanvasPosRef.current;

      if (activeTheme === 'holo_deck') {
        particles.forEach(p => {
          p.y += p.vy;
          p.phase += p.frequency;
          p.x += Math.sin(p.phase) * p.amplitude * 0.05 + p.vx;

          // Wrap around limits
          if (p.y < -10) p.y = height + 10;
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
          ctx.fill();
        });
        ctx.shadowBlur = 0;
      } 
      
      else if (activeTheme === 'matrix_rain') {
        ctx.font = '13px "Segoe UI Symbol", "Segoe UI Emoji", "Arial Unicode MS", monospace';
        for (let i = 0; i < matrixCols; i++) {
          const x = i * colWidth;
          const y = matrixDrops[i];
          const isCyan = i % 2 === 0;

          // Draw head glyph
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 8;
          ctx.shadowColor = isCyan ? '#00f2ff' : '#00ff41';
          const headChar = matrixChars[Math.floor(Math.random() * matrixChars.length)];
          ctx.fillText(headChar, x, y);

          // Draw fading trail
          const trailLength = 8;
          for (let j = 1; j <= trailLength; j++) {
            const trailY = y - j * 15;
            if (trailY > 0 && trailY < height) {
              const opacity = 1 - (j / trailLength);
              ctx.fillStyle = isCyan ? `rgba(0, 242, 255, ${opacity * 0.55})` : `rgba(0, 255, 65, ${opacity * 0.45})`;
              ctx.shadowBlur = 0;
              const trailChar = matrixChars[Math.floor(Math.random() * matrixChars.length)];
              ctx.fillText(trailChar, x, trailY);
            }
          }

          // Move down
          matrixDrops[i] += matrixSpeeds[i] * 3;
          if (matrixDrops[i] > height + trailLength * 15) {
            matrixDrops[i] = -20;
            matrixSpeeds[i] = Math.random() * 2.5 + 1.2;
          }
        }
      } 


      
      else if (activeTheme === 'singularity') {
        const targetX = (mouse.x > 0 && mouse.x < width) ? mouse.x : width / 2;
        const targetY = (mouse.y > 0 && mouse.y < height) ? mouse.y : height / 2;
        
        coreX += (targetX - coreX) * 0.08;
        coreY += (targetY - coreY) * 0.08;
        
        // Draw singularity central gravitational well glow
        ctx.beginPath();
        const grad = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, 200);
        grad.addColorStop(0, 'rgba(0, 242, 255, 0.25)');
        grad.addColorStop(0.3, 'rgba(0, 255, 65, 0.08)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.arc(coreX, coreY, 200, 0, Math.PI * 2);
        ctx.fill();

        // Draw concentric mathematical vector rings wrapping the singularity core
        ctx.strokeStyle = 'rgba(0, 242, 255, 0.12)';
        ctx.lineWidth = 0.5;
        for (let r = 80; r <= 320; r += 80) {
          ctx.beginPath();
          ctx.arc(coreX, coreY, r, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw rotating tactical telemetry core brackets
        coreRotation += 0.003;
        ctx.save();
        ctx.translate(coreX, coreY);
        ctx.rotate(coreRotation);
        
        ctx.strokeStyle = 'rgba(0, 242, 255, 0.35)';
        ctx.lineWidth = 1.2;
        // Central targeting ring
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();

        // Target crosshair brackets
        for (let a = 0; a < 4; a++) {
          const angle = (a * Math.PI) / 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * 22, Math.sin(angle) * 22);
          ctx.lineTo(Math.cos(angle) * 36, Math.sin(angle) * 36);
          ctx.stroke();
        }
        ctx.restore();

        // Update and render spiraling quantum particle streams
        particles.forEach(p => {
          p.angle += p.speed;
          p.r -= p.radialSpeed;
          
          p.x = coreX + Math.cos(p.angle) * p.r;
          p.y = coreY + Math.sin(p.angle) * p.r;

          // Build elegant particle trails
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 8) {
            p.trail.shift();
          }

          if (p.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let k = 1; k < p.trail.length; k++) {
              ctx.lineTo(p.trail[k].x, p.trail[k].y);
            }
            ctx.strokeStyle = p.color.includes('242') ? 'rgba(0, 242, 255, 0.18)' : 'rgba(0, 255, 65, 0.14)';
            ctx.lineWidth = p.radius * 0.6;
            ctx.stroke();
          }

          // Draw active particle node
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 5;
          ctx.shadowColor = p.color;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Reset particle if it falls into the gravity well core or spirals out of bounds
          if (p.r < 12) {
            p.r = Math.random() * Math.max(width, height) * 0.8 + 100;
            p.angle = Math.random() * Math.PI * 2;
            p.speed = Math.random() * 0.008 + 0.003;
            p.radialSpeed = Math.random() * 1.2 + 0.4;
            p.trail = [];
          }
        });
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeTheme]);

  const handleMouseMove = (e) => {
    const { clientWidth, clientHeight } = e.currentTarget;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    mouseCanvasPosRef.current = { x: clientX, y: clientY };

    const x = (e.clientX - clientWidth / 2) / (clientWidth / 2); // -1 to 1
    const y = (e.clientY - clientHeight / 2) / (clientHeight / 2); // -1 to 1
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
    mouseCanvasPosRef.current = { x: -1000, y: -1000 };
  };

  const tiltStyle = {
    transform: `rotateX(${-mousePos.y * 3.5}deg) rotateY(${mousePos.x * 3.5}deg)`,
    transition: 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    transformStyle: 'preserve-3d',
    width: '100%',
    height: '100%',
    position: 'relative'
  };

  return (
    <div 
      className="empty-state-container" 
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ 
        position: 'relative', 
        height: '100%', 
        width: '100%', 
        overflow: 'hidden', 
        background: '#010102',
        perspective: '1000px'
      }}
    >
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
        @keyframes cursor-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes grid-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.8; } }
        @keyframes console-bloom { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        
        .terminal-cursor {
          display: inline-block;
          width: 8px;
          height: 12px;
          background: #00f2ff;
          margin-left: 4px;
          animation: cursor-blink 1s step-end infinite;
          vertical-align: middle;
        }

        .hud-console-card {
          border: 1px solid rgba(0, 242, 255, 0.12);
          background: linear-gradient(180deg, rgba(5, 5, 8, 0.85) 0%, rgba(10, 10, 15, 0.9) 100%);
          backdrop-filter: blur(8px);
          padding: 16px;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-family: monospace;
          animation: console-bloom 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }

        .hud-card-header {
          color: #00f2ff;
          font-size: 11px;
          letter-spacing: 2px;
          font-weight: bold;
          border-bottom: 1px solid rgba(0, 242, 255, 0.15);
          padding-bottom: 6px;
          margin-bottom: 4px;
          display: flex;
          justify-content: space-between;
        }

        .diag-row {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #e0e0e0;
          letter-spacing: 1px;
        }

        .diag-label {
          color: rgba(224, 224, 224, 0.7);
        }

        .diag-value {
          color: #00ff41;
          font-weight: bold;
        }

        .diag-progress-bg {
          width: 100%;
          height: 5px;
          background: rgba(0, 242, 255, 0.08);
          border-radius: 2px;
          overflow: hidden;
          margin-top: 2px;
          border: 1px solid rgba(0, 242, 255, 0.1);
        }

        .diag-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00ff41, #00f2ff);
          box-shadow: 0 0 8px rgba(0, 242, 255, 0.5);
          transition: width 0.5s ease;
        }

        .cyber-grid-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(rgba(0, 242, 255, 0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 242, 255, 0.045) 1px, transparent 1px);
          background-size: 60px 60px;
          background-position: center;
          z-index: 0;
          pointer-events: none;
          animation: grid-pulse 6s ease-in-out infinite;
        }

        .cyber-center-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 70vw;
          height: 70vh;
          background: radial-gradient(circle, rgba(0, 242, 255, 0.08) 0%, rgba(0, 255, 65, 0.02) 40%, transparent 75%);
          z-index: 0;
          pointer-events: none;
        }

        .hud-header-top-right {
          position: absolute;
          top: clamp(15px, 2.5%, 30px);
          right: clamp(15px, 3%, 40px);
          color: #00f2ff;
          font-family: monospace;
          font-size: clamp(10px, 1.1vw, 16px);
          letter-spacing: clamp(1px, 0.2vw, 3px);
          z-index: 15;
          opacity: 0.7;
          transform: translateZ(30px);
          transition: all 0.3s ease;
        }

        .hud-header-top-left {
          position: absolute;
          top: clamp(15px, 2.5%, 30px);
          left: clamp(15px, 3%, 40px);
          color: #00f2ff;
          font-family: monospace;
          font-size: clamp(8px, 0.9vw, 12px);
          opacity: 0.4;
          line-height: 1.5;
          z-index: 15;
          transform: translateZ(25px);
          transition: all 0.3s ease;
        }

        .hud-title-wrapper {
          position: absolute;
          top: 7%;
          width: 100%;
          text-align: center;
          z-index: 15;
          transform: translateZ(50px);
          transition: all 0.3s ease;
        }
        @media (max-width: 1200px) {
          .hud-title-wrapper {
            top: 6%;
          }
        }
        @media (max-width: 768px) {
          .hud-title-wrapper {
            top: 5%;
          }
        }

        .dynamic-title {
          font-size: clamp(24px, 4vw, 55px);
          font-weight: 900;
          letter-spacing: clamp(6px, 1.2vw, 18px);
          font-family: "Arial Black", sans-serif;
          color: #e0ffff;
          text-shadow: 0 0 20px rgba(0, 242, 255, 0.5);
          transition: all 0.3s ease;
          display: inline-block;
        }

        .neon-ghost-title {
          color: #00f2ff;
          font-size: clamp(14px, 2.2vw, 28px);
          letter-spacing: clamp(4px, 0.6vw, 8px);
          font-family: monospace;
          font-weight: bold;
          transition: all 0.3s ease;
          display: inline-block;
        }

        .hud-panel-left {
          position: absolute;
          top: 30%;
          left: 40px;
          width: 280px;
          height: auto;
          z-index: 15;
          transform: translateZ(40px);
          transition: all 0.3s ease;
          transform-origin: top left;
        }
        @media (max-width: 1400px) {
          .hud-panel-left {
            transform: translateZ(40px) scale(0.85) !important;
            left: 20px !important;
            top: 31% !important;
          }
        }
        @media (max-width: 1200px) {
          .hud-panel-left {
            transform: translateZ(40px) scale(0.72) !important;
            left: 15px !important;
            top: 32% !important;
          }
        }
        @media (max-width: 1024px) {
          .hud-panel-left {
            transform: translateZ(40px) scale(0.62) !important;
            left: 10px !important;
            top: 33% !important;
          }
        }
        @media (max-width: 900px) {
          .hud-panel-left {
            display: none !important;
          }
        }

        .hud-panel-right {
          position: absolute;
          top: 30%;
          right: 40px;
          width: 310px;
          height: 48%;
          z-index: 15;
          transform: translateZ(40px);
          transition: all 0.3s ease;
          transform-origin: top right;
        }
        @media (max-width: 1400px) {
          .hud-panel-right {
            transform: translateZ(40px) scale(0.85) !important;
            right: 20px !important;
            top: 31% !important;
          }
        }
        @media (max-width: 1200px) {
          .hud-panel-right {
            transform: translateZ(40px) scale(0.72) !important;
            right: 15px !important;
            top: 32% !important;
          }
        }
        @media (max-width: 1024px) {
          .hud-panel-right {
            transform: translateZ(40px) scale(0.62) !important;
            right: 10px !important;
            top: 33% !important;
          }
        }
        @media (max-width: 900px) {
          .hud-panel-right {
            display: none !important;
          }
        }


        .hud-central-telemetry {
          position: absolute;
          top: 52%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90vw;
          max-width: 1500px;
          height: 72vh;
          max-height: 740px;
          border: 1px solid rgba(0, 242, 255, 0.12);
          pointer-events: none;
          z-index: 2;
          box-shadow: inset 0 0 30px rgba(0, 242, 255, 0.03);
          transform-style: preserve-3d;
          transition: all 0.3s ease;
        }
        @media (max-width: 1024px) {
          .hud-central-telemetry {
            width: 95vw;
            height: 60vh;
          }
        }
        @media (max-height: 800px) {
          .hud-central-telemetry {
            height: 65vh;
          }
        }

        .hud-video-reveal {
          position: absolute; 
          top: 52%; 
          left: 50%; 
          transform: translate(-50%, -50%) scale(1.5); 
          width: 90vw;
          max-width: 1500px;
          height: 72vh;
          max-height: 740px;
          opacity: 0.88; 
          mixBlendMode: screen; 
          pointerEvents: none; 
          z-index: 1;
          object-fit: contain;
          mask-image: radial-gradient(circle, rgba(0,0,0,1) 35%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0) 86%);
          WebkitMaskImage: radial-gradient(circle, rgba(0,0,0,1) 35%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0) 86%);
          transition: all 0.3s ease;
        }
        @media (max-width: 1024px) {
          .hud-video-reveal {
            width: 95vw;
            height: 60vh;
            transform: translate(-50%, -50%) scale(1.2); 
          }
        }
        @media (max-height: 800px) {
          .hud-video-reveal {
            height: 65vh;
          }
        }

        .hud-footer-classified {
          position: absolute;
          bottom: 12%;
          width: 100%;
          text-align: center;
          z-index: 15;
          transform: translateZ(35px);
          transition: all 0.3s ease;
        }
        @media (max-width: 1200px) {
          .hud-footer-classified {
            bottom: 24%;
          }
        }
        @media (max-width: 1024px) {
          .hud-footer-classified {
            bottom: 26%;
          }
        }
        @media (max-width: 768px) {
          .hud-footer-classified {
            bottom: 28%;
          }
        }

        .hud-footer-uplink-text {
          color: #00f2ff;
          font-family: monospace;
          font-size: clamp(10px, 1.1vw, 16px);
          letter-spacing: clamp(1px, 0.2vw, 3px);
          opacity: 0.7;
          margin-top: 15px;
          transition: all 0.3s ease;
        }

        .hud-boot-logs {
          display: none !important;
        }
        .boot-logs-feed {
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-size: 10px;
          color: #00f2ff;
          letter-spacing: 1px;
          opacity: 0.8;
          height: 110px;
          width: 420px;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        @media (max-width: 1200px) {
          .hud-boot-logs {
            left: 20px;
            bottom: 4%;
          }
        }
        @media (max-width: 1024px) {
          .hud-boot-logs {
            width: calc(100% - 40px) !important;
            max-width: 600px;
          }
          .boot-logs-feed {
            width: 100% !important;
          }
        }
        @media (max-width: 768px) {
          .hud-boot-logs {
            left: 15px;
          }
          .boot-logs-feed {
            height: 90px;
          }
        }

        .sigma-glitch-text {
          animation: cyber-glitch 4s infinite;
          color: #ff3e3e;
          font-size: clamp(12px, 2vw, 28px);
          font-weight: bold;
          letter-spacing: clamp(2px, 0.3vw, 4px);
          display: inline-block;
        }

        .hud-status-online {
          color: #00ff41;
          font-size: clamp(11px, 1.3vw, 18px);
          font-weight: bold;
          letter-spacing: clamp(1px, 0.15vw, 2px);
          text-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
          animation: subtle-star-pulse 3s infinite;
        }

        .hud-awaiting-input {
          display: none !important;
        }
        @media (max-width: 1024px) {
          .hud-awaiting-input {
            display: none !important;
          }
        }
      `}</style>

      {/* BACKGROUND GRID */}
      <div className="cyber-grid-overlay" />
      <div className="cyber-center-glow" />

      {/* SPACE DUST PARTICLES */}
      <canvas 
        ref={canvasRef} 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          pointerEvents: 'none', 
          zIndex: 2 
        }} 
      />

      {/* SCI-FI OVERLAY: SCANLINES */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.12) 50%)', backgroundSize: '100% 4px', zIndex: 10, pointerEvents: 'none', opacity: 0.45 }} />

      {/* INTERACTIVE 3D TILT CONTAINER */}
      <div style={tiltStyle}>

        {/* TOP-RIGHT CORNER TELEMETRY REMOVED FOR CLEANUP */}

        {/* STAGGERED DECRYPTING TITLE HUD */}
        <div className="hud-title-wrapper">
          {/* MOBILE ONLY Splash Operator trigger */}
          <button 
            className="mobile-splash-operator-btn"
            onClick={onOpenMobileSidebar}
            style={{
              display: 'none', /* Handled in CSS */
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              background: 'rgba(2, 2, 6, 0.85)',
              border: '1px solid #00f2ff55',
              color: '#00f2ff',
              padding: '8px 18px',
              fontFamily: 'monospace',
              fontSize: '10px',
              letterSpacing: '2px',
              borderRadius: '4px',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 0 15px rgba(0, 242, 255, 0.15), inset 0 0 10px rgba(0, 242, 255, 0.1)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 242, 255, 0.15)';
              e.currentTarget.style.borderColor = '#00f2ff';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 242, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(2, 2, 6, 0.85)';
              e.currentTarget.style.borderColor = '#00f2ff55';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 242, 255, 0.15), inset 0 0 10px rgba(0, 242, 255, 0.1)';
            }}
          >
            <span>☰ // OPERATOR</span>
          </button>
          <br className="mobile-splash-operator-br" style={{ display: 'none' }} />

          <span className="dynamic-title">
            <ScrambledText text="THE COUNCIL" speed={25} delay={100} />
          </span><br/>
          <span className="neon-ghost-title">
            <ScrambledText text="NEON_GHOST" speed={30} delay={650} />
          </span>
          <br/>
          <div style={{ color: '#00f2ff', fontFamily: 'monospace', fontSize: '12px', opacity: 0.4, lineHeight: '1.5', marginTop: '15px', letterSpacing: '1px' }}>
            UPLINK_STABILITY: 99.8%<br/>
            HEX_OFFSET: 0x4F2A<br/>
            COORD: 36.1699° N, 115.1398° W
          </div>
        </div>

        {/* TOP-LEFT TELEMETRY DECENTRALIZED FOR CLEANUP */}

        {/* LEFT MODULAR HUD PANEL: DIAGNOSTICS */}
        <div className={`hud-console-card hud-panel-left ${activeMobileTab === 'diagnostics' ? 'mobile-active' : ''}`} style={{ zIndex: 15, transform: 'translateZ(40px)' }}>
          <div className="hud-card-header">
            <span>// SYSTEM DIAGNOSTICS</span>
            <span style={{ color: '#00ff41' }}>LIVE</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <div className="diag-row">
                <span className="diag-label">COGNITIVE_CORE_LOAD</span>
                <span className="diag-value">{cpuUsage}%</span>
              </div>
              <div className="diag-progress-bg">
                <div className="diag-progress-fill" style={{ width: `${cpuUsage}%` }} />
              </div>
            </div>

            <div>
              <div className="diag-row">
                <span className="diag-label">NEURAL_WEAVE_SYNC</span>
                <span className="diag-value">{netWeave}%</span>
              </div>
              <div className="diag-progress-bg">
                <div className="diag-progress-fill" style={{ width: `${netWeave}%` }} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(0, 242, 255, 0.08)', paddingTop: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div className="diag-row">
                <span className="diag-label">GATEWAY_LATENCY</span>
                <span className="diag-value" style={{ color: '#00f2ff' }}>12ms</span>
              </div>
              <div className="diag-row">
                <span className="diag-label">FAST_TIER</span>
                <span className="diag-value" style={{ color: '#00ff41' }}>STABLE</span>
              </div>
              <div className="diag-row">
                <span className="diag-label">PRO_TIER</span>
                <span className="diag-value" style={{ color: '#00ff41' }}>ACTIVE</span>
              </div>
              <div className="diag-row">
                <span className="diag-label">OMEGA_TIER</span>
                <span className="diag-value" style={{ color: '#ffc107' }}>DECRYPTING</span>
              </div>
              <div className="diag-row">
                <span className="diag-label">SECURITY_LEVEL</span>
                <span className="diag-value" style={{ color: '#ff3e3e' }}>SIGMA_LEVEL</span>
              </div>
            </div>

            {/* REAL-TIME THEME SWITCHER */}
            <div style={{ borderTop: '1px solid rgba(0, 242, 255, 0.12)', paddingTop: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="diag-row" style={{ color: '#00f2ff', fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px' }}>
                <span>// BACKDROP_OVERRIDE</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                <button 
                  onClick={() => setActiveTheme('holo_deck')}
                  style={{
                    flex: 1,
                    background: activeTheme === 'holo_deck' ? 'rgba(0, 242, 255, 0.15)' : 'rgba(5, 5, 8, 0.6)',
                    border: activeTheme === 'holo_deck' ? '1px solid #00f2ff' : '1px solid rgba(0, 242, 255, 0.25)',
                    color: activeTheme === 'holo_deck' ? '#00f2ff' : 'rgba(0, 242, 255, 0.6)',
                    fontSize: '8px',
                    fontFamily: 'monospace',
                    padding: '4px 0',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    transition: 'all 0.2s ease',
                    boxShadow: activeTheme === 'holo_deck' ? '0 0 8px rgba(0, 242, 255, 0.3)' : 'none'
                  }}
                >
                  HOLO_DECK
                </button>
                <button 
                  onClick={() => setActiveTheme('matrix_rain')}
                  style={{
                    flex: 1,
                    background: activeTheme === 'matrix_rain' ? 'rgba(0, 255, 65, 0.15)' : 'rgba(5, 5, 8, 0.6)',
                    border: activeTheme === 'matrix_rain' ? '1px solid #00ff41' : '1px solid rgba(0, 242, 255, 0.25)',
                    color: activeTheme === 'matrix_rain' ? '#00ff41' : 'rgba(0, 242, 255, 0.6)',
                    fontSize: '8px',
                    fontFamily: 'monospace',
                    padding: '4px 0',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    transition: 'all 0.2s ease',
                    boxShadow: activeTheme === 'matrix_rain' ? '0 0 8px rgba(0, 255, 65, 0.3)' : 'none'
                  }}
                >
                  MATRIX
                </button>
                <button 
                  onClick={() => setActiveTheme('singularity')}
                  style={{
                    flex: 1,
                    background: activeTheme === 'singularity' ? 'rgba(0, 242, 255, 0.15)' : 'rgba(5, 5, 8, 0.6)',
                    border: activeTheme === 'singularity' ? '1px solid #00f2ff' : '1px solid rgba(0, 242, 255, 0.25)',
                    color: activeTheme === 'singularity' ? '#00f2ff' : 'rgba(0, 242, 255, 0.6)',
                    fontSize: '8px',
                    fontFamily: 'monospace',
                    padding: '4px 0',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    transition: 'all 0.2s ease',
                    boxShadow: activeTheme === 'singularity' ? '0 0 8px rgba(0, 242, 255, 0.3)' : 'none'
                  }}
                >
                  SINGULARITY
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT MODULAR HUD PANEL: CRYPTO FEED */}
        <div className={`hud-console-card hud-panel-right ${activeMobileTab === 'decryption' ? 'mobile-active' : ''}`} style={{ zIndex: 15, transform: 'translateZ(40px)' }}>
          <div className="hud-card-header">
            <span>// CRYPTO_DECRYPTION_LOG</span>
            <span className="terminal-cursor" style={{ background: '#00f2ff', width: '6px', height: '10px' }} />
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '9px', color: '#00f2ff', letterSpacing: '0.5px', overflow: 'hidden', opacity: 0.85 }}>
            {decryptionLogs.length === 0 ? (
              <div style={{ color: 'rgba(0, 242, 255, 0.4)', fontStyle: 'italic' }}>Listening on sockets...</div>
            ) : (
              decryptionLogs.map((log, index) => (
                <div key={index} style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* CENTRAL TACTICAL TELEMETRY CAMERA BRACKETS */}
        <div className="hud-central-telemetry">
          {/* Corner Ticks */}
          <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '15px', height: '15px', borderLeft: '3px solid #00f2ff', borderTop: '3px solid #00f2ff' }} />
          <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '15px', height: '15px', borderRight: '3px solid #00f2ff', borderTop: '3px solid #00f2ff' }} />
          <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '15px', height: '15px', borderLeft: '3px solid #00f2ff', borderBottom: '3px solid #00f2ff' }} />
          <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '15px', height: '15px', borderRight: '3px solid #00f2ff', borderBottom: '3px solid #00f2ff' }} />
          
          {/* FOCUS_FEED_01 telemetry text removed for declutter */}
          {/* RESOLVE: 1080P telemetry text removed for declutter */}
        </div>

        {/* CORE LOGO: VIDEO REVEAL (CINEMATIC IMMERSIVE SCALE) */}
        <video 
          src="/vault-reveal.mp4" 
          autoPlay 
          muted 
          loop={false}
          playsInline
          className="hud-video-reveal"
        />

        {/* SENSORY SCAN SWEEP */}
        <div style={{ position: 'absolute', width: '100%', height: '50px', background: 'rgba(0, 242, 255, 0.05)', boxShadow: '0 0 20px rgba(0, 242, 255, 0.1)', top: '-100px', zIndex: 5, animation: 'scan-sweep 12s infinite linear', pointerEvents: 'none' }} />

        {/* FOOTER HUD */}
        <div className="hud-footer-classified">
          <span className="sigma-glitch-text">
            PRIORITY: SIGMA<br/>ACCESS: CLASSIFIED
          </span>
          <div className="hud-footer-uplink-text">
            USER_UPLINK: DR_LINDSAY // AUTH: DIRECTOR
          </div>
        </div>

        {/* TACTICAL LIVE HUD BOOT LOGS (BOTTOM-LEFT) */}
        <div className="hud-boot-logs">
          <div className="hud-status-online">
            STATUS: ONLINE
          </div>
          <div className="boot-logs-feed">
            {visibleLogs.map((log, index) => (
              <div key={index} style={{ whiteSpace: 'nowrap' }}>
                {log}{index === visibleLogs.length - 1 ? <span className="terminal-cursor" /> : ''}
              </div>
            ))}
          </div>
        </div>

        {/* TACTICAL AWAITING INPUT STATUS ROW */}
        <div className="hud-awaiting-input">
          <span className="flashing-arrow" style={{ animation: 'flash-arrow 1s step-end infinite', color: '#00f2ff', fontWeight: 'bold' }}>&gt;</span> AWAITING INPUT...
        </div>


      </div>
    </div>
  );
};

export default Splash;