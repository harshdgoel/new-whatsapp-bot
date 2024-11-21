const LoginService = require("../services/loginService");
const BalanceService = require("../services/BalanceService");
const RecentTransactionService = require("../services/RecentTransactionService");
const TemplateLayer = require("../services/TemplateLayer");

const states = {
    OTP_VERIFICATION: "OTP_VERIFICATION",
    LOGGED_IN: "LOGGED_IN",
    LOGGED_OUT: "LOGGED_OUT",
    TRANSACTIONS: "TRANSACTIONS",
    UPCOMINGPAYMENTS: "UPCOMINGPAYMENTS",
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
            this.sessionCache.set(userId, { state: states.LOGGED_OUT, lastIntent: null, otp: null, accounts: null, selectedAccount: null });
        }
        return this.sessionCache.get(userId);
    }

   async handleMessage(from, messageBody, intent) {
    const userSession = this.getSession(from);
    console.log("Handling message, userSession:", userSession);

    // Check if user is in OTP verification state
    if (userSession.state === states.OTP_VERIFICATION) {
        userSession.otp = messageBody;
        return await this.handleOTPVerification(userSession);
    }

    // Check if user is in account selection state
    if (userSession.state === states.ACCOUNT_SELECTION) {
        return await this.handleAccountSelection(userSession, messageBody);
    }

    // Early login check
    const isLoggedIn = await LoginService.checkLogin();
    if (!isLoggedIn) {
        userSession.lastIntent = intent; // Save intent for post-login processing
        userSession.state = states.OTP_VERIFICATION;
        return "Please enter the One Time Password sent to your registered number.";
    }

    // Handle recognized intents
    if (intent === "BALANCE") {
        userSession.state = states.BALANCE;
        userSession.lastIntent = intent;
        return await this.handleBalanceInquiry(userSession);
    }

    if (intent === "TRANSACTIONS") {
        userSession.state = states.TRANSACTIONS;
        userSession.lastIntent = intent;
        return await this.handleTransactionsInquiry(userSession); // Update for TRANSACTIONS
    }

    // If logged in but intent is null or not recognized
    if (!intent) {
	console.log("userSession.lastIntent: ", userSession.lastIntent);
        if (userSession.lastIntent) {
            return this.handleIntentAfterLogin(userSession); // Continue previous intent
        }
        return "I'm sorry, I didn't understand that. Could you please rephrase?";
    }

    // Default fallback
    return "I'm sorry, I couldn't process your request. Please try again.";
}

async handleBalanceInquiry(userSession) {
    const accountsResult = await BalanceService.initiateBalanceInquiry(userSession);
    if (accountsResult && accountsResult.type === "interactive") {
        console.log("Returning generated interactive template directly to WhatsApp:", JSON.stringify(accountsResult, null, 2));
        userSession.state = states.ACCOUNT_SELECTION;
        return accountsResult; // Return the interactive template directly
    } else {
        return "No accounts available.";
    }
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
        switch (userSession.lastIntent) {
            case "BALANCE":
                return await this.handleBalanceInquiry(userSession);
            case "TRANSACTIONS":
                return await this.handleBalanceInquiry(userSession);
            default:
                return "Oops! I'm encountering a trouble understanding you. Please try again later"; // THIS NEEDED TO BE CHANGED it goes in default case as 1234 is not recoginezes as intent and intent set to null... add condition if intent null then set intent to the start intent of flow

        }
    }

    async handleAccountSelection(userSession, messageBody) {
        console.log("UserSession in handleAccountSelection is: ", userSession)
        console.log("entering handleAccountSelection and messageBody is:", messageBody) //messageBody is the selected account actual value
        const selectedAccount = BalanceService.parseAccountSelection(messageBody, userSession.accounts);
        if (selectedAccount) {
            console.log("the selected account is:", selectedAccount);
            userSession.selectedAccount = selectedAccount;
            if(userSession.lastIntent == "BALANCE"){
            userSession.state = states.FETCHING_BALANCE;
            const balanceMessage = await BalanceService.fetchBalanceForSelectedAccount(selectedAccount);
            userSession.state = states.LOGGED_IN;
            return balanceMessage;  // Return balance message
            }
           else if(userSession.lastIntent == "TRANSACTIONS"){
               console.log("entering transactions service");
                userSession.state = states.FETCHING_TRANSACTION;
                const transactionMessage = await RecentTransactionService.fetchTransactionsForSelectedAccount(selectedAccount, messageBody);
                userSession.state = states.LOGGED_IN;
                console.log("transactions are:", transactionMessage);
                return transactionMessage;
           }
        } else {
            return "Please enter a valid account selection from the list.";
        }
    }
}
module.exports = new StateMachine();
