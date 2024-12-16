const { sendResponseToChannel } = require("../services/apiHandler");
const stateMachine = require("../states/stateMachine");

const handleIncomingMessage = async (phoneNumberId, from, message) => {
    const { body, intent } = message;
    console.log("Received message:", message);

    // Get the main response
    const mainResponse = await stateMachine.handleMessage(from, body, intent);

    console.log("response message in botController is: ", mainResponse);

    const channel = process.env.CHANNEL;
    console.log("channel in botController is: ", channel);

    // Send the main response
    await sendResponseToChannel(channel, phoneNumberId, from, mainResponse);

    // Check if the state is HELP (indicating that the flow is done) and send help menu
    const userSession = stateMachine.getSession(from); // Get the user's session state
    if (userSession.state === "HELP") { // Only send the help menu if the flow is complete
        const helpMenu = await stateMachine.getHelpMenu();
        await sendResponseToChannel(channel, phoneNumberId, from, helpMenu);
    }
};

module.exports = { handleIncomingMessage };
