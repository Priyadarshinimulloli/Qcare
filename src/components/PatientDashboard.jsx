import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot, orderBy, getDocs } from "firebase/firestore";
import "./PatientDashboard.css";

const mockAppointments = [
  { id: 'apt-001', date: '2025-10-15', time: '10:30', doctor: 'Dr. Asha Patel', department: 'Cardiology', status: 'Upcoming' },
  { id: 'apt-002', date: '2025-09-12', time: '14:00', doctor: 'Dr. Ravi Kumar', department: 'Orthopedics', status: 'Completed' }
];

const mockVitals = {
  bloodPressure: '120/78 mmHg',
  heartRate: '72 bpm',
  temperature: '36.7 °C',
  respiratoryRate: '16 breaths/min'
};

const mockPrescriptions = [
  { id: 'rx-001', name: 'Atorvastatin 10mg', instructions: 'Once daily at night', prescribedOn: '2025-09-12' },
  { id: 'rx-002', name: 'Paracetamol 500mg', instructions: '1-2 tablets every 4-6 hours as needed', prescribedOn: '2025-09-12' }
];

const mockQueues = [
  { id: 'q-001', customQueueId: 'Q-1001', department: 'General Medicine', status: 'waiting', estimatedWaitTime: 25, timestamp: { seconds: Math.floor(Date.now()/1000) } }
];

