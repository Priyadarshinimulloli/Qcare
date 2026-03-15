import React, { useEffect, useState, useMemo } from "react";
import { fetchTips, fetchUserHabits, toggleTipCompletion } from "../utils/healthTipsApi";
import "./HealthTipPlanner.css";

// Built-in tips shown when Firestore healthTips collection is empty or unreachable
const BUILTIN_TIPS = [
  { id: 'bt-1', tip: 'Drink at least 8 glasses of water today to stay hydrated.', category: 'Hydration' },
  { id: 'bt-2', tip: 'Take a 10-minute walk — even indoors — to improve circulation.', category: 'Exercise' },
  { id: 'bt-3', tip: 'Eat a fruit or vegetable with every meal for better nutrition.', category: 'Diet' },
  { id: 'bt-4', tip: 'Practice slow, deep breathing for 3 minutes to reduce stress.', category: 'Mental Health' },
  { id: 'bt-5', tip: 'Wash your hands thoroughly before meals and after using the restroom.', category: 'Hygiene' },
  { id: 'bt-6', tip: 'Aim for 7–8 hours of sleep tonight by setting a consistent bedtime.', category: 'Sleep' },
  { id: 'bt-7', tip: 'Avoid screens 30 minutes before bed to improve sleep quality.', category: 'Sleep' },
  { id: 'bt-8', tip: 'Stand up and stretch for 2 minutes every hour if seated for long.', category: 'Exercise' },
];

// Lightweight UI primitives (no external UI lib required) — feel free to replace with your design system
function Progress({ value }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div style={{ width: "100%", background: "#f3f4f6", borderRadius: 8, height: 12 }}>
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: "linear-gradient(90deg,#16a34a,#4ade80)",
          borderRadius: 8,
          transition: "width 300ms ease",
        }}
      />
    </div>
  );
}

function Checkbox({ checked, onChange }) {
  return (
    <input
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{ width: 18, height: 18 }}
    />
  );
}

export default function HealthTipPlanner({ userId: propUserId, category = null }) {
  // If no userId is provided, create a temporary guest id in-memory
  const [userId] = useState(() => propUserId || `guest_${Math.random().toString(36).slice(2, 9)}`);
  const [tips, setTips] = useState([]);
  const [completedTips, setCompletedTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    // Fetch tips and user habits independently so one failure doesn't block the other
    const tipsPromise = fetchTips(category).catch((err) => {
      console.warn('Could not fetch Firestore tips, using built-in fallback:', err?.message);
      return []; // will fall back to BUILTIN_TIPS below
    });

    const habitsPromise = userId
      ? fetchUserHabits(userId).catch((err) => {
          console.warn('Could not fetch user habits:', err?.message);
          return { completedTips: [] };
        })
      : Promise.resolve({ completedTips: [] });

    Promise.all([tipsPromise, habitsPromise])
      .then(([fetchedTips, userHabits]) => {
        if (!mounted) return;
        // If Firestore has no tips, show built-in ones
        setTips(fetchedTips.length > 0 ? fetchedTips : BUILTIN_TIPS);
        setCompletedTips(userHabits?.completedTips || []);
      })
      .catch((err) => {
        if (mounted) {
          console.error('HealthTipPlanner error:', err);
          setTips(BUILTIN_TIPS);
        }
      })
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, [userId, category]);

  const progress = useMemo(() => {
    if (!tips.length) return 0;
    return (completedTips.length / tips.length) * 100;
  }, [tips, completedTips]);

  async function handleToggle(tipId) {
    if (!userId) return; // guest — no Firestore writes
    try {
      // optimistic update
      const had = completedTips.includes(tipId);
      const next = had ? completedTips.filter((t) => t !== tipId) : [...completedTips, tipId];
      setCompletedTips(next);
      await toggleTipCompletion(userId, tipId, next);
    } catch (err) {
      console.error("toggle error", err);
      // revert on failure
      setCompletedTips((cur) => (cur.includes(tipId) ? cur.filter((t) => t !== tipId) : [...cur, tipId]));
      setError(err?.message || String(err));
    }
  }

  return (
    <div className="ht-root">
      <div className="ht-panel">
        <div className="ht-header">
          <div>
            <div className="ht-title">💡 Health Tips for You</div>
            <div className="ht-note">Small, actionable tips to improve your daily health.</div>
          </div>
          <div className="ht-progress">
            <Progress value={progress} />
          </div>
        </div>

        {loading && <p>Loading tips…</p>}
        {error && !loading && (
          <p style={{ color: '#b91c1c', fontSize: 13 }}>Could not sync with server. Showing built-in tips.</p>
        )}

        {!loading && !tips.length && <p>No tips available right now.</p>}

        <div className="ht-list">
          {tips.map((tip) => (
            <div key={tip.id} className="ht-item">
              <div className="text">
                <div style={{ fontSize: 14 }}>{tip.tip}</div>
                {tip.category && <div className="ht-category">{tip.category}</div>}
              </div>
              <div>
                <Checkbox checked={completedTips.includes(tip.id)} onChange={() => handleToggle(tip.id)} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          <p style={{ marginTop: 8, color: "#6b7280", fontSize: 13 }}>
            You’ve completed {completedTips.length}/{tips.length} tips today!
          </p>
        </div>
      </div>
    </div>
  );
}
