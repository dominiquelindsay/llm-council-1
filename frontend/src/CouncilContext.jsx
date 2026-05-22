import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

const CouncilContext = createContext();

export const useCouncil = () => useContext(CouncilContext);

// Shared core fallback models used for initialization and fresh-fetch default states
const DEFAULT_ROSTER = [
  { modelId: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', tier: 'fast', isQuarantined: false, isArbiter: true },
  { modelId: 'openai/gpt-4o', name: 'GPT-4o', tier: 'pro', isQuarantined: false, isArbiter: true },
  { modelId: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', tier: 'pro', isQuarantined: false, isArbiter: false },
  { modelId: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro', tier: 'pro', isQuarantined: false, isArbiter: false },
  { modelId: 'openai/gpt-4o', name: 'GPT-4o', tier: 'omega', isQuarantined: false, isArbiter: false },
  { modelId: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', tier: 'omega', isQuarantined: false, isArbiter: true },
  { modelId: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro', tier: 'omega', isQuarantined: false, isArbiter: false },
  { modelId: 'openai/o1-preview', name: 'o1 Preview', tier: 'god', isQuarantined: false, isArbiter: true },
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
      parsedMemory.forEach(item => {
        if (item && item.modelId) {
          initialRoster.push({
            modelId: item.modelId,
            name: item.name || item.modelId.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            tier: item.tier || null,
            isQuarantined: !!item.isQuarantined,
            isArbiter: !!item.isArbiter
          });
          processedModelIds.add(item.modelId);
        }
      });
    }

    DEFAULT_ROSTER.forEach(def => {
      if (!processedModelIds.has(def.modelId)) {
        initialRoster.push(def);
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
    if (item.tier && councilConfig[item.tier]) {
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
  const saveRosterState = (roster) => {
    const modified = roster.filter(item => item.tier || item.isQuarantined || item.isArbiter)
                            .map(item => ({
                              modelId: item.modelId,
                              tier: item.tier || null,
                              isQuarantined: !!item.isQuarantined,
                              isArbiter: !!item.isArbiter
                            }));
    localStorage.setItem('council_memory', JSON.stringify(modified));
  };

  // 5. Ghost Exorcism Rehydration Logic: Apply historical configurations only to active OpenRouter models
  useEffect(() => {
    const fetchAndRehydrate = async () => {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/models');
        const data = await response.json();
        
        // Read consolidated historical config
        const savedMemory = localStorage.getItem('council_memory');
        let parsedMemory = [];
        if (savedMemory) {
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

          // A. If exists in history, apply saved modifications
          const memMatch = parsedMemory.find(item => item.modelId === modelId);
          if (memMatch) {
            return {
              modelId,
              name,
              tier: memMatch.tier || null,
              isQuarantined: !!memMatch.isQuarantined,
              isArbiter: !!memMatch.isArbiter
            };
          }

          // B. Else if exists in defaults, inject fallback configuration
          const defaultMatch = DEFAULT_ROSTER.find(item => item.modelId === modelId);
          if (defaultMatch) {
            return {
              modelId,
              name,
              tier: defaultMatch.tier || null,
              isQuarantined: !!defaultMatch.isQuarantined,
              isArbiter: !!defaultMatch.isArbiter
            };
          }

          // C. Else clean baseline model
          return {
            modelId,
            name,
            tier: null,
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
      isQuarantined: false,
      isArbiter: false
    }));
    setGlobalRoster(resetRoster);
  };

  // 7. Tier-Scoped Purge: Reset specific roster components and instantly update state and council_memory
  const purgeTierData = (targetTier) => {
    const currentRoster = rosterRef.current;
    let newRoster;

    const normalizedTarget = targetTier.toUpperCase();

    if (normalizedTarget === 'ALL') {
      newRoster = currentRoster.map(item => ({
        ...item,
        tier: null,
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
        if (item.tier && item.tier.toUpperCase() === normalizedTarget) {
          return { ...item, tier: null };
        }
        return item;
      });
    } else {
      return;
    }

    setGlobalRoster(newRoster);
    saveRosterState(newRoster);
  };

  const toggleTierMember = (tier, modelId) => {
    const currentRoster = rosterRef.current;
    const model = currentRoster.find(item => item.modelId === modelId);

    if (model && model.isQuarantined) {
      return { success: false, error: "Cannot activate quarantined node." };
    }

    const isAlreadyInTier = currentRoster.some(item => item.modelId === modelId && item.tier === tier);

    let newRoster;
    if (isAlreadyInTier) {
      newRoster = currentRoster.map(item => {
        if (item.modelId === modelId && item.tier === tier) {
          return { ...item, tier: null };
        }
        return item;
      });
      setGlobalRoster(newRoster);
      saveRosterState(newRoster);
      return { success: true };
    } else {
      const currentTierCount = currentRoster.filter(item => item.tier === tier).length;
      if (currentTierCount >= 5) {
        return { success: false, error: `Maximum of 5 seats reached for ${tier.toUpperCase()} Council.` };
      }

      newRoster = currentRoster.map(item => {
        if (item.modelId === modelId) {
          return { ...item, tier };
        }
        return item;
      });
      setGlobalRoster(newRoster);
      saveRosterState(newRoster);
      return { success: true };
    }
  };

  const updateTierChairman = (tier, modelId) => {
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
    saveRosterState(newRoster);
  };

  const toggleQuarantine = (modelId) => {
    const currentRoster = rosterRef.current;
    const newRoster = currentRoster.map(item => {
      if (item.modelId === modelId) {
        const isQuarantined = !item.isQuarantined;
        return {
          ...item,
          isQuarantined,
          tier: isQuarantined ? null : item.tier,
          isArbiter: isQuarantined ? false : item.isArbiter
        };
      }
      return item;
    });
    setGlobalRoster(newRoster);
    saveRosterState(newRoster);
  };

  return (
    <CouncilContext.Provider value={{ councilConfig, globalRoster, toggleTierMember, updateTierChairman, toggleQuarantine, purgeMemory, purgeTierData }}>
      {children}
    </CouncilContext.Provider>
  );
};
