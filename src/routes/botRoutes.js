const express = require("express");
const { handleIncomingMessage } = require("../controllers/botController");
const config = require("../config/config"); // Import config.js
const router = express.Router();

const intents = {
    BALANCE: ["balance", "check balance", "my balance", "account balance"],
    TRANSACTIONS: ["recent transactions", "last transactions", "transactions"],
    // ... add more intents as needed
};

// Function to identify intent from message
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

    const VERIFY_TOKEN = config.verifyToken; // Use the correct key from config

    if (mode && token === VERIFY_TOKEN) {
        console.log('Webhook verified successfully');
        res.status(200).send(challenge);
    } else {
        console.error("Invalid verify token or mode mismatch:", { mode, token });
        res.sendStatus(403);
    }
});

// This route handles both messages and statuses
router.post("/webhook", async (req, res) => {
    const { entry } = req.body;

    // Validate the structure of the webhook
    if (!entry || !entry[0]?.changes?.[0]?.value) {
        console.error("Invalid webhook structure received:", JSON.stringify(entry, null, 2));
        return res.status(400).send("Invalid webhook payload.");
    }

    const changes = entry[0].changes || [];

    try {
        for (const change of changes) {
            const value = change.value;

            // Handle incoming messages
            if (value.messages) {
                const messagingEvent = value.messages[0];
                const { from, text, interactive } = messagingEvent;

                let messageBody = text?.body || ""; // Default to the text message body
                if (interactive) {
                    // If it's an interactive message (e.g., list selection), get the selected ID
                    messageBody = interactive.list_reply?.id || ""; // The ID of the selected list option
                }

                const intent = identifyIntent(messageBody);

                // Call the function to handle the incoming message
                await handleIncomingMessage(config.phoneNumberId, from, { body: messageBody, intent });

            } else if (value.statuses) {
                // Handle message statuses
                const statusEvent = value.statuses[0];
                const { id, status, recipient_id, timestamp, conversation } = statusEvent;

                console.log("Status Update Received:", {
                    messageId: id,
                    recipientId: recipient_id,
                    status,
                    timestamp,
                    conversationId: conversation?.id
                });

                // You can add specific logic here to handle statuses if needed
                // For example, tracking delivery statuses or receipts
            } else {
                console.log("Unhandled change:", JSON.stringify(change, null, 2));
            }
        }

        res.sendStatus(200); // Respond with success to WhatsApp
    } catch (error) {
        console.error("Error processing webhook:", error);
        res.status(500).send("Internal server error.");
    }
});

module.exports = router;
