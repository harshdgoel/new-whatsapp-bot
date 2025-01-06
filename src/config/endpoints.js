module.exports = {
    accounts: "/digx-common/account/v1/accounts",
    recentTransactions: "/digx-common/transactions/v1/recentTransactions",
    anonymousToken: "/digx-infra/login/v1/anonymousToken",
    login: "/digx-infra/login/v1/login",
    me: "/digx-common/user/v1/me",
    transactions: "/digx-common/dda/v1/demandDeposit",
    upcoming_payments: "/digx-payments/payment/v1/payments/instructions",
    billers: "/digx-payments/ebpp/v1/registeredBillers",
    billPayment: "/digx-payments/ebpp/v1/ebillPayments",
    payees: "/digx-payments/payment/v1/payments/payeesv3"
    // Add more endpoints as needed
};
