const TemplateLayer = require("./TemplateLayer");
const OBDXService = require("./OBDXService");
const LoginService = require("./loginService");
const endpoints = require("../config/endpoints");
const states = {
    OTP_VERIFICATION: "OTP_VERIFICATION",
    LOGGED_IN: "LOGGED_IN",
    LOGGED_OUT: "LOGGED_OUT",
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
            const response = await OBDXService.invokeService(
                endpoints.billers,
                "GET",
                null,
                {},
                LoginService
            );

            const billers = response.billerRegistrationDTOs || [];
            const validBillers = billers.filter(biller => biller.id && biller.billerName);

            if (!validBillers.length) throw new Error("No billers found.");

            userSession.billers = validBillers;

            const rows = validBillers.map((biller, index) => ({
                id: biller.id,
                title: biller.billerName,
            }));

            const templateData = {
                type: "list",
                sections: rows.map(row => ({ id: row.id, title: row.title })),
                bodyText: "Please select a biller from the list below:",
                buttonText: "Select Biller",
                channel: process.env.CHANNEL,
                to: userSession.userId,
            };

            userSession.state = states.FETCHING_BILLERS;
            return TemplateLayer.generateTemplate(templateData);
        } catch (error) {
            console.error("Error fetching billers:", error.message);
            return "An error occurred while fetching billers. Please try again.";
        }
    }

    static confirmAmount(userSession, selectedBiller) {
        userSession.selectedBiller = selectedBiller;
        userSession.state = states.CONFIRM_AMOUNT;
        return "Enter the amount to be paid.";
    }

    static async selectAccountForPayment(userSession, amount) {
        userSession.amount = amount;

        const accounts = userSession.accounts || [];
        const rows = accounts.map(account => ({
            id: account.id.value,
            title: account.id.displayValue,
        }));

        const templateData = {
            type: "list",
            sections: rows.map(row => ({ id: row.id, title: row.title })),
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
