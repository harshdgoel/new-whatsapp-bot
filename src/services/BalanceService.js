static async initiateBalanceInquiry(userSession) {
    try {
        const queryParams = new Map([
            ["accountType", "CURRENT,SAVING"],
            ["status", "ACTIVE"],
            ["locale", "en"],
        ]);

        const response = await OBDXService.invokeService(
            endpoints.accounts,
            "GET",
            queryParams,
            {}, // No body needed for GET request
            LoginService
        );

        console.log("Response after FETCHACCOUNT API CALL IS", response);

        if (response.data && response.data.accounts) {
            const accounts = response.data.accounts;
            userSession.accounts = accounts; // Store accounts in user session

            // Generate rows for accounts
            const rows = accounts.map((account, index) => ({
                id: account.id?.value || `account_${index}`, // Unique account ID
                title: account.id?.displayValue || `Account ${index + 1}`, // Display name
                payload: account.id?.displayValue || `Account ${index + 1}`, // Payload for Messenger
            }));

            const channel = config.channel.toLowerCase();
            const templateData = {
                channel,
                sections: channel === "whatsapp"
                    ? rows.map(row => ({ id: row.id, title: row.title })) // WhatsApp structure
                    : rows.map(row => ({ content_type: "text", title: row.title, payload: row.payload })), // Facebook structure
                bodyText: "Please select an account to view details.",
                buttonText: "View Accounts", // For WhatsApp
                to: channel === "whatsapp" ? "916378582419" : "1306151306130839", // Replace with actual recipient number
            };

            console.log("template data is:", templateData);

            // Pass the constructed template data to the TemplateLayer
            return TemplateLayer.generateTemplate(templateData);
        } else {
            throw new Error("No accounts found in the response.");
        }
    } catch (error) {
        console.error("Error fetching accounts:", error.message);
        if (error.message.includes("Missing token or cookie")) {
            userSession.state = states.OTP_VERIFICATION;
            return "Please enter the One Time Password sent to your registered number.";
        }
        return "An error occurred while fetching your accounts. Please try again.";
    }
}
