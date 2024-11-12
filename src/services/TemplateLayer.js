class TemplateLayer {
static generateAccountListTemplate(accounts) {
        if (!accounts || accounts.length === 0) {
            return {
                "text": "No active accounts found."
            };
        }

        let sections = accounts.map(account => {
            return {
                "title": account.displayName,
                "rows": [
                    {
                        "id": account.id.value,  // Use account ID for row selection
                        "title": account.displayName,
                        "description": `${account.currencyCode} ${account.currentBalance.amount} - ${account.iban}`
                    }
                ]
            };
        });

        return {
            "interactive": {
                "type": "list",
                "header": {
                    "type": "text",
                    "text": "Select an Account"
                },
                "body": {
                    "text": "Please select an account to view its balance."
                },
                "footer": {
                    "text": "Choose your account"
                },
                "action": {
                    "button": "Select Account",
                    "sections": sections
                }
            }
        };
    }
}

module.exports = TemplateLayer;
