// Priority Calculator for Hospital Queue System

// Priority levels with weights and colors
export const PRIORITY_LEVELS = {
  CRITICAL: {
    name: 'Critical',
    score: 100,
    color: '#dc2626', // Red
    description: 'Life-threatening conditions requiring immediate attention'
  },
  HIGH: {
    name: 'High',
    score: 80,
    color: '#f59e0b', // Orange
    description: 'Urgent conditions requiring prompt attention'
  },
  MEDIUM: {
    name: 'Medium',
    score: 60,
    color: '#3b82f6', // Blue
    description: 'Moderate conditions that should be seen soon'
  },
  STANDARD: {
    name: 'Standard',
    score: 40,
    color: '#10b981', // Green
    description: 'Routine consultations and check-ups'
  },
  LOW: {
    name: 'Low',
    score: 20,
    color: '#6b7280', // Gray
    description: 'Non-urgent consultations'
  }
};

// Age priority multipliers
const AGE_MULTIPLIERS = {
  INFANT: { min: 0, max: 2, multiplier: 1.5 },      // 0-2 years
  CHILD: { min: 3, max: 12, multiplier: 1.3 },      // 3-12 years
  TEEN: { min: 13, max: 17, multiplier: 1.1 },      // 13-17 years
  ADULT: { min: 18, max: 64, multiplier: 1.0 },     // 18-64 years
  SENIOR: { min: 65, max: 79, multiplier: 1.2 },    // 65-79 years
  ELDERLY: { min: 80, max: 120, multiplier: 1.4 }   // 80+ years
};

// Time-based priority boost (waiting time in minutes)
const TIME_BOOST_THRESHOLDS = {
  30: 5,   // 5 points after 30 minutes
  60: 10,  // 10 points after 1 hour
  90: 15,  // 15 points after 1.5 hours
  120: 25, // 25 points after 2 hours
  180: 40  // 40 points after 3 hours
};

// Calculate age-based priority multiplier
export const getAgePriorityMultiplier = (age) => {
  for (const category of Object.values(AGE_MULTIPLIERS)) {
    if (age >= category.min && age <= category.max) {
      return category.multiplier;
    }
  }
  return 1.0; // Default multiplier
};

// Calculate time-based priority boost
export const getTimePriorityBoost = (waitingTimeMinutes) => {
  let boost = 0;
  
  for (const [threshold, points] of Object.entries(TIME_BOOST_THRESHOLDS)) {
    if (waitingTimeMinutes >= parseInt(threshold)) {
      boost = points;
    }
  }
  
  return boost;
};

// Calculate overall priority score for a patient
export const calculatePriorityScore = (patient) => {
  // Base priority score from medical condition
  const basePriority = patient.priority?.score || PRIORITY_LEVELS.STANDARD.score;
  
  // Age multiplier
  const ageMultiplier = getAgePriorityMultiplier(patient.age || 30);
  
  // Time waiting boost
  const waitingTime = patient.timestamp ? 
    Math.floor((Date.now() - (patient.timestamp.seconds * 1000)) / (1000 * 60)) : 0;
  const timeBoost = getTimePriorityBoost(waitingTime);
  
  // Additional factors
  let additionalScore = 0;
  
  // Pregnancy priority
  if (patient.isPregnant) {
    additionalScore += 15;
  }
  
  // Disability accommodations
  if (patient.hasDisability) {
    additionalScore += 10;
  }
  
  // Emergency escalation
  if (patient.escalated) {
    additionalScore += 20;
  }
  
  // Calculate final score
  const finalScore = Math.floor((basePriority * ageMultiplier) + timeBoost + additionalScore);
  
  return Math.min(finalScore, 200); // Cap at 200 points
};

// Sort queue by priority (highest priority first)
export const sortQueueByPriority = (queueArray) => {
  return queueArray
    .map(patient => ({
      ...patient,
      priorityScore: calculatePriorityScore(patient)
    }))
    .sort((a, b) => {
      // First sort by priority score (descending)
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      
      // If same priority, sort by timestamp (first come, first served)
      const aTime = a.timestamp?.seconds || 0;
      const bTime = b.timestamp?.seconds || 0;
      return aTime - bTime;
    });
};

// Calculate estimated wait time for a position in queue
export const calculateEstimatedWaitTime = (position, priorityLevel = 'Standard') => {
  // Base consultation times by priority (in minutes)
  const CONSULTATION_TIMES = {
    'Critical': 45,   // Emergency cases take longer
    'High': 25,       // Urgent cases
    'Medium': 20,     // Standard consultation
    'Standard': 15,   // Routine check-up
    'Low': 10         // Quick consultations
  };
  
  // Get average consultation time
  const avgConsultationTime = CONSULTATION_TIMES[priorityLevel] || 15;
  
  // Add buffer time for transitions (5 minutes between patients)
  const bufferTime = 5;
  
  // Calculate total estimated time
  const estimatedTime = (position - 1) * (avgConsultationTime + bufferTime);
  
  return Math.max(estimatedTime, 0);
};

