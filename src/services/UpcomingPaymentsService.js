const TemplateLayer = require('./TemplateLayer');
const OBDXService = require('./OBDXService');
const LoginService = require('./loginService');
const endpoints = require("../config/endpoints");
const config = require("../config/config"); // Import config.js
const channel = config.channel;
const { sendResponseToWhatsApp } = require('./apiHandler');

const states = {
    OTP_VERIFICATION: "OTP_VERIFICATION",
    LOGGED_IN: "LOGGED_IN",
    LOGGED_OUT: "LOGGED_OUT"
};

class UpcomingPaymentsService {
    static async fetchPaymentsForSelectedAccount(selectedAccount, userSession) {
        console.log("Entering fetchTransactionsForSelectedAccount");
        const token = LoginService.getToken();
        const cookie = LoginService.getCookie();
        if (!token || !cookie) {
            userSession.state = states.OTP_VERIFICATION;
            return "Please enter the One Time Password sent to your registered number.";
        }

        const queryParams = new Map([
            ["pageSize", "10"],
            ["pageNumber", "1"],
            ["accountId", selectedAccount.id.value],
            ["accountType", "CSA"],
            ["partyId", selectedAccount.partyId.value],
            ["transferType", "A"],
            ["offset", "0"],
            ["limit", "20"],
            ["totalResults", "true"],
            ["locale", "en"]
        ]);

        console.log("Selected account in transactions:", selectedAccount.id.value);
        const endpointUrl = `${endpoints.upcoming_payments}`;
        console.log("Transaction API URL:", endpointUrl);

        try {
            const response = await OBDXService.invokeService(
                endpointUrl,
                "GET",
                queryParams,
                {},
                LoginService
            );

            console.log("Response after FETCHPAYMENTSACTIVITY API CALL IS:", response);

            // Check for valid transaction data
            if (response.data && response.data.items && Array.isArray(response.data.items)) {
                const transactions = response.data.items;
            
                // Prepare text for WhatsApp
                let bodyText = "*Here are your Upcoming Payments:*\n";
                transactions.forEach((transaction, index) => {
                    const type = transaction.type || "N/A";
                    const nickname = transaction.payeeNickName || "N/A";
                    const externalReferenceNumber = transaction.externalReferenceNumber || "N/A";
                    const amount = transaction.amount?.currency + " " + transaction.amount?.amount || "N/A";
                    const startDate = transaction.startDate || "N/A";
            
                    bodyText += `*Transaction ${index + 1}:*\n`;
                    bodyText += `Type: ${type}\n`;
                    bodyText += `Payee Nickname: ${nickname}\n`;
                    bodyText += `Reference Number: ${externalReferenceNumber}\n`;
                    bodyText += `Amount: ${amount}\n`;
                    bodyText += `Start Date: ${startDate}\n`;
                    bodyText += `~ ~ ~ ~ ~ ~ ~ ~\n\n`;
                });
                            console.log("Generated transaction message body:", bodyText);
                const templateData ={
                    type: "text",
                    bodyText: bodyText,
                    channel: channel,
                    to: "916378582419"
                };
              return TemplateLayer.generateTemplate(templateData);
            } else {
                throw new Error("No transaction data found in the response.");
            }
        } catch (error) {
            console.error("Error fetching payments:", error.message);
            return "An error occurred while fetching your transactions. Please try again.";
        }
    }
}

module.exports = UpcomingPaymentsService;
