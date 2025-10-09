import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc,
  getDocs,
  serverTimestamp,
  addDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { sortQueueByPriority, PRIORITY_LEVELS, calculateEstimatedWaitTime } from "../utils/priorityCalculator.js";
import twilioService from "../services/twilioService";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [selectedHospital, setSelectedHospital] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [queueList, setQueueList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    status: 'connecting',
    lastUpdate: null,
    totalConnections: 0,
    activeListeners: 0
  });
  const [stats, setStats] = useState({
    waiting: 0,
    called: 0,
    inProgress: 0,
    completed: 0,
    totalProcessed: 0,
    averageWaitTime: 0
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedPatients, setSelectedPatients] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds
  const [notifications, setNotifications] = useState([]);
  
  // SMS-related state
  const [smsLoading, setSmsLoading] = useState(false);
  const [showSmsPanel, setShowSmsPanel] = useState(false);
  const [customSmsMessage, setCustomSmsMessage] = useState('');
  const [smsRecipients, setSmsRecipients] = useState([]);
  
  const unsubscribeRef = useRef(null);
  const refreshIntervalRef = useRef(null);

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

  // Database connection monitoring
  useEffect(() => {
    const monitorConnection = () => {
      setConnectionStatus(prev => ({
        ...prev,
        status: 'connected',
        lastUpdate: new Date().toLocaleTimeString(),
        totalConnections: prev.totalConnections + 1
      }));
    };

    // Monitor every 30 seconds
    const connectionMonitor = setInterval(monitorConnection, 30000);
    monitorConnection(); // Initial check

    return () => clearInterval(connectionMonitor);
  }, []);

  // Real-time queue monitoring with enhanced features and debugging
  useEffect(() => {
    if (!selectedHospital || !selectedDepartment) {
      setQueueList([]);
      setConnectionStatus(prev => ({ ...prev, activeListeners: 0 }));
      return;
    }

    setLoading(true);
    console.log(`Setting up enhanced monitoring for ${selectedHospital} - ${selectedDepartment}`);

    // Clean up previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Firebase query without orderBy to avoid composite index requirement
    // Note: Using client-side sorting instead of server-side orderBy to avoid creating
    // composite indexes. For production with large datasets, consider creating the 
    // composite index: (hospital, department, timestamp) for better performance.
    const queueQuery = query(
      collection(db, "queues"),
      where("hospital", "==", selectedHospital),
      where("department", "==", selectedDepartment)
    );

    const unsubscribe = onSnapshot(queueQuery, (snapshot) => {
      console.log("🔄 Admin dashboard update received");
      console.log("📊 Raw snapshot data:", snapshot.docs.length, "documents");
      
      const queueData = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log(`📋 Patient ${data.customQueueId || doc.id}: Status=${data.status}, Priority=${data.priority?.name}`);
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp || { seconds: Date.now() / 1000 }
        };
      });

      // Sort by timestamp first (client-side sorting to avoid composite index requirement)
      const sortedByTime = queueData.sort((a, b) => {
        const aTime = a.timestamp?.seconds || 0;
        const bTime = b.timestamp?.seconds || 0;
        return aTime - bTime;
      });

      console.log("🎯 Time-sorted queue data:", sortedByTime);

      // Then sort by priority using our priority calculator
      const sortedQueue = sortQueueByPriority(sortedByTime);
      console.log("⚖️ Sorted queue:", sortedQueue.map(p => `${p.customQueueId}: ${p.priority?.name} (Score: ${p.priorityScore})`));
      
      // Add real-time calculations
      const enhancedQueue = sortedQueue.map((patient, index) => {
        const waitingQueuePosition = sortedQueue
          .filter(p => p.status === 'waiting')
          .findIndex(p => p.id === patient.id) + 1;
        
        const timeInQueue = patient.timestamp ? 
          Math.floor((Date.now() - (patient.timestamp.seconds * 1000)) / (1000 * 60)) : 0;
        
        const estimatedWaitTime = patient.status === 'waiting' 
          ? calculateEstimatedWaitTime(waitingQueuePosition, patient.priority?.name || 'Standard')
          : null;

        console.log(`👤 Enhanced patient ${patient.customQueueId}:`, {
          status: patient.status,
          position: patient.status === 'waiting' ? waitingQueuePosition : null,
          timeInQueue,
          estimatedWaitTime
        });
        
        return {
          ...patient,
          currentPosition: patient.status === 'waiting' ? waitingQueuePosition : null,
          estimatedWaitTime,
          timeInQueue,
          statusDuration: patient.lastStatusUpdate ? 
            Math.floor((Date.now() - new Date(patient.lastStatusUpdate).getTime()) / (1000 * 60)) : 0
        };
      });

      console.log("✅ Final enhanced queue:", enhancedQueue);
      setQueueList(enhancedQueue);

      // Enhanced statistics
      const completedToday = enhancedQueue.filter(p => 
        p.status === 'completed' && 
        p.timestamp && 
        new Date(p.timestamp.seconds * 1000).toDateString() === new Date().toDateString()
      );

      const newStats = {
        waiting: enhancedQueue.filter(p => p.status === 'waiting').length,
        called: enhancedQueue.filter(p => p.status === 'called').length,
        inProgress: enhancedQueue.filter(p => p.status === 'in-progress').length,
        completed: enhancedQueue.filter(p => p.status === 'completed').length,
        totalProcessed: enhancedQueue.length,
        averageWaitTime: completedToday.length > 0 
          ? completedToday.reduce((acc, p) => acc + p.timeInQueue, 0) / completedToday.length 
          : 0,
        completedToday: completedToday.length
      };
      
      console.log("📈 Updated statistics:", newStats);
      setStats(newStats);
      setConnectionStatus(prev => ({
        ...prev,
        status: 'connected',
        lastUpdate: new Date().toLocaleTimeString(),
        activeListeners: 1
      }));
      
      setLoading(false);
      console.log("🎉 Admin dashboard update completed successfully");
    }, (error) => {
      console.error("❌ Error in enhanced admin monitoring:", error);
      setConnectionStatus(prev => ({
        ...prev,
        status: 'error',
        lastUpdate: new Date().toLocaleTimeString()
      }));
      setLoading(false);
      
      // Add user notification for errors with specific handling for index errors
      let errorMessage = `Database connection error: ${error.message}`;
      let notificationType = 'error';
      
      if (error.message.includes('query requires an index')) {
        errorMessage = 'Database query optimized for better performance. Using client-side sorting instead of server-side indexing.';
        notificationType = 'info';
        console.log("ℹ️ Using client-side sorting to avoid composite index requirement");
      }
      
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: notificationType,
        message: errorMessage,
        timestamp: new Date().toLocaleTimeString()
      }]);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedHospital, selectedDepartment, refreshTrigger]);

  // Auto-refresh and notification system
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        setConnectionStatus(prev => ({
          ...prev,
          lastUpdate: new Date().toLocaleTimeString()
        }));
      }, refreshInterval * 1000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  // Enhanced patient status update with automatic queue reorganization
  const updatePatientStatus = async (patientId, newStatus, customQueueId = null) => {
    try {
      const currentPatient = queueList.find(p => p.id === patientId);
      
      const updateData = {
        status: newStatus,
        lastStatusUpdate: new Date().toISOString(),
        updatedBy: 'admin',
        updatedAt: serverTimestamp(),
        ...(newStatus === 'completed' && {
          completedAt: serverTimestamp(),
          completionTime: new Date().toISOString()
        }),
        ...(newStatus === 'called' && {
          calledAt: serverTimestamp()
        }),
        ...(newStatus === 'in-progress' && {
          startedAt: serverTimestamp()
        })
      };

      // Update the patient record in Firestore
      await updateDoc(doc(db, "queues", patientId), updateData);

      // Send SMS notification for status changes
      if (currentPatient && ['called', 'completed'].includes(newStatus)) {
        try {
          await twilioService.sendQueueNotification(currentPatient, newStatus);
          console.log(`📱 SMS sent to ${currentPatient.name} for status: ${newStatus}`);
        } catch (smsError) {
          console.error('SMS notification failed:', smsError);
          setNotifications(prev => [...prev, {
            id: Date.now(),
            type: 'warning',
            message: `Status updated but SMS failed: ${smsError.message}`,
            timestamp: new Date().toLocaleTimeString()
          }]);
        }
      }

      // If patient status changes affect queue order, recalculate positions
      if (['completed', 'called', 'in-progress', 'no-show'].includes(newStatus)) {
        // Get all waiting patients for reordering
        const waitingPatients = queueList.filter(p => 
          p.id !== patientId && 
          p.status === 'waiting' && 
          p.hospital === selectedHospital && 
          p.department === selectedDepartment &&
          // Filter for real patient data only
          p.patientName && 
          !p.patientName.toLowerCase().includes('test') &&
          !p.patientName.toLowerCase().includes('demo') &&
          !p.patientName.toLowerCase().includes('mock') &&
          p.contactNumber && p.contactNumber.length >= 10
        );

        if (waitingPatients.length > 0) {
          // Update positions for remaining waiting patients
          await updateQueueOrder();
          
          console.log(`Queue reordered after ${currentPatient?.patientName || 'patient'} status changed to ${newStatus}. ${waitingPatients.length} waiting patients updated.`);
        }
      }

      // Log admin action for audit trail
      await addDoc(collection(db, "admin_actions"), {
        action: 'status_update',
        patientId,
        customQueueId,
        oldStatus: currentPatient?.status,
        newStatus,
        timestamp: serverTimestamp(),
        hospital: selectedHospital,
        department: selectedDepartment,
        adminId: 'current_admin',
        sessionId: Date.now().toString()
      });

      // Show notification with queue update info
      const waitingCount = queueList.filter(p => 
        p.status === 'waiting' && 
        p.hospital === selectedHospital && 
        p.department === selectedDepartment
      ).length;
      
      const statusUpdateMessage = ['completed', 'called', 'in-progress', 'no-show'].includes(newStatus) && waitingCount > 0
        ? `Patient ${customQueueId || patientId} marked as ${newStatus}. Queue positions updated for ${waitingCount} waiting patients.`
        : `Patient ${customQueueId || patientId} marked as ${newStatus}`;

      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'success',
        message: statusUpdateMessage,
        timestamp: new Date().toLocaleTimeString()
      }]);

      console.log(`Patient ${patientId} status updated to: ${newStatus}. Real-time updates will propagate automatically.`);
    } catch (error) {
      console.error("Error updating patient status:", error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `Failed to update patient status: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  };

  // Bulk actions for multiple patients
  const handleBulkAction = async () => {
    if (selectedPatients.size === 0 || !bulkAction) return;

    try {
      const promises = Array.from(selectedPatients).map(patientId => {
        const patient = queueList.find(p => p.id === patientId);
        return updatePatientStatus(patientId, bulkAction, patient?.customQueueId);
      });

      await Promise.all(promises);
      setSelectedPatients(new Set());
      setBulkAction('');
      
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'success',
        message: `Bulk action completed: ${selectedPatients.size} patients marked as ${bulkAction}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } catch (error) {
      console.error("Error performing bulk action:", error);
    }
  };

  // Function to recalculate and update queue order for all patients
  const updateQueueOrder = async () => {
    try {
      if (!selectedHospital || !selectedDepartment) return;

      console.log("🔄 Recalculating queue order...");

      // Get all waiting patients for the current hospital/department
      const waitingQuery = query(
        collection(db, "queues"),
        where("hospital", "==", selectedHospital),
        where("department", "==", selectedDepartment),
        where("status", "==", "waiting")
      );

      const waitingSnapshot = await getDocs(waitingQuery);
      const waitingPatients = waitingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`📊 Found ${waitingPatients.length} waiting patients to reorder`);

      // Filter for real data only
      const realWaitingPatients = waitingPatients.filter(patient => 
        patient.name && 
        patient.name.trim() !== '' && 
        patient.age && 
        patient.contact && 
        patient.contact.trim() !== '' &&
        !patient.name.toLowerCase().includes('test') &&
        !patient.name.toLowerCase().includes('mock') &&
        !patient.name.toLowerCase().includes('demo')
      );

      if (realWaitingPatients.length === 0) {
        console.log("No real waiting patients to reorder");
        return;
      }

      // Sort by priority to determine new order
      const sortedWaitingPatients = sortQueueByPriority(realWaitingPatients);
      
      console.log("🎯 New queue order:", sortedWaitingPatients.map((p, index) => 
        `${index + 1}. ${p.customQueueId}: ${p.priority?.name} (Score: ${p.priorityScore})`
      ));

      // Update each patient's position and estimated wait time
      const updatePromises = sortedWaitingPatients.map(async (patient, index) => {
        const newPosition = index + 1;
        const newEstimatedWaitTime = calculateEstimatedWaitTime(newPosition, patient.priority?.name || 'Standard');
        
        await updateDoc(doc(db, "queues", patient.id), {
          currentPosition: newPosition,
          estimatedWaitTime: newEstimatedWaitTime,
          lastPositionUpdate: serverTimestamp(),
          queueOrderUpdateReason: 'Priority change - automatic reordering'
        });

        console.log(`✅ Updated ${patient.customQueueId}: Position ${newPosition}, Wait ${newEstimatedWaitTime}min`);
      });

      await Promise.all(updatePromises);
      console.log("🎉 Queue order update completed successfully");

      // Log the queue reordering action
      await addDoc(collection(db, "admin_actions"), {
        action: 'queue_reorder',
        reason: 'Priority escalation',
        hospital: selectedHospital,
        department: selectedDepartment,
        patientsAffected: realWaitingPatients.length,
        timestamp: serverTimestamp(),
        adminId: 'current_admin'
      });

    } catch (error) {
      console.error("❌ Error updating queue order:", error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `Failed to update queue order: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  };

  // Emergency priority override with queue reordering
  const escalatePatient = async (patientId) => {
    try {
      // Update the patient's priority
      await updateDoc(doc(db, "queues", patientId), {
        priority: PRIORITY_LEVELS.CRITICAL,
        priorityScore: PRIORITY_LEVELS.CRITICAL.score + 10,
        escalated: true,
        escalatedBy: 'admin',
        escalatedAt: serverTimestamp(),
        priorityReasons: ['Emergency escalation by admin'],
        lastPriorityUpdate: serverTimestamp()
      });

      console.log(`🚨 Patient ${patientId} escalated to CRITICAL priority`);

      // Immediately recalculate and update queue positions for all waiting patients
      await updateQueueOrder();

      const patient = queueList.find(p => p.id === patientId);
      
      // Send SMS notification for emergency escalation
      try {
        await twilioService.sendQueueNotification(patient, 'emergency_escalation');
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'success',
          message: `Emergency escalation SMS sent to ${patient?.name}`,
          timestamp: new Date().toLocaleTimeString()
        }]);
      } catch (smsError) {
        console.error('SMS notification failed:', smsError);
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'warning',
          message: `Patient escalated but SMS notification failed: ${smsError.message}`,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }

      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'warning',
        message: `Patient ${patient?.customQueueId || patientId} escalated to emergency priority - queue positions updated`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } catch (error) {
      console.error("Error escalating patient:", error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `Failed to escalate patient: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  };

  // SMS Functions
  const sendSMSToPatient = async (patient, notificationType = 'called') => {
    try {
      setSmsLoading(true);
      await twilioService.sendQueueNotification(patient, notificationType);
      
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'success',
        message: `SMS sent to ${patient.name} (${patient.customQueueId})`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } catch (error) {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `SMS failed: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setSmsLoading(false);
    }
  };

  // Test SMS function to verify Twilio API
  const testTwilioAPI = async () => {
    try {
      setSmsLoading(true);
      console.log('🧪 Testing Twilio API integration...');
      
      // Use the first patient's phone number for testing, or a default test number
      const testPhone = queueList.length > 0 ? queueList[0].contact : '+918105792715';
      
      const result = await twilioService.testSMS(testPhone);
      
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'success', 
        message: `✅ Test SMS sent successfully! Message ID: ${result.messageId}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      console.log('✅ Twilio API test successful:', result);
    } catch (error) {
      console.error('❌ Twilio API test failed:', error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `❌ Test SMS failed: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setSmsLoading(false);
    }
  };

  const sendBulkSMS = async () => {
    if (smsRecipients.length === 0 || !customSmsMessage.trim()) {
      alert('Please select recipients and enter a message');
      return;
    }

    try {
      setSmsLoading(true);
      const selectedPatients = queueList.filter(p => smsRecipients.includes(p.id));
      
      await twilioService.sendBulkNotifications(selectedPatients, customSmsMessage, 'bulk_admin');
      
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'success',
        message: `Bulk SMS sent to ${selectedPatients.length} patients`,
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      setShowSmsPanel(false);
      setCustomSmsMessage('');
      setSmsRecipients([]);
    } catch (error) {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `Bulk SMS failed: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setSmsLoading(false);
    }
  };

  const sendEmergencyBroadcast = async () => {
    const message = prompt('Enter emergency message for all waiting patients:');
    if (!message) return;

    try {
      setSmsLoading(true);
      const waitingPatients = queueList.filter(p => p.status === 'waiting');
      
      if (waitingPatients.length === 0) {
        alert('No waiting patients to notify');
        return;
      }

      await twilioService.sendBulkNotifications(
        waitingPatients, 
        `🚨 EMERGENCY NOTICE: ${message}`,
        'emergency_broadcast'
      );
      
      await twilioService.sendEmergencyBroadcast(selectedHospital, selectedDepartment, message);
      
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'warning',
        message: `Emergency broadcast sent to ${waitingPatients.length} waiting patients`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } catch (error) {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: `Emergency broadcast failed: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setSmsLoading(false);
    }
  };

  // Filter and search functionality
  const getFilteredQueue = () => {
    // First filter for real data only - exclude incomplete or test entries
    let filtered = queueList.filter(patient => 
      patient.name && // Must have patient name
      patient.hospital && // Must have hospital
      patient.department && // Must have department
      patient.contact && // Must have contact info
      patient.name.length > 1 && // Name must be meaningful
      patient.patientId && // Must have patient ID (authenticated user)
      !patient.name.toLowerCase().includes('test') && // Exclude test entries
      !patient.name.toLowerCase().includes('demo') && // Exclude demo entries
      !patient.name.toLowerCase().includes('sample') // Exclude sample entries
    );

    if (filterStatus !== 'all') {
      filtered = filtered.filter(patient => patient.status === filterStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(patient =>
        patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.customQueueId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.contact?.includes(searchTerm)
      );
    }

    // Only log when the filter results change significantly (not on every render)
    if (window.lastFilteredCount !== filtered.length) {
      console.log(`👥 Admin Dashboard: Showing ${filtered.length} real patients from ${queueList.length} total records`);
      window.lastFilteredCount = filtered.length;
    }
    return filtered;
  };

  // Toggle patient selection for bulk actions
  const togglePatientSelection = (patientId) => {
    const newSelection = new Set(selectedPatients);
    if (newSelection.has(patientId)) {
      newSelection.delete(patientId);
    } else {
      newSelection.add(patientId);
    }
    setSelectedPatients(newSelection);
  };

  const updateQueueStatus = async (queueId, newStatus) => {
    // Use the enhanced updatePatientStatus instead
    const patient = queueList.find(p => p.id === queueId);
    await updatePatientStatus(queueId, newStatus, patient?.customQueueId);
  };

  const callNextPatient = async () => {
    const waitingPatients = queueList.filter(q => q.status === "waiting");
    if (waitingPatients.length === 0) {
      alert("No patients waiting in queue");
      return;
    }

    const nextPatient = waitingPatients[0];
    await updateQueueStatus(nextPatient.id, "called");
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

  return (
    <div className="admin-page">
      {/* Header with Analytics Button */}
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
            <h1 className="hospital-name">Admin Dashboard</h1>
          </div>
          
          <div className="header-actions">
            <button onClick={() => navigate("/")} className="logout-button">
              Back to Home
            </button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        {/* Database Connection Status */}
        <div className="connection-status">
          <div className={`status-indicator ${connectionStatus.status}`}>
            <div className="status-light"></div>
            <div className="status-info">
              <span className="status-text">
                Database: {connectionStatus.status === 'connected' ? 'Connected' : 
                          connectionStatus.status === 'error' ? 'Error' : 'Connecting...'}
              </span>
              <span className="status-time">Last Update: {connectionStatus.lastUpdate || 'Never'}</span>
            </div>
          </div>
          
          <div className="connection-details">
            <span>Active Listeners: {connectionStatus.activeListeners}</span>
            <span>Total Connections: {connectionStatus.totalConnections}</span>
          </div>
        </div>

        {/* Enhanced Controls Panel */}
        <div className="controls-panel">
          <div className="hospital-department-selector">
            <div className="selector-group">
              <label>Hospital:</label>
              <select 
                value={selectedHospital} 
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="hospital-select"
              >
                <option value="">Select Hospital</option>
                {hospitals.map(hospital => (
                  <option key={hospital} value={hospital}>{hospital}</option>
                ))}
              </select>
            </div>
            
            <div className="selector-group">
              <label>Department:</label>
              <select 
                value={selectedDepartment} 
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="department-select"
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-controls">
            <div className="search-filter">
              <input
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="status-filter">
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="waiting">Waiting</option>
                <option value="called">Called</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="auto-refresh-controls">
              <label className="refresh-toggle">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto Refresh
              </label>
              <select 
                value={refreshInterval} 
                onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                disabled={!autoRefresh}
                className="refresh-interval"
              >
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
              </select>
              <button 
                onClick={() => {
                  console.log("🔄 Manual refresh triggered");
                  setRefreshTrigger(prev => prev + 1);
                  setConnectionStatus(prev => ({
                    ...prev,
                    lastUpdate: new Date().toLocaleTimeString()
                  }));
                  setNotifications(prev => [...prev, {
                    id: Date.now(),
                    type: 'info',
                    message: 'Manual refresh triggered - reloading queue data',
                    timestamp: new Date().toLocaleTimeString()
                  }]);
                }}
                className="manual-refresh-btn"
                title="Manual Refresh"
              >
                🔄
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Statistics Dashboard */}
        {selectedHospital && selectedDepartment && (
          <>
            <div className="debug-info">
              <span>🔄 Last Update: {connectionStatus.lastUpdate}</span>
              <span>📊 Total Records: {queueList.length}</span>
              <span>🔍 Filtered: {getFilteredQueue().length}</span>
              <span>📡 Status: {connectionStatus.status}</span>
            </div>
            
            <div className="stats-dashboard">
              <div className="stat-card waiting">
                <div className="stat-icon">⏳</div>
                <div className="stat-info">
                  <span className="stat-number">{stats.waiting}</span>
                  <span className="stat-label">Waiting</span>
                </div>
              </div>
              
              <div className="stat-card called">
                <div className="stat-icon">📞</div>
                <div className="stat-info">
                  <span className="stat-number">{stats.called}</span>
                  <span className="stat-label">Called</span>
                </div>
              </div>
              
              <div className="stat-card in-progress">
                <div className="stat-icon">👨‍⚕️</div>
                <div className="stat-info">
                  <span className="stat-number">{stats.inProgress}</span>
                  <span className="stat-label">In Progress</span>
                </div>
              </div>
              
              <div className="stat-card completed">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <span className="stat-number">{stats.completed}</span>
                  <span className="stat-label">Completed</span>
                </div>
              </div>

              <div className="stat-card average-time">
                <div className="stat-icon">⏱️</div>
                <div className="stat-info">
                  <span className="stat-number">{Math.round(stats.averageWaitTime)}</span>
                  <span className="stat-label">Avg Wait (min)</span>
                </div>
              </div>

              <div className="stat-card total">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <span className="stat-number">{stats.totalProcessed}</span>
                  <span className="stat-label">Total Processed</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Analytics Dashboard Button */}
        {selectedHospital && selectedDepartment && (
          <div className="analytics-section">
            <div className="analytics-card">
              <div className="analytics-content">
                <div className="analytics-info">
                  <h3>📊 Advanced Analytics</h3>
                  <p>View detailed insights, trends, and comprehensive reports for {selectedHospital} - {selectedDepartment}</p>
                </div>
                <button 
                  onClick={() => navigate("/analytics")} 
                  className="analytics-dashboard-button"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 3V21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 9L12 6L16 10L20 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="9" cy="9" r="1" fill="currentColor"/>
                    <circle cx="12" cy="6" r="1" fill="currentColor"/>
                    <circle cx="16" cy="10" r="1" fill="currentColor"/>
                    <circle cx="20" cy="6" r="1" fill="currentColor"/>
                  </svg>
                  View Analytics Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Panel */}
        {notifications.length > 0 && (
          <div className="notifications-panel">
            {notifications.map(notification => (
              <div key={notification.id} className={`notification notification-${notification.type}`}>
                <span className="notification-message">{notification.message}</span>
                <span className="notification-time">{notification.timestamp}</span>
                <button 
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  className="notification-close"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions Panel */}
        {selectedHospital && selectedDepartment && (
          <div className="quick-actions">
            <button 
              onClick={() => callNextPatient()} 
              className="action-button call-next"
              disabled={stats.waiting === 0}
            >
              📞 Call Next Patient
            </button>
            
            {selectedPatients.size > 0 && (
              <div className="bulk-actions">
                <select 
                  value={bulkAction} 
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="bulk-select"
                >
                  <option value="">Select Bulk Action</option>
                  <option value="called">Mark as Called</option>
                  <option value="in-progress">Mark as In Progress</option>
                  <option value="completed">Mark as Completed</option>
                </select>
                <button 
                  onClick={handleBulkAction}
                  disabled={!bulkAction}
                  className="action-button bulk-action"
                >
                  Apply to {selectedPatients.size} patients
                </button>
              </div>
            )}
          </div>
        )}

        {/* SMS & Emergency Actions Panel */}
        {selectedHospital && selectedDepartment && (
          <div className="sms-emergency-panel">
            <div className="panel-header">
              <h3>📱 SMS & Emergency Actions</h3>
            </div>
            
            <div className="sms-actions">
              <button 
                onClick={() => setShowSmsPanel(!showSmsPanel)}
                className="action-button sms-panel-toggle"
                disabled={smsLoading}
              >
                📤 Bulk SMS
              </button>
              
              <button 
                onClick={sendEmergencyBroadcast}
                className="action-button emergency-broadcast"
                disabled={smsLoading || stats.waiting === 0}
              >
                🚨 Emergency Broadcast
              </button>
              
              <button 
                onClick={testTwilioAPI}
                className="action-button test-sms"
                disabled={smsLoading}
                style={{
                  background: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                title="Test Twilio API integration with real SMS"
              >
                🧪 Test SMS API
              </button>
              
              {smsLoading && (
                <div className="sms-loading">
                  <div className="loading-spinner"></div>
                  <span>Sending SMS...</span>
                </div>
              )}
            </div>

            {/* SMS Panel */}
            {showSmsPanel && (
              <div className="sms-panel">
                <div className="sms-panel-header">
                  <h4>📋 Compose Bulk SMS</h4>
                  <button 
                    onClick={() => setShowSmsPanel(false)}
                    className="close-panel-btn"
                  >
                    ×
                  </button>
                </div>
                
                <div className="sms-recipients">
                  <label>Select Recipients:</label>
                  <div className="recipient-options">
                    <button 
                      onClick={() => setSmsRecipients(queueList.filter(p => p.status === 'waiting').map(p => p.id))}
                      className="select-recipients-btn"
                    >
                      All Waiting ({queueList.filter(p => p.status === 'waiting').length})
                    </button>
                    <button 
                      onClick={() => setSmsRecipients(Array.from(selectedPatients))}
                      className="select-recipients-btn"
                      disabled={selectedPatients.size === 0}
                    >
                      Selected ({selectedPatients.size})
                    </button>
                    <button 
                      onClick={() => setSmsRecipients([])}
                      className="select-recipients-btn clear"
                    >
                      Clear
                    </button>
                  </div>
                  <small>Selected: {smsRecipients.length} patients</small>
                </div>
                
                <div className="sms-message">
                  <label>Message:</label>
                  <textarea
                    value={customSmsMessage}
                    onChange={(e) => setCustomSmsMessage(e.target.value)}
                    placeholder="Enter your message here... 
Available variables: {name}, {queueId}, {hospital}, {department}"
                    rows={4}
                    maxLength={160}
                    className="sms-textarea"
                  />
                  <small>{customSmsMessage.length}/160 characters</small>
                </div>
                
                <div className="sms-panel-actions">
                  <button 
                    onClick={sendBulkSMS}
                    disabled={smsRecipients.length === 0 || !customSmsMessage.trim() || smsLoading}
                    className="action-button send-sms"
                  >
                    📤 Send SMS to {smsRecipients.length} patients
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Queue Table */}
        {selectedHospital && selectedDepartment && (
          <div className="queue-container">
            <div className="queue-header">
              <div className="queue-header-top">
                <h2>Patient Queue - {selectedHospital} / {selectedDepartment}</h2>
                <div className="queue-controls">
                  <span className="queue-count">
                    Showing {getFilteredQueue().length} of {queueList.length} patients
                  </span>
                  <button 
                    onClick={() => {
                      console.log("🔍 Current queue state:", queueList);
                      console.log("🔍 Filtered queue:", getFilteredQueue());
                      console.log("🔍 Current filters:", { filterStatus, searchTerm });
                      console.log("🔍 Selected hospital/department:", { selectedHospital, selectedDepartment });
                      console.log("🔍 Loading state:", loading);
                      console.log("🔍 Connection status:", connectionStatus);
                      
                      // Also test direct Firebase query
                      if (selectedHospital && selectedDepartment) {
                        import('firebase/firestore').then(({ getDocs, collection, query, where }) => {
                          const testQuery = query(
                            collection(db, "queues"),
                            where("hospital", "==", selectedHospital),
                            where("department", "==", selectedDepartment)
                          );
                          
                          getDocs(testQuery).then(snapshot => {
                            console.log("🧪 Direct Firebase test - documents found:", snapshot.docs.length);
                            snapshot.docs.forEach(doc => {
                              console.log("🧪 Document:", doc.id, doc.data());
                            });
                          }).catch(error => {
                            console.error("🧪 Direct Firebase test error:", error);
                          });
                        });
                      }
                    }}
                    className="debug-btn"
                    title="Debug Queue State"
                  >
                    🔍 Debug
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner-large"></div>
                <p>Loading patient queue for {selectedHospital} - {selectedDepartment}...</p>
                <small>If this takes too long, try the manual refresh button above.</small>
              </div>
            ) : getFilteredQueue().length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No patients in queue</h3>
                <p>There are currently no patients matching your criteria for {selectedHospital} - {selectedDepartment}.</p>
                {queueList.length > 0 && (
                  <small>Total patients in database: {queueList.length} (filtered out by current settings)</small>
                )}
              </div>
            ) : (
              <div className="queue-table-container">
                <table className="queue-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPatients(new Set(getFilteredQueue().map(p => p.id)));
                            } else {
                              setSelectedPatients(new Set());
                            }
                          }}
                          checked={selectedPatients.size === getFilteredQueue().length && getFilteredQueue().length > 0}
                        />
                      </th>
                      <th>Queue ID</th>
                      <th>Patient Name</th>
                      <th>Priority</th>
                      <th>Position</th>
                      <th>Wait Time</th>
                      <th>Status</th>
                      <th>Time in Queue</th>
                      <th>Contact</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredQueue().map((patient) => (
                      <tr key={patient.id} className={`queue-row ${patient.status}`}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedPatients.has(patient.id)}
                            onChange={() => togglePatientSelection(patient.id)}
                          />
                        </td>
                        
                        <td className="queue-id">
                          <span className="id-text">{patient.customQueueId || patient.id.slice(-6)}</span>
                        </td>
                        
                        <td className="patient-name">
                          <div className="name-details">
                            <span className="name">{patient.name || 'Unknown Patient'}</span>
                            <span className="age-info">Age: {patient.age || 'N/A'}</span>
                          </div>
                        </td>
                        
                        <td className="priority-cell">
                          <div 
                            className="priority-badge" 
                            style={{ backgroundColor: patient.priority?.color || '#6b7280' }}
                          >
                            {patient.priority?.name || 'Standard'}
                          </div>
                          {patient.escalated && <span className="escalated-indicator">🚨</span>}
                        </td>
                        
                        <td className="position">
                          {patient.currentPosition || patient.queuePosition || '-'}
                        </td>
                        
                        <td className="wait-time">
                          {patient.estimatedWaitTime ? `${patient.estimatedWaitTime} min` : 
                           patient.currentPosition ? `${(patient.currentPosition - 1) * 10} min` : '-'}
                        </td>
                        
                        <td className="status">
                          <span 
                            className={`status-badge ${patient.status}`}
                            style={{ backgroundColor: getStatusColor(patient.status) }}
                          >
                            {patient.status ? patient.status.charAt(0).toUpperCase() + patient.status.slice(1) : 'Unknown'}
                          </span>
                        </td>
                        
                        <td className="time-in-queue">
                          {patient.timeInQueue !== undefined ? `${patient.timeInQueue} min` : 
                           patient.timestamp ? `${Math.floor((Date.now() - (patient.timestamp.seconds * 1000)) / (1000 * 60))} min` : '-'}
                        </td>
                        
                        <td className="contact">
                          {patient.contact || 'N/A'}
                        </td>
                        
                        <td className="actions">
                          <div className="action-buttons">
                            {patient.status === 'waiting' && (
                              <>
                                <button 
                                  onClick={() => updatePatientStatus(patient.id, "called", patient.customQueueId)}
                                  className="action-btn call"
                                  title="Call Patient"
                                >
                                  📞
                                </button>
                                <button 
                                  onClick={() => sendSMSToPatient(patient, 'called')}
                                  className="action-btn sms"
                                  title="Send SMS"
                                  disabled={smsLoading}
                                >
                                  📱
                                </button>
                              </>
                            )}
                            
                            {patient.status === 'called' && (
                              <button 
                                onClick={() => updatePatientStatus(patient.id, "in-progress", patient.customQueueId)}
                                className="action-btn start"
                                title="Start Consultation"
                              >
                                🏥
                              </button>
                            )}
                            
                            {(patient.status === 'in-progress' || patient.status === 'called') && (
                              <button 
                                onClick={() => updatePatientStatus(patient.id, "completed", patient.customQueueId)}
                                className="action-btn complete"
                                title="Mark Completed"
                              >
                                ✅
                              </button>
                            )}
                            
                            {patient.status === 'waiting' && (
                              <button 
                                onClick={() => escalatePatient(patient.id)}
                                className="action-btn escalate"
                                title="Emergency Priority"
                              >
                                🚨
                              </button>
                            )}
                            
                            {/* Position update SMS for waiting patients */}
                            {patient.status === 'waiting' && patient.currentPosition && (
                              <button 
                                onClick={() => sendSMSToPatient(patient, 'position_update', patient.currentPosition, patient.estimatedWaitTime)}
                                className="action-btn position-sms"
                                title="Send Position Update"
                                disabled={smsLoading}
                              >
                                📍
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;