const LoginService = require("../services/loginService");
const BalanceService = require("../services/BalanceService");
const MessageService = require('../services/MessageService');
const TemplateLayer = require("../services/TemplateLayer");
const RecentTransactionService = require("../services/RecentTransactionService");
const BillPaymentService = require("../services/BillPaymentService");

const UpcomingPaymentsService = require("../services/UpcomingPaymentsService");
const HelpMeService = require("../services/HelpMeService");
const IntentService = require("../services/IntentService");
const logger = require("../utils/logger");

const states = {
    OTP_VERIFICATION: "OTP_VERIFICATION",
    LOGGED_IN: "LOGGED_IN",
    LOGGED_OUT: "LOGGED_OUT",
    TRANSACTIONS: "TRANSACTIONS",
    UPCOMINGPAYMENTS: "UPCOMINGPAYMENTS",
    HELP: "HELP",
    BALANCE: "BALANCE",
    BILLPAYMENT: "BILLPAYMENT",
    FETCHING_BILLERS: "FETCHING_BILLERS",
    ACCOUNT_SELECTION: "ACCOUNT_SELECTION",
    ASK_AMOUNT: "ASK_AMOUNT",
    FETCHING_BALANCE: "FETCHING_BALANCE",
    RESOLVE_AMOUNT: "RESOLVE_AMOUNT",
    FETCHING_TRANSACTION: "FETCHING_TRANSACTION",
    FETCH_MOBILE_NUMBER: "FETCH_MOBILE_NUMBER"

};

class StateMachine {
    constructor() {
        this.sessionCache = new Map();
    }

    getSession(userId) {
        if (!this.sessionCache.has(userId)) {
            logger.log(`Creating a new session for user: ${userId}`);
            this.sessionCache.set(userId, { 
                userId: userId,
                state: states.LOGGED_OUT, 
                lastIntent: null, 
                otp: null, 
                mobileNumber: null,
                accounts: null, 
                billers: null,
                amount: null,
                currency: null,
                selectedBiller: null,
                selectedAccount: null, 
                isHelpTriggered: false,
                currentHelpPage: 1
            });
        }
        return this.sessionCache.get(userId);
    }

