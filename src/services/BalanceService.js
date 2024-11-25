const TemplateLayer = require("./TemplateLayer");
const OBDXService = require("./OBDXService");
const LoginService = require("./loginService");
const endpoints = require("../config/endpoints");
const config = require("../config/config"); // Import config.js
const channel = config.channel;
const states = {
    OTP_VERIFICATION: "OTP_VERIFICATION",
    LOGGED_IN: "LOGGED_IN",
    LOGGED_OUT: "LOGGED_OUT"
};
class BalanceService {
    static async initiateBalanceInquiry(userSession) {
        try {
            const queryParams = new Map([
                ["accountType", "CURRENT,SAVING"],
                ["status", "ACTIVE"],
                ["locale", "en"],
            ]);

            const response = await OBDXService.invokeService(
                endpoints.accounts,
                "GET",
                queryParams,
                {}, // No body needed for GET request
                LoginService
            );

            console.log("Response after FETCHACCOUNT API CALL IS", response);

            if (response.data && response.data.accounts) {
                const accounts = response.data.accounts;
                userSession.accounts = accounts; // Store accounts in user session

                // Generate rows for accounts
                const rows = accounts.map((account, index) => ({
                    id: account.id?.value || `account_${index}`,
                    title: account.id?.displayValue || `Account ${index + 1}`,
                }));

                // Set the template type based on the channel
                const templateType = config.channel.toLowerCase() === "facebook" ? "button" : "list";

                // Construct the template data
                const templateData = {
                    type: templateType,
                    sections: rows, // Use rows directly for both list and button templates
                    bodyText: "Please select an account to view details.",
                    buttonText: "View Accounts",
                    channel: config.channel, // Dynamically use the channel from config
                    to: "916378582419", // Replace with actual recipient number
                };

                // Generate and return the appropriate template
                return TemplateLayer.generateTemplate(templateData);
            } else {
                throw new Error("No accounts found in the response.");
            }
        } catch (error) {
            console.error("Error fetching accounts:", error.message);
            if (error.message.includes("Missing token or cookie")) {
                userSession.state = states.OTP_VERIFICATION;
                return "Please enter the One Time Password sent to your registered number.";
            }
            return "An error occurred while fetching your accounts. Please try again.";
        }
    }

    static async fetchBalanceForSelectedAccount(selectedAccount) {
        try {
            const balanceMessage = `Balance for account ${selectedAccount.id.displayValue} is ${selectedAccount.availableBalance.currency} ${selectedAccount.availableBalance.amount}`;
            return balanceMessage;
        } catch (error) {
            console.error("Error fetching balance:", error.message);
            return "Unable to fetch balance at this time. Please try again later.";
        }
    }

    static parseAccountSelection(accountId, accounts) {
        return accounts.find(account => account.id.value === accountId);
    }
}

module.exports = BalanceService;
