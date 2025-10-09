import React from 'react'

export default function DoctorStatus({ doctors, patients, onComplete }) {
  return (
    <div className="doctor-status">
      <h3>Doctors</h3>
      <ul>
        {doctors.map(d => (
          <li key={d.id} className="doctor-item">
            <div className="doc-info">
              <strong>{d.name}</strong>
              <div className="doc-meta">{d.status}{d.currentPatientId ? ` • ${d.currentPatientId}` : ''}</div>
            </div>
            {d.status === 'busy' && (
              <button className="btn small" onClick={() => onComplete(d.id)}>Complete</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
