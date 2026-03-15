// Twilio SMS Service for Hospital Queue System
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

class TwilioService {
  constructor() {
    // Initialize Twilio configuration
    this.accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
    this.authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
    this.phoneNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER;
    this.messagingServiceSid = import.meta.env.VITE_TWILIO_MESSAGING_SERVICE_SID;

    // Validate configuration on startup
    this.validateConfig();
  }

  // Validate Twilio configuration
  validateConfig() {
    console.log('🔧 Twilio Configuration Check:');
    console.log('Account SID:', this.accountSid ? '✅ Set' : '❌ Missing');
    console.log('Auth Token:', this.authToken ? '✅ Set' : '❌ Missing');
    console.log('Phone Number:', this.phoneNumber ? '✅ Set' : '⚠️ Optional (use Messaging Service SID instead)');
    console.log('Messaging Service SID:', this.messagingServiceSid ? '✅ Set' : '⚠️ Not set');

    if (!this.accountSid || !this.authToken || (!this.phoneNumber && !this.messagingServiceSid)) {
      console.warn('⚠️ Twilio configuration incomplete. Set VITE_TWILIO_PHONE_NUMBER or VITE_TWILIO_MESSAGING_SERVICE_SID.');
    }
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

  // Send SMS notification (actual Twilio API implementation)
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
      if (!this.accountSid || !this.authToken || (!this.phoneNumber && !this.messagingServiceSid)) {
        console.error('❌ Twilio configuration missing. Please check environment variables.');
        throw new Error('Twilio configuration incomplete. Set VITE_TWILIO_PHONE_NUMBER or VITE_TWILIO_MESSAGING_SERVICE_SID.');
      }

      // Prefer Messaging Service SID when provided because it handles sender/country routing.
      const smsData = {
        To: formattedPhone,
        Body: message,
        ...(this.messagingServiceSid
          ? { MessagingServiceSid: this.messagingServiceSid }
          : { From: this.phoneNumber })
      };

      console.log('📤 Sending SMS via Twilio API:', { ...smsData, Body: smsData.Body.substring(0, 50) + '...' });

      // Make actual HTTP request to Twilio API
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      
      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.accountSid}:${this.authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(smsData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('❌ Twilio API error:', responseData);

        const apiMessage = responseData?.message || 'Unknown error';
        const lowerMessage = String(apiMessage).toLowerCase();
        if (lowerMessage.includes('not a twilio phone number') || lowerMessage.includes('country mismatch')) {
          throw new Error(
            'Twilio sender mismatch: configure a valid sender for the destination country, or set VITE_TWILIO_MESSAGING_SERVICE_SID and remove VITE_TWILIO_PHONE_NUMBER.'
          );
        }

        throw new Error(`Twilio API error: ${apiMessage}`);
      }

      console.log('✅ SMS sent successfully via Twilio:', responseData.sid);

      // Log SMS in Firebase for tracking
      const logData = {
        twilioSid: responseData.sid,
        to: formattedPhone,
        from: this.phoneNumber || null,
        messagingServiceSid: this.messagingServiceSid || null,
        body: message,
        patientId,
        queueId,
        hospital,
        department,
        notificationType,
        timestamp: new Date().toISOString(),
        status: responseData.status,
        sentAt: serverTimestamp(),
        provider: 'twilio',
        twilioResponse: {
          sid: responseData.sid,
          status: responseData.status,
          direction: responseData.direction,
          dateCreated: responseData.date_created,
          dateUpdated: responseData.date_updated,
          price: responseData.price,
          priceUnit: responseData.price_unit
        }
      };

      const smsLog = await addDoc(collection(db, "sms_logs"), logData);
      console.log('✅ SMS logged successfully in Firebase:', smsLog.id);

      return {
        success: true,
        messageId: responseData.sid,
        status: responseData.status,
        to: formattedPhone,
        logId: smsLog.id,
        twilioResponse: responseData
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

  // Get SMS delivery status from Twilio API
  async getSMSStatus(messageId) {
    try {
      if (!messageId || messageId.startsWith('mock_')) {
        return { messageId, status: 'unknown', updatedAt: new Date().toISOString() };
      }

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages/${messageId}.json`;
      
      const response = await fetch(twilioUrl, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.accountSid}:${this.authToken}`)
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get SMS status: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 SMS status from Twilio:', data);

      return {
        messageId: data.sid,
        status: data.status,
        errorCode: data.error_code,
        errorMessage: data.error_message,
        price: data.price,
        priceUnit: data.price_unit,
        direction: data.direction,
        dateCreated: data.date_created,
        dateUpdated: data.date_updated,
        dateSent: data.date_sent,
        to: data.to,
        from: data.from
      };
    } catch (error) {
      console.error('Error getting SMS status:', error);
      return {
        messageId,
        status: 'error',
        error: error.message,
        updatedAt: new Date().toISOString()
      };
    }
  }

  // Test SMS function to verify API connectivity
  async testSMS(testPhoneNumber) {
    try {
      console.log('🧪 Testing Twilio SMS API...');
      
      const testMessage = 'Test message from Hospital Queue System - ' + new Date().toLocaleTimeString();
      
      const result = await this.sendSMS({
        to: testPhoneNumber,
        message: testMessage,
        patientId: 'test',
        queueId: 'TEST001',
        hospital: 'Test Hospital',
        department: 'Test Department',
        notificationType: 'test'
      });
      
      console.log('✅ Test SMS result:', result);
      return result;
    } catch (error) {
      console.error('❌ Test SMS failed:', error);
      throw error;
    }
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
  getPatientSMSHistory,
  testSMS
} = twilioService;