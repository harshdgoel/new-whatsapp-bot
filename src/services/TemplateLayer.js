const config = require("../config/config"); // Import config.js

class TemplateLayer {
    static generateTemplate(templateData) {
        const { channel, ...rest } = templateData;
        console.log("channel is:", channel);
        console.log("rest is: ", rest);

        switch (config.channel.toLowerCase()) {
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

         //Remove Markdown formatting
    const responseText = bodyText
        ? bodyText
              .replace(/[*~_]/g, "")
              .replace(/\n+/g, " ")  
              .trim()             
        : "Please select an option:";

        if (!sections || !Array.isArray(sections) || sections.length === 0) {
            console.log("Sections are missing. Generating fallback text message.");
            return {
                recipient: {
                    id: to,
                },
                message: {
                    text: responseText,
                },
            };
        }

        const quickReplies = sections.map(section => ({
            content_type: section.content_type || "text",
            title: section.title,
            payload: section.payload,
        }));

        const template = {
            recipient: {
                id: to,
            },
            message: {
                text: bodyText || "Please select an account:",
                quick_replies: quickReplies,
            },
        };

        console.log("Generated Facebook template:", JSON.stringify(template, null, 2));
        return template;
    }
}

module.exports = TemplateLayer;
