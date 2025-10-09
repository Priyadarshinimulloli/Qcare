import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import HealthTipPlanner from "../components/HealthTipPlanner";

export default function Home() {
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(false);

  // join form state
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [contact, setContact] = useState("");
  const [department, setDepartment] = useState("General");
  const [symptoms, setSymptoms] = useState("");

  useEffect(() => {
    // subscribe to the 'queues' collection ordered by timestamp
    try {
      const q = query(collection(db, "queues"), orderBy("timestamp", "asc"));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          setQueues(docs);
          setLoading(false);
        },
        (err) => {
          console.error("queues onSnapshot error:", err);
          setLoading(false);
        }
      );
      return () => unsub();
    } catch (err) {
      console.error("subscribe queues failed", err);
      setLoading(false);
    }
  }, []);

  const joinQueue = async (e) => {
    e.preventDefault();
    if (!name || !contact) return alert("Please enter your name and contact");
    try {
      await addDoc(collection(db, "queues"), {
        name,
        age: age || null,
        contact,
        department,
        symptoms: symptoms || "",
        status: "waiting",
        tipsCompleted: [],
        wellnessScore: 0,
        timestamp: serverTimestamp(),
        createdBy: auth?.currentUser?.uid || null,
      });
      setName("");
      setAge("");
      setContact("");
      setSymptoms("");
      alert("You have joined the queue");
    } catch (err) {
      console.error("joinQueue failed", err);
      alert("Failed to join queue");
    }
  };

  const fmtTime = (t) => {
    if (!t) return "-";
    try {
      return t.seconds ? new Date(t.seconds * 1000).toLocaleTimeString() : new Date(t).toLocaleTimeString();
    } catch {
      return "-";
    }
  };

  return (
    <div className="home-main" style={{ paddingTop: 24 }}>
      <div className="welcome-container">
        <h1 style={{ margin: 0 }}>Daily Health Tips</h1>
        <p style={{ marginTop: 8, color: "var(--text-secondary)" }}>Simple daily tips & a habit checklist to keep patients engaged while waiting.</p>
      </div>

      <section className="health-tips-grid" style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 24 }}>
        <aside className="tips-sidebar">
          <div className="queue-summary">
            <div className="summary-item">Total patients: <strong>{queues.length}</strong></div>
            <div className="summary-item">Waiting: <strong>{queues.filter((q) => (q.status || "").toLowerCase() === "waiting").length}</strong></div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="submit-button" onClick={async () => {
              try {
                const snap = await getDocs(collection(db, "healthTips"));
                if (!snap.empty) return alert("Health tips already seeded.");
                const samples = [
                  { category: "General", tip: "Drink at least 2 liters of water daily.", day: new Date().toISOString().split("T")[0] },
                  { category: "Cardiology", tip: "Take a 20-minute brisk walk today.", day: new Date().toISOString().split("T")[0] },
                  { category: "Wellness", tip: "Try 5 minutes of mindful breathing.", day: new Date().toISOString().split("T")[0] },
                ];
                for (const t of samples) await addDoc(collection(db, "healthTips"), t);
                alert("Seeded sample health tips.");
              } catch (err) {
                console.error(err);
                alert("Seeding failed: " + err?.message);
              }
            }}>Seed sample tips</button>
          </div>
        </aside>

        <main className="tips-main">
          <div className="queue-panel">
            <div className="panel-header">
              <div>Showing: <strong>{queues.length}</strong> total</div>
              <div>Waiting: <strong>{queues.filter((q) => (q.status || "").toLowerCase() === "waiting").length}</strong></div>
            </div>
            <div style={{ marginTop: 12 }}>
              <HealthTipPlanner userId={auth?.currentUser?.uid || null} />
            </div>
          </div>
        </main>
      </section>
    </div>
  );
}
