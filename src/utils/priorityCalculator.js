// Priority Calculator for Hospital Queue Management
// Implements age-based and symptom-based priority scoring

export const PRIORITY_LEVELS = {
  CRITICAL: { level: 1, name: "Critical", color: "#dc2626", score: 100 },
  HIGH: { level: 2, name: "High Priority", color: "#ea580c", score: 80 },
  ELDERLY: { level: 3, name: "Elderly Priority", color: "#d97706", score: 60 },
  STANDARD: { level: 4, name: "Standard", color: "#059669", score: 40 }
};

// Critical symptoms that warrant immediate attention
const CRITICAL_SYMPTOMS = [
  'chest pain', 'difficulty breathing', 'unconscious', 'severe bleeding', 
  'heart attack', 'stroke', 'seizure', 'severe abdominal pain',
  'head injury', 'high fever', 'vomiting blood', 'severe burns',
  'allergic reaction', 'overdose', 'shortness of breath', 'choking'
];

// High priority symptoms
const HIGH_PRIORITY_SYMPTOMS = [
  'broken bone', 'deep cut', 'severe pain', 'infection', 'dehydration',
  'migraine', 'stomach pain', 'back pain', 'joint pain', 'fever'
];

/**
 * Calculate patient priority based on age and symptoms
 * @param {number} age - Patient age
 * @param {string} symptoms - Patient symptoms description
 * @returns {Object} Priority information with level, score, and reason
 */
export const calculatePriority = (age, symptoms = '') => {
  const symptomsLower = symptoms.toLowerCase();
  let priority = PRIORITY_LEVELS.STANDARD;
  let reasons = [];
  let score = PRIORITY_LEVELS.STANDARD.score;

  // Check for critical symptoms (highest priority)
  const hasCriticalSymptoms = CRITICAL_SYMPTOMS.some(symptom => 
    symptomsLower.includes(symptom)
  );

  if (hasCriticalSymptoms) {
    priority = PRIORITY_LEVELS.CRITICAL;
    score = PRIORITY_LEVELS.CRITICAL.score;
    reasons.push("Critical symptoms detected");
    return { priority, score, reasons, escalated: true };
  }

  // Check for high priority symptoms
  const hasHighPrioritySymptoms = HIGH_PRIORITY_SYMPTOMS.some(symptom => 
    symptomsLower.includes(symptom)
  );

  if (hasHighPrioritySymptoms) {
    priority = PRIORITY_LEVELS.HIGH;
    score = PRIORITY_LEVELS.HIGH.score;
    reasons.push("High priority symptoms");
  }

  // Check age-based priority (elderly 65+)
  if (age >= 65) {
    if (priority.level > PRIORITY_LEVELS.ELDERLY.level) {
      priority = PRIORITY_LEVELS.ELDERLY;
      score = Math.max(score, PRIORITY_LEVELS.ELDERLY.score);
    } else {
      // Add elderly bonus to existing high/critical priority
      score += 20;
    }
    reasons.push(`Elderly patient (age ${age})`);
  }

  // Age adjustment for very young children (under 5)
  if (age < 5) {
    score += 15;
    reasons.push(`Young child (age ${age})`);
  }

  return { 
    priority, 
    score, 
    reasons, 
    escalated: priority.level <= PRIORITY_LEVELS.HIGH.level 
  };
};

/**
 * Generate standardized Queue ID
 * @param {string} hospital - Hospital name
 * @param {string} department - Department name
 * @returns {string} Formatted Queue ID like "QH2023-0542"
 */
export const generateQueueId = (hospital, department) => {
  const year = new Date().getFullYear();
  const hospitalCode = hospital.charAt(0).toUpperCase();
  const deptCode = department.charAt(0).toUpperCase();
  
  // Generate random 4-digit number
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  
  return `Q${hospitalCode}${deptCode}${year}-${randomNum}`;
};

/**
 * Sort queue by priority and timestamp
 * @param {Array} queueList - Array of queue items
 * @returns {Array} Sorted queue with positions
 */
export const sortQueueByPriority = (queueList) => {
  return queueList
    .filter(item => item.status === 'waiting')
    .sort((a, b) => {
      // First sort by priority score (higher score = higher priority)
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      
      // If same priority, sort by timestamp (first-come-first-serve)
      const timeA = a.timestamp?.seconds || 0;
      const timeB = b.timestamp?.seconds || 0;
      return timeA - timeB;
    })
    .map((item, index) => ({
      ...item,
      currentPosition: index + 1
    }));
};

/**
 * Calculate estimated wait time based on position and priority
 * @param {number} position - Current position in queue
 * @param {string} priorityLevel - Priority level name
 * @returns {number} Estimated wait time in minutes
 */
export const calculateEstimatedWaitTime = (position, priorityLevel) => {
  const baseTimePerPatient = 10; // minutes
  
  // Adjust time based on priority level
  const priorityMultipliers = {
    'Critical': 5, // Seen immediately or very soon
    'High Priority': 7,
    'Elderly Priority': 8,
    'Standard': 10
  };
  
  const timePerPatient = priorityMultipliers[priorityLevel] || baseTimePerPatient;
  return Math.max(5, (position - 1) * timePerPatient); // Minimum 5 minutes
};

/**
 * Check if patient should be notified about queue changes
 * @param {Object} oldPosition - Previous queue position
 * @param {Object} newPosition - New queue position
 * @returns {Object} Notification information
 */
export const checkForNotifications = (oldPosition, newPosition) => {
  const notifications = [];
  
  if (newPosition.currentPosition < oldPosition.currentPosition) {
    notifications.push({
      type: 'position_improved',
      message: `Your position improved from ${oldPosition.currentPosition} to ${newPosition.currentPosition}`,
      priority: 'info'
    });
  }
  
  if (newPosition.currentPosition <= 3 && oldPosition.currentPosition > 3) {
    notifications.push({
      type: 'almost_ready',
      message: 'You\'re almost next! Please be ready.',
      priority: 'warning'
    });
  }
  
  if (newPosition.currentPosition === 1) {
    notifications.push({
      type: 'next_patient',
      message: 'You\'re next! Please proceed to the counter.',
      priority: 'urgent'
    });
  }
  
  return notifications;
};