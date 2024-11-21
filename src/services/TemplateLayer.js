class TemplateLayer {
    static generateAccountListTemplate(sections) {


        console.log("sections in generateAccountListTemplate is: ", sections);
        if (!apiResponse || !Array.isArray(apiResponse) || apiResponse.length === 0) {
            console.error("Error: API response is null, not an array, or empty.");
            return "No accounts found";
        }
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
