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

    await handleIncomingMessage("PHONE_NUMBER_ID", from, { body: messageBody, intent });
    return res.sendStatus(200);
});

module.exports = router;
