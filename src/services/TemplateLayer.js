class TemplateLayer {
    static generateTemplate(templateData) {
        const { channel, ...rest } = templateData;
        console.log("channel is:",channel);
        console.log("rest is: ", rest);

        switch (channel.toLowerCase()) {
            case "whatsapp":
                return this.generateTemplateForWhatsApp(rest);
            case "facebook":
                return this.generateTemplateForFacebook(rest);
            default:
                throw new Error(`Unsupported channel type: ${channel}`);
        }
    }

    static generateTemplateForWhatsApp({ sections, bodyText, buttonText, to }) {
        console.log("Generating WhatsApp list template for:", to);

        if (!sections || !Array.isArray(sections) || sections.length === 0) {
            throw new Error("Missing or invalid sections for list template.");
        }

        const template = {
            recipient_type: "individual",
            to: to,
            messaging_product: "whatsapp",
            type: "interactive",
            interactive: {
                type: "list",
                body: {
                    text: bodyText || "Please make a selection.",
                },
                action: {
                    button: buttonText || "Select",
                    sections: sections,
                },
            },
        };

        console.log("Generated WhatsApp template:", JSON.stringify(template, null, 2));
        return template;
    }

    static generateTemplateForFacebook({ sections, bodyText, to }) {
        console.log("Generating Facebook quick reply template for:", to);

        if (!sections || !Array.isArray(sections) || sections.length === 0) {
            throw new Error("Missing or invalid sections for quick reply template.");
        }

        const template = {
            recipient: {
                id: to,
            },
            message: {
                text: bodyText || "Please select an account:",
                quick_replies: sections,
            },
        };

        console.log("Generated Facebook template:", JSON.stringify(template, null, 2));
        return template;
    }
}

module.exports = TemplateLayer;
