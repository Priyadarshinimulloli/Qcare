const functions = require("firebase-functions");
const admin = require("firebase-admin");
const OpenAI = require("openai");

admin.initializeApp();
const db = admin.firestore();

// Initialize OpenAI with secret key stored in Firebase environment
const openai = new OpenAI({
  apiKey: functions.config().openai.key,
});

// Trigger: When a patient document is created or updated
exports.generateHealthTip = functions.firestore
  .document("patients/{patientId}")
  .onWrite(async (change, context) => {
    const patient = change.after.data();
    const patientId = context.params.patientId;

    // Only trigger if patient is waiting and has no healthTip yet
    if (patient && patient.status === "waiting" && !patient.healthTip) {
      console.log(`Generating health tip for ${patient.name}`);

      const prompt = `Provide a short, friendly health tip for a waiting patient with ${
        patient.condition || "general health"
      } issues.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      });

      const healthTip = completion.choices[0].message.content;

      // Save the generated tip back to Firestore
      await db.collection("patients").doc(patientId).update({
        healthTip,
      });

      console.log(`✅ Health tip saved for ${patient.name}: ${healthTip}`);
    }
  });
