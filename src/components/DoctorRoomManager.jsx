import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, deleteDoc, doc } from 'firebase/firestore';
import DoctorRoomForm from './DoctorRoomForm';

const DoctorRoomManager = () => {
  const [roomAssignments, setRoomAssignments] = useState([]);
  const [editingRoom, setEditingRoom] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'doctor_rooms'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const rooms = [];
      querySnapshot.forEach((doc) => {
        rooms.push({ id: doc.id, ...doc.data() });
      });
      setRoomAssignments(rooms);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      await deleteDoc(doc(db, 'doctor_rooms', id));
    }
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingRoom(null);
  };

  return (
    <div className="doctor-room-management">
      <DoctorRoomForm editingRoom={editingRoom} onCancel={handleCancelEdit} />
      
      <div className="queue-table-container">
        <h3>📋 Current Doctor Room Assignments</h3>
        {roomAssignments.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '2rem' }}>
            <p>No room assignments found. Use the form above to add one.</p>
          </div>
        ) : (
          <div className="queue-table-container">
            <div className="queue-table">
              <div className="table-header" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem' }}>
                <div>Doctor Name</div>
                <div>Room Number</div>
                <div>Department</div>
                <div style={{ textAlign: 'center' }}>Actions</div>
              </div>
              <div className="table-body">
                {roomAssignments.map((room) => (
                  <div key={room.id} className="table-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
                    <div style={{ fontWeight: '600' }}>{room.doctorName}</div>
                    <div>{room.roomNumber}</div>
                    <div>
                      <span className="status-badge" style={{ backgroundColor: 'var(--primary-blue)' }}>
                        {room.department}
                      </span>
                    </div>
                    <div className="actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', padding: '0.5rem' }}>
                      <button 
                        onClick={() => handleEdit(room)}
                        className="action-btn"
                        style={{ background: 'var(--primary-blue)', color: 'white' }}
                        title="Edit Assignment"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDelete(room.id)}
                        className="action-btn"
                        style={{ background: 'var(--warning-red)', color: 'white' }}
                        title="Delete Assignment"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorRoomManager;
