const axios = require('axios');
require('dotenv').config();

const sendResponseToWhatsApp = async (phoneNumberId, to, message) => {
    try {
        // Log the token for debugging purposes
        const token = process.env.WHATSAPP_ACCESS_TOKEN;
        console.log("Using WhatsApp API token:", token); // Check if the token is correctly loaded

        if (!token) {
            console.error("Error: WhatsApp API token is missing.");
            throw new Error("WhatsApp API token is not defined.");
        }

        // Set up the message data
        const messageData = {
            messaging_product: "whatsapp",
            to: to,
            text: { body: String(message) }
        };

        // Send the message to the WhatsApp API
        const response = await axios.post(
            `https://graph.facebook.com/v14.0/${phoneNumberId}/messages`,
            messageData,
            {
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );

        // Log the response data
        console.log("Response from WhatsApp API:", response.data);
    } catch (error) {
        console.error("Error in sendResponseToWhatsApp:", error);
        if (error.response) {
            console.error("API Response Error:", error.response.data);
        }
        throw error;
    }
};

module.exports = { sendResponseToWhatsApp };
