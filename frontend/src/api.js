// --- THE MASTER UPLINK CONFIGURATION ---
// V9.9.4: Data Fragmentation Buffer & Strict Failsafes
const SERVER_URL = import.meta.env.VITE_API_URL || window.location.origin;
const API_BASE = `${SERVER_URL}/api`; 

export const api = {
  async listConversations() {
    const res = await fetch(`${API_BASE}/conversations`);
    if (!res.ok) throw new Error("ARCHIVE_ACCESS_DENIED");
    return res.json();
  },

  async getConversation(id) {
    const res = await fetch(`${API_BASE}/conversations/${id}`);
    if (!res.ok) throw new Error("SESSION_ID_NOT_FOUND");
    return res.json();
  },

  async createConversation() {
    const res = await fetch(`${API_BASE}/conversations`, { method: 'POST' });
    if (!res.ok) throw new Error(`CORE_REFUSED_SESSION: ${res.status}`);
    return res.json();
  },

  async renameConversation(id, title) {
    const res = await fetch(`${API_BASE}/conversations/${id}/title`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    if (!res.ok) throw new Error("RENAME_FAILED");
  },

  async clearMessages(id) {
    const res = await fetch(`${API_BASE}/conversations/${id}/messages`, { method: 'DELETE' });
    if (!res.ok) throw new Error("PURGE_FAILED");
  },

  async deleteConversation(id) {
    const res = await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("DELETE_FAILED");
  },

  async sendMessageStream(conversationId, content, files, tier, onEvent, council = null, chairman = null, visualEngine = 'dall-e-3') {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('tier', tier);
    formData.append('visual_engine', visualEngine);
    const quarantined = JSON.parse(localStorage.getItem('quarantineList') || '[]');

    if (council) {
      const filteredCouncil = council.filter(slug => !quarantined.includes(slug));
      formData.append('council', JSON.stringify(filteredCouncil));
    }
    
    if (chairman) {
      let finalChairman = chairman;
      if (quarantined.includes(chairman)) {
        finalChairman = 'google/gemini-3.1-pro-preview';
      }
      formData.append('chairman', finalChairman);
    }
    if (files) {
      files.forEach(f => formData.append('files', f));
    }

    const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      onEvent('error', { detail: "TRANSMISSION_REJECTED" });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    // V9.9.4: The Fragmentation Buffer
    // This stitches broken network packets back together before parsing
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // SSE sends a double newline \n\n to signify a complete chunk
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n\n')) >= 0) {
        // Extract the complete chunk and remove it from the buffer
        const completeChunk = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 2);
        
        if (completeChunk.startsWith('data: ')) {
          const dataStr = completeChunk.slice(6);
          
          if (dataStr === '[DONE]') {
            onEvent('complete');
            continue;
          }
          
          try {
            const data = JSON.parse(dataStr);
            onEvent(data.type, data);
          } catch (e) {
            console.error('SSE_PARSING_ERROR: Data fragment lost.', e);
          }
        }
      }
    }
  }
};