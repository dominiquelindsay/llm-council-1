import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

const CouncilContext = createContext();

export const useCouncil = () => useContext(CouncilContext);

// Shared core fallback models used for initialization and fresh-fetch default states
const DEFAULT_ROSTER = [
  { modelId: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', tier: 'fast', isQuarantined: false, isArbiter: false },
  { modelId: 'openai/gpt-4o', name: 'GPT-4o', tier: 'pro', isQuarantined: false, isArbiter: true },
  { modelId: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', tier: 'pro', isQuarantined: false, isArbiter: false },
  { modelId: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro', tier: 'pro', isQuarantined: false, isArbiter: false },
  { modelId: 'openai/gpt-4o', name: 'GPT-4o', tier: 'omega', isQuarantined: false, isArbiter: false },
  { modelId: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', tier: 'omega', isQuarantined: false, isArbiter: false },
  { modelId: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro', tier: 'omega', isQuarantined: false, isArbiter: false },
  { modelId: 'openai/o1-preview', name: 'o1 Preview', tier: 'god', isQuarantined: false, isArbiter: false },
  { modelId: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', tier: 'god', isQuarantined: false, isArbiter: false },
  { modelId: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro', tier: 'god', isQuarantined: false, isArbiter: false }
];

export const CouncilProvider = ({ children }) => {
  // 1. Synchronously initialize globalRoster with the saved local storage state or defaults
  const [globalRoster, setGlobalRoster] = useState(() => {
    const savedMemory = localStorage.getItem('council_memory');
    let parsedMemory = [];
    if (savedMemory) {
      try {
        parsedMemory = JSON.parse(savedMemory);
      } catch (e) {
        console.error("Error parsing council_memory:", e);
      }
    } else {
      // One-time legacy migration from older fragmented keys
      const savedRoster = localStorage.getItem('global_roster');
      if (savedRoster) {
        try {
          parsedMemory = JSON.parse(savedRoster);
        } catch (e) {
          console.error("Error parsing legacy global_roster:", e);
        }
      } else {
        const savedConfig = localStorage.getItem('council_config') || localStorage.getItem('councilConfig');
        const savedQuarantine = localStorage.getItem('quarantineList');
        let parsedQuarantine = [];
        if (savedQuarantine) {
          try {
            parsedQuarantine = JSON.parse(savedQuarantine);
          } catch (e) {}
        }
        if (savedConfig) {
          try {
            const parsed = JSON.parse(savedConfig);
            const roster = [];
            const TIERS_MAPPING = {
              fast: 'fast', f: 'fast',
              pro: 'pro', p: 'pro',
              omega: 'omega', o: 'omega',
              god: 'god', g: 'god'
            };
            Object.keys(parsed).forEach(tier => {
              const normalizedTier = TIERS_MAPPING[tier.toLowerCase()] || tier.toLowerCase();
              if (parsed[tier] && Array.isArray(parsed[tier].council)) {
                parsed[tier].council.forEach(modelId => {
                  const isArbiter = parsed[tier].chairman === modelId;
                  const isQuarantined = parsedQuarantine.includes(modelId);
                  roster.push({ modelId, tier: normalizedTier, isQuarantined, isArbiter });
                });
              }
            });
            parsedMemory = roster;
          } catch (e) {
            console.error("Migration error from legacy config:", e);
          }
        }
      }
    }

    // Combine loaded memory/migrated roster and de-duplicate by modelId to keep exactly one entry
    const initialRoster = [];
    const processedModelIds = new Set();

    if (Array.isArray(parsedMemory) && parsedMemory.length > 0) {
      const groupedMemory = {};
      parsedMemory.forEach(item => {
        if (item && item.modelId) {
          if (!groupedMemory[item.modelId]) {
            groupedMemory[item.modelId] = {
              modelId: item.modelId,
              name: item.name,
              tiers: [],
              isQuarantined: false,
              isArbiter: false
            };
          }
          const itemTiers = item.tiers || (item.tier ? [item.tier] : []);
          itemTiers.forEach(t => {
            if (!groupedMemory[item.modelId].tiers.includes(t)) {
              groupedMemory[item.modelId].tiers.push(t);
            }
          });
          if (item.isQuarantined) groupedMemory[item.modelId].isQuarantined = true;
          if (item.isArbiter) groupedMemory[item.modelId].isArbiter = true;
        }
      });

      Object.values(groupedMemory).forEach(item => {
        initialRoster.push({
          modelId: item.modelId,
          name: item.name || item.modelId.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          tier: item.tiers[0] || null,
          tiers: item.tiers,
          isQuarantined: !!item.isQuarantined,
          isArbiter: !!item.isArbiter
        });
        processedModelIds.add(item.modelId);
      });
    }

    DEFAULT_ROSTER.forEach(def => {
      if (!processedModelIds.has(def.modelId)) {
        const defaultMatches = DEFAULT_ROSTER.filter(d => d.modelId === def.modelId);
        const defaultTiers = defaultMatches.map(d => d.tier);
        initialRoster.push({
          modelId: def.modelId,
          name: def.name,
          tier: def.tier || defaultTiers[0] || null,
          tiers: defaultTiers,
          isQuarantined: !!def.isQuarantined,
          isArbiter: !!def.isArbiter
        });
        processedModelIds.add(def.modelId);
      }
    });

    return initialRoster;
  });

  // 2. Derive councilConfig dynamically based on globalRoster for backward compatibility
  const councilConfig = {
    fast: { council: [], chairman: 'openai/gpt-4o-mini' },
    pro: { council: [], chairman: 'openai/gpt-4o' },
    omega: { council: [], chairman: 'anthropic/claude-3-opus' },
    god: { council: [], chairman: 'openai/o1-preview' }
  };

  globalRoster.forEach(item => {
    if (Array.isArray(item.tiers)) {
      item.tiers.forEach(t => {
        if (councilConfig[t]) {
          councilConfig[t].council.push(item.modelId);
        }
      });
    } else if (item.tier && councilConfig[item.tier]) {
      councilConfig[item.tier].council.push(item.modelId);
    }
    if (item.isArbiter) {
      Object.keys(councilConfig).forEach(t => {
        councilConfig[t].chairman = item.modelId;
      });
    }
  });

  // 3. Keep rosterRef in sync
  const rosterRef = useRef(globalRoster);
  useEffect(() => {
    rosterRef.current = globalRoster;
  }, [globalRoster]);

  // 4. Save function: Stores only modified models under the single key 'council_memory'
  const saveRosterState = (roster, radarPassword = null) => {
    const modified = roster.filter(item => (item.tiers && item.tiers.length > 0) || item.tier || item.isQuarantined || item.isArbiter)
                            .map(item => ({
                              modelId: item.modelId,
                              tier: item.tier || (item.tiers && item.tiers[0]) || null,
                              tiers: item.tiers || (item.tier ? [item.tier] : []),
                              isQuarantined: !!item.isQuarantined,
                              isArbiter: !!item.isArbiter
                            }));
    localStorage.setItem('council_memory', JSON.stringify(modified));

    // Persist to backend server ONLY if we are NOT on mobile viewports (lock configurations on mobile!)
    const isMobile = window.innerWidth <= 768;
    if (!isMobile && radarPassword) {
      const SERVER_URL = import.meta.env.VITE_API_URL || window.location.origin;
      fetch(`${SERVER_URL}/api/council-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Radar-Password': radarPassword },
        body: JSON.stringify(modified)
      }).catch(err => console.error("FAILED_TO_PERSIST_COUNCIL_ROSTER:", err));
    }
  };

  // 5. Ghost Exorcism Rehydration Logic: Apply historical configurations only to active OpenRouter models
  useEffect(() => {
    const fetchAndRehydrate = async () => {
      try {
        let backendMemory = [];
        try {
          const SERVER_URL = import.meta.env.VITE_API_URL || window.location.origin;
          const syncRes = await fetch(`${SERVER_URL}/api/council-memory`);
          if (syncRes.ok) {
            backendMemory = await syncRes.json();
          }
        } catch (e) {
          console.warn("Backend sync check failed, falling back to local memory:", e);
        }

        const response = await fetch('https://openrouter.ai/api/v1/models');
        const data = await response.json();
        
        // Read consolidated historical config
        const savedMemory = localStorage.getItem('council_memory');
        let parsedMemory = [];
        if (backendMemory && backendMemory.length > 0) {
          parsedMemory = backendMemory;
          localStorage.setItem('council_memory', JSON.stringify(backendMemory));
        } else if (savedMemory) {
          try {
            parsedMemory = JSON.parse(savedMemory);
          } catch (e) {}
        } else {
          // Legacy migration fallback
          const savedRoster = localStorage.getItem('global_roster');
          if (savedRoster) {
            try {
              parsedMemory = JSON.parse(savedRoster);
            } catch (e) {}
          } else {
            const savedConfig = localStorage.getItem('council_config') || localStorage.getItem('councilConfig');
            const savedQuarantine = localStorage.getItem('quarantineList');
            let parsedQuarantine = [];
            if (savedQuarantine) {
              try { parsedQuarantine = JSON.parse(savedQuarantine); } catch (e) {}
            }
            if (savedConfig) {
              try {
                const parsed = JSON.parse(savedConfig);
                const roster = [];
                Object.keys(parsed).forEach(tier => {
                  if (parsed[tier] && Array.isArray(parsed[tier].council)) {
                    parsed[tier].council.forEach(modelId => {
                      const isArbiter = parsed[tier].chairman === modelId;
                      const isQuarantined = parsedQuarantine.includes(modelId);
                      roster.push({ modelId, tier, isQuarantined, isArbiter });
                    });
                  }
                });
                parsedMemory = roster;
              } catch (e) {}
            }
          }
        }

        // Map over the fresh OpenRouter response. ONLY rehydrate models present in the live fetch.
        // Deprecated models missing from the API fetch are silently discarded.
        const rehydrated = data.data.map(m => {
          const modelId = m.id;
          const name = m.name;

          // A. If exists in history, apply saved modifications (aggregate all duplicates)
          const memMatches = parsedMemory.filter(item => item.modelId === modelId);
          if (memMatches.length > 0) {
            const itemTiers = [];
            memMatches.forEach(mm => {
              const tiers = mm.tiers || (mm.tier ? [mm.tier] : []);
              tiers.forEach(t => {
                if (!itemTiers.includes(t)) itemTiers.push(t);
              });
            });
            const firstMatch = memMatches[0];
            return {
              modelId,
              name,
              tier: firstMatch.tier || itemTiers[0] || null,
              tiers: itemTiers,
              isQuarantined: memMatches.some(mm => mm.isQuarantined),
              isArbiter: memMatches.some(mm => mm.isArbiter)
            };
          }

          // B. Else if exists in defaults, inject fallback configuration
          const defaultMatches = DEFAULT_ROSTER.filter(item => item.modelId === modelId);
          if (defaultMatches.length > 0) {
            const defaultTiers = defaultMatches.map(d => d.tier);
            return {
              modelId,
              name,
              tier: defaultMatches[0].tier || defaultTiers[0] || null,
              tiers: defaultTiers,
              isQuarantined: defaultMatches.some(dm => dm.isQuarantined),
              isArbiter: defaultMatches.some(dm => dm.isArbiter)
            };
          }

          // C. Else clean baseline model
          return {
            modelId,
            name,
            tier: null,
            tiers: [],
            isQuarantined: false,
            isArbiter: false
          };
        });

        // Set live globalRoster and save to 'council_memory'
        setGlobalRoster(rehydrated);
        saveRosterState(rehydrated);

      } catch (error) {
        console.error("OpenRouter Sync / Rehydration failed:", error);
      }
    };
    
    fetchAndRehydrate();
  }, []);

  // 6. Purge Protocol: Reset and clean both localStorage and the live memory state instantly
  const purgeMemory = () => {
    const keysToRemove = [
      'council_memory',
      'global_roster',
      'council_config',
      'councilConfig',
      'quarantineList',
      'council_chairmen'
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));

    const resetRoster = rosterRef.current.map(item => ({
      ...item,
      tier: null,
      tiers: [],
      isQuarantined: false,
      isArbiter: false
    }));
    setGlobalRoster(resetRoster);
  };

  // 7. Tier-Scoped Purge: Reset specific roster components and instantly update state and council_memory
  const purgeTierData = (targetTier, radarPassword = null) => {
    const currentRoster = rosterRef.current;
    let newRoster;

    const normalizedTarget = targetTier.toUpperCase();

    if (normalizedTarget === 'ALL') {
      newRoster = currentRoster.map(item => ({
        ...item,
        tier: null,
        tiers: [],
        isQuarantined: false,
        isArbiter: false
      }));
    } else if (normalizedTarget === 'QUARANTINE') {
      newRoster = currentRoster.map(item => ({
        ...item,
        isQuarantined: false
      }));
    } else if (normalizedTarget === 'ARBITER') {
      newRoster = currentRoster.map(item => ({
        ...item,
        isArbiter: false
      }));
    } else if (['FAST', 'PRO', 'OMEGA', 'GOD'].includes(normalizedTarget)) {
      newRoster = currentRoster.map(item => {
        const itemTiers = item.tiers || (item.tier ? [item.tier] : []);
        const targetLower = normalizedTarget.toLowerCase();
        if (itemTiers.includes(targetLower)) {
          const updatedTiers = itemTiers.filter(t => t !== targetLower);
          return { ...item, tiers: updatedTiers, tier: updatedTiers[0] || null };
        }
        return item;
      });
    } else {
      return;
    }

    setGlobalRoster(newRoster);
    saveRosterState(newRoster, radarPassword);
  };

  const toggleTierMember = (tier, modelId, radarPassword = null) => {
    const currentRoster = rosterRef.current;
    const model = currentRoster.find(item => item.modelId === modelId);

    if (model && model.isQuarantined) {
      return { success: false, error: "Cannot activate quarantined node." };
    }

    const itemTiers = model?.tiers || (model?.tier ? [model.tier] : []);
    const isAlreadyInTier = itemTiers.includes(tier);

    let newRoster;
    if (isAlreadyInTier) {
      newRoster = currentRoster.map(item => {
        if (item.modelId === modelId) {
          const updatedTiers = (item.tiers || (item.tier ? [item.tier] : [])).filter(t => t !== tier);
          return { ...item, tiers: updatedTiers, tier: updatedTiers[0] || null };
        }
        return item;
      });
      setGlobalRoster(newRoster);
      saveRosterState(newRoster, radarPassword);
      return { success: true };
    } else {
      const currentTierCount = currentRoster.filter(item => {
        const tiers = item.tiers || (item.tier ? [item.tier] : []);
        return tiers.includes(tier);
      }).length;
      if (currentTierCount >= 5) {
        return { success: false, error: `Maximum of 5 seats reached for ${tier.toUpperCase()} Council.` };
      }

      newRoster = currentRoster.map(item => {
        if (item.modelId === modelId) {
          const updatedTiers = [...(item.tiers || (item.tier ? [item.tier] : [])), tier];
          return { ...item, tiers: updatedTiers, tier: updatedTiers[0] || null };
        }
        return item;
      });
      setGlobalRoster(newRoster);
      saveRosterState(newRoster, radarPassword);
      return { success: true };
    }
  };

  const updateTierChairman = (tier, modelId, radarPassword = null) => {
    const currentRoster = rosterRef.current;
    const model = currentRoster.find(item => item.modelId === modelId);

    if (model && model.isQuarantined) {
      return;
    }

    const newRoster = currentRoster.map(item => {
      if (item.modelId === modelId) {
        return { ...item, isArbiter: true };
      } else {
        return { ...item, isArbiter: false };
      }
    });
    setGlobalRoster(newRoster);
    saveRosterState(newRoster, radarPassword);
  };

  const toggleQuarantine = (modelId, radarPassword = null) => {
    const currentRoster = rosterRef.current;
    const newRoster = currentRoster.map(item => {
      if (item.modelId === modelId) {
        const isQuarantined = !item.isQuarantined;
        return {
          ...item,
          isQuarantined,
          tier: null,
          tiers: [],
          isArbiter: isQuarantined ? false : item.isArbiter
        };
      }
      return item;
    });
    setGlobalRoster(newRoster);
    saveRosterState(newRoster, radarPassword);
  };

  return (
    <CouncilContext.Provider value={{ councilConfig, globalRoster, toggleTierMember, updateTierChairman, toggleQuarantine, purgeMemory, purgeTierData }}>
      {children}
    </CouncilContext.Provider>
  );
};
