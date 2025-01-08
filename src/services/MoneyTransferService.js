const OBDXService = require('./OBDXService');
const LoginService = require('./loginService');
const TemplateLayer = require('./TemplateLayer');
const endpoints = require('../config/endpoints');

const states = {
    OTP_VERIFICATION: "OTP_VERIFICATION",
    LOGGED_IN: "LOGGED_IN",
    LOGGED_OUT: "LOGGED_OUT",
    FETCHING_PAYEES: "FETCHING_PAYEES",
    BILLPAYMENT: "BILLPAYMENT",
    RESOLVE_AMOUNT: "RESOLVE_AMOUNT",
    ASK_AMOUNT: "ASK_AMOUNT"
};

class MoneyTransferService {
   static async fetchPayees(userSession) {
    const token = LoginService.getToken();
    const cookie = LoginService.getCookie();

    if (!token || !cookie) {
        userSession.state = states.OTP_VERIFICATION;
        return "Please enter the One Time Password sent to your registered number.";
    }

    try {
        const queryParams = new Map([
            ["locale", "en"],
            ["types", "INTERNAL,GENERICDOMESTIC"],
        ]);
        const response = await OBDXService.invokeService(
            endpoints.payees,
            "GET",
            queryParams,
            {}, // No body needed for GET request
            LoginService,
            userSession
        );

        const payees = response.data.items || [];
        userSession.payees = payees;
       console.log("payees is:",payees);
        // Map the payees to a structured format
        const rows = payees.map((payee) => ({
            id: payee.nickName,
            title: payee.nickName,
        }));
        const channel = process.env.CHANNEL.toLowerCase();
        let templateData;

        switch (channel) {
            case "whatsapp":
                const limitedRows = rows.slice(0, 10);

                templateData = {
                    type: "list",
                    sections: limitedRows.map((row) => ({
                        id: row.id,
                        title: row.title,
                    })),
                    bodyText: "Please select a payee to proceed.",
                    buttonText: "View Payees",
                    channel,
                    to: "917249318604", // Replace with the actual recipient number
                };
                break;

            case "facebook":
                // Limit the list to 10 payees for Facebook
                const limitedRows = rows.slice(0, 10);
                templateData = {
                    bodyText: "Please select a Payee",
                    sections: limitedRows.map((row) => ({
                        content_type: "text",
                        title: row.title,
                        payload: row.id,
                    })),
                };
                break;

            default:
                throw new Error("Unsupported channel type. Only 'whatsapp' and 'facebook' are supported.");
        }
        userSession.state = states.FETCHING_PAYEES;
        console.log("template data in moneytransfer:",templateData);
        return TemplateLayer.generateTemplate(templateData);
    } catch (error) {
        console.error("Error fetching payees:", error.message);
        return "An error occurred while fetching payees. Please try again.";
    }
}

    
    static confirmTransferAmount(userSession, selectedPayee) {
        console.log("userSession.lastIntent in confirm amount is:", userSession.lastIntent);
        userSession.selectedPayee = selectedPayee;
        userSession.state = states.RESOLVE_AMOUNT;
        return "Enter the amount to be paid.";
    }

    
static async completePayment(userSession) {
    console.log("entering complete payment in money transfer and user session is: ", userSession);
    const { selectedPayee, amount, selectedAccount } = userSession;

    if (!selectedPayee || !amount || !selectedAccount) {
        return "Missing details. Please select a payee, account, and enter an amount.";
    }

    if (!userSession.systemReferenceId) {
        const randomValue = Math.floor(Math.random() * 100000000000000);
        userSession.systemReferenceId = `PC${String(randomValue).padStart(16, "0")}`;
    }

    const systemReferenceId = userSession.systemReferenceId;
     // Format the payment date
     const currentDate = new Date();
     const paymentDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}T00:00:00`;
 

    // Initialize the request body
    const requestBody = {
        systemReferenceId,
        partyId: {
            displayValue: null,
            value: null,
        },
        amount: {
            currency: selectedPayee.currency || "EUR", // Use currency from payee or default to EUR
            amount: amount,
        },
        debitAccountId: {
            displayValue: selectedAccount.id.displayValue,
            value: selectedAccount.id.value,
        },
        paymentDate,
        remarks: "Chatbot",
    };

    // Handle different payee types
    if (selectedPayee.payeeType.toUpperCase() === "INTERNAL") {
        requestBody.paymentType = "INTERNAL";
        requestBody.network = "INTERNAL";
        requestBody.beneficiary = [
            {
                creditAccountId: selectedPayee.accountNumber,
                beneficiaryName: selectedPayee.accountName,
            },
        ];
        requestBody.payee = {
            id: selectedPayee.id,
            payeeType: "INTERNAL",
            nickName: selectedPayee.nickName,
        };
        requestBody.currencyOfTransfer = selectedPayee.currency || "GBP"; // Default for INTERNAL is GBP
    } else if (selectedPayee.payeeType.toUpperCase() === "GENERICDOMESTIC") {
        requestBody.paymentType = "DOMESTIC";
        requestBody.network = selectedPayee.network || "SEPACREDIT"; // Default network for DOMESTIC
        requestBody.beneficiary = [
            {
                creditAccountId: selectedPayee.accountNumber,
                beneficiaryName: selectedPayee.accountName,
                payeeEmail: selectedPayee.payeeEmail,
                beneficiaryBankDetails: [
                    {
                        bic2: selectedPayee.bankDetails?.code || null, // Fetch BIC if available
                    },
                ],
            },
        ];
          requestBody.payee = {
            id: selectedPayee.id,
            payeeType: "DOMESTIC",
            nickName: selectedPayee.nickName,
        };
        requestBody.currencyOfTransfer = null; // No transfer currency for DOMESTIC
        requestBody.purpose = "STO"; // Static purpose for DOMESTIC
    }

    // Make the service call
    try {
        console.log("request body for MONEY TRANSFER GENERATED IS:", requestBody);
        const response = await OBDXService.invokeService(
            endpoints.moneyTransfer,
            "POST",
            new Map([["locale", "en"]]),
            requestBody,
            LoginService,
            userSession
        );

        if (response && response.status === "SUCCESS") {
            return `Transfer successful! Reference Number: ${response.referenceNumber}`;
        } else {
            return "Transfer failed. Please try again.";
        }
    } catch (error) {
        console.error("Error completing payment:", error.message);
        return "An error occurred during the transfer. Please try again later.";
    }
}

    
    static parsePayeeSelection(payeeNickName, payees) {
        console.log("Parsing selected payee");
        if (!Array.isArray(payees) || payees.length === 0) {
            console.error("Payees list is empty or invalid");
            return null;
        }
    
        const selectedPayee = payees.find(
            payee => payee.nickName.toLowerCase() === payeeNickName.toLowerCase()
        );
    
        if (!selectedPayee) {
            console.warn(`Payee with nickname "${payeeNickName}" not found.`);
            return null;
        }
    
        return selectedPayee;
    }
    
}

module.exports = MoneyTransferService;
