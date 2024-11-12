const axios = require('axios');
require('dotenv').config(); // Ensure environment variables are loaded

// Function to send a response message to WhatsApp
const sendResponseToWhatsApp = async (phoneNumberId, to, message) => {
    try {
        // Ensure the message is a string
        const messageData = {
            messaging_product: "whatsapp",
            to: to,
            text: { body: String(message) }
        };

        // Get the WhatsApp API token from the environment variables
        const token = process.env.MYTOKEN;

        if (!token) {
            console.error("Error: Missing WhatsApp API token.");
            throw new Error("WhatsApp API token is not defined.");
        }

        // Log the message that will be sent
        console.log("Sending message to WhatsApp:", JSON.stringify(messageData, null, 2));

        // Send the message via the WhatsApp API
        const response = await axios.post(
            `https://graph.facebook.com/v14.0/${phoneNumberId}/messages`,
            messageData,
            {
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );

        // Log the response from the API
        console.log("Response from WhatsApp API:", response.data);

    } catch (error) {
        console.error("Error in sendResponseToWhatsApp:", error);
        if (error.response) {
            // Log the response error details
            console.error("API Response Error:", error.response.data);
        }
        throw error;  // Rethrow error after logging
    }
};

module.exports = { sendResponseToWhatsApp };
