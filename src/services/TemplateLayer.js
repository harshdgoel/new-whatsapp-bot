class TemplateLayer {
    // Method to create a list template
    static createListTemplate(header, body, footer, buttons) {
        return {
            type: "interactive",
            interactive: {
                type: "list",
                header: {
                    type: "text",
                    text: header
                },
                body: {
                    text: body
                },
                footer: {
                    text: footer
                },
                action: {
                    buttons: buttons.map((buttonText, index) => ({
                        type: "reply",
                        reply: {
                            id: `${index + 1}`,
                            title: buttonText
                        }
                    }))
                }
            }
        };
    }

    // Method to create a button template
    static createButtonTemplate(body, buttons) {
        return {
            type: "interactive",
            interactive: {
                type: "button",
                body: {
                    text: body
                },
                action: {
                    buttons: buttons.map((buttonText, index) => ({
                        type: "reply",
                        reply: {
                            id: `${index + 1}`,
                            title: buttonText
                        }
                    }))
                }
            }
        };
    }
}

module.exports = TemplateLayer;
