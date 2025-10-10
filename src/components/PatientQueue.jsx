// import React from 'react';

// /**
//  * Simple, focused PatientQueue component.
//  * - No external UI library imports included
//  * - Props: patients (array), onServe(patientId)
//  * - Renders a clean table, priority badges and an actions button
//  */
// export function PatientQueue({ patients = [], onServe = () => {} }) {
//   // Filter waiting patients and sort by priorityScore desc, then arrivalTime asc
//   const waitingPatients = (patients || [])
//     .filter(p => p && p.status === 'waiting')
//     .sort((a, b) => {
//       const pa = a.priorityScore ?? 0;
//       const pb = b.priorityScore ?? 0;
//       if (pb !== pa) return pb - pa;
//       const ta = a.arrivalTime ? new Date(a.arrivalTime).getTime() : 0;
//       const tb = b.arrivalTime ? new Date(b.arrivalTime).getTime() : 0;
//       return ta - tb;
//     });

//   const getPriorityBadge = (score) => {
//     if (score === undefined || score === null) return (
//       <span style={{ padding: '4px 8px', borderRadius: 999, background: '#e2e8f0', color: '#0f172a', fontWeight: 600 }}>N/A</span>
//     );
//     if (score > 7) return (
//       <span style={{ padding: '4px 8px', borderRadius: 999, background: '#ef4444', color: 'white', fontWeight: 700 }}>High</span>
//     );
//     if (score > 4) return (
//       <span style={{ padding: '4px 8px', borderRadius: 999, background: '#f59e0b', color: 'white', fontWeight: 700 }}>Medium</span>
//     );
//     return (
//       <span style={{ padding: '4px 8px', borderRadius: 999, background: '#10b981', color: 'white', fontWeight: 700 }}>Low</span>
//     );
//   };

//   return (
//     <div style={{ background: 'white', borderRadius: 10, padding: 12, boxShadow: '0 6px 20px rgba(2,6,23,0.06)' }}>
//       <div style={{ marginBottom: 8 }}>
//         <h3 style={{ margin: 0, fontSize: 18 }}>Waiting Patients Queue</h3>
//         <div style={{ color: '#6b7280', fontSize: 13 }}>Patients are ordered by priority, then arrival time.</div>
//       </div>

//       <div style={{ overflowX: 'auto' }}>
//         <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//           <thead>
//             <tr style={{ textAlign: 'left', borderBottom: '1px solid #eef2f7' }}>
//               <th style={{ padding: '8px 6px' }}>Patient</th>
//               <th style={{ padding: '8px 6px' }}>Symptoms</th>
//               <th style={{ padding: '8px 6px' }}>Priority</th>
//               <th style={{ padding: '8px 6px', textAlign: 'right' }}>Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {waitingPatients.length > 0 ? waitingPatients.map(patient => (
//               <tr key={patient.patientId || patient.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
//                 <td style={{ padding: '10px 6px', verticalAlign: 'top' }}>
//                   <div style={{ fontWeight: 700 }}>{patient.name || 'Unknown'}</div>
//                   <div style={{ fontSize: 12, color: '#64748b' }}>{patient.patientId || patient.id || ''}</div>
//                 </td>
//                 <td style={{ padding: '10px 6px', verticalAlign: 'top', maxWidth: 320 }}>
//                   <div style={{ fontSize: 13, color: '#0f172a' }}>{patient.symptoms || '-'}</div>
//                 </td>
//                 <td style={{ padding: '10px 6px', verticalAlign: 'top' }}>{getPriorityBadge(patient.priorityScore)}</td>
//                 <td style={{ padding: '10px 6px', verticalAlign: 'top', textAlign: 'right' }}>
//                   <button
//                     onClick={() => onServe(patient.patientId || patient.id)}
//                     style={{ padding: '8px 10px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer' }}
//                   >
//                     Start Consultation
//                   </button>
//                 </td>
//               </tr>
//             )) : (
//               <tr>
//                 <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No patients waiting.</td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// export default PatientQueue;
