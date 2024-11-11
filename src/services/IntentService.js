"use strict";

const natural = require("natural");
const { WordTokenizer } = natural;
const tokenizer = new WordTokenizer();

class IntentService {
    constructor() {
        this.intents = {
            INITIAL: ["start", "begin", "hello", "hi", "greetings"],
            HELP: ["help", "assist", "support", "what can you do"],
            BALANCE: ["balance", "check balance", "my balance", "account balance"],
            // Add other intents here
        };
    }

    identifyIntent(message) {
        const tokens = tokenizer.tokenize(message.toLowerCase());
        for (const [intent, keywords] of Object.entries(this.intents)) {
            if (keywords.some(keyword => tokens.includes(keyword))) {
                return intent;
            }
        }
        return "UNKNOWN";
    }
}

module.exports = new IntentService();
