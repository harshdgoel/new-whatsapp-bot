const axios = require('axios');  // Assuming axios is used for API calls
const TemplateLayer = require('./TemplateLayer');  // Import TemplateLayer class

// The function to send response to WhatsApp
const sendResponseToWhatsApp = async (phoneNumberId, to, message, apiResponse = null) => {
    let responseData;

    try {
        // Check if the message type is 'interactive' (list template)
        if (message && message.type === 'interactive') {
            console.log("Detected interactive message type. Generating list template...");

            // Use TemplateLayer to generate the interactive list template
            responseData = TemplateLayer.generateAccountListTemplate(apiResponse);
            console.log("Generated interactive template:", JSON.stringify(responseData, null, 2));
        } else {
            // Default message handling (text message)
            console.log("Sending a text message...");

            responseData = {
                messaging_product: "whatsapp",
                to: to,
                text: { body: String(message) }  // Ensure message is a string
            };

            console.log("Text message response data:", JSON.stringify(responseData, null, 2));
        }

        // Log the request payload before sending it to WhatsApp
        console.log("Sending response to WhatsApp...");
        
        const response = await sendToWhatsAppAPI(phoneNumberId, responseData);  // Send to WhatsApp API
        
        console.log("WhatsApp response sent successfully:", response);

    } catch (error) {
        console.error("Error sending WhatsApp message:", error);
    }
};

// Placeholder for sending message to WhatsApp API (Assuming you're using an HTTP request like axios)
const sendToWhatsAppAPI = async (phoneNumberId, messageData) => {
    try {
        console.log("sendToWhatsAppAPI - Sending data:", JSON.stringify(messageData, null, 2));

        // Example of sending a message using axios
        const response = await axios.post(
            `https://graph.facebook.com/v14.0/${phoneNumberId}/messages`,
            messageData,
            {
                headers: { 'Authorization': `Bearer ${process.env.MYTOKEN}` }
            }
        );

        return response.data;  // Return the response from WhatsApp API
    } catch (error) {
        console.error("Error in sendToWhatsAppAPI:", error);
        throw error;  // Re-throw to be handled by the caller
    }
};

module.exports = { sendResponseToWhatsApp };  // Export the function
