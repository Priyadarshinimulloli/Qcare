import React from 'react'

export function SmallStat({ label, value }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default function Analytics({ patients, stats }) {
  return (
    <div className="analytics">
      <SmallStat label="Total Patients" value={stats.total} />
      <SmallStat label="Waiting" value={stats.waiting} />
      <SmallStat label="In Service" value={stats.inService} />
    </div>
  )
}
