import React from 'react'

export default function PatientQueue({ patients, onServe }) {
  return (
    <div className="patient-queue">
      <h3>Live Queue</h3>
      <table>
        <thead>
          <tr>
            <th>Queue ID</th>
            <th>Patient</th>
            <th>Arrival</th>
            <th>Symptoms</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {patients.map(p => (
            <tr key={p.patientId}>
              <td>{p.patientId}</td>
              <td>{p.name}</td>
              <td>{p.arrival || '-'}</td>
              <td>{p.symptoms}</td>
              <td>{p.status}</td>
              <td>
                {p.status === 'waiting' && (
                  <button className="btn small" onClick={() => onServe(p.patientId)}>Serve</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
