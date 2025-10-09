import React, { useEffect, useState, useMemo } from "react";
import { fetchTips, fetchUserHabits, toggleTipCompletion } from "../utils/healthTipsApi";
import { doc } from "firebase/firestore";

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

    Promise.all([fetchTips(category), fetchUserHabits(userId)])
      .then(([fetchedTips, userHabits]) => {
        if (!mounted) return;
        setTips(fetchedTips || []);
        setCompletedTips(userHabits?.completedTips || []);
      })
      .catch((err) => {
        console.error("HealthTipPlanner error:", err);
        if (mounted) setError(err?.message || String(err));
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [userId, category]);

  const progress = useMemo(() => {
    if (!tips.length) return 0;
    return (completedTips.length / tips.length) * 100;
  }, [tips, completedTips]);

  async function handleToggle(tipId) {
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
    <div style={{ maxWidth: 720, width: "100%", padding: 16 }}>
      <div style={{ padding: 16, borderRadius: 12, background: "#fff", boxShadow: "0 6px 20px rgba(0,0,0,0.06)" }}>
        <h2 style={{ margin: 0, marginBottom: 12, color: "#065f46" }}>💡 Health Tips for You</h2>

        {loading && <p>Loading tips…</p>}
        {error && <p style={{ color: "#b91c1c" }}>Error: {error}</p>}

        {!loading && !tips.length && <p>No tips available right now.</p>}

        {tips.map((tip) => (
          <div key={tip.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 8 }}>
            <div style={{ flex: 1, paddingRight: 12 }}>
              <div style={{ fontSize: 14 }}>{tip.tip}</div>
              {tip.category && <div style={{ fontSize: 12, color: "#6b7280" }}>{tip.category}</div>}
            </div>
            <Checkbox checked={completedTips.includes(tip.id)} onChange={() => handleToggle(tip.id)} />
          </div>
        ))}

        <div style={{ marginTop: 12 }}>
          <Progress value={progress} />
          <p style={{ marginTop: 8, color: "#6b7280", fontSize: 13 }}>
            You’ve completed {completedTips.length}/{tips.length} tips today!
          </p>
        </div>
      </div>
    </div>
  );
}
