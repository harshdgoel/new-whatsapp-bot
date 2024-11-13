const TemplateLayer = require('./TemplateLayer');
const OBDXService = require('./OBDXService');
const LoginService = require('./loginService');
const states = require('../states/stateMachine').states;
const { sendResponseToWhatsApp } = require('./apiHandler');

class BalanceService {
    // Initiates the balance inquiry by fetching the accounts
    static async initiateBalanceInquiry(userSession) {
        const token = LoginService.getToken();
        const cookie = LoginService.getCookie();

        if (!token || !cookie) {
           userSession.state = states.OTP_VERIFICATION;
            return "Please enter the One Time Password sent to your registered number.";
        }

        const headers = {
            "Authorization": `Bearer ${token}`,
            "Cookie": cookie,
            "Content-Type": "application/json",
            "X-Token-Type": "JWT",
            "X-Target-Unit": "OBDX_BU"
        };

        const queryParams = new Map([["accountType", "CURRENT,SAVING"], ["status", "ACTIVE"], ["locale", "en"]]);

        try {
            const response = await OBDXService.invokeService(
                "/digx-common/dda/v1/demandDeposit",
                "GET",
                new Map(Object.entries(headers)),
                queryParams,
                {},
                null,
                LoginService
            );

            console.log("Response after FETCHACCOUNT API CALL IS", response);
            console.log("Response.data:", response.data);
            console.log("Response.data.accounte:", response.data.accounts);


            if (response.data && response.data.accounts) {
                const accounts = response.data.accounts;
                userSession.accounts = accounts; // Store accounts in user session
                return TemplateLayer.generateAccountListTemplate(accounts);
            } else {
                throw new Error("No accounts found in the response.");
            }
        } catch (error) {
            console.error("Error fetching accounts:", error.message);
            return "An error occurred while fetching your accounts. Please try again.";
        }
    }

    // Fetches balance for the selected account
    static async fetchBalanceForSelectedAccount(selectedAccount) {
        try {
            const balanceMessage = `Balance for ${selectedAccount.accountNickname || selectedAccount.displayName}: ${selectedAccount.availableBalance.amount} ${selectedAccount.availableBalance.currency}`;
            console.log("Fetched balance for selected account:", selectedAccount.accountNickname);
            return balanceMessage;
        } catch (error) {
            console.error("Error fetching balance:", error.message);
            return "Unable to fetch balance at this time. Please try again later.";
        }
    }

    // Parse the selected account and return the account object
    static parseAccountSelection(accountId, accounts) {
        return accounts.find(account => account.id === accountId);
    }
}

module.exports = BalanceService;
