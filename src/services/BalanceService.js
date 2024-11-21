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
    // Initiates the balance inquiry by fetching the accounts
    static async initiateBalanceInquiry(userSession) {
        try {
            const queryParams = new Map([
                ["accountType", "CURRENT,SAVING"],
                ["status", "ACTIVE"],
                ["locale", "en"]
            ]);

            const response = await OBDXService.invokeService(
                endpoints.accounts,
                "GET",
                queryParams,
                {}, // No body needed for GET request
                LoginService
            );

            console.log("Response after FETCHACCOUNT API CALL IS", response);
            console.log("Response.data:", response.data);

            if (response.data && response.data.accounts) {
                const accounts = response.data.accounts;
                userSession.accounts = accounts; // Store accounts in user session
                 // Initialize rows array for storing account details
        const rows = [];
        // Iterate over each account in the API respons
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            const accountId = account.id?.value;
            if (!accountId) {
                console.warn(`Account ${i + 1} is missing id.value`);
                continue; // Skip this account if id is missing
            }
            const accountTitle = account.id?.displayValue;
            console.log(`Account ${i + 1} title:`, accountTitle);
            rows.push({
                id: accountId,
                title: accountTitle
            });
        }

        const sections = [
            {
                title: "Select an Account",
                rows: rows
            }
        ];
                console.log("Sections generated in Balance is:", sections);

            
const templateData = {
    type: "list",
    sections:sections,
    bodyText: "Please select an account to view details.",
    buttonText: "View Accounts",
    channel: channel,
    to: "916378582419", // Replace with actual recipient number
};

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

    // Fetches balance for the selected account
    static async fetchBalanceForSelectedAccount(selectedAccount) {
        try {
            const balanceMessage = `Balance for account ${selectedAccount.id.displayValue} is ${selectedAccount.availableBalance.currency} ${selectedAccount.availableBalance.amount}`;
            return balanceMessage;
        } catch (error) {
            console.error("Error fetching balance:", error.message);
            return "Unable to fetch balance at this time. Please try again later.";
        }
    }

    // Parse the selected account and return the account object
    static parseAccountSelection(accountId, accounts) {
        return accounts.find(account => account.id.value === accountId);
    }
}

module.exports = BalanceService;
