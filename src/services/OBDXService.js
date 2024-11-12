"use strict";

const axios = require('axios');
const baseURL = "https://rnqqj-148-87-23-5.a.free.pinggy.link"; // Make sure this is your correct base URL

class OBDXService {
    // Accept LoginService as a parameter
    async invokeService(ctxPath, method, headers, queryParam, body, userId, loginService) {
        console.log("Entering invokeService method");

        // Use loginService parameter here to check login
        const isLoggedIn = await loginService.checkLogin(baseURL); // Check if the token is valid

        if (!isLoggedIn) {
            console.error("Login check failed. Token might be expired.");
            return { status: "error", message: "Login expired or missing." };
        }

        // Get the latest token and cookie after login check
        const token = loginService.getToken();
        const cookie = loginService.getCookie();

        if (!token || !cookie) {
            console.error("Missing token or cookie.");
            return { status: "error", message: "Missing token or cookie." };
        }

        // Add Authorization and Cookie to headers
        headers.set("Authorization", `Bearer ${token}`);
        headers.set("Cookie", cookie);
        console.log("Token and Cookie set in headers");

        // Call the service
        return this.serviceMeth(ctxPath, method, headers, queryParam, body);
    }

    // Helper method to make the actual API call using axios
    async serviceMeth(ctxPath, method, hdr, queryParam, body) {
        hdr.set("Content-Type", "application/json");

        const url = baseURL + ctxPath + "?" + new URLSearchParams(queryParam).toString();
        const headersObj = Object.fromEntries(hdr);
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
            return response.data; // Return the response data directly
        } catch (error) {
            console.error("Service request failed:", error.message);
            throw error; // Rethrow error to be handled by caller
        }
    }
};

module.exports = new OBDXService();
