"use strict";
const axios = require("axios");
const URL = process.env.BASE_URL; // Use the correct key from config
const defaultHomeEntity = process.env.DEFAULT_HOME_ENTITY;

class OBDXService {
    // Constructs and returns headers for API calls
    populateHeaders(loginService,userSession) {
         const token = loginService.getToken(userSession.userId);
         const cookie = loginService.getCookie(userSession.userId);
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
    console.log("headers is:",headers);
        // Add X-CHALLENGE_RESPONSE header if OTP is present
        if (userSession?.authOTP) {
            headers["X-CHALLENGE_RESPONSE"] = JSON.stringify({
                otp: userSession.authOTP,
                referenceNo: userSession.XTOKENREFNO,
                authType: userSession.AUTH_TYPE,
            });
        }
        return headers;
    }

    // Main method to invoke services
    async invokeService(ctxPath, method, queryParam, body, loginService, userSession) {
        console.log("entering invokeservice and usersession is:",userSession);
        const headers = this.populateHeaders(loginService,userSession);
        const responseData = await this.serviceMeth(ctxPath, method, headers, queryParam, body, userSession);
        return responseData;
    }

    // Helper method to make the API call
    async serviceMeth(ctxPath, method, headers, queryParam, body, userSession) {
        console.log("entering service method");
        const url = URL + ctxPath + "?" + new URLSearchParams(queryParam).toString();
        console.log("url generated is",url);
        // Convert headers to a plain object if it's a Map
    const headersObj = headers instanceof Map ? Object.fromEntries(headers) : headers;
    console.log("headersObj:", headersObj);
        console.log("method:",method);
        try {
            const response = await axios({
                url,
                method,
                headers: headersObj,
                data: body
            });

if ([200, 201, 202].includes(response.status)) {
                return response;
            }
        } catch (error) {
            const statusCode = error.response?.status;
            const headers = error.response?.headers || {};
            const data = error.response?.data || {};

            if (statusCode === 417) {
                console.log("entered 417 2fa ");
                const challenge = headers["x-challenge"] ? JSON.parse(headers["x-challenge"]) : {};
                const authType = challenge.authType || "UNKNOWN";
                const refNo = challenge.referenceNo || null;

                console.log("challenge:",challenge);
                console.log("authType:",authType);
                console.log("refNo:",refNo);
                userSession.IS_OTP_REQUIRED = true;
                userSession.AUTH_TYPE = authType;
                userSession.XTOKENREFNO = refNo;
                userSession.state = "ACCOUNT_SELECTION";

                if (authType === "OTP") {
                    return "Please enter the One Time Password (OTP) sent to your registered number.";
                } else if (authType === "TOTP") {
                    return "Please enter your Time-based One Time Password (TOTP).";
                } else {
                    return `Please enter the HOPT code: ${challenge.randomNumber}`;
                }
            } else if (statusCode === 412) {
                userSession.IS_OTP_REQUIRED = false;
                throw new Error("Maximum OTP attempts exceeded. Please try again later.");
            } else if ([400, 403, 500].includes(statusCode)) {
                const errorMessage = data?.message?.validationError?.[0]?.errorMessage || 
                                     data?.message?.detail || 
                                     "Unknown error.";
                throw new Error(`Network Error: ${errorMessage}`);
            } else {
                throw new Error(`Unexpected error occurred: ${statusCode || "Unknown status"}`);
            }
        }        
        }
    }


module.exports = new OBDXService();
