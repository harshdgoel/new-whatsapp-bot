class TemplateLayer {
    static generateAccountListTemplate(apiResponse) {
        // Log received API response
        console.log("generateAccountListTemplate - Received API response:", apiResponse);

        // Check if apiResponse is valid
        if (!apiResponse || !Array.isArray(apiResponse) || apiResponse.length === 0) {
            console.error("Error: API response is null, not an array, or empty.");
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

        // Initialize rows array for storing account details
        const rows = [];

        // Iterate over each account in the API response
        for (let i = 0; i < apiResponse.length; i++) {
            const account = apiResponse[i];

            // Log the entire account object for debugging
            console.log(`Processing account ${i + 1}:`, account);

            // Extract the account ID and log it
            const accountId = account.id?.value;
            if (!accountId) {
                console.warn(`Account ${i + 1} is missing id.value`);
                continue; // Skip this account if id is missing
            }
            console.log(`Account ${i + 1} id:`, accountId);

            // Determine the title with fallbacks and log it
            const accountTitle = account.accountNickname || account.displayName || "Account";
            console.log(`Account ${i + 1} title:`, accountTitle);

            // Add this account's id and title to rows array
            rows.push({
                id: accountId,
                title: accountTitle
            });
        }

        // Log the final rows array to see all added entries
        console.log("Final rows array:", rows);

        // Create sections for the list based on the populated rows
        const sections = [
            {
                title: "Select an Account",
                rows: rows
            }
        ];

        // Generate the final interactive template
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

        // Log the generated interactive template
        console.log("Generated interactive template:", JSON.stringify(interactiveTemplate, null, 2));

        return interactiveTemplate;
    }
}

module.exports = TemplateLayer;
