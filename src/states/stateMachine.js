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

        userSession.state = states.LOGGED_IN;
        userSession.lastIntent = intent;
        return this.handleIntentAfterLogin(userSession);
    }

   async handleBalanceInquiry(userSession) {
    const accountsResult = await BalanceService.initiateBalanceInquiry(userSession);

    console.log("Full accountsResult:", JSON.stringify(accountsResult, null, 2));

   // Check if accountsResult is a valid object and contains sections and rows
    if (typeof accountsResult === "string") {
        return accountsResult; // Either OTP prompt or error message
    } else if (accountsResult) {
        // Initialize an empty array for rows
        const rows = [];

        // Access the rows in the first section
        const sections = accountsResult.interactive.action.sections;

        // Iterate over the rows array in the first section
        for (let i = 0; i < sections[0].rows.length; i++) {
            const account = sections[0].rows[i];  // Access account directly from the rows

            // Log the entire account object for debugging
            console.log(`Processing account ${i + 1}:`, account);

            // Extract the account ID and log it
            const accountId = account.id;

            // Check if the account has an id field, otherwise skip it
            if (!accountId) {
                console.warn(`Account ${i + 1} is missing id`);
                continue; // Skip this account if id is missing
            }

            // Push the valid account data to the rows array
            rows.push({
                id: accountId,
                title: account.title
            });
        }

        // If there are valid rows, set them in the sections array
        if (rows.length > 0) {
            sections[0].rows = rows; // Populate the rows with valid account data

            console.log("Final accountsResult with populated sections:", JSON.stringify(accountsResult, null, 2));

            userSession.state = states.ACCOUNT_SELECTION;
            return accountsResult;  // This should send the populated list template to WhatsApp
        } else {
            return "No valid accounts available.";
        }
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
            default:
                return "You're logged in! How may I assist you?";
        }
    }

    async handleAccountSelection(userSession, messageBody) {
        const selectedAccount = BalanceService.parseAccountSelection(messageBody, userSession.accounts);

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
module.exports.states = states;
