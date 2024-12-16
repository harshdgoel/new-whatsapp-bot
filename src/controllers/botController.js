const HelpMeService = require("../services/HelpMeService");

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
    console.log("State in botcontroller is: ", stateMachine.getSession(from));

    // Check if the state is HELP (indicating that the flow is done) and send help menu
    const userSession = stateMachine.getSession(from); // Get the user's session state
    // Send the help menu if the state is HELP and it hasn't been sent yet
    if (userSession.state === "HELP" && !userSession.isHelpTriggered) {
        const page = 1; // Initial page
        userSession.isHelpTriggered = true; // Set the flag to avoid duplicate sends
        const helpMenu = await HelpMeService.helpMe(page);
        await sendResponseToChannel(channel, phoneNumberId, from, helpMenu);
    }
};

module.exports = { handleIncomingMessage };
