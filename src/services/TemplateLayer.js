
class TemplateLayer {
    static generateTemplate(templateData) {
        const { channel, ...rest } = templateData;

        switch (process.env.CHANNEL.toLowerCase()) {
            case "whatsapp":
                return this.generateTemplateForWhatsApp(rest);
            case "facebook":
                return this.generateTemplateForFacebook(rest);
            default:
                throw new Error(`Unsupported channel type: ${channel}`);
        }
    }

    static generateTemplateForWhatsApp({ sections, bodyText, buttonText, to }) {

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

        return template;
    }

    static generateTemplateForFacebook({ sections, bodyText, to }) {

         //Remove Markdown formatting
    const responseText = bodyText
        ?  bodyText.replace(/[*~_]/g, "")         
        : "Please select an option:";

        if (!sections || !Array.isArray(sections) || sections.length === 0) {
            return {
                recipient: {
                    id: to,
                },
                message: {
                    text: bodyText,
                },
            };
        }

        const quickReplies = sections.map(section => ({
            content_type: section.content_type || "text",
            title: section.title,
            payload: section.payload,
        }));

        console.log("quick_replies is:",quickReplies);
        const template = {
            recipient: {
                id: to,
            },
            message: {
                text: bodyText || "Please select an account:",
                quick_replies: quickReplies,
            },
        };

        return template;
    }
}

module.exports = TemplateLayer;
