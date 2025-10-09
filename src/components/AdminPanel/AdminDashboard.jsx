// import React, { useMemo, useState, useTransition } from 'react'
// import './AdminDashboard.css'
// import Analytics from './Analytics'
// import DoctorStatus from './DoctorStatus'
// import PatientQueue from './PatientQueue'

// export default function Dashboard() {
//   const [isPending, startTransition] = useTransition()

//   const [patients, setPatients] = useState([
//     { patientId: 'P-1001', name: 'John Doe', status: 'waiting', symptoms: 'Chest pain', appointmentType: 'walk-in', priorityScore: 3 },
//     { patientId: 'P-1002', name: 'Mary Johnson', status: 'waiting', symptoms: 'Fever', appointmentType: 'appointment', priorityScore: 2 },
//     { patientId: 'P-1003', name: 'Rahul Patel', status: 'in-service', symptoms: 'Headache', appointmentType: 'walk-in', priorityScore: 1 },
//   ])

//   const [doctors, setDoctors] = useState([
//     { id: 'D-1', name: 'Dr. Smith', status: 'available' },
//     { id: 'D-2', name: 'Dr. Lee', status: 'available' },
//     { id: 'D-3', name: 'Dr. Wilson', status: 'busy', currentPatientId: 'P-1003' },
//   ])

//   const handleOptimizeQueue = () => {
//     startTransition(() => {
//       // Simulate optimization: bump priority for patients with severe symptoms
//       const optimized = patients.map(p => ({ ...p }))
//       optimized.forEach(p => {
//         if (p.symptoms.toLowerCase().includes('chest')) p.priorityScore = Math.min((p.priorityScore || 0) + 2, 10)
//         if (p.symptoms.toLowerCase().includes('fever')) p.priorityScore = Math.min((p.priorityScore || 0) + 1, 10)
//       })
//       setTimeout(() => {
//         setPatients(optimized)
//         alert('Queue optimized — priority scores updated')
//       }, 700)
//     })
//   }

//   const handleServePatient = (patientId) => {
//     const freeDoctor = doctors.find(d => d.status === 'available')
//     if (!freeDoctor) {
//       alert('No doctors available right now')
//       return
//     }
//     setDoctors(doctors.map(d => d.id === freeDoctor.id ? { ...d, status: 'busy', currentPatientId: patientId } : d))
//     setPatients(patients.map(p => p.patientId === patientId ? { ...p, status: 'in-service' } : p))
//     alert(`${freeDoctor.name} is now seeing patient ${patientId}`)
//   }

//   const handleCompleteConsultation = (doctorId) => {
//     const doc = doctors.find(d => d.id === doctorId)
//     if (!doc || !doc.currentPatientId) return
//     const pid = doc.currentPatientId
//     setDoctors(doctors.map(d => d.id === doctorId ? { ...d, status: 'available', currentPatientId: undefined } : d))
//     setPatients(patients.map(p => p.patientId === pid ? { ...p, status: 'completed' } : p))
//     alert(`Consultation complete for ${pid}`)
//   }

//   const stats = useMemo(() => ({
//     total: patients.length,
//     waiting: patients.filter(p => p.status === 'waiting').length,
//     inService: patients.filter(p => p.status === 'in-service').length,
//   }), [patients])

//   return (
//     <div className="admin-dashboard">
//       <div className="admin-header">
//         <h1>Hospital Queue Management</h1>
//         <div className="header-actions">
//           <button className="btn" onClick={handleOptimizeQueue} disabled={isPending}>{isPending ? 'Optimizing...' : 'Optimize Queue'}</button>
//         </div>
//       </div>

//       <Analytics patients={patients} stats={stats} />

//       <div className="admin-grid">
//         <div className="left">
//           <PatientQueue patients={patients} onServe={handleServePatient} />
//         </div>
//         <div className="right">
//           <DoctorStatus doctors={doctors} patients={patients} onComplete={handleCompleteConsultation} />
//         </div>
//       </div>
//     </div>
//   )
// }
'use client'

