const TemplateLayer = require("./TemplateLayer");
const OBDXService = require("./OBDXService");
const LoginService = require("./loginService");
const endpoints = require("../config/endpoints");
const states = {
    OTP_VERIFICATION: "OTP_VERIFICATION",
    LOGGED_IN: "LOGGED_IN",
    LOGGED_OUT: "LOGGED_OUT",
};

class BillPaymentService {
    static async fetchBillers(userSession) {
        const token = LoginService.getToken();
        const cookie = LoginService.getCookie();

        // Check for authentication
        if (!token || !cookie) {
            userSession.state = states.OTP_VERIFICATION;
            return "Please enter the One Time Password sent to your registered number.";
        }

        const queryParams = new Map([["locale", "en"]]);
        const endpointUrl = `${endpoints.billers}`;

        try {
            // Invoke the API
            const response = await OBDXService.invokeService(
                endpointUrl,
                "GET",
                queryParams,
                {},
                LoginService
            );

            console.log("billers response is:", response);
            if (response && response.billerRegistrationDTOs) {
                const billers = response.billerRegistrationDTOs;

                // Filter out billers with missing or invalid properties
                const validBillers = billers.filter(biller => {
                    return biller.id && biller.billerName;
                });

                if (validBillers.length === 0) {
                    throw new Error("No valid billers found in the response.");
                }

                // Store valid billers in the user session
                userSession.billers = validBillers;

                // Generate rows for valid billers
                const rows = validBillers.map((biller, index) => ({
                    id: biller.id || `biller_${index}`, // Unique biller ID
                    title: biller.billerName || `Biller ${index + 1}`, // Display name
                    payload: biller.billerName || `Biller ${index + 1}`, // Payload for Messenger
                }));

                const channel = process.env.CHANNEL.toLowerCase();
                let templateData;

                // Generate the appropriate template structure based on the channel
                switch (channel) {
                    case "whatsapp":
                        templateData = {
                            type: "list",
                            sections: rows.map(row => ({
                                id: row.id,
                                title: row.title,
                            })), // Include only id and title for WhatsApp
                            bodyText: "Please select a biller from the list below:",
                            buttonText: "View Billers",
                            channel,
                            to: "916378582419", // Replace with actual recipient number
                        };
                        break;

                    case "facebook":
                        templateData = {
                            bodyText: "Please select a biller from the list below:",
                            sections: rows
                                .slice(0, 10) // Limit to top 10 entries
                                .filter(row => row.title && row.payload) // Filter out invalid rows
                                .map(row => ({
                                    content_type: "text",
                                    title: row.title,
                                    payload: row.payload, // Payload for Facebook
                                })),
                        };
                        break;

                    default:
                        throw new Error("Unsupported channel type. Only 'whatsapp' and 'facebook' are supported.");
                }

                // Pass the constructed template data to the TemplateLayer
                return TemplateLayer.generateTemplate(templateData);
            } else {
                throw new Error("No billers found in the response.");
            }
        } catch (error) {
            console.error("Error fetching billers:", error.message);

            if (error.message.includes("Missing token or cookie")) {
                userSession.state = states.OTP_VERIFICATION;
                return "Please enter the One Time Password sent to your registered number.";
            }

            return "An error occurred while fetching your billers. Please try again.";
        }
    }
}

module.exports = BillPaymentService;
