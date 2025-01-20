const LoginService = require("../services/loginService");
const BalanceService = require("../services/BalanceService");
const MessageService = require('../services/MessageService');
const TemplateLayer = require("../services/TemplateLayer");
const RecentTransactionService = require("../services/RecentTransactionService");
const BillPaymentService = require("../services/BillPaymentService");
const MoneyTransferService = require("../services/MoneyTransferService");

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
    TRANSFERMONEY: "TRANSFERMONEY",
    FETCHING_BILLERS: "FETCHING_BILLERS",
    ACCOUNT_SELECTION: "ACCOUNT_SELECTION",
    ASK_AMOUNT: "ASK_AMOUNT",
    FETCHING_BALANCE: "FETCHING_BALANCE",
    RESOLVE_AMOUNT: "RESOLVE_AMOUNT",
    FETCHING_TRANSACTION: "FETCHING_TRANSACTION",
    FETCH_MOBILE_NUMBER: "FETCH_MOBILE_NUMBER",
    FETCHING_PAYEES: "FETCHING_PAYEES",
    WHATSAPP_LOGIN: "WHATSAPP_LOGIN"
};

class StateMachine {
    constructor() {
        this.sessionCache = new Map();
    }

 getSession(userId) {
    let userSession = this.sessionCache.get(userId);
    if (!userSession) {
        logger.log(`Creating a new session for user: ${userId}`);
        userSession = {
            userId: userId,
            state: states.HELP,
            lastIntent: null,
            otp: null,
            authOTP: null,
            registrationId: null,
            mobileNumber: null,
            accounts: null,
            billers: null,
            payees: null,
            amount: null,
            currency: null,
            selectedBiller: null,
            selectedPayee: null,
            selectedAccount: null,
            isHelpTriggered: false,
            currentHelpPage: 1,
            IS_OTP_REQUIRED: null,
            AUTH_TYPE: null,
            XTOKENREFNO: null
        };
        this.sessionCache.set(userId, userSession);
    }
    return userSession;
}


