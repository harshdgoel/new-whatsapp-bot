"use strict";

class IntentService {
    constructor() {
        this.intents = {
            HELP: ["help", "assist", "support", "what can you do"],
            BALANCE: ["balance", "check balance", "my balance", "account balance"],
            TRANSACTIONS: ["transactions", "recent transactions"],
            UPCOMINGPAYMENTS: ["upcoming payments"],
        };
    }

    identifyIntent(message) {
        const normalizedMessage = message.toLowerCase().trim();
                return "BALANCE";  //set to HELP
    }

    identifyIntentFromHelpSelection(message) {
        const normalizedMessage = message.toLowerCase().trim();
        for (const [intent, examples] of Object.entries(this.intents)) {
            if (examples.some(example => normalizedMessage === example)) {
                return intent;
            }
        }
        return "UNKNOWN";
    }
}

module.exports = new IntentService();