import React, { useMemo, useState, useTransition } from 'react'
import './AdminDashboard.css'
import Analytics from './Analytics'
import DoctorStatus from './DoctorStatus'
import PatientQueue from './PatientQueue'

export default function Dashboard() {
  const [isPending, startTransition] = useTransition()

  const [patients, setPatients] = useState([
    { patientId: 'P-1001', name: 'John Doe', status: 'waiting', symptoms: 'Chest pain', appointmentType: 'walk-in', priorityScore: 3 },
    { patientId: 'P-1002', name: 'Mary Johnson', status: 'waiting', symptoms: 'Fever', appointmentType: 'appointment', priorityScore: 2 },
    { patientId: 'P-1003', name: 'Rahul Patel', status: 'in-service', symptoms: 'Headache', appointmentType: 'walk-in', priorityScore: 1, arrival: '09:20' },
  ])

  const [doctors, setDoctors] = useState([
    { id: 'D-1', name: 'Dr. Smith', status: 'available' },
    { id: 'D-2', name: 'Dr. Lee', status: 'available' },
    { id: 'D-3', name: 'Dr. Wilson', status: 'busy', currentPatientId: 'P-1003' },
  ])

  const handleOptimizeQueue = () => {
    startTransition(() => {
      // Simulate optimization: bump priority for patients with severe symptoms
      const optimized = patients.map(p => ({ ...p }))
      optimized.forEach(p => {
        if (p.symptoms && p.symptoms.toLowerCase().includes('chest')) p.priorityScore = Math.min((p.priorityScore || 0) + 2, 10)
        if (p.symptoms && p.symptoms.toLowerCase().includes('fever')) p.priorityScore = Math.min((p.priorityScore || 0) + 1, 10)
      })
      setTimeout(() => {
        setPatients(optimized)
        alert('Queue optimized — priority scores updated')
      }, 700)
    })
  }

  const handleServePatient = (patientId) => {
    const freeDoctor = doctors.find(d => d.status === 'available')
    if (!freeDoctor) {
      alert('No doctors available right now')
      return
    }
    setDoctors(doctors.map(d => d.id === freeDoctor.id ? { ...d, status: 'busy', currentPatientId: patientId } : d))
    setPatients(patients.map(p => p.patientId === patientId ? { ...p, status: 'in-service', arrival: p.arrival || new Date().toLocaleTimeString() } : p))
    alert(`${freeDoctor.name} is now seeing patient ${patientId}`)
  }

  const handleCompleteConsultation = (doctorId) => {
    const doc = doctors.find(d => d.id === doctorId)
    if (!doc || !doc.currentPatientId) return
    const pid = doc.currentPatientId
    setDoctors(doctors.map(d => d.id === doctorId ? { ...d, status: 'available', currentPatientId: undefined } : d))
    setPatients(patients.map(p => p.patientId === pid ? { ...p, status: 'completed' } : p))
    alert(`Consultation complete for ${pid}`)
  }

  const stats = useMemo(() => ({
    total: patients.length,
    waiting: patients.filter(p => p.status === 'waiting').length,
    inService: patients.filter(p => p.status === 'in-service' || p.status === 'serving').length,
  }), [patients])

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Hospital Queue Management</h1>
        <div className="header-actions">
          <button className="btn" onClick={handleOptimizeQueue} disabled={isPending}>{isPending ? 'Optimizing...' : 'Optimize Queue'}</button>
        </div>
      </div>

      <Analytics patients={patients} stats={stats} />

      <div className="admin-grid">
        <div className="left">
          <PatientQueue patients={patients} onServe={handleServePatient} />
        </div>
        <div className="right">
          <DoctorStatus doctors={doctors} patients={patients} onComplete={handleCompleteConsultation} />
        </div>
      </div>
    </div>
  )
}
