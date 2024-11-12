class TemplateLayer {
    static generateAccountListTemplate(apiResponse) {
        console.log("generateAccountListTemplate apiResponse", apiResponse);
        const accounts = apiResponse || [];
        
        if (accounts.length === 0) {
            console.log("No accounts available for template generation.");
            return {
                recipient_type: "individual",
                to: "916378582419",  // Use dynamic phone number here
                messaging_product: "whatsapp",
                type: "interactive",
                interactive: {
                    type: "list",
                    body: {
                        text: "No accounts available."
                    }
                }
            };
        }

        const sections = [
            {
                title: "Select an Account",
                rows: accounts.map(account => ({
                    id: account.id?.value || account.id.displayValue, 
                    title: account.accountNickname || account.displayName
                }))
            }
        ];

        const interactiveTemplate = {
            recipient_type: "individual",
            to: "916378582419",  // Use dynamic phone number here
            messaging_product: "whatsapp",
            type: "interactive",
            interactive: {
                type: "list",
                body: {
                    text: "Please select from the following account to view details."
                },
                action: {
                    button: "View Accounts",
                    sections: sections
                }
            }
        };

        return interactiveTemplate;
    }
}

module.exports = TemplateLayer;
