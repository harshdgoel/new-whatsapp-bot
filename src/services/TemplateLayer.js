class TemplateLayer {
    static generateAccountListTemplate(apiResponse) {
        // Log received API response
        console.log("generateAccountListTemplate - Received API response:", apiResponse);

        // Check if apiResponse is valid
        if (!apiResponse || !Array.isArray(apiResponse)) {
            console.log("logging starts. APIRESPONSE IS:", apiresponse);
            console.log("first account",apiresponse[0].id.value);
            console.error("Error: API response is null or not an array.");
            
            return {
                recipient_type: "individual",
                to: "916378582419",
                messaging_product: "whatsapp",
                type: "interactive",
                interactive: {
                    type: "list",
                    body: {
                        text: "No accounts available to display."
                    },
                    action: {
                        button: "View Accounts",
                        sections: [
                            {
                                title: "No Accounts",
                                rows: [
                                    {
                                        id: "no_accounts",
                                        title: "No accounts found"
                                    }
                                ]
                            }
                        ]
                    }
                }
            };
        }

        // Create sections for the list based on the available accounts
        const sections = [
            {
                title: "Select an Account",
                rows: apiResponse.map(account => ({
                    id: account.id.value,  // Ensure 'id' field structure is correct
                    title: account.accountNickname || account.displayName || "Account"  // Use appropriate title fallback
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
