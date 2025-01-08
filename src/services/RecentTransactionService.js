const TemplateLayer = require('./TemplateLayer');
const OBDXService = require('./OBDXService');
const LoginService = require('./loginService');
const endpoints = require("../config/endpoints");
const { sendResponseToWhatsApp } = require('./apiHandler');

const states = {
    OTP_VERIFICATION: "OTP_VERIFICATION",
    LOGGED_IN: "LOGGED_IN",
    LOGGED_OUT: "LOGGED_OUT"
};

class RecentTransactionService {
    static async fetchTransactionsForSelectedAccount(selectedAccount, userSession) {
        const token = LoginService.getToken();
        const cookie = LoginService.getCookie();
        if (!token || !cookie) {
            userSession.state = states.OTP_VERIFICATION;
            return "Please enter the One Time Password sent to your registered number.";
        }

        const queryParams = new Map([["searchBy", "CPR"], ["transactionType", "A"], ["locale", "en"]]);
        const endpointUrl = `${endpoints.transactions}/${selectedAccount.id.value}/transactions`;

        try {
            const response = await OBDXService.invokeService(endpointUrl, "GET", queryParams, {}, LoginService,userSession);

            console.log("respnse for RECENT TRANSACTIONS IS:", response);

            if (response.data && response.data.items && Array.isArray(response.data.items)) {
                const transactions = response.data.items;

                console.log("transactions are:", transactions);
                // Prepare text for WhatsApp/Facebook
                let bodyText = "*Here are your Recent Transactions:*\n";
                transactions.forEach((transaction, index) => {
                    const accountDisplayValue = transaction.accountId?.displayValue || "N/A";
                    const currency = transaction.amountInAccountCurrency?.currency || "N/A";
                    const amount = transaction.amountInAccountCurrency?.amount || "N/A";
                    const description = transaction.description || "No description available";
                    const transactionRef = transaction.key?.transactionReferenceNumber || "N/A";
                    const transactionDate = transaction.transactionDate || "N/A";
                    const transactionType = transaction.transactionType === "C" ? "Credit" : "Debit";
                    
                    bodyText += `*Transaction ${index + 1}:*\n`;
                    bodyText += `Account: ${accountDisplayValue}\n`;
                    bodyText += `Amount: ${currency} ${amount}\n`;
                    bodyText += `Description: ${description}\n`;
                    bodyText += `Reference: ${transactionRef}\n`;
                    bodyText += `Date: ${transactionDate}\n`;
                    bodyText += `Type: ${transactionType}\n`;
                    bodyText += `~ ~ ~ ~ ~ ~ ~ ~\n\n`;
                });
                let templateData;
                console.log("bodyText is:",bodyText);
                // Select channel template structure based on config
                switch (process.env.CHANNEL.toLowerCase()) {
                    case "whatsapp":
                        templateData = {
                            type: "text",
                            bodyText: bodyText,
                            channel: process.env.CHANNEL,
                            to: "917249318604" // WhatsApp number here
                        };
                        break;

                    case "facebook":
                        templateData = {
                            bodyText: bodyText
                        };
                        break;

                    default:
                        throw new Error("Unsupported channel type");
                }
                // Pass template data to TemplateLayer
                return templateData;

            } else {
                throw new Error("No transaction data found in the response.");
            }

        } catch (error) {
            console.error("Error fetching transactions:", error.message);
            return "An error occurred while fetching your transactions. Please try again.";
        }
    }
}

module.exports = RecentTransactionService;
