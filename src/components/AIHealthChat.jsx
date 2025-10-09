import React, { useState, useRef } from 'react';
import './AIHealthChat.css';

const fallbackTips = (prompt) => {
  // Very small deterministic generator based on keywords
  const p = (prompt || '').toLowerCase();
  const tips = [];
  if (p.includes('sleep')) tips.push('Try keeping a consistent sleep schedule: go to bed and wake up at the same time each day.');
  if (p.includes('diet') || p.includes('food')) tips.push('Add a serving of vegetables to two meals a day and drink a glass of water before each meal.');
  if (p.includes('exercise') || p.includes('workout')) tips.push('Start with 10 minutes of brisk walking daily and increase gradually.');
  if (p.includes('stress') || p.includes('anxiety')) tips.push('Practice deep breathing for 3 minutes when you feel overwhelmed.');
  if (!tips.length) {
    tips.push('Stay hydrated, move regularly, and maintain a balanced diet. If you have specific concerns, ask me more details.');
  }
  return tips.join('\n\n');
};

export default function AIHealthChat({ userId = null }) {
  const [messages, setMessages] = useState([
    { role: 'system', text: 'I am a health tips assistant. I provide practical, non-diagnostic advice.' },
    { role: 'bot', text: 'Hi — ask me for a personalized health tip (sleep, diet, exercise, stress, etc.)' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef();

  const send = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setMessages(m => [...m, { role: 'user', text: userText }]);
    setInput('');
    setLoading(true);

    try {
      const endpoint = import.meta.env.VITE_AI_ENDPOINT;
      let reply = null;
      if (endpoint) {
        // Call configured endpoint (expects JSON { prompt }) and returns { reply }
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: userText, userId })
        });
        if (!res.ok) throw new Error('AI endpoint error');
        const json = await res.json();
        reply = json.reply || fallbackTips(userText);
      } else {
        // Local fallback
        reply = fallbackTips(userText);
      }

      setMessages(m => [...m, { role: 'bot', text: reply }]);
      // scroll
      setTimeout(() => containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' }), 50);
    } catch (err) {
      console.error('AI chat error', err);
      setMessages(m => [...m, { role: 'bot', text: 'Sorry, I could not generate tips right now. Try again or refine your request.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-root">
      <div className="ai-panel">
        <div className="ai-system">Tip bot — not a doctor. For serious issues, consult a professional.</div>
        <div className="ai-messages" ref={containerRef}>
          {messages.map((m, i) => (
            <div key={i} className={`ai-msg ${m.role === 'user' ? 'user' : m.role === 'bot' ? 'bot' : 'bot'}`}>
              {m.text}
            </div>
          ))}
        </div>

        <div className="ai-input-row">
          <input className="ai-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask for a tip (e.g. 'tips for better sleep')" />
          <button className="ai-send" onClick={send} disabled={loading}>{loading ? '…' : 'Send'}</button>
        </div>
      </div>
    </div>
  );
}
