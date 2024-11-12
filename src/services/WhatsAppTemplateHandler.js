class WhatsAppTemplateHandler {
  static createAccountListTemplate(accounts) {
    const accountOptions = accounts.map(account => ({
      title: account.id.displayValue, // Shows the account number
      description: `${account.displayName} | ${account.currencyCode} | Available Balance: ${account.availableBalance.amount} ${account.availableBalance.currency}`,
      id: account.id.value // Unique identifier for account selection
    }));

    // WhatsApp list template structure
    return {
      type: 'list',
      header: {
        type: 'text',
        text: 'Select an Account'
      },
      body: {
        text: 'Choose one of your accounts to view balance details.'
      },
      action: {
        button: 'View Accounts',
        sections: [
          {
            title: 'Accounts',
            rows: accountOptions.map(option => ({
              title: option.title,
              description: option.description,
              rowId: option.id
            }))
          }
        ]
      }
    };
  }

  static createBalanceDisplayTemplate(account) {
    // Template for displaying balance after an account is selected
    return {
      type: 'text',
      text: `Account Number: ${account.id.displayValue}\nAccount Name: ${account.displayName}\nCurrency: ${account.currencyCode}\nAvailable Balance: ${account.availableBalance.amount} ${account.availableBalance.currency}\nCurrent Balance: ${account.currentBalance.amount} ${account.currentBalance.currency}`
    };
  }
}

module.exports = WhatsAppTemplateHandler;
