class TemplateLayer {
    static generateAccountListTemplate(apiResponse) {
        // Check if apiResponse is valid
        if (!apiResponse || !Array.isArray(apiResponse)) {
            console.error("Error: API response is null or not an array.");
            return null;  // Return null if the response is invalid
        }

        console.log("generateAccountListTemplate - Received API response:", apiResponse);

        // Create sections for the list, mapping over each account
        const sections = [
            {
                title: "Select an Account",
                rows: apiResponse.map(account => ({
                    id: account.id?.value || account.id?.displayValue, 
                    title: account.accountNickname || account.displayName,
                }))
            }
        ];

        const interactiveTemplate = {
            recipient_type: "individual",
            to: "916378582419",  // Replace with the actual recipient's number
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
