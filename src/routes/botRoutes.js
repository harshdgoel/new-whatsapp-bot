const express = require("express");
const { handleIncomingMessage } = require("../controllers/botController");
const config = require("../config/config"); // Import config.js
require('dotenv').config(); // Ensure this is loaded to access process.env values
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
    const channel = process.env.CHANNEL; // Get the channel from the environment file
    const { entry } = req.body;

    // Validate the structure of the webhook
    if (!entry || !Array.isArray(entry)) {
        console.error("Invalid webhook structure received:", JSON.stringify(entry, null, 2));
        return res.status(400).send("Invalid webhook payload.");
    }

    try {
        // Loop through the entries
        for (const event of entry) {
            if (channel === "whatsapp") {
                // WhatsApp-specific webhook processing
                const changes = event.changes || [];

                for (const change of changes) {
                    const value = change.value;

                    // Handle incoming WhatsApp messages
                    if (value.messages) {
                        const messagingEvent = value.messages[0];
                        const { from, text, interactive } = messagingEvent;

                        let messageBody = text?.body || ""; // Default to the text message body
                        if (interactive) {
                            // If it's an interactive message (e.g., list selection), get the selected ID
                            messageBody = interactive.list_reply?.id || ""; // The ID of the selected list option
                        }

                        // Identify intent from the message body
                        const intent = identifyIntent(messageBody);

                        // Handle the message with the intent and from user
                        await handleIncomingMessage(config.phoneNumberId, from, { body: messageBody, intent });
                    } else {
                        console.log("Unhandled change for WhatsApp:", JSON.stringify(change, null, 2));
                    }
                }
            } else if (channel === "facebook") {
                // Facebook Messenger-specific webhook processing
                const messagingEvents = event.messaging || []; // For Facebook Messenger

                for (const messagingEvent of messagingEvents) {
                    const senderId = messagingEvent.sender.id;
                    const recipientId = messagingEvent.recipient.id;

                    if (messagingEvent.message && messagingEvent.message.text) {
                        // Extract the message text
                        const messageBody = messagingEvent.message.text;

                        // Identify intent from the message
                        const intent = identifyIntent(messageBody);

                        // Call the function to handle the incoming message
                        await handleIncomingMessage(recipientId, senderId, {
                            body: messageBody,
                            intent,
                        });
                    } else {
                        console.log("Unhandled messaging event for Facebook:", JSON.stringify(messagingEvent, null, 2));
                    }
                }
            } else {
                console.error("Unsupported channel specified:", channel);
                return res.status(400).send("Unsupported channel specified.");
            }
        }

        res.sendStatus(200); // Respond with success to the platform (WhatsApp/Facebook)
    } catch (error) {
        console.error("Error processing webhook:", error);
        res.status(500).send("Internal server error.");
    }
});

module.exports = router;
