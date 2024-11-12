// src/services/WhatsAppTemplateHandler.js
class WhatsAppTemplateHandler {
    createListTemplate(headerText, bodyText, footerText, buttonText, accounts) {
        const sections = [
            {
                title: "Available Accounts",
                rows: accounts.map((account, index) => ({
                    id: `${index}`,
                    title: account.displayName,
                    description: `IBAN: ${account.iban}`
                }))
            }
        ];

        return {
            interactive: {
                type: "list",
                header: {
                    type: "text",
                    text: headerText
                },
                body: {
                    text: bodyText
                },
                footer: {
                    text: footerText
                },
                action: {
                    button: buttonText,
                    sections: sections
                }
            }
        };
    }
}

module.exports = new WhatsAppTemplateHandler();
