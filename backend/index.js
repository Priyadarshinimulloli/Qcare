app.post("/api/twiml", (req, res) => {
  // Log all incoming query parameters from Twilio
  console.log("Twilio request query:", req.query);

  const { name, id, doctor, hospital, department, estimatedWait, Digits } = req.query;

  const patient = { name, id, doctor, hospital, department, estimatedWait };
  const messages = MESSAGES(patient);

  const twiml = new VoiceResponse();

  // If Digits exist, user already pressed a key
  if (Digits) {
    if (Digits === "1") twiml.say({ voice: "alice", language: "en-US" }, messages.ENGLISH);
    else if (Digits === "2") twiml.say({ voice: "alice", language: "kn-IN" }, messages.KANNADA);
    else if (Digits === "3") twiml.say({ voice: "alice", language: "hi-IN" }, messages.HINDI);
    else twiml.say({ voice: "alice", language: "en-US" }, messages.ENGLISH);

    twiml.say("Thank you. Goodbye!");
    twiml.hangup();
  } else {
    // Ask user to press a key
    const gather = twiml.gather({
      numDigits: 1,
      action: `${process.env.PUBLIC_URL}/api/twiml?name=${encodeURIComponent(name)}&id=${encodeURIComponent(id)}&doctor=${encodeURIComponent(doctor)}&hospital=${encodeURIComponent(hospital)}&department=${encodeURIComponent(department)}&estimatedWait=${encodeURIComponent(estimatedWait)}`,
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
