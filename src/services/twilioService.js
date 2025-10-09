// Twilio SMS Service for Hospital Queue System
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

class TwilioService {
  constructor() {
    // Since Twilio SDK needs server-side execution, we'll use Firebase Functions
    // For now, we'll create a mock service and prepare for backend integration
    this.accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
    this.authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
    this.phoneNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER;
    this.apiEndpoint = '/api/sms'; // Backend endpoint for Twilio API calls
  }

  // Validate phone number format
  validatePhoneNumber(phoneNumber) {
    console.log('🔍 Validating phone number:', phoneNumber);
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const isValid = phoneRegex.test(cleaned);
    console.log('📞 Phone validation result:', { original: phoneNumber, cleaned, isValid });
    return isValid;
  }

  // Format phone number for Twilio (ensure + prefix)
  formatPhoneNumber(phoneNumber) {
    console.log('📱 Formatting phone number:', phoneNumber);
    let formatted = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!formatted.startsWith('+')) {
      // Assume Indian number if no country code
      if (formatted.length === 10) {
        formatted = '+91' + formatted;
        console.log('🇮🇳 Added India country code:', formatted);
      } else {
        formatted = '+' + formatted;
        console.log('🌍 Added generic + prefix:', formatted);
      }
    }
    console.log('✅ Final formatted number:', formatted);
    return formatted;
  }

  // Send SMS notification (mock implementation for frontend)
  async sendSMS({ to, message, patientId, queueId, hospital, department, notificationType }) {
    try {
      console.log('📱 Twilio SMS Request:', { to, message: message.substring(0, 50) + '...', notificationType });

      // Validate phone number
      if (!this.validatePhoneNumber(to)) {
        const error = `Invalid phone number format: ${to}. Must include country code (e.g., +91 9876543210)`;
        console.error('❌ Phone validation failed:', error);
        throw new Error(error);
      }

      const formattedPhone = this.formatPhoneNumber(to);
      console.log('📞 Using formatted phone number:', formattedPhone);

      // Check if required Twilio config is present
      if (!this.phoneNumber) {
        console.warn('⚠️ Twilio phone number not configured. Set VITE_TWILIO_PHONE_NUMBER in environment.');
      }

      // Mock SMS sending (replace with actual backend API call)
      const smsData = {
        to: formattedPhone,
        from: this.phoneNumber || '+1234567890', // fallback for testing
        body: message,
        patientId,
        queueId,
        hospital,
        department,
        notificationType,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };

      console.log('📤 Sending SMS data:', smsData);

      // For now, simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Log SMS in Firebase for tracking
      const smsLog = await addDoc(collection(db, "sms_logs"), {
        ...smsData,
        sentAt: serverTimestamp(),
        status: 'sent',
        provider: 'twilio'
      });

      console.log('✅ SMS logged successfully:', smsLog.id);

      return {
        success: true,
        messageId: `mock_${Date.now()}`,
        status: 'sent',
        to: formattedPhone,
        logId: smsLog.id
      };

    } catch (error) {
      console.error('❌ SMS sending error:', error);

      // Log failed SMS attempt
      try {
        await addDoc(collection(db, "sms_logs"), {
          to: to,
          message,
          patientId,
          queueId,
          hospital,
          department,
          notificationType,
          timestamp: new Date().toISOString(),
          status: 'failed',
          error: error.message,
          sentAt: serverTimestamp(),
          provider: 'twilio'
        });
      } catch (logError) {
        console.error('❌ Failed to log SMS error:', logError);
      }

      throw error;
    }
  }

  // Send queue status notification
  async sendQueueNotification(patient, status, position = null, estimatedWait = null) {
    try {
      let message = '';
      
      switch (status) {
        case 'called':
          message = `🏥 ${patient.hospital}\nDear ${patient.name}, please proceed to ${patient.department}. Your queue number ${patient.customQueueId} is now being called. Thank you for your patience.`;
          break;
          
        case 'position_update':
          message = `🏥 ${patient.hospital}\nHi ${patient.name}, your current position in ${patient.department} queue is ${position}. Estimated wait time: ${estimatedWait} minutes. Queue ID: ${patient.customQueueId}`;
          break;
          
        case 'reminder':
          message = `🏥 ${patient.hospital}\nReminder: You are number ${position} in line for ${patient.department}. Estimated wait: ${estimatedWait} minutes. Queue ID: ${patient.customQueueId}`;
          break;
          
        case 'emergency_escalation':
          message = `🚨 ${patient.hospital}\nIMPORTANT: Your appointment has been marked as priority. Please be ready for immediate consultation at ${patient.department}. Queue ID: ${patient.customQueueId}`;
          break;
          
        case 'completed':
          message = `✅ ${patient.hospital}\nThank you ${patient.name}! Your consultation at ${patient.department} is now complete. We hope you have a speedy recovery. Queue ID: ${patient.customQueueId}`;
          break;
          
        default:
          message = `🏥 ${patient.hospital}\nUpdate for ${patient.name}: Your status in ${patient.department} has been updated. Queue ID: ${patient.customQueueId}`;
      }

      return await this.sendSMS({
        to: patient.contact,
        message,
        patientId: patient.id,
        queueId: patient.customQueueId,
        hospital: patient.hospital,
        department: patient.department,
        notificationType: status
      });

    } catch (error) {
      console.error('Error sending queue notification:', error);
      throw error;
    }
  }

  // Send bulk notifications to multiple patients
  async sendBulkNotifications(patients, message, notificationType = 'general') {
    const results = [];
    
    for (const patient of patients) {
      try {
        const result = await this.sendSMS({
          to: patient.contact,
          message: message.replace('{name}', patient.name)
                          .replace('{queueId}', patient.customQueueId)
                          .replace('{hospital}', patient.hospital)
                          .replace('{department}', patient.department),
          patientId: patient.id,
          queueId: patient.customQueueId,
          hospital: patient.hospital,
          department: patient.department,
          notificationType
        });
        
        results.push({ patient: patient.id, success: true, result });
      } catch (error) {
        results.push({ patient: patient.id, success: false, error: error.message });
      }
    }
    
    return results;
  }

  // Send emergency broadcast to all waiting patients
  async sendEmergencyBroadcast(hospital, department, message) {
    try {
      // This would typically query waiting patients from the current queue
      console.log(`📢 Emergency broadcast to ${hospital} - ${department}: ${message}`);
      
      // Log the broadcast
      await addDoc(collection(db, "emergency_broadcasts"), {
        hospital,
        department,
        message,
        timestamp: serverTimestamp(),
        type: 'emergency',
        sentBy: 'admin'
      });

      return {
        success: true,
        message: 'Emergency broadcast logged successfully'
      };
    } catch (error) {
      console.error('Error sending emergency broadcast:', error);
      throw error;
    }
  }

  // Get SMS delivery status
  async getSMSStatus(messageId) {
    // Mock status check (replace with actual Twilio API call)
    return {
      messageId,
      status: 'delivered',
      updatedAt: new Date().toISOString()
    };
  }

  // Get SMS logs for a patient
  async getPatientSMSHistory(patientId, limit = 10) {
    try {
      // Query SMS logs from Firebase
      // This would use Firebase queries to get SMS history
      console.log(`📋 Getting SMS history for patient: ${patientId}`);
      return [];
    } catch (error) {
      console.error('Error getting SMS history:', error);
      throw error;
    }
  }
}

// Export singleton instance
const twilioService = new TwilioService();
export default twilioService;

// Export specific functions for easy import
export const {
  sendSMS,
  sendQueueNotification,
  sendBulkNotifications,
  sendEmergencyBroadcast,
  getSMSStatus,
  getPatientSMSHistory
} = twilioService;