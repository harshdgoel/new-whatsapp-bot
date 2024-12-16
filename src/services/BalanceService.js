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
    HELP: "HELP"
};
class BalanceService {
  static async initiateBalanceInquiry(userSession) {
    try {
      const queryParams = null;

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

        // Filter accounts with missing or invalid required properties
        const validAccounts = accounts.filter(account => {
          return account.id?.value && account.id?.displayValue;
        });

        if (validAccounts.length === 0) {
          throw new Error("No valid accounts found in the response.");
        }

        userSession.accounts = validAccounts; // Store valid accounts in the user session

        // Generate rows for valid accounts
        const rows = validAccounts.map((account, index) => ({
          id: account.id?.value || `account_${index}`, // Unique account ID
          title: account.id?.displayValue || `Account ${index + 1}`, // Display name
          payload: account.id?.displayValue || `Account ${index + 1}`, // Payload for Messenger
        }));
        const channel = config.channel.toLowerCase();
        let templateData;

        // Generate the appropriate template structure based on the channel
        switch (channel) {
          case "whatsapp":
            templateData = {
              type: "list",
              sections: rows.map(row => ({
                id: row.id,
                title: row.title,
              })), // Include only id and title for WhatsApp
              bodyText: "Please select an account to view details.",
              buttonText: "View Accounts",
              channel,
              to: "916378582419", // Replace with actual recipient number
            };
            break;

          case "facebook":
           templateData = {
        bodyText: "Please select an account to view details.",
    sections: rows
      .slice(0, 10) // Limit to top 10 entries
      .filter(row => row.title && row.payload) // Filter out invalid rows
      .map(row => ({
        content_type: "text",
        title: row.title,
        payload: row.payload, // Payload for Facebook
      })),

};
    break;

          default:
            throw new Error("Unsupported channel type. Only 'whatsapp' and 'facebook' are supported.");
        }

        console.log("Template data is:", templateData);
        // Pass the constructed template data to the TemplateLayer
        return TemplateLayer.generateTemplate(templateData);

      } else {
        throw new Error("No accounts found in the response.");
      }
    } catch (error) {
      console.error("Error fetching accounts:", error.message);

      if (error.message.includes("Missing token or cookie")) {
        userSession.state = states.OTP_VERIFICATION;
      return MessageService.getMessage('otpMessage');
      }
      console.log("state in balance service catch is:",userSession.state);
        userSession.state === states.HELP // just for trial
        console.log("state in balance service catch is:",userSession.state);
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
      console.log("entering parseAccountSelection");
      console.log("matched account is",accounts.find(account => account.id.displayValue === accountId));

    return accounts.find(account => account.id.displayValue === accountId);
  }
}
module.exports = BalanceService;
