class TemplateLayer {
    static generateAccountListTemplate(apiResponse) {
        // Check if accounts exist in the API response
        const accounts = apiResponse.accounts || [];
        
        if (accounts.length === 0) {
            console.log("No accounts available for template generation.");
            return { text: "No accounts available." };
        }

        // Create sections for the WhatsApp list template
        const sections = accounts.map(account => ({
            title: `Account: ${account.displayName}`,
            rows: [
                {
                    id: account.id.value, // Assuming `id` is an object and accessing `value`
                    title: account.accountNickname || account.displayName,
                    description: `Balance: ${account.availableBalance.amount} ${account.availableBalance.currency}` // Assuming availableBalance is an object
                }
            ]
        }));

        // Construct the interactive WhatsApp list template
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
