import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { notifyPatient, TTS_LANGUAGES } from "../utils/ttsService";

const PatientDashboard = () => {
  const { queueId } = useParams(); // Get patient token from URL
  const [patient, setPatient] = useState(null);
  const [ttsVolume, setTtsVolume] = useState(0.8);
  const [hasAnnounced, setHasAnnounced] = useState(false);


  // Real-time listener for patient queue
  useEffect(() => {
    if (!queueId) return;

    const patientRef = doc(db, "queues", queueId);
    const unsubscribe = onSnapshot(patientRef, (docSnap) => {
      if (docSnap.exists()) {
        const patientData = docSnap.data();
        setPatient({ id: docSnap.id, ...patientData });

       if (patientData.status === "called" && !hasAnnounced) {
        window.speechSynthesis.cancel(); // stop any ongoing speech
        notifyPatient(patientData, TTS_LANGUAGES.ENGLISH, ttsVolume);
        notifyPatient(patientData, TTS_LANGUAGES.HINDI, ttsVolume);
        notifyPatient(patientData, TTS_LANGUAGES.KANNADA, ttsVolume);
        setHasAnnounced(true); // prevent multiple announcements
      }
      if (patientData.status !== "called" && hasAnnounced) {
        setHasAnnounced(false);
      }

      }
    });

    return () => unsubscribe();
  }, [queueId, ttsVolume, hasAnnounced]);

  if (!patient) return <div className="loading">Loading your queue info...</div>;

  return (
    <div className="patient-dashboard">
      <header className="header">
        <div className="logo">
          <h1>Welcome to MediCare</h1>
          <p>Your Queue Status</p>
        </div>
      </header>

      <main className="patient-main">
        <div className="patient-card">
          <h2>Hello {patient.name}</h2>
          <p><strong>Token Number:</strong> {patient.id}</p>
          <p><strong>Age:</strong> {patient.age}</p>
          <p><strong>Contact:</strong> {patient.contact}</p>
          <p><strong>Doctor:</strong> {patient.doctor || "Any"}</p>
          <p>
            <strong>Status:</strong> 
            <span className={`status ${patient.status}`}>{patient.status}</span>
          </p>
          <p><strong>Estimated Wait Time:</strong> {patient.estimatedWait || "Calculating..."} minutes</p>
        </div>

        {/* Volume Control */}
        <div className="volume-control">
          <label>Notification Volume:</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={ttsVolume}
            onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
          />
          <span>{Math.round(ttsVolume * 100)}%</span>
        </div>
      </main>
    </div>
  );
};

export default PatientDashboard;
