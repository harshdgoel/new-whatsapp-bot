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
        console.log("from in handleMessage is:", from);
        const userSession = this.getSession(from);
        console.log("Handling message, userSession:", userSession);

        // If Help Me is triggered for the first time
        if (!userSession.isHelpTriggered) {
            console.log("Entering Help Me intent");
            userSession.state = states.HELP;
            userSession.isHelpTriggered = true; // Mark Help as triggered
            return await HelpMeService.helpMe();
        }


    if (userSession.state === states.HELP) {
    if (messageBody === "View More") { // Match the exact "View More" text
        const currentPage = userSession.currentHelpPage || 1; // Track the current page
        const nextPage = currentPage + 1;
        userSession.currentHelpPage = nextPage; // Update session with the new page
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
            console.log("Entering OTP_VERIFICATION and messageBody is:", messageBody);
            userSession.otp = messageBody;
            return await this.handleOTPVerification(userSession);
        }

        // Check if user is in account selection state
        if (userSession.state === states.ACCOUNT_SELECTION) {
            console.log("Entering account selection state, user session is:", userSession);
            return await this.handleAccountSelection(userSession, messageBody);
        }

        // Handle recognized intents
        return await this.processIntent(userSession, intent);
    }

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
                return await this.handleBalanceInquiry(userSession);
            case "UPCOMINGPAYMENTS":
                userSession.state = states.UPCOMINGPAYMENTS;
                return await this.handleBalanceInquiry(userSession);
            default:
                return "I'm sorry, I couldn't understand your request. Please try again.";
        }
    }

    async handleBalanceInquiry(userSession) {
        const accountsResult = await BalanceService.initiateBalanceInquiry(userSession);
        console.log("accountsResult in handleBalanceInquiry is:", accountsResult);

        if (accountsResult) {
            console.log("Returning generated interactive template directly to WhatsApp:", JSON.stringify(accountsResult, null, 2));
            userSession.state = states.ACCOUNT_SELECTION;
            return accountsResult;
        } else {
            return "No accounts available.";
        }
    }

    async handleTransactions(userSession) {
        // Implement the logic to fetch transactions
        return "Transactions functionality is under development.";
    }

    async handleUpcomingPayments(userSession) {
        // Implement the logic to fetch upcoming payments
        return "Upcoming payments functionality is under development.";
    }

    async handleOTPVerification(userSession) {
        console.log("Verifying OTP, OTP:", userSession.otp);
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
        console.log("Handling intent after login, userSession:", userSession);
        if (userSession.lastIntent) {
            return await this.processIntent(userSession, userSession.lastIntent);
        }
        return "You're logged in! How may I assist you?";
    }

async handleAccountSelection(userSession, messageBody) {
    console.log("UserSession in handleAccountSelection is:", userSession);
    console.log("Entering handleAccountSelection and messageBody is:", messageBody); // messageBody is the selected account actual value
    const selectedAccount = BalanceService.parseAccountSelection(messageBody, userSession.accounts);
    console.log("The selected account is:", selectedAccount);

    if (selectedAccount) {
        userSession.selectedAccount = selectedAccount;

        let responseMessage;
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

        // After processing the selected intent, reset state
        userSession.state = states.LOGGED_IN;
        userSession.isHelpTriggered = false; // Reset Help trigger for next session

        // Fetch Help Me menu
        const helpMenu = await HelpMeService.helpMe();

        // Use TemplateLayer to format the help menu
        const formattedHelpMenu = TemplateLayer.generateTemplate(helpMenu); 

        console.log("helpMenu is:", helpMenu);
        console.log("responseMessage is: ", responseMessage);

        // Return balance/transaction/payment response along with Help Me menu
        if (responseMessage) {
            console.log("Returning response message and Help Me menu:", responseMessage);
            return `${responseMessage}\n\n${formattedHelpMenu}`; // Send the formatted help menu
        } else {
                        console.log("returning Help Me menu:", responseMessage);
            return formattedHelpMenu; // If no responseMessage is generated, just return the help menu
        }
    } else {
        return "Please enter a valid account selection from the list.";
    }
}




}

module.exports = new StateMachine();
