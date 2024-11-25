const axios = require('axios');
const TemplateLayer = require('./TemplateLayer');

const sendResponseToChannel = async (channel, phoneNumberId, to, message) => {
    let responseData;

    try {
        if (!to || !message) {
            throw new Error("Missing essential parameters: recipient or message.");
        }

        if (channel === "whatsapp") {
            // WhatsApp-specific message formatting
            if (message.type === 'interactive') {
                responseData = message;
            } else if (message.type === 'text' && message.text?.body) {
                responseData = {
                    messaging_product: "whatsapp",
                    to: to,
                    type: "text",
                    text: { body: message.text.body },
                };
            } else {
                responseData = {
                    messaging_product: "whatsapp",
                    to: to,
                    text: { body: String(message) },
                };
            }

            console.log("Sending response to WhatsApp...", JSON.stringify(responseData, null, 2));

            const response = await sendToWhatsAppAPI(phoneNumberId, responseData);
            console.log("WhatsApp response sent successfully:", response);

        } else if (channel === "facebook") {
            // Facebook Messenger-specific message formatting
            if (typeof message === "string") {
                // If message is a plain string, treat it as text
                responseData = {
                    messaging_type: "RESPONSE",
                    recipient: { id: to },
                    message: { text: message },
                };
            } else if (message.text?.body) {
                // For text messages with the text body
                responseData = {
                    messaging_type: "RESPONSE",
                    recipient: { id: to },
                    message: { text: message.text.body },
                };
            } else {
                throw new Error("Unsupported Facebook message format.");
            }

            console.log("Sending response to Facebook Messenger...", JSON.stringify(responseData, null, 2));

            const response = await sendToFacebookAPI(responseData);
            console.log("Facebook response sent successfully:", response);
        } else {
            throw new Error("Unsupported channel specified.");
        }
    } catch (error) {
        console.error(`Error sending message to ${channel}:`, error.response?.data || error.message);
        throw error;
    }
};

const sendToWhatsAppAPI = async (phoneNumberId, messageData) => {
    try {
        const response = await axios.post(
            `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
            messageData,
            {
                headers: { Authorization: `Bearer ${process.env.MYTOKEN}` },
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error in sendToWhatsAppAPI:", error.response?.data || error.message);
        throw error;
    }
};

const sendToFacebookAPI = async (messageData) => {
    try {
        const response = await axios.post(
            `https://graph.facebook.com/v20.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`,
            messageData
        );
        return response.data;
    } catch (error) {
        console.error("Error in sendToFacebookAPI:", error.response?.data || error.message);
        throw error;
    }
};

module.exports = { sendResponseToChannel };
