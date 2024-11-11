const express = require("express");
const { handleIncomingMessage } = require("../controllers/botController");
const router = express.Router();

const intents = {
    BALANCE: ["balance", "check balance", "my balance", "account balance"],
    TRANSACTIONS: ["recent transactions", "last transactions", "transactions"],
    // ... add more intents as needed
};

function identifyIntent(messageBody) {
    for (const [intent, keywords] of Object.entries(intents)) {
        if (keywords.some(keyword => messageBody.toLowerCase().includes(keyword))) {
            return intent;
        }
    }
    return 'UNKNOWN';
}

// This route is used to verify the webhook
router.get("/webhook", (req, res) => {
    const mode = req.query['hub.mode'];
    const challenge = req.query['hub.challenge'];
    const token = req.query['hub.verify_token'];

    // Make sure the verification token matches the one you provided in Facebook Developer Console
    const VERIFY_TOKEN = 'your-verify-token'; // Replace with your actual token

    if (mode && token === VERIFY_TOKEN) {
        console.log('Webhook verified');
        res.status(200).send(challenge); // Respond with the challenge if verification is successful
    } else {
        res.sendStatus(403); // If the token doesn't match, send Forbidden status
    }
});

// This route handles the incoming messages
router.post("/webhook", async (req, res) => {
    const { entry } = req.body;
    let messagingEvent = entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!messagingEvent) {
        console.error("Invalid webhook structure received:", JSON.stringify(entry, null, 2));
        return res.status(400).send("No messaging event received.");
    }

    const { from, text } = messagingEvent;
    const messageBody = text?.body || "";
    const intent = identifyIntent(messageBody);

    try {
        // Call the function to handle the incoming message (e.g., check login status, etc.)
        await handleIncomingMessage("PHONE_NUMBER_ID", from, { body: messageBody, intent });
        return res.sendStatus(200); // Send success response to Facebook
    } catch (error) {
        console.error("Error handling incoming message:", error);
        return res.status(500).send("Internal server error.");
    }
});

module.exports = router;
