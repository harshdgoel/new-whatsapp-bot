const TemplateLayer = require('./TemplateLayer'); // Import TemplateLayer
const LoginService = require('./loginService');
const OBDXService = require('./OBDXService');

class BalanceService {
    static async fetchAccounts() {
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

        const queryParams = new Map([["accountType", "CURRENT,SAVING"], ["status", "ACTIVE"], ["locale", "en"]]);

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

            // Use the INTERACTIVE layer to generate the interactive list
            return TemplateLayer.generateAccountListTemplate(accounts);
        } catch (error) {
            console.error("Error fetching accounts:", error.message);
            return "An error occurred while fetching your accounts. Please try again.";
        }
    }
}

module.exports = BalanceService;

