// controllers/botController.js
const { sendResponseToWhatsApp } = require("../services/apiHandler");
const stateMachine = require("../states/stateMachine");  // This should import the instance, not the class

const handleIncomingMessage = async (phoneNumberId, from, message) => {
    const { body, intent } = message;
    console.log("Received message:", message);

    const responseMessage = await stateMachine.handleMessage(from, body, intent);

    // Pass the generated template or message directly to the API handler
    await sendResponseToWhatsApp(phoneNumberId, from, responseMessage);
};

module.exports = { handleIncomingMessage };
