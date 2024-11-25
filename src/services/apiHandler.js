const axios = require("axios");
const TemplateLayer = require("./TemplateLayer");

const sendResponseToChannel = async (channel, phoneNumberId, to, message) => {
    let responseData;

    try {
        if (!phoneNumberId || !to || !message) {
            throw new Error("Missing essential parameters: phoneNumberId, to, or message.");
        }

        // Build the message based on the channel type
        if (channel === "facebook") {
            responseData = buildFacebookMessage(to, message);
        } else if (channel === "whatsapp") {
            responseData = buildWhatsAppMessage(to, message);
        } else {
            throw new Error("Unsupported channel type.");
        }

        console.log(`Sending response to ${channel}...`, JSON.stringify(responseData, null, 2));

        // Send the message to the appropriate API
        const response = await sendToAPI(channel, phoneNumberId, responseData);
        console.log(`${channel} response sent successfully:`, response);
    } catch (error) {
        console.error(`Error sending ${channel} message:`, error.response?.data || error.message || error);
    }
};

const buildFacebookMessage = (to, message) => {
    if (message.type === "text") {
        return {
            recipient: { id: to },
            messaging_type: "RESPONSE",
            message: { text: message.text.body }
        };
    }
    throw new Error("Unsupported Facebook message type.");
};

const buildWhatsAppMessage = (to, message) => {
    if (message.type === "interactive") {
        return message;
    } else if (message.type === "text" && message.text?.body) {
        return {
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body: message.text.body }
        };
    } else {
        return {
            messaging_product: "whatsapp",
            to,
            text: { body: String(message) }
        };
    }
};

const sendToAPI = async (channel, phoneNumberId, messageData) => {
    const baseURL =
        channel === "facebook"
            ? `https://graph.facebook.com/v21.0/${process.env.PAGE_ID}/messages`
            : `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    try {
        console.log("sendToAPI - Sending data:", JSON.stringify(messageData));

        const response = await axios.post(baseURL, messageData, {
            headers: { Authorization: `Bearer ${process.env.MYTOKEN}` }
        });

        return response.data;
    } catch (error) {
        console.error(`Error in sendToAPI (${channel}):`, error.response?.data || error.message);
        throw error;
    }
};

module.exports = { sendResponseToChannel };
