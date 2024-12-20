const OBDXService = require('./OBDXService');
const LoginService = require('./loginService');
const TemplateLayer = require('./TemplateLayer');
const endpoints = require('../config/endpoints');

const  states = {
    OTP_VERIFICATION: "OTP_VERIFICATION",
    LOGGED_IN: "LOGGED_IN",
    LOGGED_OUT: "LOGGED_OUT",
    FETCHING_BILLERS: "FETCHING_BILLERS",
    BILLPAYMENT: "BILLPAYMENT",
    RESOLVE_AMOUNT: "RESOLVE_AMOUNT",
    ASK_AMOUNT: "ASK_AMOUNT"
};

class BillPaymentService {
    static async initiateBillPayment(userSession) {
        const token = LoginService.getToken();
        const cookie = LoginService.getCookie();

        if (!token || !cookie) {
            userSession.state = states.OTP_VERIFICATION;
            return "Please enter the One Time Password sent to your registered number.";
        }

        try {
            const queryParams = new Map([["locale", "en"]]);
             const response = await OBDXService.invokeService(
        endpoints.billers,
        "GET",
        queryParams,
        {}, // No body needed for GET request
        LoginService
      );

            console.log("response is:", response);
            const billers = response.data.billerRegistrationDTOs || [];
            console.log("billers list is:",billers);
            userSession.billers = billers;

            const rows = billers.map(biller => ({
                id: biller.billerId,
                title: biller.billerNickName,
            }));

            console.log("biller rows is:", rows);
            const channel = process.env.CHANNEL.toLowerCase();
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
          bodyText: "Please select Biller",
      sections: rows
        .map(row => ({
          content_type: "text",
          title: row.title,
          payload: row.id,
        })),
  
  };
      break;
  
            default:
              throw new Error("Unsupported channel type. Only 'whatsapp' and 'facebook' are supported.");
          }
            console.log("template data in billers list is:",templateData);
            userSession.state = states.FETCHING_BILLERS;
            return TemplateLayer.generateTemplate(templateData);
        } catch (error) {
            console.error("Error fetching billers:", error.message);
            return "An error occurred while fetching billers. Please try again.";
        }
    }

    static confirmAmount(userSession, selectedBiller) {
        console.log("usersession.lastIntent in confirm amount is:",userSession.lastIntent);
        userSession.selectedBiller = selectedBiller;
        userSession.state = states.RESOLVE_AMOUNT;
        return "Enter the amount to be paid.";
    }

    static async selectAccountForPayment(userSession, amount) {
        userSession.amount = amount;

        const accounts = userSession.accounts || [];
        if (!accounts.length) return "No accounts available for payment.";

        const rows = accounts.map(account => ({
            id: account.id.value,
            title: account.id.displayValue,
        }));

        const templateData = {
            type: "list",
            sections: [{ title: "Available Accounts", rows }],
            bodyText: "Please select an account for payment:",
            buttonText: "Select Account",
            channel: process.env.CHANNEL,
            to: userSession.userId,
        };

        userSession.state = states.SELECT_ACCOUNT;
        return TemplateLayer.generateTemplate(templateData);
    }

    static async completePayment(userSession, selectedAccountId) {
        const selectedAccount = userSession.accounts.find(acc => acc.id.value === selectedAccountId);
        if (!selectedAccount) return "Invalid account selected.";

        try {
            const paymentResponse = await OBDXService.invokeService(
                endpoints.payBill,
                "POST",
                null,
                {
                    billerId: userSession.selectedBiller.id,
                    accountId: selectedAccount.id.value,
                    amount: userSession.amount,
                },
                LoginService
            );

            userSession.state = states.HELP;
            return `Bill payment of ${userSession.amount} to ${userSession.selectedBiller.billerName} from account ${selectedAccount.id.displayValue} was successful.`;
        } catch (error) {
            console.error("Error completing payment:", error.message);
            return "An error occurred during payment. Please try again.";
        }
    }
}

module.exports = BillPaymentService;
