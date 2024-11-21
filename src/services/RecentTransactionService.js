const TemplateLayer = require('./TemplateLayer');
const OBDXService = require('./OBDXService');
const LoginService = require('./loginService');
const { sendResponseToWhatsApp } = require('./apiHandler');

const states = {
    OTP_VERIFICATION: "OTP_VERIFICATION",
    LOGGED_IN: "LOGGED_IN",
    LOGGED_OUT: "LOGGED_OUT"
};


class RecentTransactionService {
    static async fetchTransactionsForSelectedAccount(selectedAccount, messageBody) {
        console.log("entering fetchTransactionsForSelectedAccount");
        const token = LoginService.getToken();
        const cookie = LoginService.getCookie();
        if (!token || !cookie) {
           userSession.state = states.OTP_VERIFICATION;
            return "Please enter the One Time Password sent to your registered number.";
        }
        const queryParams = new Map([["searchBy", "CPR"], ["transactionType", "A"], ["locale", "en"]]);
        try {
            const response = await OBDXService.invokeService(
                endpoints.accounts + "/" + messageBody+ "/transactions",
                "GET",
                queryParams,
                {},
                LoginService
            );
            console.log("Response after FETCHACCOUNTACTIVITY API CALL IS", response);
            // if (response.data && response.data.accounts) {
            //     const accounts = response.data.accounts;
            //     userSession.accounts = accounts; // Store accounts in user session
            //     return TemplateLayer.generateAccountListTemplate(accounts);
            // } else {
            //     throw new Error("No accounts found in the response.");
            // }
        } catch (error) {
            console.error("Error fetching accounts:", error.message);
            return "An error occurred while fetching your accounts. Please try again.";
        }
    }
}

module.exports = RecentTransactionService;
