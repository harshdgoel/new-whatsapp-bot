const OBDXService = require('./OBDXService');
const LoginService = require('./LoginService');  // Import LoginService

class BalanceService {
    async initiateBalanceInquiry(userSession) {
        // Step 1: Check login state by verifying the token and cookie
        const isLoggedIn = await LoginService.checkLogin();
        if (!isLoggedIn) {
            // If not logged in, prompt for OTP
            return "Authentication required. Please enter your OTP.";
        }

        // Step 2: If logged in, proceed to fetch account details
        return await this.fetchAccounts();
    }

    async fetchAccounts() {
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
            // Fetch the list of accounts
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
            console.log("accounts are:", accounts);
            if (accounts && accounts.length > 0) {
                // Display the list of accounts for user to choose
                let accountList = "Please select an account to view its balance:\n";
                accounts.forEach((account, index) => {
                    accountList += `${index + 1}. ${account.displayName} - ${account.iban}\n`;
                });
                return { message: accountList, accounts: accounts }; // Returning accounts for further use
            } else {
                return "No active accounts found.";
            }
        } catch (error) {
            console.error("Error fetching accounts:", error.message);
            return "An error occurred while fetching your accounts. Please try again.";
        }
    }

    async fetchBalanceForSelectedAccount(selectedIndex, accounts) {
        const account = accounts[selectedIndex];
        if (!account) {
            return "Invalid account selection.";
        }
        
        const balance = `${account.currentBalance.currency} ${account.currentBalance.amount}`;
        return `The balance for account ${account.displayName} is ${balance}.`;
    }
}

module.exports = new BalanceService();
