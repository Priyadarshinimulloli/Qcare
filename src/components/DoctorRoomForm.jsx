import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, getDocs, query } from 'firebase/firestore';
import { DEPARTMENTS } from '../utils/constants';

const DoctorRoomForm = ({ editingRoom, onCancel }) => {
  const [formData, setFormData] = useState({
    doctorName: '',
    roomNumber: '',
    department: DEPARTMENTS[0],
  });
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing doctors from Firestore
  useEffect(() => {
    const fetchDoctors = async () => {
      setLoadingDoctors(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'doctors'));
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDoctors(docs);
        console.log("Fetched doctors:", docs);
      } catch (error) {
        console.error("Error fetching doctors: ", error);
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (editingRoom) {
      setFormData({
        doctorName: editingRoom.doctorName,
        roomNumber: editingRoom.roomNumber,
        department: editingRoom.department,
      });
    } else {
      setFormData({
        doctorName: '',
        roomNumber: '',
        department: DEPARTMENTS[0],
      });
    }
  }, [editingRoom]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      console.log("Attempting to save room assignment to Firestore collection 'doctor_rooms'...", formData);
      if (editingRoom) {
        await updateDoc(doc(db, 'doctor_rooms', editingRoom.id), formData);
        alert("🏥 Room Assignment Updated Successfully!");
        onCancel();
      } else {
        const docRef = await addDoc(collection(db, 'doctor_rooms'), {
          ...formData,
          isActive: true,
          createdAt: new Date(),
        });
        console.log("Document saved with ID: ", docRef.id);
        alert("🏥 New Doctor Room Assignment Added Successfully!");
      }
      setFormData({ doctorName: '', roomNumber: '', department: DEPARTMENTS[0] });
    } catch (error) {
      console.error("FIREBASE SAVE ERROR:", error);
      alert(`Failed to save room assignment: ${error.message}. Please check your internet connection and ensure Firestore rules are deployed.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-controls" style={{ maxWidth: '600px', margin: '0 auto 2rem auto' }}>
      <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1.5rem', textAlign: 'center' }}>
        {editingRoom ? '✏️ Edit Room Assignment' : '🏥 Add New Room Assignment'}
      </h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Doctor Name</label>
          {loadingDoctors ? (
            <div style={{ padding: '0.875rem', background: '#f9fafb', borderRadius: '8px', color: '#6b7280' }}>Loading doctors...</div>
          ) : doctors.length > 0 ? (
            <select
              name="doctorName"
              value={formData.doctorName}
              onChange={handleChange}
              className="hospital-select"
              style={{ width: '100%', padding: '0.875rem' }}
              required
            >
              <option value="">-- Select Stored Doctor --</option>
              {doctors.map(doc => (
                <option key={doc.id} value={doc.name || doc.doctorName}>
                  {doc.name || doc.doctorName}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              name="doctorName"
              value={formData.doctorName}
              onChange={handleChange}
              placeholder="e.g. Dr. Rao"
              className="hospital-select"
              style={{ width: '100%', padding: '0.875rem' }}
              required
            />
          )}
          {doctors.length > 0 && (
            <div style={{ marginTop: '0.5rem', fontSize: '13px', color: '#6b7280' }}>
              Note: If doctor is not in list, please add them to the 'doctors' collection.
            </div>
          )}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Room Number</label>
            <input
              type="text"
              name="roomNumber"
              value={formData.roomNumber}
              onChange={handleChange}
              placeholder="e.g. Room 3"
              className="hospital-select"
              style={{ width: '100%', padding: '0.875rem' }}
              required
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Department</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="department-select"
              style={{ width: '100%', padding: '0.875rem' }}
              required
            >
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button 
            type="submit" 
            className="submit-button" 
            style={{ flex: 1, margin: 0, opacity: isSubmitting ? 0.7 : 1 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving to Firebase...' : (editingRoom ? 'Update Assignment' : 'Assign Doctor to Room')}
          </button>
          {editingRoom && (
            <button 
              type="button" 
              onClick={onCancel} 
              className="btn-secondary"
              style={{ padding: '0.875rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default DoctorRoomForm;