export default function PatientDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [myQueues, setMyQueues] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [vitals, setVitals] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingMockData, setUsingMockData] = useState(false);

  useEffect(() => {
    let unsubQueues = null;
    let unsubAppointments = null;
    const current = auth?.currentUser;
    if (!current) {
      setUser(null);
      setLoading(false);
      return undefined;
    }

    setUser({ name: current.displayName || current.email, email: current.email });

    try {
      // Queues (real-time) - avoid server-side orderBy to prevent index/watch issues; sort client-side
      const qQueues = query(collection(db, "queues"), where("createdBy", "==", current.uid));
      unsubQueues = onSnapshot(qQueues, (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // sort by timestamp.seconds if available, newest first
        items.sort((a, b) => {
          const aTime = a.timestamp?.seconds || 0;
          const bTime = b.timestamp?.seconds || 0;
          return bTime - aTime;
        });
        setMyQueues(items);
      }, (err) => {
        console.error('PatientDashboard queues onSnapshot error', err);
        setError(err.message || String(err));
        // fallback to mock data so UI remains usable
        setUsingMockData(true);
        setMyQueues(mockQueues);
        setAppointments(mockAppointments);
        setPrescriptions(mockPrescriptions);
        setVitals(mockVitals);
      });

      // Appointments (real-time)
      // Appointments - get realtime stream, sort client-side by date (newest first)
      const qApts = query(collection(db, "appointments"), where("patientId", "==", current.uid));
      unsubAppointments = onSnapshot(qApts, (snap) => {
        const apts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        apts.sort((a, b) => {
          // try ISO date first, fallback to timestamp.seconds
          const aDate = a.date ? new Date(a.date).getTime() : (a.timestamp?.seconds || 0) * 1000;
          const bDate = b.date ? new Date(b.date).getTime() : (b.timestamp?.seconds || 0) * 1000;
          return bDate - aDate;
        });
        setAppointments(apts);
      }, (err) => {
        console.error('PatientDashboard appointments onSnapshot error', err);
        setError(err.message || String(err));
        // fallback to mock
        setUsingMockData(true);
        setAppointments(mockAppointments);
      });

      // Vitals and prescriptions - load once
      (async () => {
  try {
          // Vitals - fetch and pick the latest by recordedAt/timestamp
          const vitalsQ = query(collection(db, "vitals"), where("patientId", "==", current.uid));
          const vitalsSnap = await getDocs(vitalsQ);
          const vitalsItems = vitalsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          vitalsItems.sort((a, b) => {
            const aTime = a.recordedAt?.seconds || a.timestamp?.seconds || 0;
            const bTime = b.recordedAt?.seconds || b.timestamp?.seconds || 0;
            return bTime - aTime;
          });
          const latestVitals = vitalsItems.length > 0 ? vitalsItems[0] : mockVitals;
          setVitals(latestVitals || mockVitals);

          // Prescriptions - fetch and sort client-side
          const rxQ = query(collection(db, "prescriptions"), where("patientId", "==", current.uid));
          const rxSnap = await getDocs(rxQ);
          const rxItems = rxSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          rxItems.sort((a, b) => {
            const aTime = a.prescribedOn ? new Date(a.prescribedOn).getTime() : (a.timestamp?.seconds || 0) * 1000;
            const bTime = b.prescribedOn ? new Date(b.prescribedOn).getTime() : (b.timestamp?.seconds || 0) * 1000;
            return bTime - aTime;
          });
          setPrescriptions(rxItems);
        } catch (readErr) {
          console.error('PatientDashboard data load error', readErr);
          setError(readErr.message || String(readErr));
          // apply mock fallback
          setUsingMockData(true);
          setVitals(mockVitals);
          setPrescriptions(mockPrescriptions);
          setAppointments(mockAppointments);
          setMyQueues(mockQueues);
        }
      })();

    } catch (err) {
      console.error('PatientDashboard init error', err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }

    return () => {
      if (unsubQueues) unsubQueues();
      if (unsubAppointments) unsubAppointments();
    };
  }, []);

  return (
    <div className="pd-root">
      <header className="pd-header">
        <div className="profile">
          <div className="pd-avatar">{user ? (user.name ? user.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()) : 'G'}</div>
          <div>
            <h2 style={{ margin: 0 }}>Patient Dashboard</h2>
            <div style={{ fontSize: 13, opacity: 0.95 }}>{user ? user.name : 'Guest'}</div>
          </div>
        </div>

        <div className="pd-actions">
          <button className="btn-primary" onClick={() => navigate('/health-tips')}>Health Tips</button>
          <Link to="/home" style={{ textDecoration: 'none' }}>
            <button className="btn-ghost">Home</button>
          </Link>
        </div>
      </header>

      <main style={{ marginTop: 18 }}>
        {error && (
          <div style={{ padding: 12, background: '#fee2e2', color: '#991b1b', borderRadius: 8, marginBottom: 12 }}>
            Error loading data: {error}
          </div>
        )}

        {usingMockData && (
          <div style={{ padding: 12, background: '#fff7ed', color: '#92400e', borderRadius: 8, marginBottom: 12 }}>
            Showing fallback mock data because live data could not be loaded.
          </div>
        )}

        <div className="pd-summary-grid">
          <div className="pd-card pd-card--accent-blue">
            <div className="label">Active Queue</div>
            <div className="value">{myQueues.length}</div>
            <div className="label">Entries created by you</div>
          </div>

          <div className="pd-card pd-card--accent-green">
            <div className="label">Upcoming Appointments</div>
            <div className="value">{appointments.filter(a => a.status === 'Upcoming').length}</div>
            <div className="label">You have upcoming visits</div>
          </div>

          <div className="pd-card pd-card--accent-orange">
            <div className="label">Active Prescriptions</div>
            <div className="value">{prescriptions.length}</div>
            <div className="label">Medications currently prescribed</div>
          </div>
        </div>

        {/* Detailed panels */}
        <div className="pd-main-grid">
          <section className="pd-card">
            <h3 style={{ marginTop: 0 }}>Your Queue Entries</h3>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center' }}>Loading…</div>
            ) : myQueues.length === 0 ? (
              <div style={{ padding: 12, borderRadius: 8 }}>No active queue entries.</div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {myQueues.map(q => (
                  <div key={q.id} className="pd-queue-item">
                    <div>
                      <div style={{ fontWeight: 700 }}>{q.customQueueId || q.name || 'Appointment'}</div>
                      <div style={{ color: '#6b7280', fontSize: 13 }}>{q.department || 'General'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{(q.status || 'waiting').toUpperCase()}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{q.estimatedWaitTime ? `${q.estimatedWaitTime} min` : '-'}</div>
                      <div style={{ marginTop: 6 }}>
                        <span className={`status-badge status-${(q.status || 'waiting')}`}>{(q.status || 'waiting')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="pd-aside">
            <div className="section pd-card">
              <h4 style={{ marginTop: 0 }}>Latest Vitals</h4>
              {vitals ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Blood Pressure</span><strong>{vitals.bloodPressure}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Heart Rate</span><strong>{vitals.heartRate}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Temp</span><strong>{vitals.temperature}</strong></div>
                </div>
              ) : (
                <div>No vitals recorded.</div>
              )}
            </div>

            <div className="section pd-card">
              <h4 style={{ marginTop: 0 }}>Prescriptions</h4>
              {prescriptions.length === 0 ? (
                <div>No active prescriptions.</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {prescriptions.slice(0,5).map(rx => (
                    <div key={rx.id} className="rx-item">
                      <div style={{ fontWeight: 600 }}>{rx.name}</div>
                      <div style={{ color: '#6b7280', fontSize: 13 }}>{rx.instructions}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