    async handleMessage(from, messageBody, intent) {
        const userSession = this.getSession(from);

        if (!userSession.isHelpTriggered) {
                    console.log("help me triggered");
            userSession.state = states.HELP;
            userSession.isHelpTriggered = true;
            return await HelpMeService.helpMe();
        }

        if (userSession.state === states.HELP) {
            console.log("entering the help state");
            if (messageBody === "View More") {
                const nextPage = (userSession.currentHelpPage || 1) + 1;
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

          if (userSession.state === states.FETCH_MOBILE_NUMBER) {
            userSession.mobileNumber = messageBody;
            userSession.state = states.OTP_VERIFICATION;
            return MessageService.getMessage("otpMessage");
        }
     if (userSession.state === states.FETCHING_BILLERS) {
            console.log("selected biller in state FETCHING_BILLERS(messagebody):", messageBody);
            userSession.selectedBiller = messageBody;
            return BillPaymentService. confirmAmount(userSession);
        }
        
        
        if (userSession.state === states.OTP_VERIFICATION) {
            userSession.otp = messageBody;
            return await this.handleOTPVerification(userSession);
        }
       
        if (userSession.state === states.RESOLVE_AMOUNT) {
const regex = /^([A-Z]{3})\s(\d+(\.\d{1,2})?)$/; // Regex to match "USD 300" format
const match = messageBody.match(regex);

if (match) {
    userSession.currency = match[1]; // e.g., "USD"
    userSession.amount = parseFloat(match[2]); // e.g., 300
    console.log(`Currency: ${userSession.currency}, Amount: ${userSession.amount}`);

    return await this.handleBillPayments(userSession);
} else {
    // Invalid format: Prompt user to re-enter
    console.log("Invalid format for amount and currency. Re-prompting for confirmation.");
    return await BillPaymentService.confirmAmount(userSession);
}
        }


        if (userSession.state === states.ACCOUNT_SELECTION) {
            return await this.handleAccountSelection(userSession, messageBody);
        }

        return await this.processIntent(userSession, intent);
    }

    async processIntent(userSession, intent) {
        if (["BALANCE", "TRANSACTIONS", "UPCOMINGPAYMENTS","BILLPAYMENT"].includes(intent)) {
const isLoggedIn = await LoginService.checkLogin(userSession.userId);
            if (!isLoggedIn) {
                userSession.lastIntent = intent;
            if (process.env.CHANNEL === "facebook") {
                userSession.state = states.FETCH_MOBILE_NUMBER;
                return MessageService.getMessage("mobileNumber");
            } else {
                userSession.state = states.OTP_VERIFICATION;
                return MessageService.getMessage("otpMessage");
            }
            }
        }

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
            case "BILLPAYMENT":
                userSession.state = states.BILLPAYMENT;
                return await BillPaymentService.initiateBillPayment(userSession);
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
        const accountsResult = await BalanceService.initiateBalanceInquiry(userSession);
        if (accountsResult) {
            userSession.state = states.ACCOUNT_SELECTION;
            return accountsResult;
        } else {
            return "No accounts available for transaction inquiries.";
        }
    }

    async handleUpcomingPayments(userSession) {
        const accountsResult = await BalanceService.initiateBalanceInquiry(userSession);
        if (accountsResult) {
            userSession.state = states.ACCOUNT_SELECTION;
            return accountsResult;
        } else {
            return "No accounts available for upcoming payments.";
        }
    }

    
    async handleBillPayments(userSession) {
        const accountsResult = await BalanceService.initiateBalanceInquiry(userSession);
        if (accountsResult) {
            userSession.state = states.ACCOUNT_SELECTION;
            return accountsResult;
        } else {
            return "No accounts available for upcoming payments.";
        }
    }

    async handleOTPVerification(userSession) {
        const otp = userSession.otp;
        console.log("otp is:",otp);
        if (!otp) throw new Error("OTP is not available or initialized.");

       const loginResult = await LoginService.verifyOTP(otp,userSession.mobileNumber);
        if (loginResult === true) {
            userSession.state = states.LOGGED_IN;
            return this.handleIntentAfterLogin(userSession);
        } else {
            userSession.state = states.OTP_VERIFICATION;
            return "OTP verification failed. Please enter the OTP again.";
        }
    }

    async handleIntentAfterLogin(userSession) {
        console.log("entering handleIntentAfterLogin usersession is:",userSession);
        if (userSession.lastIntent) {
            return await this.processIntent(userSession, userSession.lastIntent);
        }
        return "You're logged in! How may I assist you?";
    }

    async handleAccountSelection(userSession, messageBody) {
        const selectedAccount = BalanceService.parseAccountSelection(messageBody, userSession.accounts);
        if (selectedAccount) {
            userSession.selectedAccount = selectedAccount;

            if (userSession.lastIntent === "BALANCE") {
                const balanceMessage = await BalanceService.fetchBalanceForSelectedAccount(selectedAccount);
                userSession.isHelpTriggered = false;
                userSession.state = states.HELP;
                return balanceMessage;
            } else if (userSession.lastIntent === "TRANSACTIONS") {
                const transactionMessage = await RecentTransactionService.fetchTransactionsForSelectedAccount(selectedAccount);
                userSession.isHelpTriggered = false;
                userSession.state = states.HELP;
                return transactionMessage;
            } else if (userSession.lastIntent === "UPCOMINGPAYMENTS") {
                const paymentsMessage = await UpcomingPaymentsService.fetchPaymentsForSelectedAccount(selectedAccount);
                userSession.isHelpTriggered = false;
                userSession.state = states.HELP;
                return paymentsMessage;
            }
            else if (userSession.lastIntent === "BILLPAYMENT") {
                // const billpayMessage = "Bill pay success!!!!";
                // userSession.isHelpTriggered = false;
                // userSession.state = states.HELP;
                return "Bill pay success!!!";
            }
        } else {
            return "Please enter a valid account selection from the list.";
        }
    }
}

module.exports = new StateMachine();
