// BalanceService.js
const OBDXService = require("./OBDXService");

class BalanceService {
    async fetchBalance(userSession) {
        const headers = {
            Authorization: `Bearer ${LoginService.getToken()}`,
            Cookie: LoginService.getCookie(),
            "Content-Type": "application/json"
        };

        const queryParams = new Map([
            ["accountType", "CURRENT,SAVING"],
            ["status", "ACTIVE,DORMANT,CLOSED"]
        ]);

        try {
            const response = await OBDXService.invokeService(
                "/demandDeposit",
                "GET",
                headers,
                queryParams
            );
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
