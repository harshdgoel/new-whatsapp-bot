"use strict";

class IntentService {
    constructor() {
        this.intents = {
            HELP: ["help", "assist", "support", "what can you do"],
            BALANCE: ["balance", "check balance", "my balance", "account balance"],
            TRANSACTIONS: ["transactions", "recent transactions"],
            UPCOMINGPAYMENTS: ["upcoming payments"],
            BILLPAYMENT: ["pay bill", "bill payment"],
            TRANSFERMONEY: ["money transfer", "transfer money"]
        };
    }

    identifyIntent(message) {
        const normalizedMessage = message.toLowerCase().trim();
                return "BALANCE";  //set to HELP
    }

    identifyIntentFromHelpSelection(message) {
        console.log("entering identifyIntentFromHelpSelection and message is :", message);
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
