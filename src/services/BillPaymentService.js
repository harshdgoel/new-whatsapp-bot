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

    static async completePayment(userSession) {
        const { selectedAccount, amount, selectedBiller } = userSession;
    
        if (!selectedAccount || !selectedBiller) {
            return "Missing account or biller details. Please ensure both are selected.";
        }
    
        try {
            const requestBody = {
                id: null,
                debitAccount: {
                    value: selectedAccount.id.value,
                    displayValue: selectedAccount.id.displayValue,
                },
                customerName: userSession.displayName || selectedAccount.partyName, // Add fallback if displayName isn't set
                billerRegistrationId: null,
                billAmount: {
                    currency: "USD",
                    amount: amount,
                },
                paymentDate: new Date().toISOString().split("T")[0],
                planId: null,
                billerId: selectedBiller.billerId,
                location: null,
                billerName: selectedBiller.billerName,
                billId: null,
                partyId: null,
                cardExpiryDate: null,
                paymentStatus: "COM",
                billPaymentRelDetails: [
                    {
                        value: "12345", // Example value; adjust if dynamic data is needed
                        labelId: "0001345", // Example labelId
                    },
                ],
                paymentType: "CASA",
                payLater: "false",
                recurring: "false",
                billerType: selectedBiller.billerType,
                locationId: null,
                categoryId: null,
                category: null,
                meterId: null,
                transactionId: "QUICK_PAY",
                paymentHostStatus: null,
                billerRegistration: {
                    billerNickName: selectedBiller.billerNickName || null,
                    autopayInstructions: {
                        frequency: null,
                        endDate: null,
                    },
                    subcategory: null,
                },
            };
    
            const paymentResponse = await OBDXService.invokeService(
                endpoints.payBill,
                "POST",
                null,
                requestBody,
                LoginService
            );
    
            // Log response for debugging
            console.log("Payment Response:", paymentResponse);
    
            // Reset user session after successful payment
            userSession.state = states.HELP;
    
            return `Bill payment of ${amount} USD to ${selectedBiller.billerName} from account ${selectedAccount.id.displayValue} was successful.`;
        } catch (error) {
            console.error("Error completing payment:", error.message);
            return "An error occurred during the payment. Please try again later.";
        }
    }

    
    /**
 * Finds the details of a selected biller based on the provided billerNickName.
 * @param {string} billerNickName - The nickname of the biller to search for.
 * @param {Array} billers - The list of billers to search in.
 * @returns {Object|null} - Returns the selected biller object or null if not found.
 */
static parseBillerSelection(billerNickName, billers) {
        console.log("Parsing selected biller:", billerNickName);
    if (!Array.isArray(billers) || billers.length === 0) {
        console.error("Billers list is empty or invalid");
        return null;
    }

    // Locate the selected biller
    const selectedBiller = billers.find(
        biller => biller.billerNickName.toLowerCase() === billerNickName.toLowerCase()
    );

    if (!selectedBiller) {
        console.warn(`Biller with nickname "${billerNickName}" not found.`);
        return null;
    }

    return selectedBiller;
}

    
}

module.exports = BillPaymentService;
