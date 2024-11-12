class TemplateLayer {
    static generateAccountListTemplate(apiResponse) {
        const accounts = apiResponse || [];
        
        if (accounts.length === 0) {
            console.log("No accounts available for template generation.");
            return {
                text: "No accounts available."
            };
        }

        const sections = [
            {
                title: "Select an Account",
                rows: accounts.map(account => ({
                    id: account.id?.value || account.id.displayValue, 
                    title: account.accountNickname || account.displayName,
                    description: `Balance: ${account.availableBalance.amount} ${account.availableBalance.currency}`
                }))
            }
        ];

        const interactiveTemplate = {
            type: "interactive",
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
