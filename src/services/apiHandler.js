const axios = require('axios');
const TemplateLayer = require('./TemplateLayer');

const sendResponseToWhatsApp = async (phoneNumberId, to, message) => {
    let responseData;

    try {
        if (!phoneNumberId || !to || !message) {
            throw new Error("Missing essential parameters: phoneNumberId, to, or message.");
        }

        if (message.type === 'interactive') {
            // If the message is an interactive template, send it as is
            responseData = message;
        } else {
            // Otherwise, send a text message
            responseData = {
                messaging_product: "whatsapp",
                to: to,
                text: { body: String(message) }
            };
        }

        console.log("Sending response to WhatsApp...", JSON.stringify(responseData, null, 2));

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
