const TemplateLayer = require('./TemplateLayer');
const MessageService = require('../services/MessageService');
const config = require("../config/config"); // Import config.js
const channel = process.env.CHANNEL;
const MAX_ITEMS_PER_PAGE = 9;

class HelpMeService {
    static async helpMe(page = 1) {
        try {
            // Fetch the full help options string from messages
            const helpOptions = MessageService.getMessage('Help.helpOptions');

            // Split the options into an array
            const optionsList = helpOptions.split('\\n').map(option => option.trim());

            // Calculate pagination
            const totalPages = Math.ceil(optionsList.length / MAX_ITEMS_PER_PAGE);
            const startIndex = (page - 1) * MAX_ITEMS_PER_PAGE;
            const endIndex = startIndex + MAX_ITEMS_PER_PAGE;
            const currentOptions = optionsList.slice(startIndex, endIndex);

            // Generate rows for current page
            const rows = currentOptions.map((option, index) => ({
                id: `option_${startIndex + index + 1}`, // Unique ID
                title: option,
                payload: option, // Payload for Messenger
            }));

            // Add "View More" option if there are more pages
            if (page < totalPages) {
                rows.push({
                    id: `view_more_${page + 1}`,
        title: "View More", // Simplified title
        payload: "View More"
                });
            }

            // Construct the template data
            let templateData;

            switch (channel.toLowerCase()) {
                case "whatsapp":
                    templateData = {
                        type: "list",
                        sections: rows.map(row => ({
                            id: row.id,
                            title: row.title,
                        })),
                        bodyText: "How can I assist you today? Please select an option:",
                        buttonText: "Help Options",
                        channel,
                        to: "916378582419",
                    };
                    break;

                case "facebook":
                    templateData = {
                        bodyText: "How can I assist you today? Please select an option:",
                        sections: rows.map(row => ({
                            content_type: "text",
                            title: row.title,
                            payload: row.payload,
                        })),
                    };
                    break;

                default:
                    throw new Error("Unsupported channel type. Only 'whatsapp' and 'facebook' are supported.");
            }

            // Send the generated template data to TemplateLayer
            return TemplateLayer.generateTemplate(templateData);
        } catch (error) {
            console.error("Error generating help options:", error.message);
            return "An error occurred while displaying the help options. Please try again later.";
        }
    }
}

module.exports = HelpMeService;
