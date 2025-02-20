const TemplateLayer = require("./TemplateLayer");
const OBDXService = require("./OBDXService");
const LoginService = require("./loginService");
const endpoints = require("../config/endpoints");
const channel = process.env.CHANNEL;
const states = {
    OTP_VERIFICATION: "OTP_VERIFICATION",
    LOGGED_IN: "LOGGED_IN",
    LOGGED_OUT: "LOGGED_OUT",
    HELP: "HELP"
};
class BalanceService {
  static async initiateBalanceInquiry(userSession) {
      console.log("entering initiateBalanceInquiry");
    try {
      const queryParams = null;

      const response = await OBDXService.invokeService(
        endpoints.accounts,
        "GET",
        queryParams,
        {}, // No body needed for GET request
        LoginService,
        userSession
      );

console.log("respose is:", response);
      if (response.data && response.data.accounts) {
          console.log("response.data present");
        const accounts = response.data.accounts;

          console.log("accounts is:",accounts);
        // Filter accounts with missing or invalid required properties
       const validAccounts = accounts.filter(account => {
  const isValid = account.id?.value && account.id?.displayValue;
  if (!isValid) {
    console.warn("Invalid account detected:", account);
  }
  return isValid;
});


        if (validAccounts.length === 0) {
          throw new Error("No valid accounts found in the response.");
        }

        userSession.accounts = validAccounts; // Store valid accounts in the user session
          console.log("validAccounts is:",validAccounts);

        // Generate rows for valid accounts
        const rows = validAccounts.map((account, index) => ({
          id: account.id?.value || `account_${index}`, // Unique account ID
          title: account.id?.displayValue || `Account ${index + 1}`, // Display name
          payload: account.id?.displayValue || `Account ${index + 1}`, // Payload for Messenger
        }));
        const channel = process.env.CHANNEL.toLowerCase();
        let templateData;

        // Generate the appropriate template structure based on the channel
        switch (channel) {
case "whatsapp":
    // Limit accounts to top 10
    const topAccounts = validAccounts.slice(0, 10);

    // Generate rows for the top 10 accounts
    const acc_rows = topAccounts.map((account, index) => ({
        id: `${account.id?.displayValue || `Account_${index}`}_${index}`,
        title: account.id?.displayValue || `Account ${index + 1}`, 
    }));

    if (acc_rows.length === 0) {
        throw new Error("No accounts available for WhatsApp template.");
    }

    templateData = {
        type: "list",
        sections: [
            {
                rows: acc_rows, // Correctly include rows for WhatsApp list
            },
        ],
        bodyText: "Please select an account to view details.",
        buttonText: "View Accounts",
        channel,
        to: userSession.mobileNumber, // Replace with the actual recipient number
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
      return "An error occurred while fetching your accounts. Please try again.";
    }
  }

  static async fetchBalanceForSelectedAccount(selectedAccount,userSession) {
    try {
      const balanceMessage = `Balance for account ${selectedAccount.id.displayValue} is ${selectedAccount.availableBalance.currency} ${selectedAccount.availableBalance.amount}.`;
    
      userSession.selectedAccount = selectedAccount;
  //    userSession.state = "ASK_INSIGHTS"; // Set next state for insights
      
   //   return `${balanceMessage}\n\nWould you like financial advice based on your balance? Reply "Yes" or "No".`;
              return `${balanceMessage}`;

         } catch (error) {
      console.error("Error fetching balance:", error.message);
      return "Unable to fetch balance at this time. Please try again later.";
    }
  }
    
  static parseAccountSelection(accountId, accounts) {
    const cleanAccountId = accountId.split('_')[0]; 
    return accounts.find(account => account.id.displayValue === cleanAccountId);
}
}
module.exports = BalanceService;
