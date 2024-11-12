"use strict";

const axios = require('axios');
const baseURL = "https://rnsgq-148-87-23-5.a.free.pinggy.link"; // Ensure this is your correct base URL

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

        // Get the latest token from LoginService
        const token = loginService.getToken();

        if (!token) {
            console.error("Missing token.");
            return { status: "error", message: "Missing token." };
        }

        // Set Authorization header
        headers.set("Authorization", `Bearer ${token}`);
        console.log("Token set in headers");

        // Now, make the service call
        const responseData = await this.serviceMeth(ctxPath, method, headers, queryParam, body);

        // Check for cookies in the response headers
        if (responseData && responseData.headers && responseData.headers['set-cookie']) {
            const setCookie = responseData.headers['set-cookie'];
            console.log("cookie is",setCookie);
            if (setCookie) {
                loginService.setCookie(setCookie);  // Join cookies if multiple
                console.log("Cookies set in LoginService:", setCookie);
            }
        }

        return responseData;
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
            return response;
        } catch (error) {
            console.error("Service request failed:", error.message);
            throw error; // Rethrow error to be handled by caller
        }
    }
};

module.exports = new OBDXService();
