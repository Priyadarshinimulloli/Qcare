require('dotenv').config();
const twilio = require("twilio");

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TEST_PATIENT_NUMBER = process.env.PATIENT_NUMBER;

// Generate messages in multiple languages
const MESSAGES = (patient) => {
  const { name, id, doctor, hospital, department, estimatedWait } = patient;

  return {
    ENGLISH: `Patient ${name}, your token number ${id}. Please proceed to ${department} department at ${hospital}. Your doctor ${doctor} is ready. Estimated waiting time: ${estimatedWait} minutes.`,
    HINDI: `मरीज ${name}, आपका टोकन नंबर ${id} है। कृपया ${hospital} के ${department} विभाग में जाएँ। आपका डॉक्टर ${doctor} तैयार है। अनुमानित प्रतीक्षा समय: ${estimatedWait} मिनट।`,
    KANNADA: `ರೋಗಿ ${name}, ನಿಮ್ಮ ಟೋಕನ್ ಸಂಖ್ಯೆ ${id}. ದಯವಿಟ್ಟು ${hospital} ರ ${department} ವಿಭಾಗಕ್ಕೆ ಹೋಗಿ. ನಿಮ್ಮ ವೈದ್ಯರು ${doctor} ಸಿದ್ಧರಾಗಿದ್ದಾರೆ. ಅಂದಾಜು ಕಾಯುವ ಸಮಯ: ${estimatedWait} ನಿಮಿಷಗಳು.`
  };
};

// Make a call with TwiML URL
const callPatient = async (patient) => {
  try {
    const baseUrl = process.env.PUBLIC_URL || "http://localhost:5000";

    // Twilio will request this endpoint during the call
    const twimlUrl = `${baseUrl}/api/twiml?name=${encodeURIComponent(patient.name)}&id=${encodeURIComponent(patient.id)}&doctor=${encodeURIComponent(patient.doctor)}&hospital=${encodeURIComponent(patient.hospital)}&department=${encodeURIComponent(patient.department)}&estimatedWait=${encodeURIComponent(patient.estimatedWait)}`;

    await client.calls.create({
      url: twimlUrl,
      to: TEST_PATIENT_NUMBER,
      from: TWILIO_PHONE_NUMBER
    });

    console.log("Call initiated successfully");
  } catch (err) {
    console.error("Error initiating call:", err);
  }
};

module.exports = { callPatient, MESSAGES };
