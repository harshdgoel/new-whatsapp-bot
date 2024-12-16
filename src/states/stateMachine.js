const LoginService = require("../services/loginService");
const BalanceService = require("../services/BalanceService");
const MessageService = require('../services/MessageService');
const TemplateLayer = require("../services/TemplateLayer");
const RecentTransactionService = require("../services/RecentTransactionService");
const UpcomingPaymentsService = require("../services/UpcomingPaymentsService");
const HelpMeService = require("../services/HelpMeService");
const IntentService = require("../services/IntentService");

const states = {
    OTP_VERIFICATION: "OTP_VERIFICATION",
    LOGGED_IN: "LOGGED_IN",
    LOGGED_OUT: "LOGGED_OUT",
    TRANSACTIONS: "TRANSACTIONS",
    UPCOMINGPAYMENTS: "UPCOMINGPAYMENTS",
    HELP: "HELP",
    BALANCE: "BALANCE",
    ACCOUNT_SELECTION: "ACCOUNT_SELECTION",
    FETCHING_BALANCE: "FETCHING_BALANCE",
    FETCHING_TRANSACTION: "FETCHING_TRANSACTION"
};




class StateMachine {
    constructor() {
        this.sessionCache = new Map();
    }

    getSession(userId) {
        if (!this.sessionCache.has(userId)) {
            this.sessionCache.set(userId, {
                state: states.LOGGED_OUT,
                lastIntent: null,
                isHelpTriggered: false,
                otp: null,
                accounts: null,
                selectedAccount: null,
            });
        }
        return this.sessionCache.get(userId);
    }

    async handleMessage(from, messageBody) {
        const userSession = this.getSession(from);

        // Always show the Help Me menu first
        if (!userSession.isHelpTriggered || userSession.state === states.HELP) {
            userSession.state = states.HELP;
            userSession.isHelpTriggered = true;
            return await HelpMeService.helpMe();
        }

        // Handle user selection from Help Me menu
        if (userSession.state === states.HELP) {
            const selectedIntent = IntentService.identifyIntentFromHelpSelection(messageBody);
            if (selectedIntent && selectedIntent !== "UNKNOWN") {
                userSession.lastIntent = selectedIntent;
                userSession.state = states.LOGGED_IN;
                return await this.handleIntent(userSession, selectedIntent);
            } else {
                return "Invalid selection. Please choose a valid option from the menu.";
            }
        }

        // Fallback for other intents
        return await this.handleIntent(userSession, userSession.lastIntent);
    }

    async handleIntent(userSession, intent) {
        let response;
        switch (intent) {
            case "BALANCE":
                response = await this.initiateBalanceFlow(userSession);
                break;
            case "TRANSACTIONS":
                response = await this.initiateTransactionsFlow(userSession);
                break;
            case "UPCOMINGPAYMENTS":
                response = await this.initiateUpcomingPaymentsFlow(userSession);
                break;
            default:
                response = "I'm sorry, I couldn't understand your request. Please try again.";
        }

        // Show the Help Me menu again after the intent flow ends
        userSession.state = states.HELP;
        response += "\n\n" + (await HelpMeService.helpMe());
        return response;
    }

    async initiateBalanceFlow(userSession) {
        const accountsResult = await BalanceService.initiateBalanceInquiry(userSession);
        if (accountsResult) {
            userSession.state = states.ACCOUNT_SELECTION;
            return accountsResult;
        }
        return "No accounts available.";
    }

    async initiateTransactionsFlow(userSession) {
        return "Transaction flow is under construction.";
    }

    async initiateUpcomingPaymentsFlow(userSession) {
        return "Upcoming Payments flow is under construction.";
    }
}

module.exports = new StateMachine();
