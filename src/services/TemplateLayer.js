class TemplateLayer {
    static generateTemplate({ type, sections, bodyText, buttonText, channel, to }) {
        console.log("Generating template for channel:", channel, "and type:", type);

        if (!type || !channel || !to) {
            throw new Error("Missing essential parameters: type, channel, or recipient.");
        }

        // Validate channel type
        if (!['whatsapp', 'facebook'].includes(channel.toLowerCase())) {
            throw new Error("Unsupported channel type. Only 'whatsapp' and 'facebook' are supported.");
        }

        const template = {
            recipient_type: "individual",
            to: to,
            messaging_product: channel === "whatsapp" ? "whatsapp" : "messenger",
        };

        if (channel === "whatsapp") {
            switch (type) {
                case "list":
                    if (!sections || !Array.isArray(sections) || sections.length === 0) {
                        throw new Error("Missing or invalid sections for list template.");
                    }
                    template.type = "interactive";
                    template.interactive = {
                        type: "list",
                        body: { text: bodyText || "Please make a selection." },
                        action: {
                            button: buttonText || "Select",
                            sections: sections,
                        },
                    };
                    break;

                case "button":
                    if (!sections || !Array.isArray(sections) || sections.length === 0) {
                        throw new Error("Missing or invalid sections for button template.");
                    }
                    template.type = "interactive";
                    template.interactive = {
                        type: "button",
                        body: { text: bodyText || "Please choose an option." },
                        action: { buttons: sections },
                    };
                    break;

                case "text":
                    template.type = "text";
                    template.text = { body: bodyText || "Hello!" };
                    break;

                default:
                    throw new Error(`Unsupported template type for WhatsApp: ${type}`);
            }
        } else if (channel === "facebook") {
            switch (type) {
                case "button": // Use postback buttons for Facebook
                    if (!sections || !Array.isArray(sections) || sections.length === 0) {
                        throw new Error("Missing or invalid sections for button template.");
                    }
                    template.message = {
                        attachment: {
                            type: "template",
                            payload: {
                                template_type: "button",
                                text: bodyText || "Please make a selection.",
                                buttons: sections.map(section => ({
                                    type: "postback",
                                    title: section.title,
                                    payload: section.id, // Use the account ID as payload
                                })),
                            },
                        },
                    };
                    break;

                case "text":
                    template.message = { text: bodyText || "Hello!" };
                    break;

                default:
                    throw new Error(`Unsupported template type for Facebook: ${type}`);
            }
        }

        console.log("Generated template:", JSON.stringify(template, null, 2));
        return template;
    }
}

module.exports = TemplateLayer;
