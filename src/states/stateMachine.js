const LoginService = require("../services/loginService");
const BalanceService = require("../services/BalanceService");
const MessageService = require('../services/MessageService');
const TemplateLayer = require("../services/TemplateLayer");
const RecentTransactionService = require("../services/RecentTransactionService");
const BillPaymentService = require("../services/BillPaymentService");
const CohereService = require('../genai/CohereService');
const UpcomingPaymentsService = require("../services/UpcomingPaymentsService");
const HelpMeService = require("../services/HelpMeService");
const IntentService = require("../services/IntentService");
const logger = require("../utils/logger");

const states = {
    OTP_VERIFICATION: "OTP_VERIFICATION",
    ASK_INSIGHTS: "ASK_INSIGHTS",
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
        const newSession = {
            userId: userId,
            state: states.HELP,
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
            currentHelpPage: 1,
        };
        this.sessionCache.set(userId, newSession);
    }
    return this.sessionCache.get(userId);
}

    async handleMessage(from, messageBody, intent) {
        const userSession = this.getSession(from);
        console.log("entering handle message and state is:", userSession.state);

        if ( !userSession.isHelpTriggered && 
    userSession.state === states.HELP) {
                    console.log("help me triggered,usersession is:",userSession);
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
                console.log("message body is:", messageBody);
                console.log("selected intent is:", selectedIntent);
                if (selectedIntent && selectedIntent !== "UNKNOWN") {
                    userSession.lastIntent = selectedIntent;
                    return await this.processIntent(userSession, selectedIntent);
                } else {
                    userSession.isHelpTriggered = false;
                    userSession.state = states.HELP;
                    return "Invalid selection. Please choose a valid option from the menu.";
                }
            }
        }

          if (userSession.state === states.FETCH_MOBILE_NUMBER) {
            userSession.isHelpTriggered = true;
            console.log("userSession in FETCH_MOBILE_NUMBER is:", userSession);
            userSession.mobileNumber = messageBody;
            userSession.state = states.OTP_VERIFICATION;
            return MessageService.getMessage("otpMessage");
        }
     if (userSession.state === states.FETCHING_BILLERS) {
            console.log("selected biller in state FETCHING_BILLERS(messagebody):", messageBody);
    const selectedBiller = BillPaymentService.parseBillerSelection(messageBody, userSession.billers); // Parse the selected biller
    if (selectedBiller) {
        userSession.selectedBiller = selectedBiller; // Save selected biller to the session
        console.log("selected biller details:", selectedBiller);
        return BillPaymentService.confirmAmount(userSession, selectedBiller);
    } else {
        return "Invalid selection. Please choose a valid biller from the list.";
    }
        }
        
        
        if (userSession.state === states.OTP_VERIFICATION) {
            userSession.otp = messageBody;
            return await this.handleOTPVerification(userSession);
        }
       
        if (userSession.state === states.RESOLVE_AMOUNT) {
            console.log("entering resolve amount state");
const regex = /^([A-Z]{3})\s(\d+(\.\d{1,2})?)$/; // Regex to match "USD 300" format
const match = messageBody.match(regex);

if (match) {
    userSession.currency = match[1];
    userSession.amount = parseFloat(match[2]);
    userSession.state = states.ACCOUNT_SELECTION;
      const accountsResult = await BalanceService.initiateBalanceInquiry(userSession);
        console.log("accountsResult in MATCHED BILLER is",accountsResult);
        if (accountsResult) {
            userSession.state = states.ACCOUNT_SELECTION;
            return accountsResult;
        } else {
            return "No accounts available for upcoming payments.";
        }
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

        if (userSession.state === states.ASK_INSIGHTS) {
            console.log("entering state ASK_INSIGHTS");
            if (messageBody.toLowerCase() === "yes") {
              const balance = userSession.selectedAccount.availableBalance; // Fetch balance from selected account
        const advice = await CohereService.getInsights({
            currency: balance.currency || "USD",
            amount: balance.amount || 0,
        });
        userSession.state = states.HELP; // Reset state after providing advice
        userSession.isHelpTriggered = false;
        return `Here is your financial advice:\n\n${advice}`;
            } else if (messageBody.toLowerCase() === "no") {
              userSession.state = states.HELP; // Reset state
              userSession.isHelpTriggered = false;
              return "Okay, let me know if you need further assistance.";
            } else {
              return 'Invalid response. Please reply with "Yes" or "No".';
            }
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
                console.log("entered bill pay intent in processIntent");
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
        console.log("entering bill pay handleBillPayments");
        const accountsResult = await BalanceService.initiateBalanceInquiry(userSession);
        console.log("accountsResult in handleBillPayments is",accountsResult);
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
        userSession.isHelpTriggered = false;
        console.log("entering handleIntentAfterLogin usersession is:",userSession);
        if (userSession.lastIntent) {
            return await this.processIntent(userSession, userSession.lastIntent);
        }
        return "You're logged in! How may I assist you?";
    }

    async handleAccountSelection(userSession, messageBody) {
        console.log("entering handleAccountSelection");
        const selectedAccount = BalanceService.parseAccountSelection(messageBody, userSession.accounts);
        console.log("selected account is:",selectedAccount);
        if (selectedAccount) {
            userSession.selectedAccount = selectedAccount;

            if (userSession.lastIntent === "BALANCE") {
                const balanceMessage = await BalanceService.fetchBalanceForSelectedAccount(selectedAccount,userSession);
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
                console.log("userSession in BILLPAYMENT STATE IS:", userSession);
                console.log("userSession in BILLPAYMENT STATE IS:", userSession);

    const billPaymentMessage = await BillPaymentService.completePayment(userSession);

    userSession.isHelpTriggered = false;
    userSession.state = states.HELP;

    return billPaymentMessage;
            }
        } else {
            return "Please enter a valid account selection from the list.";
        }
    }
}

module.exports = new StateMachine();
