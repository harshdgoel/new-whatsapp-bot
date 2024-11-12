class TemplateLayer {
    static generateAccountListTemplate(apiResponse) {
        console.log("generateAccountListTemplate - Received API response:", apiResponse);

        const accounts = apiResponse || [];
        
        // if (accounts.length === 0) {
        //     console.log("No accounts available. Returning empty template.");
        //     return {
        //         recipient_type: "individual",
        //         to: "916378582419",  
        //         messaging_product: "whatsapp",
        //         type: "interactive",
        //         interactive: {
        //             type: "list",
        //             body: {
        //                 text: "No accounts available."
        //             }
        //         }
        //     };
        // }

        // Create sections for the list
        const sections = [
            {
                title: "Select an Account",
                rows: accounts.map(account => ({
                    id: account.id?.value || account.id.displayValue, 
                    title: account.accountNickname || account.displayName,
                    description: account.balance ? `Balance: ${account.balance}` : "No balance info"
                }))
            }
        ];

        const interactiveTemplate = {
            recipient_type: "individual",
            to: "916378582419",
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

        console.log("Generated interactive template:", JSON.stringify(interactiveTemplate, null, 2));
        return interactiveTemplate;
    }
}

module.exports = TemplateLayer;
