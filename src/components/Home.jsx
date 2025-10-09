import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot, orderBy } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";
import { 
  calculatePriority, 
  generateQueueId, 
  sortQueueByPriority,
  calculateEstimatedWaitTime,
  checkForNotifications,
  PRIORITY_LEVELS
} from "../utils/priorityCalculator";

const Home = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [contact, setContact] = useState("");
  const [hospital, setHospital] = useState("");
  const [department, setDepartment] = useState("");
  const [doctor, setDoctor] = useState("");
  const [symptoms, setSymptoms] = useState("");

  const [queueId, setQueueId] = useState(null);
  const [position, setPosition] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [queueStatus, setQueueStatus] = useState(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [priorityInfo, setPriorityInfo] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [customQueueId, setCustomQueueId] = useState(null);

  const avgTimePerPatient = 10; // minutes per patient

  useEffect(() => {
    // Check if user is authenticated
    if (auth.currentUser) {
      setName(auth.currentUser.displayName || auth.currentUser.email || "");
    } else {
      // If not authenticated, redirect to login
      navigate("/login");
    }
  }, [navigate]);

  // Real-time queue monitoring
  useEffect(() => {
    if (!queueId || !hospital || !department || !realTimeUpdates) return;

    console.log("Setting up real-time queue monitoring...");

    const queueQuery = query(
      collection(db, "queues"),
      where("hospital", "==", hospital),
      where("department", "==", department),
      where("status", "in", ["waiting", "called"]),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(queueQuery, (snapshot) => {
      const queueList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log("Raw queue data:", queueList.length, "items");

      // Sort queue by priority
      const sortedQueue = sortQueueByPriority(queueList);
      
      console.log("Sorted queue:", sortedQueue.map(q => `${q.customQueueId}: ${q.priority?.name} (${q.priorityScore})`));

      // Find current patient's position in sorted queue
      const currentPatient = sortedQueue.find(item => item.id === queueId);
      
      if (currentPatient) {
        const oldPosition = { currentPosition: position };
        const newPosition = { currentPosition: currentPatient.currentPosition };
        
        // Check for notifications about position changes
        if (position !== null && position !== currentPatient.currentPosition) {
          const newNotifications = checkForNotifications(oldPosition, newPosition);
          if (newNotifications.length > 0) {
            setNotifications(prev => [...prev, ...newNotifications]);
            // Auto-remove notifications after 10 seconds
            setTimeout(() => {
              setNotifications(prev => prev.filter(n => !newNotifications.includes(n)));
            }, 10000);
          }
        }
        
        setPosition(currentPatient.currentPosition);
        setEstimatedTime(calculateEstimatedWaitTime(
          currentPatient.currentPosition, 
          currentPatient.priority?.name || 'Standard'
        ));
        setQueueStatus(currentPatient.status);

        console.log(`Queue updated - Position: ${currentPatient.currentPosition}, Priority: ${currentPatient.priority?.name}, Status: ${currentPatient.status}`);
      } else {
        console.log("Patient not found in current queue - may have been completed");
      }
    }, (error) => {
      console.error("Error monitoring queue:", error);
    });

    return () => {
      console.log("Cleaning up queue monitoring...");
      unsubscribe();
    };
  }, [queueId, hospital, department, realTimeUpdates, avgTimePerPatient]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculate patient priority based on age and symptoms
      const priority = calculatePriority(parseInt(age), symptoms);
      setPriorityInfo(priority);
      
      // Generate custom queue ID
      const customId = generateQueueId(hospital, department);
      setCustomQueueId(customId);

      console.log("Priority calculated:", priority);
      console.log("Generated Queue ID:", customId);

      // Get current queue to calculate position with priority
      const queueQuery = query(
        collection(db, "queues"),
        where("hospital", "==", hospital),
        where("department", "==", department),
        where("status", "==", "waiting")
      );

      const currentQueueSnapshot = await getDocs(queueQuery);
      const currentQueue = currentQueueSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Add new patient to queue temporarily to calculate position
      const tempQueue = [...currentQueue, {
        priorityScore: priority.score,
        priority: priority.priority,
        timestamp: { seconds: Date.now() / 1000 }
      }];

      const sortedQueue = sortQueueByPriority(tempQueue);
      const calculatedPosition = sortedQueue.findIndex(item => 
        item.priorityScore === priority.score && !item.id
      ) + 1;

      const calculatedWaitTime = calculateEstimatedWaitTime(calculatedPosition, priority.priority.name);

      // Add queue entry to Firestore with priority and custom ID
      const docRef = await addDoc(collection(db, "queues"), {
        customQueueId: customId,
        patientId: auth.currentUser.uid,
        patientEmail: auth.currentUser.email,
        name,
        age: parseInt(age),
        contact,
        hospital,
        department,
        doctor,
        symptoms,
        priority: priority.priority,
        priorityScore: priority.score,
        priorityReasons: priority.reasons,
        escalated: priority.escalated,
        status: "waiting",
        queuePosition: calculatedPosition,
        estimatedWaitTime: calculatedWaitTime,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
        // Analytics tracking fields
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        },
        sessionData: {
          referrer: document.referrer,
          currentUrl: window.location.href,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        bookingMethod: "web_portal"
      });

      const newQueueId = docRef.id;
      setQueueId(newQueueId);
      setPosition(calculatedPosition);
      setEstimatedTime(calculatedWaitTime);
      setQueueStatus("waiting");

      // Show priority information to user
      if (priority.escalated) {
        setNotifications([{
          type: 'priority_assigned',
          message: `Your queue has been prioritized: ${priority.priority.name}. Reasons: ${priority.reasons.join(', ')}`,
          priority: 'info'
        }]);
      }

      console.log(`Queue created successfully:
        - Custom Queue ID: ${customId}
        - Firestore ID: ${newQueueId}
        - Priority: ${priority.priority.name} (Score: ${priority.score})
        - Position: ${calculatedPosition}
        - Estimated wait: ${calculatedWaitTime} minutes
        - Reasons: ${priority.reasons.join(', ')}`);

      // Enable real-time updates after successful queue creation
      setRealTimeUpdates(true);

    } catch (err) {
      console.error("Error creating queue:", err);
      alert("Failed to create queue. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page">
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
            <h1 className="hospital-name">MediCare Hospital</h1>
          </div>
          <div className="header-actions">
            <button 
              onClick={() => navigate('/analytics')} 
              className="analytics-button"
              title="View Analytics Dashboard"
            >
              📊 Analytics
            </button>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="home-main">
        <div className="welcome-container">
          <h2>Welcome to Patient Portal</h2>
          <p>You have successfully logged in to your patient account.</p>
        </div>

        {/* Queue / Appointment Form */}
        <div className="queue-form-container">
          <div className="queue-form-header">
            <h2>Book Your Appointment / Queue</h2>
            <p>Fill in the details below to join the hospital queue</p>
          </div>
          
          <form className="queue-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="age">Age</label>
                <input
                  id="age"
                  type="number"
                  placeholder="Enter your age"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="contact">Contact Number</label>
              <input
                id="contact"
                type="tel"
                placeholder="Enter your contact number"
                value={contact}
                onChange={e => setContact(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="hospital">Select Hospital</label>
                <select
                  id="hospital"
                  value={hospital}
                  onChange={e => setHospital(e.target.value)}
                  required
                >
                  <option value="">Choose a hospital</option>
                  <option value="City Care Hospital">City Care Hospital</option>
                  <option value="LifeLine Hospital">LifeLine Hospital</option>
                  <option value="MediCare Central">MediCare Central</option>
                  <option value="General Hospital">General Hospital</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="department">Select Department</label>
                <select
                  id="department"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  required
                >
                  <option value="">Choose a department</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="General Medicine">General Medicine</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="doctor">Preferred Doctor (Optional)</label>
              <input
                id="doctor"
                type="text"
                placeholder="Enter doctor's name if you have a preference"
                value={doctor}
                onChange={e => setDoctor(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="symptoms">Symptoms / Notes (Optional)</label>
              <textarea
                id="symptoms"
                placeholder="Describe your symptoms or any additional notes"
                value={symptoms}
                onChange={e => setSymptoms(e.target.value)}
                rows="3"
              />
            </div>

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Booking Queue...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 1L13 4H7L10 1Z" fill="currentColor"/>
                    <rect x="2" y="4" width="16" height="14" rx="1" fill="currentColor"/>
                  </svg>
                  Book Queue
                </>
              )}
            </button>
          </form>

          {queueId && (
            <div className="queue-details">
              <div className="queue-details-header">
                <h3>Your Queue Details</h3>
                <div className={`queue-status ${queueStatus}`}>
                  {queueStatus === "waiting" && "Waiting"}
                  {queueStatus === "called" && "Called - Please proceed"}
                  {queueStatus === "in-progress" && "In Progress"}
                  {queueStatus === "completed" && "Completed"}
                </div>
              </div>

              {/* Priority Information */}
              {priorityInfo && (
                <div className="priority-info">
                  <div className="priority-badge" style={{ backgroundColor: priorityInfo.priority.color }}>
                    {priorityInfo.priority.name}
                  </div>
                  {priorityInfo.escalated && (
                    <div className="priority-reasons">
                      <strong>Priority Reasons:</strong> {priorityInfo.reasons.join(', ')}
                    </div>
                  )}
                </div>
              )}

              {/* Notifications */}
              {notifications.map((notification, index) => (
                <div key={index} className={`notification notification-${notification.priority}`}>
                  <span className="notification-icon">
                    {notification.type === 'priority_assigned' && '⚡'}
                    {notification.type === 'position_improved' && '📈'}
                    {notification.type === 'almost_ready' && '⏰'}
                    {notification.type === 'next_patient' && '🔔'}
                  </span>
                  {notification.message}
                  <button 
                    className="notification-close"
                    onClick={() => setNotifications(prev => prev.filter((_, i) => i !== index))}
                  >
                    ×
                  </button>
                </div>
              ))}

              <div className="queue-info">
                <div className="queue-info-item">
                  <span className="label">Queue ID:</span>
                  <span className="value">{customQueueId || queueId}</span>
                </div>
                <div className="queue-info-item">
                  <span className="label">Position in Queue:</span>
                  <span className="value">
                    {position}
                    {realTimeUpdates && (
                      <span className="live-indicator">🔴 Live</span>
                    )}
                  </span>
                </div>
                <div className="queue-info-item">
                  <span className="label">Estimated Waiting Time:</span>
                  <span className="value">{estimatedTime} minutes</span>
                </div>
                <div className="queue-info-item">
                  <span className="label">Hospital:</span>
                  <span className="value">{hospital}</span>
                </div>
                <div className="queue-info-item">
                  <span className="label">Department:</span>
                  <span className="value">{department}</span>
                </div>
                {queueStatus === "called" && (
                  <div className="queue-alert">
                    <strong>🔔 Your turn! Please proceed to the department.</strong>
                  </div>
                )}
                {position <= 3 && queueStatus === "waiting" && (
                  <div className="queue-warning">
                    <strong>⚠️ Your turn is approaching. Please be ready.</strong>
                  </div>
                )}
              </div>
              
              <div className="queue-actions">
                <button 
                  onClick={() => setRealTimeUpdates(!realTimeUpdates)}
                  className={`toggle-updates ${realTimeUpdates ? 'active' : ''}`}
                >
                  {realTimeUpdates ? '⏸️ Pause Updates' : '▶️ Resume Updates'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
