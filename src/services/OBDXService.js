const OBDXService = require('./OBDXService');
const LoginService = require('./loginService');  // Import LoginService

class BalanceService {
    async fetchBalance(userSession) {
        console.log("Entering FETCH BALANCE METHOD, usersession:", userSession);

        // Clean token and cookie handling
        const token = LoginService.getToken().replace(/[\r\n]+/g, "");
        const cookie = LoginService.getCookie();

        if (!token || !cookie) {
            console.error("Missing token or cookie.");
            return "Authentication failed. Please log in again.";
        }

        // Wrap header property names with hyphens in quotes
        const headers = {
            "Authorization": `Bearer ${token}`,
            "Cookie": cookie,
            "Content-Type": "application/json",   // Corrected syntax for hyphenated keys
            "X-Token-Type": "JWT",
            "X-Target-Unit": "OBDX_BU"
        };

        console.log("Balance headers are:", headers);

        const queryParams = new Map([
            ["accountType", "CURRENT,SAVING"],
            ["status", "ACTIVE,DORMANT,CLOSED"],
            ["locale", "en"]
        ]);

        try {
            // Pass LoginService as a parameter to invokeService
            const response = await OBDXService.invokeService(
                "/digx-common/dda/v1/demandDeposit",
                "GET",
                new Map(Object.entries(headers)),  // Convert headers object to Map
                queryParams,
                {},
                null,  // userId is not required
                LoginService  // Pass LoginService instance here
            );

            // Log the full response to debug the structure
            console.log("balance response is:", response);

          const firstAccount = response.data.accounts[0];

        if (firstAccount) {
            // Access the account number (displayValue), currency, and balance amount
            const accountNumber = firstAccount.id.displayValue; // Display value of account ID
            const currency = firstAccount.currentBalance.currency; // Currency code from current balance
            const balanceAmount = firstAccount.currentBalance.amount; // Amount from current balance

            // Return the formatted message
            return `Your balance for account number: ${accountNumber} is ${currency} ${balanceAmount}`;
        } catch (error) {
            console.error("Error fetching balance:", error.message);
            return "An error occurred while fetching your balance. Please try again.";
        }
    }
}

module.exports = new BalanceService();
