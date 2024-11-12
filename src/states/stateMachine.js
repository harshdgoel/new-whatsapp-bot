const LoginService = require("../services/loginService");
const BalanceService = require("../services/BalanceService");

const states = {
    OTP_VERIFICATION: "OTP_VERIFICATION",
    LOGGED_IN: "LOGGED_IN",
    LOGGED_OUT: "LOGGED_OUT",
    BALANCE: "BALANCE",
    ACCOUNT_SELECTION: "ACCOUNT_SELECTION",  // New state for account selection
    FETCHING_BALANCE: "FETCHING_BALANCE"     // New state for fetching selected account balance
};

class StateMachine {
    constructor() {
        this.sessionCache = new Map();
    }

    getSession(userId) {
        if (!this.sessionCache.has(userId)) {
            this.sessionCache.set(userId, { state: states.LOGGED_OUT, lastIntent: null, otp: null, selectedAccount: null });
        }
        return this.sessionCache.get(userId);
    }

    async handleMessage(from, messageBody, intent) {
        const userSession = this.getSession(from);
        console.log("Handling message, userSession:", userSession);

        // Handle OTP input if user is in OTP_VERIFICATION state
        if (userSession.state === states.OTP_VERIFICATION) {
            userSession.otp = messageBody;
            return await this.handleOTPVerification(userSession);
        }

        // If user is selecting an account in ACCOUNT_SELECTION state
        if (userSession.state === states.ACCOUNT_SELECTION) {
            return await this.handleAccountSelection(userSession, messageBody);
        }

        if (intent === "BALANCE") {
            userSession.state = states.BALANCE;
        }

        const isLoggedIn = await LoginService.checkLogin();
        if (!isLoggedIn) {
            userSession.lastIntent = intent;
            userSession.state = states.OTP_VERIFICATION;
            return "Please enter the One Time Password sent to your registered number.";
        }

        userSession.state = states.LOGGED_IN;
        userSession.lastIntent = intent;
        return this.handleIntentAfterLogin(userSession);
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
                // Fetch accounts list instead of balance
                const accountsMessage = await BalanceService.fetchAccounts(userSession);
                userSession.state = states.ACCOUNT_SELECTION;
                return `Please select an account:\n${accountsMessage}`; // Display list of accounts to user
            case "TRANSACTIONS":
                return "Transaction history will be displayed here.";
            default:
                return "You're logged in! How may I assist you?";
        }
    }

    async handleAccountSelection(userSession, messageBody) {
        console.log("Handling account selection, user response:", messageBody);
        
        // Assuming messageBody contains an identifier for the selected account
        const selectedAccount = BalanceService.parseAccountSelection(messageBody);  // Implement parsing in BalanceService

        if (selectedAccount) {
            userSession.selectedAccount = selectedAccount;
            userSession.state = states.FETCHING_BALANCE;

            // Fetch balance for the selected account
            const balanceMessage = await BalanceService.fetchBalanceForSelectedAccount(userSession.selectedAccount);
            userSession.state = states.LOGGED_IN;  // Reset to LOGGED_IN after fetching balance
            return balanceMessage;
        } else {
            return "Please enter a valid account selection from the list.";
        }
    }
}

module.exports = new StateMachine();
