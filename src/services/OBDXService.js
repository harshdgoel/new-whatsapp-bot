"use strict";
const config = require("../config/config"); // Import config.js
const axios = require("axios");
const URL = process.env.BASE_URL; // Use the correct key from config
const defaultHomeEntity = process.env.DEFAULT_HOME_ENTITY;

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
        const headers = this.populateHeaders(loginService);
        const responseData = await this.serviceMeth(ctxPath, method, headers, queryParam, body);
        return responseData;
    }

    // Helper method to make the API call
    async serviceMeth(ctxPath, method, headers, queryParam, body) {
        const url = URL + ctxPath + "?" + new URLSearchParams(queryParam).toString();
        const headersObj = Object.fromEntries(headers);
        try {
            const response = await axios({
                url,
                method,
                headers: headersObj,
                data: body
            });

            return response;
        } catch (error) {
            console.error("Service request failed:", error.message);
            throw error; // Rethrow error to be handled by caller
        }
    }
}

module.exports = new OBDXService();
