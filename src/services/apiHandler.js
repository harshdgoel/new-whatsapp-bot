    const axios = require("axios");
    const config = require("../config/config");

    const sendResponseToWhatsApp = async (phoneNumberId, to, message) => {
        const responseData = {
            messaging_product: "whatsapp",
            to: to,
            text: { body: message }
        };

        try {
            const response = await axios.post(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages?access_token=${config.whatsappToken}`, responseData, {
                headers: { "Content-Type": "application/json" }
            });
            console.log("Response sent:", response.data);
        } catch (error) {
            console.error("Error sending response:", error.response ? error.response.data : error.message);
        }
    };

    module.exports = { sendResponseToWhatsApp };
