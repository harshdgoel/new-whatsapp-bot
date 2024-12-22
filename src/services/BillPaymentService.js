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
        console.log("selected account in completePayment is:", selectedAccount);
    
        if (!selectedAccount || !selectedBiller) {
            return "Missing account or biller details. Please ensure both are selected.";
        }
    
        try {
           // Prepare the payment request body using selected biller details
        const requestBody = {
            id: null, // Populate if needed dynamically
            debitAccount: {
                value: selectedAccount.value, // Account identifier
                displayValue: selectedAccount.displayValue, // Account display value
            },
            customerName: selectedBiller.customerName || selectedAccount.partyName, // Fallback to account name
            billerRegistrationId: selectedBiller.id, // Biller registration ID
            billAmount: {
                currency: "USD", // Adjust dynamically if needed
                amount: amount,
            },
            paymentDate: new Date().toISOString().split("T")[0], // Current date in YYYY-MM-DD
            planId: null, // Add plan ID if applicable
            billerId: selectedBiller.billerId, // Biller ID
            location: selectedBiller.location ? selectedBiller.location.areaName : null, // Use areaName for location
            billerName: selectedBiller.billerName, // Biller name
            billId: null, // Populate if specific bill ID is required
            partyId: null, // Populate if needed
            cardExpiryDate: null, // Populate for card payments if applicable
            paymentStatus: "COM", // Payment completion status
            billPaymentRelDetails: selectedBiller.relationshipDetails.map(rel => ({
                value: rel.value,
                labelId: rel.labelId,
            })), // Map relationship details
            paymentType: selectedBiller.autopayInstructions.paymentType || "CAS", // Default to 'CAS' if not specified
        };

        console.log("Payment request body prepared:", requestBody);

        // Invoke the payment service
        const response = await OBDXService.invokeService(
            endpoints.billPayment, // Endpoint for bill payment
            "POST", // Use POST for creating a payment
            new Map(), // Add query parameters if needed
            requestBody, // Payload
            LoginService // Pass login service for authentication headers
        );

        console.log("Payment response:", response);

        if (response && response.data) {
            userSession.state = states.LOGGED_IN; // Reset state after successful payment
            return "Your payment was successful. Thank you!";
        } else {
            return "Payment was unsuccessful. Please try again.";
        }
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
