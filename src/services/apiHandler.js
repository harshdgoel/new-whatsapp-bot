const axios = require('axios');
const TemplateLayer = require('./TemplateLayer');

const sendResponseToWhatsApp = async (phoneNumberId, to, message, apiResponse = null) => {
    let responseData;

    try {
        // Validate critical parameters
        if (!phoneNumberId || !to || !message) {
            throw new Error("Missing essential parameters: phoneNumberId, to, or message.");
        }

        if (message && message.type === 'interactive') {
            console.log("Detected interactive message type. Generating list template...", message);
            responseData = message;

            if (!responseData) {
                throw new Error("Failed to generate interactive template due to invalid API response.");
            }

            console.log("Generated interactive template:", JSON.stringify(responseData, null, 2));
        } else {
            console.log("Sending a text message...");

            responseData = {
                messaging_product: "whatsapp",
                to: to,
                text: { body: String(message) }
            };

            console.log("Text message response data:", JSON.stringify(responseData, null, 2));
        }

        console.log("Sending response to WhatsApp...");

        const response = await sendToWhatsAppAPI(phoneNumberId, responseData);

        console.log("WhatsApp response sent successfully:", response);

    } catch (error) {
        console.error("Error sending WhatsApp message:", error.message || error);
    }
};

const sendToWhatsAppAPI = async (phoneNumberId, messageData) => {
    try {
        console.log("sendToWhatsAppAPI - Sending data:", JSON.stringify(messageData));

        const response = await axios.post(
            `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
            messageData,
            {
                headers: { 'Authorization': `Bearer ${process.env.MYTOKEN}` }
            }
        );

        return response.data;
    } catch (error) {
        console.error("Error in sendToWhatsAppAPI:", error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = { sendResponseToWhatsApp };
