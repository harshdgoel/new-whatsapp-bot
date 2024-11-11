// In your BalanceService or wherever invokeService is being called
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

        const headers = {
            Authorization: `Bearer ${token}`,
            Cookie: cookie,
            Content-Type: "application/json",
            X-Token-Type: "JWT",
            X-Target-Unit: "OBDX_BU"
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

            console.log("balance response is:", response);
            const firstAccount = response.accounts[0];
            if (firstAccount) {
                const balance = `${firstAccount.currentBalance.currency} ${firstAccount.currentBalance.amount}`;
                return `Your current balance is ${balance}`;
            } else {
                return "No accounts found.";
            }
        } catch (error) {
            console.error("Error fetching balance:", error.message);
            return "An error occurred while fetching your balance. Please try again.";
        }
    }
}

module.exports = new BalanceService();
