"use strict";
const config = require("../config/config"); // Import config.js
const axios = require("axios");
const URL = config.baseURL; // Use the correct key from config
const defaultHomeEntity = config.defaultHomeEntity;

class OBDXService {
    // Constructs and returns headers for API calls
    populateHeaders(loginService) {
        const token = loginService.getToken();
        const cookie = loginService.getCookie();

        if (!token || !cookie) {
            throw new Error("Missing token or cookie for API call.");
        }

        return new Map([
            ["Authorization", `Bearer ${token}`],
            ["Cookie", cookie],
            ["Content-Type", "application/json"],
            ["X-Token-Type", "JWT"],
            ["X-Target-Unit", defaultHomeEntity]
        ]);
    }

    // Main method to invoke services
    async invokeService(ctxPath, method, queryParam, body, loginService) {
        console.log("Entering invokeService method");

        // Check if the user is logged in
        const isLoggedIn = await loginService.checkLogin(baseURL);

        if (!isLoggedIn) {
            console.error("Login check failed. Token might be expired.");
            return { status: "error", message: "Login expired or missing." };
        }

        // Construct headers
        const headers = this.populateHeaders(loginService);
        console.log("Headers constructed successfully.");

        // Make the actual API call
        const responseData = await this.serviceMeth(ctxPath, method, headers, queryParam, body);
        return responseData;
    }

    // Helper method to make the API call
    async serviceMeth(ctxPath, method, headers, queryParam, body) {
        const url = URL + ctxPath + "?" + new URLSearchParams(queryParam).toString();
        const headersObj = Object.fromEntries(headers);

        console.log("Making request with headers:", headersObj);
        console.log("Request URL:", url);

        try {
            const response = await axios({
                url,
                method,
                headers: headersObj,
                data: body
            });

            console.log("Response from API:", response.data);
            return response;
        } catch (error) {
            console.error("Service request failed:", error.message);
            throw error; // Rethrow error to be handled by caller
        }
    }
}

module.exports = new OBDXService();