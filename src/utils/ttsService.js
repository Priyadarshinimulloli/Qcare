// // src/utils/ttsService.js
// /**
//  * TTS (Text-to-Speech) Service
//  * Provides multi-lingual, volume-adjustable voice notifications
//  * Integrates with existing patient queue system
//  */

// export const TTS_LANGUAGES = {
//   ENGLISH: "en-US",
//   HINDI: "hi-IN",
//   KANNADA: "kn-IN"
// };

// /**
//  * Speak a message using browser SpeechSynthesis API
//  * @param {string} message - The text to speak
//  * @param {string} language - Language code from TTS_LANGUAGES
//  * @param {number} volume - Volume (0.0 to 1.0)
//  */
// export const speakMessage = (message, language = TTS_LANGUAGES.ENGLISH, volume = 1) => {
//   if (!window.speechSynthesis) {
//     console.warn("SpeechSynthesis not supported in this browser.");
//     return;
//   }

//   const utterance = new SpeechSynthesisUtterance(message);
//   utterance.lang = language;
//   utterance.volume = volume;
//   utterance.rate = 1; // normal speed
//   utterance.pitch = 1; // normal pitch

//   window.speechSynthesis.speak(utterance);
// };

// /**
//  * Generate voice notification text for a patient
//  * @param {Object} patient - Patient object from queue
//  * @returns {string} TTS message
//  */
// export const generateNotificationMessage = (patient) => {
//   // Example: "Patient A-124, please proceed to Consultation Room 3. Your doctor is ready."
//   const queueId = patient.queueId || patient.id; // use existing queueId if available
//   const doctorRoom = patient.doctor || "1";
//   return `Patient ${queueId}, please proceed to Consultation Room ${doctorRoom}. Your doctor is ready to see you.`;
// };

// /**
//  * Notify patient by voice
//  * @param {Object} patient - Patient object
//  * @param {string} language - TTS language
//  * @param {number} volume - TTS volume
//  */
// export const notifyPatient = (patient, language = TTS_LANGUAGES.ENGLISH, volume = 1) => {
//   const message = generateNotificationMessage(patient);
//   speakMessage(message, language, volume);
// };
// src/utils/ttsService.js
/**
 * TTS (Text-to-Speech) Service
 * Provides multi-lingual, volume-adjustable voice notifications
 * Integrates with existing patient queue system
 * Ensures browser compatibility and user-interaction fallback
 */

export const TTS_LANGUAGES = {
  ENGLISH: "en-US",
  HINDI: "hi-IN",
  KANNADA: "kn-IN"
};

/**
 * Speak a message using browser SpeechSynthesis API
 * @param {string} message - The text to speak
 * @param {string} language - Language code from TTS_LANGUAGES
 * @param {number} volume - Volume (0.0 to 1.0)
 */
export const speakMessage = (message, language = TTS_LANGUAGES.ENGLISH, volume = 1) => {
  if (!window.speechSynthesis) {
    console.warn("SpeechSynthesis not supported in this browser.");
    return;
  }

  if (!message || message.trim() === "") {
    console.warn("No message provided to speak.");
    return;
  }

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = language;
  utterance.volume = volume;
  utterance.rate = 1;
  utterance.pitch = 1;

  // Some browsers require a user interaction before TTS works
  try {
    window.speechSynthesis.speak(utterance);
    console.log(`TTS triggered [${language}]: "${message}"`);
  } catch (err) {
    console.error("Error speaking message:", err);
  }
};

/**
 * Generate voice notification text for a patient
 * @param {Object} patient - Patient object from queue
 * @returns {string} TTS message
 */
export const generateNotificationMessage = (patient) => {
  if (!patient) return "No patient data available.";

  const queueId = patient.queueId || patient.id || "Unknown";
  const doctorRoom = patient.doctor || "1";

  return `Patient ${queueId}, please proceed to Consultation Room ${doctorRoom}. Your doctor is ready to see you.`;
};

/**
 * Notify patient by voice in multiple languages
 * @param {Object} patient - Patient object
 * @param {string[]} languages - Array of TTS_LANGUAGES to speak in
 * @param {number} volume - Volume (0.0 to 1.0)
 */
export const notifyPatient = (patient, languages = [TTS_LANGUAGES.ENGLISH], volume = 1) => {
  if (!patient) {
    console.warn("No patient object provided to notifyPatient.");
    return;
  }

  const message = generateNotificationMessage(patient);

  // Speak in all specified languages sequentially
  languages.forEach((lang) => {
    speakMessage(message, lang, volume);
  });
};
