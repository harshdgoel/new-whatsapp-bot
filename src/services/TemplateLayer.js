class TemplateLayer {
    static generateAccountListTemplate(apiResponse) {
        // Extract accounts from the API response
        const accounts = apiResponse.accounts || [];
        
        if (accounts.length === 0) {
            console.log("No accounts available for template generation.");
            return {
                text: "No accounts available."
            };
        }

        // Construct sections for the WhatsApp list template
        const sections = [
            {
                title: "Select an Account",
                rows: accounts.map(account => ({
                    // Adjust the following accesses to match the actual structure of `account`
                    id: account.id?.value || account.id.displayValue, // Checks `id.value` or falls back to `id.displayValue`
                    title: account.accountNickname || account.displayName,
                    description: `Balance: ${account.availableBalance.amount} ${account.availableBalance.currency}` // Ensures correct access to `availableBalance`
                }))
            }
        ];

        // Create the interactive template object
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
