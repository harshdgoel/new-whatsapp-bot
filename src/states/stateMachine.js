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
                otp: null, 
                accounts: null, 
                selectedAccount: null, 
                isHelpTriggered: false,
                currentHelpPage: 1
            });
        }
        return this.sessionCache.get(userId);
    }

    async handleMessage(from, messageBody, intent) {
        const userSession = this.getSession(from);

        // If Help Me is triggered for the first time
        if (!userSession.isHelpTriggered) {
            userSession.state = states.HELP;
            userSession.isHelpTriggered = true; // Mark Help as triggered
            return await HelpMeService.helpMe();
        }

        if (userSession.state === states.HELP) {
            if (messageBody === "View More") { // Handle pagination
                const currentPage = userSession.currentHelpPage || 1; // Track the current page
                const nextPage = currentPage + 1;
                userSession.currentHelpPage = nextPage;
                return await HelpMeService.helpMe(nextPage);
            } else {
                const selectedIntent = IntentService.identifyIntentFromHelpSelection(messageBody);
                if (selectedIntent && selectedIntent !== "UNKNOWN") {
                    userSession.lastIntent = selectedIntent;
                    return await this.processIntent(userSession, selectedIntent);
                } else {
                    return "Invalid selection. Please choose a valid option from the menu.";
                }
            }
        }

        // Check if user is in OTP verification state
        if (userSession.state === states.OTP_VERIFICATION) {
            userSession.otp = messageBody;
            return await this.handleOTPVerification(userSession);
        }

        // Check if user is in account selection state
        if (userSession.state === states.ACCOUNT_SELECTION) {
            return await this.handleAccountSelection(userSession, messageBody);
        }

        // Handle recognized intents
        return await this.processIntent(userSession, intent);
    }

    async handleAccountSelection(userSession, messageBody) {
        console.log("Entering handleAccountSelection and messageBody is:", messageBody); 

        // Parse the selected account from the provided messageBody
        const selectedAccount = BalanceService.parseAccountSelection(messageBody, userSession.accounts);
        if (selectedAccount) {
            userSession.selectedAccount = selectedAccount;

            let responseMessage;

            // Determine what response to fetch based on the user's last intent
            if (userSession.lastIntent === "BALANCE") {
                userSession.state = states.FETCHING_BALANCE;
                responseMessage = await BalanceService.fetchBalanceForSelectedAccount(selectedAccount);
            } else if (userSession.lastIntent === "TRANSACTIONS") {
                userSession.state = states.FETCHING_TRANSACTION;
                responseMessage = await RecentTransactionService.fetchTransactionsForSelectedAccount(selectedAccount, messageBody);
            } else if (userSession.lastIntent === "UPCOMINGPAYMENTS") {
                userSession.state = states.FETCHING_TRANSACTION;
                responseMessage = await UpcomingPaymentsService.fetchPaymentsForSelectedAccount(selectedAccount, messageBody);
            }

            // After processing the selected intent, reset state to LOGGED_IN
            userSession.state = states.LOGGED_IN;

            // Fetch the help menu if necessary (if help flow is triggered)
            const helpMenu = await HelpMeService.helpMe();

            // Return the response message along with the help menu (if available)
            if (responseMessage) {
               return responseMessage;
                // return {
                //     response: responseMessage,
                //     helpMenu: helpMenu,
                // };
            } else {
               return helpMenu;
                // return { helpMenu: helpMenu };
            }
        } else {
            return "Please enter a valid account selection from the list.";
        }
    }

    // Reset help trigger when the process is complete
    async processIntent(userSession, intent) {
        if (["BALANCE", "TRANSACTIONS", "UPCOMINGPAYMENTS"].includes(intent)) {
            const isLoggedIn = await LoginService.checkLogin();
            if (!isLoggedIn) {
                userSession.lastIntent = intent; // Save the intent for post-login processing
                userSession.state = states.OTP_VERIFICATION;
                return MessageService.getMessage("otpMessage"); // Prompt for OTP
            }
        }

        // Proceed with intent processing
        switch (intent) {
            case "BALANCE":
                userSession.state = states.BALANCE;
                return await this.handleBalanceInquiry(userSession);
            case "TRANSACTIONS":
                userSession.state = states.TRANSACTIONS;
                return await this.handleTransactions(userSession);
            case "UPCOMINGPAYMENTS":
                userSession.state = states.UPCOMINGPAYMENTS;
                return await this.handleUpcomingPayments(userSession);
            default:
                return "I'm sorry, I couldn't understand your request. Please try again.";
        }
    }

    async handleBalanceInquiry(userSession) {
        const accountsResult = await BalanceService.initiateBalanceInquiry(userSession);
        if (accountsResult) {
            userSession.state = states.ACCOUNT_SELECTION;
            return accountsResult;
        } else {
            return "No accounts available.";
        }
    }

    async handleTransactions(userSession) {
        return "Transactions functionality is under development.";
    }

    async handleUpcomingPayments(userSession) {
        return "Upcoming payments functionality is under development.";
    }

    async handleOTPVerification(userSession) {
        const otp = userSession.otp;
        if (!otp) {
            throw new Error("OTP is not available or initialized.");
        }

        const loginResult = await LoginService.verifyOTP(otp);

        if (loginResult === true) {
            userSession.state = states.LOGGED_IN;
            return this.handleIntentAfterLogin(userSession);
        } else {
            userSession.state = states.OTP_VERIFICATION;
            return "OTP verification failed. Please enter the OTP again.";
        }
    }

    async handleIntentAfterLogin(userSession) {
        if (userSession.lastIntent) {
            return await this.processIntent(userSession, userSession.lastIntent);
        }
        return "You're logged in! How may I assist you?";
    }
}

module.exports = new StateMachine();
