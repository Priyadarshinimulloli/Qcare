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
} from "../utils/priorityCalculator.js";
import HealthTipPlanner from "./HealthTipPlanner";

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
  const [phoneValidation, setPhoneValidation] = useState({ isValid: true, message: '' });

  const avgTimePerPatient = 10; // minutes per patient

  // Phone number formatting function
  const formatPhoneNumber = (phoneNumber) => {
    let formatted = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!formatted.startsWith('+')) {
      // Assume Indian number if no country code and 10 digits
      if (formatted.length === 10) {
        formatted = '+91' + formatted;
      } else if (formatted.length > 10) {
        formatted = '+' + formatted;
      }
    }
    return formatted;
  };

  // Validate phone number format
  const validatePhoneNumber = (phoneNumber) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''));
  };

  // Handle contact number change with real-time validation
  const handleContactChange = (e) => {
    const value = e.target.value;
    setContact(value);
    
    if (value.length > 0) {
      const isValid = validatePhoneNumber(value);
      if (!isValid) {
        setPhoneValidation({
          isValid: false,
          message: 'Please include country code (e.g., +91 9876543210)'
        });
      } else {
        setPhoneValidation({ isValid: true, message: '✓ Valid phone number format' });
      }
    } else {
      setPhoneValidation({ isValid: true, message: '' });
    }
  };

  useEffect(() => {
    // Check if user is authenticated
    if (auth.currentUser) {
      setName(auth.currentUser.displayName || auth.currentUser.email || "");
    } else {
      // If not authenticated, redirect to login
      navigate("/login");
    }
  }, [navigate]);

  // Real-time queue monitoring with enhanced error handling and reconnection
  useEffect(() => {
    if (!queueId || !hospital || !department || !realTimeUpdates) return;

    console.log("Setting up real-time queue monitoring...");

    // Firebase query without orderBy to avoid composite index requirement
    // Using client-side sorting for better compatibility
    const queueQuery = query(
      collection(db, "queues"),
      where("hospital", "==", hospital),
      where("department", "==", department),
      where("status", "in", ["waiting", "called", "in-progress"])
    );

    const unsubscribe = onSnapshot(queueQuery, (snapshot) => {
      const queueList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      // Filter for real data only to ensure accurate position calculations
      .filter(patient => 
        patient.name && 
        patient.hospital && 
        patient.department && 
        patient.contact && 
        patient.name.length > 1 && 
        patient.patientId &&
        !patient.name.toLowerCase().includes('test') &&
        !patient.name.toLowerCase().includes('demo') &&
        !patient.name.toLowerCase().includes('sample')
      );

      console.log(`Raw queue data: ${snapshot.docs.length} total, ${queueList.length} real patients`);

      // Sort by timestamp first (client-side sorting to avoid composite index requirement)
      const sortedByTime = queueList.sort((a, b) => {
        const aTime = a.timestamp?.seconds || 0;
        const bTime = b.timestamp?.seconds || 0;
        return aTime - bTime;
      });

      // Sort queue by priority
      const sortedQueue = sortQueueByPriority(sortedByTime);
      
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
        
        // Update position and estimated time with real-time data
        setPosition(currentPatient.currentPosition || currentPatient.queuePosition);
        setEstimatedTime(currentPatient.estimatedWaitTime || calculateEstimatedWaitTime(
          currentPatient.currentPosition || currentPatient.queuePosition, 
          currentPatient.priority?.name || 'Standard'
        ));
        setQueueStatus(currentPatient.status);

        console.log(`Queue updated - Position: ${currentPatient.currentPosition || currentPatient.queuePosition}, Priority: ${currentPatient.priority?.name}, Status: ${currentPatient.status}`);
        
        // Check for status changes that require patient attention
        if (currentPatient.status === 'called' && queueStatus !== 'called') {
          setNotifications(prev => [...prev, {
            type: 'status_change',
            message: '🔔 You have been called! Please proceed to the department.',
            priority: 'urgent',
            timestamp: new Date().toLocaleTimeString()
          }]);
        }
      } else {
        // Patient might have been completed - check with more comprehensive query
        const completedQuery = query(
          collection(db, "queues"),
          where("hospital", "==", hospital),
          where("department", "==", department),
          where("status", "==", "completed")
        );
        
        getDocs(completedQuery).then(completedSnapshot => {
          const completedPatient = completedSnapshot.docs.find(doc => doc.id === queueId);
          if (completedPatient) {
            setQueueStatus("completed");
            setNotifications(prev => [...prev, {
              type: 'completed',
              message: '✅ Your appointment has been completed. Thank you!',
              priority: 'success',
              timestamp: new Date().toLocaleTimeString()
            }]);
            console.log("Patient has been marked as completed");
          } else {
            console.log("Patient not found in current queue - may have been removed");
          }
        });
      }
    }, (error) => {
      console.error("Error monitoring queue:", error);
      setNotifications(prev => [...prev, {
        type: 'error',
        message: 'Connection issue detected. Retrying...',
        priority: 'warning',
        timestamp: new Date().toLocaleTimeString()
      }]);
    });

    return () => {
      console.log("Cleaning up queue monitoring...");
      unsubscribe();
    };
  }, [queueId, hospital, department, realTimeUpdates, position, queueStatus]);

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
      // Validate and format phone number
      if (!validatePhoneNumber(contact)) {
        alert('Please enter a valid phone number with country code (e.g., +91 9876543210)');
        setLoading(false);
        return;
      }

      const formattedContact = formatPhoneNumber(contact);
      console.log('📞 Original contact:', contact);
      console.log('📞 Formatted contact:', formattedContact);

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
        priority: priority,
        timestamp: { seconds: Date.now() / 1000 }
      }];

      const sortedQueue = sortQueueByPriority(tempQueue);
      const calculatedPosition = sortedQueue.findIndex(item => 
        item.priorityScore === priority.score && !item.id
      ) + 1;

      const calculatedWaitTime = calculateEstimatedWaitTime(calculatedPosition, priority.name);

      // Add queue entry to Firestore with priority and custom ID
      const docRef = await addDoc(collection(db, "queues"), {
        customQueueId: customId,
        patientId: auth.currentUser.uid,
        patientEmail: auth.currentUser.email,
        name,
        age: parseInt(age),
        contact: formattedContact, // Use formatted phone number
        originalContact: contact, // Keep original for reference
        hospital,
        department,
        doctor,
        symptoms,
        priority: priority,
        priorityScore: priority.score,
        priorityDescription: priority.description, // Use description instead of undefined reasons
        escalated: priority.score >= 80, // Mark as escalated if High or Critical priority
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
      if (priority.score >= 80) { // Show notification for High or Critical priority
        setNotifications([{
          type: 'priority_assigned',
          message: `Your queue has been prioritized: ${priority.name}. Your priority level has been automatically assigned.`,
          priority: 'info'
        }]);
      }

      console.log(`Queue created successfully:
        - Custom Queue ID: ${customId}
        - Firestore ID: ${newQueueId}
        - Priority: ${priority.name} (Score: ${priority.score})
        - Position: ${calculatedPosition}
        - Estimated wait: ${calculatedWaitTime} minutes
        - Description: ${priority.description}`);

      // Enable real-time updates after successful queue creation
      setRealTimeUpdates(true);

      // Show success message
      alert(`Queue booked successfully! 
      
Queue ID: ${customId}
Priority: ${priority.name}
Position: ${calculatedPosition}
Estimated wait: ${calculatedWaitTime} minutes

Redirecting to your dashboard...`);

      // Redirect to patient dashboard after successful queue creation
      setTimeout(() => {
        navigate("/patient");
      }, 1500); // Small delay to show success message

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
        <div className="home-container">
          {/* Welcome Card */}
          <div className="welcome-card">
            <div className="welcome-content">
              <div className="welcome-icon">🏥</div>
              <h2>Welcome to Patient Portal</h2>
              <p>Book your appointment and join the hospital queue easily</p>
            </div>
          </div>

          {/* Health Tips Card */}
          <div className="health-tips-card">
            <HealthTipPlanner userId={auth?.currentUser?.uid} />
          </div>

          {/* Queue Booking Card */}
          <div className="queue-booking-card">
            <div className="card-header">
              <div className="header-icon">📋</div>
              <div className="header-content">
                <h2>Book Your Appointment</h2>
                <p>Fill in the details below to join the hospital queue</p>
              </div>
            </div>
            
            <form className="queue-form" onSubmit={handleSubmit}>
              <div className="form-section">
                <h3>Personal Information</h3>
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
                      min="1"
                      max="120"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="contact">Contact Number</label>
                  <input
                    id="contact"
                    type="tel"
                    placeholder="Enter your contact number (e.g., +91 9876543210)"
                    value={contact}
                    onChange={handleContactChange}
                    required
                    style={{
                      borderColor: phoneValidation.isValid ? '#ddd' : '#dc3545'
                    }}
                  />
                  <small style={{
                    color: phoneValidation.isValid ? '#28a745' : '#dc3545', 
                    fontSize: '0.8rem', 
                    marginTop: '0.25rem', 
                    display: 'block'
                  }}>
                    {phoneValidation.message || 'Include country code (e.g., +91 for India, +1 for US)'}
                  </small>
                </div>
              </div>

              <div className="form-section">
                <h3>Appointment Details</h3>
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
              </div>

              <div className="form-section">
                <h3>Additional Information</h3>
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
              </div>

              <div className="form-actions">
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
              </div>
            </form>
          </div> {/* Close queue-booking-card */}

          {queueId && (
            <div className="queue-details">
              <div className="queue-details-header">
                <h3>Your Queue Details</h3>
                <div className="queue-status-container">
                  <div className={`queue-status ${queueStatus}`}>
                    {queueStatus === "waiting" && "⏳ Waiting"}
                    {queueStatus === "called" && "📞 Called - Please proceed"}
                    {queueStatus === "in-progress" && "👨‍⚕️ In Progress"}
                    {queueStatus === "completed" && "✅ Completed"}
                  </div>
                  {realTimeUpdates && (
                    <div className="real-time-indicator">
                      <div className="pulse-dot"></div>
                      <span>Live Updates</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Priority Information */}
              {priorityInfo && (
                <div className="priority-info">
                  <div className="priority-badge" style={{ backgroundColor: priorityInfo.color }}>
                    {priorityInfo.name}
                  </div>
                  {priorityInfo.escalated && (
                    <div className="priority-reasons">
                      <strong>Priority Level:</strong> {priorityInfo.description}
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
        </div> {/* Close home-container */}
      </main>
    </div>
  );
};

export default Home;