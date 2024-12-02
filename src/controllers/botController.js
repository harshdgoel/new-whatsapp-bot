const { sendResponseToChannel } = require("../services/apiHandler");
const stateMachine = require("../states/stateMachine");

const handleIncomingMessage = async (phoneNumberId, from, message) => {
    const { body, intent } = message;
    console.log("Received message:", message);

    const responseMessage = await stateMachine.handleMessage(from, body, intent);

    console.log("response message in botController is: ", responseMessage);

    // Determine channel from environment and send message accordingly
    const channel = process.env.CHANNEL;
    console.log("channel in botController is: ", channel);

    await sendResponseToChannel(channel, phoneNumberId, from, responseMessage);
};

module.exports = { handleIncomingMessage };
