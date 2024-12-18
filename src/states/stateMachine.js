const LoginService = require("../services/loginService");
const BalanceService = require("../services/BalanceService");
const MessageService = require('../services/MessageService');
const TemplateLayer = require("../services/TemplateLayer");
const RecentTransactionService = require("../services/RecentTransactionService");
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
    ACCOUNT_SELECTION: "ACCOUNT_SELECTION",
    FETCHING_BALANCE: "FETCHING_BALANCE",
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
            userSession.isHelpTriggered = true;
            return await HelpMeService.helpMe();
        }

        if (userSession.state === states.HELP) {
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
        
        if (userSession.state === states.OTP_VERIFICATION) {
            userSession.otp = messageBody;
            return await this.handleOTPVerification(userSession);
        }

        if (userSession.state === states.ACCOUNT_SELECTION) {
            return await this.handleAccountSelection(userSession, messageBody);
        }

        return await this.processIntent(userSession, intent);
    }

    async processIntent(userSession, intent) {
        if (["BALANCE", "TRANSACTIONS", "UPCOMINGPAYMENTS"].includes(intent)) {
const isLoggedIn = await LoginService.checkLogin(userSession.userId);
            if (!isLoggedIn) {
                userSession.lastIntent = intent;
                userSession.state = states.FETCH_MOBILE_NUMBER;
                return "Please enter your registered mobile number.";
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

    async handleOTPVerification(userSession) {
        const otp = userSession.otp;
        console.log("otp is:",otp);
        if (!otp) throw new Error("OTP is not available or initialized.");

       const loginResult = await LoginService.verifyOTP(userSession.userId, otp,process.env.CHANNEL);
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
        } else {
            return "Please enter a valid account selection from the list.";
        }
    }
}

module.exports = new StateMachine();
