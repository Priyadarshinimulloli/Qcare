import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot, orderBy, getDocs } from "firebase/firestore";
import "./PatientDashboard.css";

// richer mock data for fallback UI when Firestore reads fail
const mockAppointments = [
  { id: 'apt-001', date: '2025-10-15', time: '10:30', doctor: 'Dr. Asha Patel', department: 'Cardiology', status: 'Upcoming' },
  { id: 'apt-002', date: '2025-09-12', time: '14:00', doctor: 'Dr. Ravi Kumar', department: 'Orthopedics', status: 'Completed' },
  { id: 'apt-003', date: '2025-11-03', time: '09:00', doctor: 'Dr. Meera Singh', department: 'Dermatology', status: 'Upcoming' }
];

const mockVitals = {
  recordedAt: { seconds: Math.floor((Date.now() - 1000 * 60 * 60 * 24) / 1000) }, // 1 day ago
  bloodPressure: '120/78 mmHg',
  heartRate: '72 bpm',
  temperature: '36.7 °C',
  respiratoryRate: '16 breaths/min'
};

const mockPrescriptions = [
  { id: 'rx-001', name: 'Atorvastatin 10mg', instructions: 'Once daily at night', prescribedOn: '2025-09-12' },
  { id: 'rx-002', name: 'Paracetamol 500mg', instructions: '1-2 tablets every 4-6 hours as needed', prescribedOn: '2025-09-12' },
  { id: 'rx-003', name: 'Vitamin D 1000 IU', instructions: 'Once daily', prescribedOn: '2025-10-01' }
];

