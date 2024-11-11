const OBDXService = require("./OBDXService");
const LoginService = require('./loginService');

class BalanceService {
    async fetchBalance(userSession) {
        console.log("Entering FETCH BALANCE METHOD, usersession:", userSession);
        console.log("get cookie method returns:", LoginService.getCookie);
        console.log("cookie after replacing /r/n", LoginService.getCookie().replace(/[\r\n]+/g, ""));
        console.log("token after replacing /r/n", LoginService.getToken().replace(/[\r\n]+/g, ""));

        

        // Clean the token and cookie by removing \r\n
        const token = LoginService.getToken().replace(/[\r\n]+/g, "");
        const cookie = LoginService.getCookie().replace(/[\r\n]+/g, "");

        if (!token || !cookie) {
            console.error("Missing token or cookie.");
            return "Authentication failed. Please log in again.";
        }

        // Initialize headers after token and cookie are cleaned
        const headers = {
            Authorization: `Bearer ${token}`,
            Cookie: cookie,
            "Content-Type": "application/json"
        };

        console.log("Balance headers are:", headers);

        const queryParams = new Map([
            ["accountType", "CURRENT,SAVING"],
            ["status", "ACTIVE,DORMANT,CLOSED"],
            ["locale", "en"]
        ]);

        try {
            const response = await OBDXService.invokeService(
                "/digx-common/dda/v1/demandDeposit",
                "GET",
                headers,
                queryParams
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
