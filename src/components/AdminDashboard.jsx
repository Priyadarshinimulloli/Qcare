import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { notifyPatient, TTS_LANGUAGES } from "../utils/ttsService";

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc,
  getDocs
} from "firebase/firestore";
import { db } from "../firebase";
import { sortQueueByPriority, PRIORITY_LEVELS } from "../utils/priorityCalculator";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [selectedHospital, setSelectedHospital] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [queueList, setQueueList] = useState([]);
  const [loading, setLoading] = useState(false);

const [ttsVolume, setTtsVolume] = useState(1);

  const [stats, setStats] = useState({
    waiting: 0,
    called: 0,
    inProgress: 0,
    completed: 0
  });

  const hospitals = [
    "City Care Hospital",
    "LifeLine Hospital", 
    "MediCare Central",
    "General Hospital"
  ];

  const departments = [
    "Cardiology",
    "Neurology", 
    "Orthopedics",
    "Pediatrics",
    "Dermatology",
    "General Medicine"
  ];

  // Real-time queue monitoring
  useEffect(() => {
    if (!selectedHospital || !selectedDepartment) {
      setQueueList([]);
      return;
    }

    console.log(`Monitoring queue for ${selectedHospital} - ${selectedDepartment}`);

    const queueQuery = query(
      collection(db, "queues"),
      where("hospital", "==", selectedHospital),
      where("department", "==", selectedDepartment),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(queueQuery, (snapshot) => {
      const queues = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort queues by priority for better admin view
      const sortedQueues = sortQueueByPriority(queues);
      setQueueList(sortedQueues);

      // Calculate stats
      const newStats = {
        waiting: queues.filter(q => q.status === "waiting").length,
        called: queues.filter(q => q.status === "called").length,
        inProgress: queues.filter(q => q.status === "in-progress").length,
        completed: queues.filter(q => q.status === "completed").length
      };
      setStats(newStats);

      console.log(`Queue updated: ${queues.length} total patients`, newStats);
    });

    return () => unsubscribe();
  }, [selectedHospital, selectedDepartment]);

  const updateQueueStatus = async (queueId, newStatus) => {
    setLoading(true);
    try {
      const queueRef = doc(db, "queues", queueId);
      await updateDoc(queueRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      console.log(`Updated queue ${queueId} to status: ${newStatus}`);
    } catch (error) {
      console.error("Error updating queue:", error);
      alert("Failed to update queue status");
    } finally {
      setLoading(false);
    }
  };

  const callNextPatient = async () => {
  const waitingPatients = queueList.filter(q => q.status === "waiting");
  if (waitingPatients.length === 0) {
    alert("No patients waiting in queue");
    return;
  }

  const nextPatient = waitingPatients[0];
  await updateQueueStatus(nextPatient.id, "called");

  // Use the ttsVolume state instead of 1
  notifyPatient(nextPatient, TTS_LANGUAGES.ENGLISH, ttsVolume);
  notifyPatient(nextPatient, TTS_LANGUAGES.HINDI, ttsVolume);
notifyPatient(nextPatient, TTS_LANGUAGES.KANNADA, ttsVolume);


  alert(`Next Patient: ${nextPatient.name} (${nextPatient.id}) - Please proceed to Consultation Room ${nextPatient.doctor || "1"}`);
};

  const getStatusColor = (status) => {
    switch (status) {
      case "waiting": return "#2563eb";
      case "called": return "#dc2626";
      case "in-progress": return "#f59e0b";
      case "completed": return "#10b981";
      default: return "#6b7280";
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString();
  };
   const callPatientPhone = async () => {
  const waitingPatients = queueList.filter(q => q.status === "waiting");
  if (waitingPatients.length === 0) {
    alert("No patients waiting in queue");
    return;
  }

  const nextPatient = waitingPatients[0];
  setLoading(true);

  try {
    // Call your backend API to initiate Twilio call
    const response = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/call-patient`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextPatient)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Twilio call error:", errorData);
      alert("Failed to make call via phone");
    } else {
      alert(`Calling patient ${nextPatient.name} (${nextPatient.id}) via phone...`);
      // Update queue status to 'called'
      await updateQueueStatus(nextPatient.id, "called");
    }
  } catch (error) {
    console.error("Error calling patient via phone:", error);
    alert("Error initiating call");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="admin-page">
      <header className="header">
        <div className="header-content">
          <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
            <div className="logo-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="18" y="8" width="4" height="24" fill="#2563eb"/>
                <rect x="8" y="18" width="24" height="4" fill="#2563eb"/>
                <circle cx="20" cy="20" r="18" stroke="#2563eb" strokeWidth="2"/>
              </svg>
            </div>
            <h1 className="hospital-name">MediCare Hospital - Admin</h1>
          </div>
          <div className="header-actions">
            <button 
              onClick={() => navigate('/analytics')} 
              className="analytics-button"
              title="View Analytics Dashboard"
            >
              📊 Analytics
            </button>
            <button onClick={() => navigate("/")} className="logout-button">
              Back to Home
            </button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-controls">
          <h2>Queue Management Dashboard</h2>

          <div className="tts-controls"> {/* ✅ TTS Volume Slider */}
            <label htmlFor="volume">Notification Volume:</label>
            <input
              type="range"
              id="volume"
              min="0"
              max="1"
              step="0.05"
              value={ttsVolume}
              onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
            />
            <span>{Math.round(ttsVolume * 100)}%</span>
          </div>
          
          <div className="filter-controls">
            <div className="form-group">
              <label htmlFor="hospital">Select Hospital</label>
              <select
                id="hospital"
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
              >
                <option value="">Choose a hospital</option>
                {hospitals.map(hospital => (
                  <option key={hospital} value={hospital}>{hospital}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="department">Select Department</label>
              <select
                id="department"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <option value="">Choose a department</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedHospital && selectedDepartment && (
            <>
              <div className="queue-stats">
                <div className="stat-card waiting">
                  <h3>{stats.waiting}</h3>
                  <p>Waiting</p>
                </div>
                <div className="stat-card called">
                  <h3>{stats.called}</h3>
                  <p>Called</p>
                </div>
                <div className="stat-card in-progress">
                  <h3>{stats.inProgress}</h3>
                  <p>In Progress</p>
                </div>
                <div className="stat-card completed">
                  <h3>{stats.completed}</h3>
                  <p>Completed</p>
                </div>
              </div>

              <div className="quick-actions">
                <button 
                  onClick={callNextPatient}
                  className="call-next-btn"
                  disabled={loading || stats.waiting === 0}
                >
                  📢 Call Next Patient
                </button>
                <button 
                 onClick={callPatientPhone}
                  className="call-phone-btn"
                  disabled={loading || stats.waiting === 0}
                 style={{ marginLeft: "10px" }}
                    >
                 📞 Call Patient via Phone
                 </button>
              </div>
            </>
          )}
        </div>

        {/* ...Rest of your queue table code remains exactly the same */}
      </main>
    </div>
  );
};

export default AdminDashboard;