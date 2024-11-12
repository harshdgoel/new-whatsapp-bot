class TemplateLayer {
    static generateAccountListTemplate(accounts) {
        // Check if accounts are valid
        if (!accounts || accounts.length === 0) {
            console.log("No accounts available for template generation.");
            return "No accounts available.";
        }

        // Generate sections for each account
        const sections = accounts.map(account => ({
            title: `Account: ${account.displayName}`,
            rows: [
                {
                    id: account.id.value,  // Unique identifier for the row
                    title: account.accountNickname || account.displayName,
                    description: `Balance: ${account.availableBalance.amount} ${account.availableBalance.currency}`,
                }
            ]
        }));

        const interactiveTemplate = {
            interactive: {
                type: "list",
                header: {
                    type: "text",
                    text: "Account Balance Information"
                },
                body: {
                    text: "Please select an account to view details."
                },
                footer: {
                    text: "Tap to select an account"
                },
                action: {
                    button: "View Account",
                    sections: sections
                }
            }
        };

        return interactiveTemplate;
    }
}

module.exports = TemplateLayer;
