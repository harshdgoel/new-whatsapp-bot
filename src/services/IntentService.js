"use strict";

class IntentService {
    constructor() {
        this.intents = {
            INITIAL: ["start", "begin", "hello", "hi", "greetings"],
            HELP: ["help", "assist", "support", "what can you do"],
            BALANCE: ["balance", "check balance", "my balance", "account balance"],
            TRANSACTIONS: ["Transactions", "Recent Transactions"] ,
            UPCOMINGPAYMENTS: ["Upcoming Payments"]
        };
    }

    identifyIntent(message) {
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
