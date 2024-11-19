const LoginService = require("../services/loginService");
const BalanceService = require("../services/BalanceService");
const TemplateLayer = require("../services/TemplateLayer");

const states = {
    OTP_VERIFICATION: "OTP_VERIFICATION",
    LOGGED_IN: "LOGGED_IN",
    LOGGED_OUT: "LOGGED_OUT",
    BALANCE: "BALANCE",
    ACCOUNT_SELECTION: "ACCOUNT_SELECTION",
    FETCHING_BALANCE: "FETCHING_BALANCE"
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

        if (userSession.state === states.OTP_VERIFICATION) {
            userSession.otp = messageBody;
            return await this.handleOTPVerification(userSession);
        }

        if (userSession.state === states.ACCOUNT_SELECTION) {
            return await this.handleAccountSelection(userSession, messageBody);
        }

        if (intent === "BALANCE") {
            userSession.state = states.BALANCE;
            return await this.handleBalanceInquiry(userSession);
        }

        const isLoggedIn = await LoginService.checkLogin();
        if (!isLoggedIn) {
            userSession.lastIntent = intent;
            userSession.state = states.OTP_VERIFICATION;
            return "Please enter the One Time Password sent to your registered number.";
        }
        console.log("the last intent is:",userSession.lastIntent);
        userSession.state = states.LOGGED_IN;
        userSession.lastIntent = intent;
        return this.handleIntentAfterLogin(userSession);
    }

   async handleBalanceInquiry(userSession) {
    const accountsResult = await BalanceService.initiateBalanceInquiry(userSession);

    console.log("Full accountsResult:", JSON.stringify(accountsResult, null, 2));
    return accountsResult;
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
            default:
                return await this.handleBalanceInquiry(userSession); // THIS NEEDED TO BE CHANGED it goes in default case as 1234 is not recoginezes as intent and intent set to null... add condition if intent null then set intent to the start intent of flow

        }
    }

    async handleAccountSelection(userSession, messageBody) {
        console.log("entering handleAccountSelection and accounts are:",userSession.accounts);
        console.log("entering handleAccountSelection and messageBody is:", messageBody)
        const selectedAccount = BalanceService.parseAccountSelection(messageBody, userSession.accounts);
        console.log("selected account is:", selectedAccount);

        if (selectedAccount) {
            userSession.selectedAccount = selectedAccount;
            userSession.state = states.FETCHING_BALANCE;

            const balanceMessage = await BalanceService.fetchBalanceForSelectedAccount(selectedAccount);
            userSession.state = states.LOGGED_IN;
            return balanceMessage;  // Return balance message
        } else {
            return "Please enter a valid account selection from the list.";
        }
    }
}
module.exports = new StateMachine();
