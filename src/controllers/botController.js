// controllers/botController.js
const { sendResponseToWhatsApp } = require("../services/apiHandler");
const stateMachine = require("../states/stateMachine");  // This should import the instance, not the class

const handleIncomingMessage = async (phoneNumberId, from, message) => {
    const { body, intent } = message;
    console.log("Received message:", message);

    // Ensure handleMessage exists
    if (typeof stateMachine.handleMessage !== 'function') {
        throw new Error("handleMessage is not a function on stateMachine");
    }

    // Call handleMessage
    const responseMessage = await stateMachine.handleMessage(from, body, intent);
    console.log("the response message in botController which is sent to apiHandler is:", responseMessage);
    await sendResponseToWhatsApp(phoneNumberId, from, responseMessage);
};

module.exports = { handleIncomingMessage };
