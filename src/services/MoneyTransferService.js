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
                LoginService
            );
    
            console.log("Response is:", response);
            const payees = response.items || [];
            console.log("Payees list is:", payees);
            userSession.payees = payees;
    
            // Map the payees to a structured format
            const rows = payees.map(payee => ({
                id: payee.id,
                title: payee.nickName,
            }));
    
            console.log("Payee rows:", rows);
    
            const channel = process.env.CHANNEL.toLowerCase();
            let templateData;
    
            switch (channel) {
                case "whatsapp":
                    templateData = {
                        type: "list",
                        sections: rows.map(row => ({
                            id: row.id,
                            title: row.title,
                        })),
                        bodyText: "Please select a payee to proceed.",
                        buttonText: "View Payees",
                        channel,
                        to: "916378582419", // Replace with the actual recipient number
                    };
                    break;
    
                case "facebook":
                    templateData = {
                        bodyText: "Please select a Payee",
                        sections: rows.map(row => ({
                            content_type: "text",
                            title: row.title,
                            payload: row.id,
                        })),
                    };
                    break;
    
                default:
                    throw new Error("Unsupported channel type. Only 'whatsapp' and 'facebook' are supported.");
            }
    
            console.log("Template data for payees list:", templateData);
            userSession.state = states.FETCHING_PAYEES;
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
        const { selectedPayee, amount, selectedAccount } = userSession;

        if (!selectedPayee || !amount || !selectedAccount) {
            return "Missing details. Please select a payee, account, and enter an amount.";
        }

        const payeeType = selectedPayee.payeeType.toUpperCase();
        let requestBody;

        if (payeeType === "DOMESTIC") {
            requestBody = {
                partyId: {
                    displayValue: null,
                    value: null,
                },
                amount: {
                    currency: "USD",
                    amount: amount,
                },
                debitAccountId: {
                    displayValue: selectedAccount.displayValue,
                    value: selectedAccount.value,
                },
                paymentDate: new Date().toISOString().split("T")[0],
                payee: {
                    id: selectedPayee.id,
                    payeeType: "DOMESTIC",
                    nickName: selectedPayee.nickName,
                },
                currencyOfTransfer: "USD",
                remarks: "Chatbot Transfer",
            };
        } else if (payeeType === "INTERNAL") {
            requestBody = {
                partyId: {
                    displayValue: null,
                    value: null,
                },
                amount: {
                    currency: "USD",
                    amount: amount,
                },
                paymentDate: new Date().toISOString().split("T")[0],
                debitAccountId: {
                    displayValue: selectedAccount.displayValue,
                    value: selectedAccount.value,
                },
                payee: {
                    id: selectedPayee.id,
                    payeeType: "INTERNAL",
                    nickName: selectedPayee.nickName,
                },
                currencyOfTransfer: "USD",
                remarks: "Chatbot Transfer",
                paymentType: "INTERNAL",
                beneficiary: [
                    {
                        creditAccountId: selectedPayee.creditAccountId,
                        beneficiaryName: selectedPayee.nickName,
                    },
                ],
            };
        } else {
            return "Unsupported payee type.";
        }

        try {
            const response = await OBDXService.invokeService(
                endpoints.moneyTransfer,
                "POST",
                new Map([["locale", "en"]]),
                requestBody,
                LoginService
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
        console.log("Parsing selected payee:", payeeNickName);
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