    async handleMessage(from, messageBody, intent) {
        const userSession = this.getSession(from);
        console.log("entering handle message and state is:", userSession.state);
        console.log("entering handle message is:", messageBody);


        if ( !userSession.isHelpTriggered && 
    userSession.state === states.HELP) {
                    console.log("help me triggered,usersession is:",userSession);
            userSession.state = states.HELP;
            userSession.mobileNumber = from;
            userSession.isHelpTriggered = true;
            return await HelpMeService.helpMe(userSession.currentHelpPage || 1, from);
        }

        if (userSession.state === states.HELP) {
            console.log("entering the help state");
            if (messageBody === "View More") {
                const nextPage = (userSession.currentHelpPage || 1) + 1;
                userSession.currentHelpPage = nextPage;
                return await HelpMeService.helpMe(nextPage,from);
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
            console.log("mobile number in FETCH_MOB_NUM state is:", messageBody);
            const result = await LoginService.authenticateUser(messageBody,userSession);
            console.log("result for login is",result);

            if (result.success) {
                console.log("User authenticated. Prompt user with message:", result.message);
            } else {
                console.error("Authentication failed:", result.message);
            }
            return result.message;
        }
       if (userSession.state === states.WHATSAPP_LOGIN) {
            userSession.isHelpTriggered = true;
            userSession.mobileNumber = from;
            const result = await LoginService.authenticateUser(userSession.mobileNumber,userSession);
            console.log("result for login is",result);

            if (result.success) {
            userSession.otp = messageBody;
            return await this.handleOTPVerification(userSession);
            } else {
                console.error("Authentication failed:", result.message);
            }
            return result.message;
        }

     if (userSession.state === states.FETCHING_BILLERS) {
            console.log("selected biller in state FETCHING_BILLERS(messagebody):", messageBody);
    const selectedBiller = BillPaymentService.parseBillerSelection(messageBody, userSession.billers); // Parse the selected biller
    if (selectedBiller) {
        userSession.selectedBiller = selectedBiller; // Save selected biller to the session
        console.log("selected biller details:", selectedBiller);
        return BillPaymentService.confirmAmount(userSession, selectedBiller);
    }
    else {
        return "Invalid selection. Please choose a valid biller from the list.";
    }
        }

        if (userSession.state === states.FETCHING_PAYEES) {
            console.log("entered state fetch_payee in handle message", userSession.payees);
    const selectedPayee = MoneyTransferService.parsePayeeSelection(messageBody, userSession.payees); // Parse the selected biller
            console.log("selected payee is:", selectedPayee);
    if (selectedPayee) {
        userSession.selectedPayee = selectedPayee; // Save selected payee to the session
        console.log("selected payee details:", selectedPayee);
        return MoneyTransferService.confirmTransferAmount(userSession, selectedPayee);
    }
    else {
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
              const balance = userSession.selectedAccount.availableBalance;
        const advice = await CohereService.getInsights({
            currency: balance.currency || "USD",
            amount: balance.amount || 0,
        });
        userSession.state = states.HELP;
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
        console.log("now calling process intent and intent is: ", intent);
        console.log("now calling process intent and state in usersession is", userSession.state);
        return await this.processIntent(userSession, intent);
    }

    async processIntent(userSession, intent) {
        console.log("entering processIntent and intent is:", intent);
        if (["BALANCE", "TRANSACTIONS", "UPCOMINGPAYMENTS","BILLPAYMENT","TRANSFERMONEY"].includes(intent)) {
const isLoggedIn = await LoginService.checkLogin(userSession.userId);
            if (!isLoggedIn) {
                userSession.lastIntent = intent;
            if (process.env.CHANNEL === "facebook") {
                userSession.state = states.FETCH_MOBILE_NUMBER;
                return MessageService.getMessage("mobileNumber");
            } else {
                userSession.state = states.WHATSAPP_LOGIN;
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
            case "TRANSFERMONEY":
                    console.log("entered transfer money intent in processIntent");
                    userSession.state = states.TRANSFERMONEY;
                    return await MoneyTransferService.fetchPayees(userSession);
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

       const loginResult = await LoginService.fetchFinalLoginResponse(otp,userSession.mobileNumber,userSession.registrationId);
       console.log("login result is:", loginResult);
        if (loginResult.success === true) {
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
    console.log("Entering handleAccountSelection");
    
    // Parse and set selectedAccount only if not already set in the userSession
    if (!userSession.selectedAccount) {
        const parsedAccount = BalanceService.parseAccountSelection(messageBody, userSession.accounts);
        if (parsedAccount) {
            userSession.selectedAccount = parsedAccount;
        } else {
            return "Please enter a valid account selection from the list.";
        }
    }

    console.log("Selected account is:", userSession.selectedAccount);

    // Perform actions based on the last intent
    if (userSession.selectedAccount) {
        switch (userSession.lastIntent) {
                //for genai use case
            // case "BALANCE":
            //     return await BalanceService.fetchBalanceForSelectedAccount(userSession.selectedAccount, userSession);

            case "BALANCE":
                const balanceMessage = await BalanceService.fetchBalanceForSelectedAccount(userSession.selectedAccount, userSession);
                 userSession.isHelpTriggered = false;
                userSession.state = states.HELP;
                return balanceMessage;

            case "TRANSACTIONS":
                const transactionMessage = await RecentTransactionService.fetchTransactionsForSelectedAccount(userSession.selectedAccount);
                userSession.isHelpTriggered = false;
                userSession.state = states.HELP;
                return transactionMessage;

            case "UPCOMINGPAYMENTS":
                const paymentsMessage = await UpcomingPaymentsService.fetchPaymentsForSelectedAccount(userSession.selectedAccount);
                userSession.isHelpTriggered = false;
                userSession.state = states.HELP;
                return paymentsMessage;

            case "BILLPAYMENT":
                console.log("User session in BILLPAYMENT state is:", userSession);
                const billPaymentMessage = await BillPaymentService.completePayment(userSession);
                userSession.isHelpTriggered = false;
                userSession.state = states.HELP;
                return billPaymentMessage;

            case "TRANSFERMONEY":
                console.log("User session in TRANSFERMONEY state is:", userSession);
                if (userSession.XTOKENREFNO) {
                    userSession.authOTP = messageBody;
                }
                const transferPaymentMessage = await MoneyTransferService.completePayment(userSession);
                userSession.isHelpTriggered = false;
                userSession.state = states.HELP;
                return transferPaymentMessage;

            default:
                return "Invalid operation. Please try again.";
        }
    } else {
        return "Please enter a valid account selection from the list.";
    }
}
}

module.exports = new StateMachine();
