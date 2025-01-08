const axios = require('axios');
const TemplateLayer = require('./TemplateLayer');

const sendResponseToChannel = async (channel, phoneNumberId, to, message) => {

    let responseData;

    try {
        if (!to || !message) {
            throw new Error("Missing essential parameters: recipient or message.");
        }

        if (channel === "whatsapp") {
            console.log("message is", message);
            // WhatsApp-specific message formatting
            if (message.type === "interactive") {
                responseData = message;
            } else if (message.type === "text" && message.bodyText) {
                responseData = {
                    messaging_product: "whatsapp",
                    to: to,
                    type: "text",
                    text: { body: message.bodyText  },
                };
            } else {
                responseData = {
                    messaging_product: "whatsapp",
                    to: to,
                    text: { body: String(message) },
                };
            }
           const response = await sendToWhatsAppAPI(phoneNumberId, responseData);

        } else if (channel === "facebook") {
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
  responseData = {
    recipient: { id: to },
    message: {
      text: message.message.text,
      quick_replies: message.message.quick_replies,
    },
    tag: "CONFIRMED_EVENT_UPDATE",
  };
}
            else if (message.message?.text){

                  responseData = {
                    messaging_type: "MESSAGE_TAG",
                    recipient: { id: to },
                    message: { text: message.message.text },
                    tag: "CONFIRMED_EVENT_UPDATE", // Add a relevant tag
                };
            }

            
            else if (message.bodyText){

                  responseData = {
                    messaging_type: "MESSAGE_TAG",
                    recipient: { id: to },
                    message: { text: message.bodyText },
                    tag: "CONFIRMED_EVENT_UPDATE", // Add a relevant tag
                };
            }

            const response = await sendToFacebookAPI(responseData);
        } else {
            throw new Error("Unsupported channel specified.");
        }
    } catch (error) {
        console.error(`Error sending message to ${channel}:`, error.response?.data || error.message);
        throw error;
    }
};

const sendToWhatsAppAPI = async (phoneNumberId, messageData) => {
    console.log("data in sendtowhatsappapi:", messageData);
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
            `https://graph.facebook.com/v20.0/me/messages`, // Correct endpoint
            messageData,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.PAGE_ACCESS_TOKEN}`,
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error in sendToFacebookAPI:", error.response?.data || error.message);
        throw error;
    }
};

module.exports = { sendResponseToChannel };
