class TemplateLayer {
    static generateAccountListTemplate(sections) {
        // Log the received sections
        console.log("sections in generateAccountListTemplate is: ", sections);

        // Validate the sections parameter
        if (!sections || !Array.isArray(sections) || sections.length === 0) {
            console.error("Error: Sections is null, not an array, or empty.");
            return {
                messaging_product: "whatsapp",
                to: "916378582419",
                text: {
                    body: "No accounts found. Please try again later."
                }
            };
        }

        const interactiveTemplate = {
            recipient_type: "individual",
            to: "916378582419",
            messaging_product: "whatsapp",
            type: "interactive",
            interactive: {
                type: "list",
                body: {
                    text: "Please select an account to view details."
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
