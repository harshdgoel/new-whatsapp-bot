const LoginService = require("../services/loginService");
const BalanceService = require("../services/BalanceService");
const MessageService = require('../services/MessageService');
const RecentTransactionService = require("../services/RecentTransactionService");
const UpcomingPaymentsService = require("../services/UpcomingPaymentsService");
const HelpMeService = require("../services/HelpMeService");


const TemplateLayer = require("../services/TemplateLayer");

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
            this.sessionCache.set(userId, { state: states.LOGGED_OUT, lastIntent: null, otp: null, accounts: null, selectedAccount: null });
        }
        return this.sessionCache.get(userId);
    }

   async handleMessage(from, messageBody, intent) {
    console.log("from in handle message is:", from);
    const userSession = this.getSession(from);
    console.log("Handling message, userSession:", userSession);

    if(intent == "HELPME"){

	console.log("entering help me intent");
        return await HelpMeService.helpMe();

    }
    
    
    // Check if user is in OTP verification state
    if (userSession.state === states.OTP_VERIFICATION) {
	console.log("entering OTP_VERIFICATION and messageBody is: ", messageBody);
        userSession.otp = messageBody;
        return await this.handleOTPVerification(userSession);
    }

    // Check if user is in account selection state
    if (userSession.state === states.ACCOUNT_SELECTION) {
        console.log("entering account selection state, user session is:", userSession);
        return await this.handleAccountSelection(userSession, messageBody);
    }

    // Early login check
    const isLoggedIn = await LoginService.checkLogin();
    if (!isLoggedIn) {
	console.log("user not logged in");
        userSession.lastIntent = intent; // Save intent for post-login processing
	console.log("lastintent in isLoggedIn set is: ",userSession.lastIntent);
        userSession.state = states.OTP_VERIFICATION;
      return MessageService.getMessage('otpMessage');
    }

    // Handle recognized intents
    if (intent === "BALANCE") {
		console.log("entering BALANCE intent");
        userSession.state = states.BALANCE;
        userSession.lastIntent = intent;
        return await this.handleBalanceInquiry(userSession);
    }

    if (intent === "TRANSACTIONS") {
        userSession.state = states.TRANSACTIONS;
        userSession.lastIntent = intent;
        return await this.handleBalanceInquiry(userSession); // Update for TRANSACTIONS
    }

     if (intent === "UPCOMINGPAYMENTS") {
        userSession.state = states.UPCOMINGPAYMENTS;
        userSession.lastIntent = intent;
        return await this.handleBalanceInquiry(userSession); // Update for Payments
      }

    // If logged in but intent is null or not recognized
    if (!intent) {
	    	console.log("entering !intent or unkninw intent");
	console.log("userSession.lastIntent here is: ", userSession.lastIntent);
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
    console.log("accountsResult in handle balance inquiry is: ", accountsResult);
    //if (accountsResult && accountsResult.type === "interactive") 
    if (accountsResult) 
    {
        console.log("Returning generated interactive template directly to WhatsApp:", JSON.stringify(accountsResult, null, 2));
        userSession.state = states.ACCOUNT_SELECTION;
        return accountsResult;
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
        console.log("the selected accounT is:", selectedAccount);

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
           else if(userSession.lastIntent == "UPCOMINGPAYMENTS"){
            console.log("entering transactions service");
             userSession.state = states.FETCHING_TRANSACTION;
             const transactionMessage = await UpcomingPaymentsService.fetchPaymentsForSelectedAccount(selectedAccount, messageBody);
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