// Check for notification triggers
export const checkForNotifications = (patient) => {
  const notifications = [];
  
  // Calculate waiting time
  const waitingTime = patient.timestamp ? 
    Math.floor((Date.now() - (patient.timestamp.seconds * 1000)) / (1000 * 60)) : 0;
  
  // Long wait notification (over 2 hours)
  if (waitingTime > 120 && patient.status === 'waiting') {
    notifications.push({
      type: 'long_wait',
      message: `Patient ${patient.customQueueId} has been waiting for ${Math.floor(waitingTime / 60)} hours`,
      priority: 'high'
    });
  }
  
  // Critical patient waiting notification
  if (patient.priority?.name === 'Critical' && patient.status === 'waiting' && waitingTime > 15) {
    notifications.push({
      type: 'critical_waiting',
      message: `CRITICAL patient ${patient.customQueueId} waiting for ${waitingTime} minutes`,
      priority: 'urgent'
    });
  }
  
  // Age-based notifications (elderly patients)
  if (patient.age >= 75 && waitingTime > 60 && patient.status === 'waiting') {
    notifications.push({
      type: 'elderly_wait',
      message: `Elderly patient ${patient.customQueueId} (age ${patient.age}) waiting for ${Math.floor(waitingTime / 60)} hours`,
      priority: 'medium'
    });
  }
  
  return notifications;
};

// Get priority level by score
export const getPriorityByScore = (score) => {
  if (score >= 90) return PRIORITY_LEVELS.CRITICAL;
  if (score >= 70) return PRIORITY_LEVELS.HIGH;
  if (score >= 50) return PRIORITY_LEVELS.MEDIUM;
  if (score >= 30) return PRIORITY_LEVELS.STANDARD;
  return PRIORITY_LEVELS.LOW;
};

// Auto-assign priority based on patient data
export const autoAssignPriority = (patientData) => {
  let score = PRIORITY_LEVELS.STANDARD.score;
  
  // Age-based adjustments
  if (patientData.age <= 2 || patientData.age >= 75) {
    score += 20;
  } else if (patientData.age <= 12 || patientData.age >= 65) {
    score += 10;
  }
  
  // Special conditions
  if (patientData.isPregnant) {
    score += 15;
  }
  
  if (patientData.hasDisability) {
    score += 10;
  }
  
  // Symptom-based priority (if provided)
  if (patientData.symptoms) {
    const urgentSymptoms = ['chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious'];
    const symptomText = patientData.symptoms.toLowerCase();
    
    if (urgentSymptoms.some(symptom => symptomText.includes(symptom))) {
      score = PRIORITY_LEVELS.CRITICAL.score;
    }
  }
  
  return getPriorityByScore(score);
};

// Department-specific priority adjustments
export const getDepartmentPriorityModifier = (department) => {
  const modifiers = {
    'Cardiology': 1.2,      // Heart conditions often urgent
    'Neurology': 1.1,       // Neurological issues can be serious
    'Pediatrics': 1.3,      // Children get priority
    'Orthopedics': 0.9,     // Often non-urgent
    'Dermatology': 0.8,     // Usually non-urgent
    'General Medicine': 1.0  // Standard
  };
  
  return modifiers[department] || 1.0;
};

// Calculate priority for new patients (simplified version for Home.jsx)
export const calculatePriority = (age, symptoms = '') => {
  let score = PRIORITY_LEVELS.STANDARD.score;
  
  // Age-based adjustments
  if (age <= 2 || age >= 75) {
    score += 20;
  } else if (age <= 12 || age >= 65) {
    score += 10;
  }
  
  // Symptom-based priority
  if (symptoms) {
    const urgentSymptoms = ['chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious', 'stroke', 'heart attack'];
    const symptomText = symptoms.toLowerCase();
    
    if (urgentSymptoms.some(symptom => symptomText.includes(symptom))) {
      score = PRIORITY_LEVELS.CRITICAL.score;
    } else if (symptomText.includes('pain') || symptomText.includes('fever')) {
      score += 15;
    }
  }
  
  return getPriorityByScore(score);
};

// Generate custom queue ID
export const generateQueueId = (hospital, department) => {
  const hospitalCode = hospital.substring(0, 2).toUpperCase();
  const deptCode = department.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  
  return `${hospitalCode}${deptCode}${timestamp}${random}`;
};

export default {
  PRIORITY_LEVELS,
  calculatePriorityScore,
  sortQueueByPriority,
  calculateEstimatedWaitTime,
  checkForNotifications,
  autoAssignPriority,
  getAgePriorityMultiplier,
  getTimePriorityBoost,
  getPriorityByScore,
  getDepartmentPriorityModifier,
  calculatePriority,
  generateQueueId
};