import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

const CouncilContext = createContext();

export const useCouncil = () => useContext(CouncilContext);

export const CouncilProvider = ({ children }) => {
  const [councilConfig, setCouncilConfig] = useState(() => {
    const saved = localStorage.getItem('council_config');
    return saved ? JSON.parse(saved) : {
      fast: { council: ['openai/gpt-4o-mini'], chairman: 'openai/gpt-4o-mini' },
      pro: { council: ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet', 'google/gemini-1.5-pro'], chairman: 'openai/gpt-4o' },
      omega: { council: ['openai/gpt-4o', 'anthropic/claude-3-opus', 'google/gemini-1.5-pro'], chairman: 'anthropic/claude-3-opus' },
      god: { council: ['openai/o1-preview', 'anthropic/claude-3-5-sonnet', 'google/gemini-1.5-pro'], chairman: 'openai/o1-preview' }
    };
  });

  // Use a ref to allow synchronous resolution of the toggle action
  const configRef = useRef(councilConfig);

  useEffect(() => {
    configRef.current = councilConfig;
    localStorage.setItem('council_config', JSON.stringify(councilConfig));
  }, [councilConfig]);

  const toggleTierMember = (tier, modelId) => {
    const currentState = configRef.current;
    const isAlreadyInTier = currentState[tier].council.includes(modelId);

    if (isAlreadyInTier) {
      // Remove it from the tier
      setCouncilConfig(prev => ({
        ...prev,
        [tier]: { ...prev[tier], council: prev[tier].council.filter(id => id !== modelId) }
      }));
      return { success: true };
    } else {
      // It's not in this tier, so we are adding it. Check capacity first.
      if (currentState[tier].council.length >= 5) {
        return { success: false, error: `Maximum of 5 seats reached for ${tier.toUpperCase()} Council.` };
      }

      // Add to requested tier, remove from all other tiers
      setCouncilConfig(prev => {
        const newState = { ...prev };
        Object.keys(newState).forEach(t => {
          if (t === tier) {
            newState[t] = { ...newState[t], council: [...newState[t].council, modelId] };
          } else {
            newState[t] = { ...newState[t], council: newState[t].council.filter(id => id !== modelId) };
          }
        });
        return newState;
      });
      return { success: true };
    }
  };

  const updateTierChairman = (tier, modelId) => {
    setCouncilConfig(prev => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        chairman: modelId
      }
    }));
  };

  return (
    <CouncilContext.Provider value={{ councilConfig, toggleTierMember, updateTierChairman }}>
      {children}
    </CouncilContext.Provider>
  );
};
