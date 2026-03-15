const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const twilio = require("twilio");

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// ---------- Twilio Setup ----------
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TEST_PATIENT_NUMBER = process.env.PATIENT_NUMBER;

// ---------- Message Templates ----------
const MESSAGES = (patient) => {
  const { name, id, doctor, hospital, department } = patient;
  return {
    ENGLISH: `Hello ${name}. Your token number is ${id}. Please proceed to the ${department} department at ${hospital}. Your doctor ${doctor} is ready to see you.`,
    HINDI: `नमस्ते ${name}। आपका टोकन नंबर ${id} है। कृपया ${hospital} के ${department} विभाग में जाएँ। आपके डॉक्टर ${doctor} आपसे मिलने के लिए तैयार हैं।`,
    KANNADA: `ನಮಸ್ಕಾರ ${name}. ನಿಮ್ಮ ಟೋಕನ್ ಸಂಖ್ಯೆ ${id}. ದಯವಿಟ್ಟು ${hospital} ನ ${department} ವಿಭಾಗಕ್ಕೆ ಹೋಗಿ. ನಿಮ್ಮ ವೈದ್ಯರಾದ ${doctor} ಅವರು ನಿಮ್ಮನ್ನು ನೋಡಲು ಸಿದ್ಧರಾಗಿದ್ದಾರೆ.`,
  };
};

// ---------- TwiML Route ----------
app.get("/api/twiml", (req, res) => {
  console.log("Twilio request query:", req.query);
  const { name, id, doctor, hospital, department, estimatedWait, Digits } = req.query;

  const patient = { name, id, doctor, hospital, department, estimatedWait };
  const messages = MESSAGES(patient);

  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  if (Digits) {
    // User pressed a digit
    if (Digits === "1") twiml.say({ voice: "alice", language: "en-US" }, messages.ENGLISH);
    else if (Digits === "2") twiml.say({ voice: "alice", language: "kn-IN" }, messages.KANNADA);
    else if (Digits === "3") twiml.say({ voice: "alice", language: "hi-IN" }, messages.HINDI);
    else twiml.say({ voice: "alice", language: "en-US" }, messages.ENGLISH);

    twiml.say("Thank you. Goodbye!");
    twiml.hangup();
  } else {
    // Ask for language input
    const gather = twiml.gather({
      numDigits: 1,
      action: `${process.env.PUBLIC_URL}/api/twiml?name=${encodeURIComponent(name)}&id=${encodeURIComponent(id)}&doctor=${encodeURIComponent(doctor)}&hospital=${encodeURIComponent(hospital)}&department=${encodeURIComponent(department)}`,
      method: "GET",
    });

    gather.say(
      { voice: "alice", language: "en-US" },
      "Press 1 for English, 2 for Kannada, 3 for Hindi."
    );
  }

  res.type("text/xml");
  res.send(twiml.toString());
});

// ---------- Trigger Patient Call Route ----------
app.post("/api/call-patient", async (req, res) => {
  try {
    const patient = req.body;
    const { name, id, doctor, hospital, department, contact } = patient;
    
    // Use patient's contact or fallback from env
    const toNumber = contact || process.env.PATIENT_NUMBER;
    
    if (!toNumber) {
      return res.status(400).json({ success: false, error: "No contact number provided" });
    }

    const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
    const twimlUrl = `${baseUrl}/api/twiml?name=${encodeURIComponent(name)}&id=${encodeURIComponent(id)}&doctor=${encodeURIComponent(doctor)}&hospital=${encodeURIComponent(hospital)}&department=${encodeURIComponent(department)}`;

    await client.calls.create({
      url: twimlUrl,
      to: toNumber,
      from: TWILIO_PHONE_NUMBER,
    });

    console.log(`✅ Voice call initiated to ${toNumber} for patient ${name}`);
    res.json({ success: true, message: "Call initiated successfully!" });
  } catch (err) {
    console.error("❌ Error initiating patient call:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- Original Trigger Call Route (Backward Compatibility) ----------
app.post("/api/call", async (req, res) => {
  try {
    const patient = req.body;
    const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
    const twimlUrl = `${baseUrl}/api/twiml?name=${encodeURIComponent(patient.name)}&id=${encodeURIComponent(patient.id)}&doctor=${encodeURIComponent(patient.doctor)}&hospital=${encodeURIComponent(patient.hospital)}&department=${encodeURIComponent(patient.department)}&estimatedWait=${encodeURIComponent(patient.estimatedWait)}`;

    await client.calls.create({
      url: twimlUrl,
      to: TEST_PATIENT_NUMBER,
      from: TWILIO_PHONE_NUMBER,
    });

    console.log("✅ Call initiated successfully!");
    res.json({ success: true, message: "Call initiated successfully!" });
  } catch (err) {
    console.error("❌ Error initiating call:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- Server ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
