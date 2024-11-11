const LoginService = require("../services/loginService");
const BalanceService = require("../services/BalanceService");

const states = {
    OTP_VERIFICATION: "OTP_VERIFICATION",
    LOGGED_IN: "LOGGED_IN",
    LOGGED_OUT: "LOGGED_OUT",
    BALANCE: "BALANCE"  // State to track balance requests
};

class StateMachine {
    constructor() {
        this.sessionCache = new Map();
    }

    getSession(userId) {
        if (!this.sessionCache.has(userId)) {
            this.sessionCache.set(userId, { state: states.LOGGED_OUT, lastIntent: null, otp: null });
        }
        return this.sessionCache.get(userId);
    }

    async handleMessage(from, messageBody, intent) {
        const userSession = this.getSession(from);
        console.log("entering handle message, userSession is:",userSession);

        // If the user is in OTP verification state, handle the OTP input
        if (userSession.state === states.OTP_VERIFICATION) {
            userSession.otp = messageBody;  // Assume the user has entered the OTP
            return await this.handleOTPVerification(userSession);
        }

        if (intent === "BALANCE") {
            userSession.state = states.BALANCE;
        }

        // Check if user is logged in; if not, ask for OTP
        const isLoggedIn = await LoginService.checkLogin();
        if (!isLoggedIn) {
            userSession.state = states.OTP_VERIFICATION;
            return "Please enter the One Time Password sent to your registered number.";
        }

        // User is logged in; handle the intent directly
        userSession.state = states.LOGGED_IN;
        userSession.lastIntent = intent;
        return this.handleIntentAfterLogin(userSession);
    }

   
async handleOTPVerification(userSession) {
    console.log("entering handleOTPVerification, OTP is:", userSession.otp); // Log the OTP entered by the user
    const otp = userSession.otp;  // Correctly use the otp from userSession

    if (!otp) {
        throw new Error("OTP is not available or initialized.");
    }

    // Attempt to verify OTP and log in
    const loginResult = await LoginService.verifyOTP(otp);

    if (loginResult === true) {
        userSession.state = states.LOGGED_IN;
        return this.handleIntentAfterLogin(userSession);  // Handle the previously requested intent (e.g., BALANCE)
    } else {
        userSession.state = states.OTP_VERIFICATION;
        return "OTP verification failed. Please enter the OTP again.";
    }
}


    async handleIntentAfterLogin(userSession) {
        switch (userSession.lastIntent) {
            case "BALANCE":
                return await BalanceService.fetchBalance(userSession);
            case "TRANSACTIONS":
                return "Transaction history will be displayed here.";
            default:
                return "You're logged in! How may I assist you?";
        }
    }
}

module.exports = new StateMachine(); // Exporting the instance directly
