const OBDXService = require('./OBDXService');
const LoginService = require('./LoginService');
const TemplateLayer = require('./TemplateLayer'); // Import TemplateLayer

class BalanceService {
    async initiateBalanceInquiry(userSession) {
        const isLoggedIn = await LoginService.checkLogin();
        if (!isLoggedIn) {
            return "Authentication required. Please enter your OTP.";
        }

        return await this.fetchAccounts(userSession);
    }

    async fetchAccounts(userSession) {
        const token = LoginService.getToken();
        const cookie = LoginService.getCookie();

        if (!token || !cookie) {
            console.error("Missing token or cookie.");
            return "Authentication failed. Please log in again.";
        }

        const headers = {
            "Authorization": `Bearer ${token}`,
            "Cookie": cookie,
            "Content-Type": "application/json",
            "X-Token-Type": "JWT",
            "X-Target-Unit": "OBDX_BU"
        };

        const queryParams = new Map([
            ["accountType", "CURRENT,SAVING"],
            ["status", "ACTIVE"],
            ["locale", "en"]
        ]);

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
             
            const accounts = response.data.accounts;
            if (accounts && accounts.length > 0) {
                // Using account.id.displayValue for the button text
                const buttons = accounts.map(account => account.id.displayValue); // Correctly accessing id.displayValue
                
                const accountListTemplate = TemplateLayer.createListTemplate(
                    "Account Selection", 
                    "Please select an account to view its balance.", 
                    "Choose an account", 
                    buttons
                );
                userSession.accounts = accounts;
                return accountListTemplate;  // Returning the template for selection
            } else {
                return "No active accounts found.";
            }
        } catch (error) {
            console.error("Error fetching accounts:", error.message);
            return "An error occurred while fetching your accounts. Please try again.";
        }
    }

    async fetchBalanceForSelectedAccount(selectedAccount) {
        if (!selectedAccount) {
            return "Invalid account selection.";
        }

        const balance = `${selectedAccount.currentBalance.currency} ${selectedAccount.currentBalance.amount}`;
        return `The balance for account ${selectedAccount.displayName} is ${balance}.`;
    }

    parseAccountSelection(selection, accounts) {
        const index = parseInt(selection) - 1;
        return accounts && accounts[index] ? accounts[index] : null;
    }
}

module.exports = new BalanceService();
