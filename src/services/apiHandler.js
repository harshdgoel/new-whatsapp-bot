
const axios = require('axios');
const TemplateLayer = require('./TemplateLayer');

const sendResponseToChannel = async (channel, phoneNumberId, to, message) => {
    console.log("entering sendResponseToChannel and message is: ",message);
    let responseData;

    try {
        if (!to || !message) {
            throw new Error("Missing essential parameters: recipient or message.");
        }

        if (channel === "whatsapp") {
            // WhatsApp-specific message formatting
            if (message.type === "interactive") {
                responseData = message;
            } else if (message.type === "text" && message.text?.body) {
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
            console.log("entering channel facebook in apiHandler and message is:", message);
            // Facebook Messenger-specific message formatting
            if (typeof message === "string") {
                // Plain text message
                responseData = {
                    messaging_type: "MESSAGE_TAG",
                    recipient: { id: to },
                    message: { text: message },
                    tag: "CONFIRMED_EVENT_UPDATE", // Add a relevant tag
                };
            } else if (message.text?.body) {
                // Text with the text body
                responseData = {
                    messaging_type: "MESSAGE_TAG",
                    recipient: { id: to },
                    message: { text: message.text.body },
                    tag: "CONFIRMED_EVENT_UPDATE", // Add a relevant tag
                };
            } 
             else if (message.message?.quick_replies) {
  console.log("Processing Facebook quick_replies...",message);
  responseData = {
    messaging_type: "MESSAGE_TAG",
    recipient: message.recipient,
    message: {
      text: message.message.text,
      quick_replies: message.message.quick_replies,
    },
    tag: "CONFIRMED_EVENT_UPDATE",
  };
}
            else {
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
    console.log("entering sendToFacebookAPI and messageData is: ",messageData);
    try {
        const response = await axios.post(
            `https://graph.facebook.com/v20.0/me/messages`, // Correct endpoint
            messageData,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.PAGE_ACCESS_TOKEN}`,
                },
            }
        );
        console.log("sendToFacebookAPI response is: ",response);
        return response.data;
    } catch (error) {
        console.error("Error in sendToFacebookAPI:", error.response?.data || error.message);
        throw error;
    }
};

module.exports = { sendResponseToChannel };
