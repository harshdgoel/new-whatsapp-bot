const TemplateLayer = require('./TemplateLayer');
const OBDXService = require('./OBDXService');
const LoginService = require('./loginService');

class BalanceService {
    // Method to initiate balance inquiry
   static async initiateBalanceInquiry() {
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

        
        console.log("response after FETCHACCOUNT API CALL IS", response);
        
        // Check if the response contains accounts
        if (response.accounts && Array.isArray(response.accounts)) {
            const accounts = response.accounts;
            console.log("Accounts are:", accounts);

            // Use the TemplateLayer to generate the interactive list template
            return TemplateLayer.generateAccountListTemplate(accounts);
        } else {
            throw new Error("No accounts found in the response.");
        }
    } catch (error) {
        console.error("Error fetching accounts:", error.message);
        return "An error occurred while fetching your accounts. Please try again.";
    }
}

}

module.exports = BalanceService;