// mock queue list: include a few patients with positions and timestamps so hero shows realistic values
const mockQueues = [
  { id: 'q-001', customQueueId: 'Q-1001', department: 'General Medicine', status: 'waiting', estimatedWaitTime: 10, position: 1, queuePosition: 1, timestamp: { seconds: Math.floor((Date.now() - 1000 * 60 * 5) / 1000) } },
  { id: 'q-002', customQueueId: 'Q-1002', department: 'General Medicine', status: 'waiting', estimatedWaitTime: 15, position: 2, queuePosition: 2, timestamp: { seconds: Math.floor((Date.now() - 1000 * 60 * 8) / 1000) } },
  { id: 'q-003', customQueueId: 'Q-1003', department: 'ENT', status: 'waiting', estimatedWaitTime: 20, position: 3, queuePosition: 3, timestamp: { seconds: Math.floor((Date.now() - 1000 * 60 * 12) / 1000) } },
  { id: 'q-004', customQueueId: 'Q-1004', department: 'Pediatrics', status: 'waiting', estimatedWaitTime: 30, position: 4, queuePosition: 4, timestamp: { seconds: Math.floor((Date.now() - 1000 * 60 * 20) / 1000) } }
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
  const [calculatedPosition, setCalculatedPosition] = useState(null);
  const [calculatedPatientsBehind, setCalculatedPatientsBehind] = useState(0);
  const [calculatedEstimatedTime, setCalculatedEstimatedTime] = useState(null);

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
        if (!items.length) {
          // no live queues found; use mock fallback so UI remains populated
          setUsingMockData(true);
          setMyQueues(mockQueues);
          setAppointments(mockAppointments);
          setPrescriptions(mockPrescriptions);
          setVitals(mockVitals);
          setCalculatedPosition(mockQueues[0]?.position || null);
          setCalculatedPatientsBehind(Math.max(0, mockQueues.length - (mockQueues[0]?.position || 0)));
          setCalculatedEstimatedTime(mockQueues[0]?.estimatedWaitTime || Math.max(5, Math.round((mockQueues.length - (mockQueues[0]?.position || 0)) * 5)));
        } else {
          setMyQueues(items);

          // compute position & patients behind by querying the department queue
          (async () => {
            try {
              const userQueue = items[0];
              const dept = userQueue.department || null;
              if (dept) {
                const deptQ = query(collection(db, 'queues'), where('department', '==', dept), where('status', '==', 'waiting'));
                const allSnap = await getDocs(deptQ);
                const all = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                // sort by timestamp ascending (oldest first -> position 1)
                all.sort((a, b) => {
                  const aT = a.timestamp?.seconds || 0;
                  const bT = b.timestamp?.seconds || 0;
                  return aT - bT;
                });
                const idx = all.findIndex(q => q.id === userQueue.id);
                const pos = idx >= 0 ? idx + 1 : 1;
                const behind = Math.max(0, all.length - pos);
                setCalculatedPosition(pos);
                setCalculatedPatientsBehind(behind);
                setCalculatedEstimatedTime(Math.max(5, Math.round(behind * 5)));
              }
            } catch (posErr) {
              console.error('Error computing position', posErr);
            }
          })();
        }
      }, (err) => {
        console.error('PatientDashboard queues onSnapshot error', err);
        setError(err.message || String(err));
        // fallback to mock data so UI remains usable
        setUsingMockData(true);
        setMyQueues(mockQueues);
        // set calculated values from mock
        setCalculatedPosition(mockQueues[0]?.position || null);
        setCalculatedPatientsBehind(Math.max(0, mockQueues.length - (mockQueues[0]?.position || 0)));
        setCalculatedEstimatedTime(mockQueues[0]?.estimatedWaitTime || Math.max(5, Math.round((mockQueues.length - (mockQueues[0]?.position || 0)) * 5)));
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

  // derived display values for hero (fallbacks when fields are not present)
  const position = myQueues[0]?.position || myQueues[0]?.queuePosition || myQueues[0]?.currentPosition || null;
  const estimatedTime = myQueues[0]?.estimatedWaitTime || (myQueues.length ? Math.max(5, Math.round((myQueues.length - (position || 0)) * 5)) : null);
  const patientsBehind = myQueues.length ? Math.max(0, myQueues.length - (position || 0)) : 0;

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
        </div>
      </header>

      <main style={{ marginTop: 18 }}>
  {error && (
          <div style={{ padding: 12, background: '#fee2e2', color: '#991b1b', borderRadius: 8, marginBottom: 12 }}>
            Error loading data: {error}
          </div>
        )}

        {/* mock-data banner intentionally hidden per user request */}

        {/* summary cards removed per user request */}
        {/* Hero center status */}
        <div className="pd-hero">
          <h1 style={{ margin: 0, fontSize: 28 }}>Your Queue Status</h1>
          <div style={{ color: '#6b7280', marginTop: 6 }}>Appointment ID: {myQueues[0]?.customQueueId || myQueues[0]?.id || '—'}</div>

          <div className="pd-status-card">
            <h3 style={{ marginTop: 0 }}>You are {calculatedPosition || '-'}{(calculatedPosition && calculatedPosition % 10 === 1 && calculatedPosition !== 11) ? 'st' : (calculatedPosition && calculatedPosition % 10 === 2 && calculatedPosition !== 12) ? 'nd' : (calculatedPosition && calculatedPosition % 10 === 3 && calculatedPosition !== 13) ? 'rd' : 'th'} in line!</h3>

            <div className="pd-stats-row">
              <div className="pd-stat">
                <div className="icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" stroke="#2563eb" strokeWidth="1.5"/><path d="M4 20c0-3.31 2.69-6 6-6h4c3.31 0 6 2.69 6 6" stroke="#2563eb" strokeWidth="1.5"/></svg>
                </div>
                <div className="big">{calculatedPosition || '-'}</div>
                <div className="label">Your Position</div>
              </div>

              <div className="pd-stat">
                <div className="icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#2563eb" strokeWidth="1.5"/><path d="M12 7v6l4 2" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="big">{calculatedEstimatedTime ? `~${calculatedEstimatedTime}` : '-'}</div>
                <div className="label">min wait</div>
              </div>

              <div className="pd-stat">
                <div className="icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M17 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM7 11c1.66 0 3-1.34 3-3S8.66 5 7 5 4 6.34 4 8s1.34 3 3 3zM7 13c-2.33 0-7 1.17-7 3.5V20h14v-3.5C14 14.17 9.33 13 7 13zM17 13c-.29 0-.62.02-.97.05C17.27 13.44 18 14.15 18 15v3h4v-1.5c0-2.33-4.67-3.5-4.03-3.95-.11-.03-.23-.05-.37-.05z" stroke="#2563eb" strokeWidth="0.6"/></svg>
                </div>
                <div className="big">{typeof calculatedPatientsBehind === 'number' ? calculatedPatientsBehind : 0}</div>
                <div className="label">Patients Behind You</div>
              </div>
            </div>

            <div className="pd-doctor-line">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2"/></svg>
              <div className="doc-text">You will be seen by: <strong style={{ marginLeft: 6 }}>Dr. Evelyn Reed</strong></div>
            </div>
          </div>

          <div className="pd-footer-note">We will send you a notification when it's your turn. Please stay near the waiting area.</div>
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
