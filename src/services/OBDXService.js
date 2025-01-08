"use strict";
const axios = require("axios");
const URL = process.env.BASE_URL; // Use the correct key from config
const defaultHomeEntity = process.env.DEFAULT_HOME_ENTITY;

class OBDXService {
    // Constructs and returns headers for API calls
    populateHeaders(loginService,userSession) {
        const token = loginService.getToken();
        const cookie = loginService.getCookie();

        if (!token || !cookie) {
            throw new Error("Missing token or cookie for API call.");
        }        
        const headers = {
            "Authorization": `Bearer ${token}`,
            "Cookie": cookie,
            "Content-Type": "application/json",
            "X-Token-Type": "JWT",
            "X-Target-Unit": defaultHomeEntity,
        };
    
        // Add X-CHALLENGE_RESPONSE header if OTP is present
        if (userSession?.authOTP) {
            headers["X-CHALLENGE_RESPONSE"] = JSON.stringify({
                otp: userSession.authOTP,
                referenceNo: userSession.XTOKENREFNO,
                authType: userSession.AUTH_TYPE,
            });
        }
    }

    // Main method to invoke services
    async invokeService(ctxPath, method, queryParam, body, loginService,userSession) {
        const headers = this.populateHeaders(loginService,userSession);
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
