"use strict";

const OBDXService = require('../services/OBDXService');
const endpoints = require("../config/endpoints");
const defaultHomeEntity = process.env.DEFAULT_HOME_ENTITY;

class LoginService {
    constructor() {
        this.authCache = { token: null, cookie: null, anonymousToken: null };
        this.mobileNumber = "919819250898";
    }
    setAuthDetails(token, cookie) {
        this.authCache.token = token;
        this.authCache.cookie = cookie;
    }
    setAnonymousToken(token) {
        this.authCache.anonymousToken = token;
    }
    getToken() {
        return this.authCache.token;
    }
    getCookie() {
        return this.authCache.cookie;
    }
    getAnonymousToken() {
        return this.authCache.anonymousToken;
    }
    clearAuthCache() {
        this.authCache = { token: null, cookie: null, anonymousToken: null };
    }
    isTokenExpired() {
        const token = this.getToken();
        if (!token) return true;
        try {
            const payloadBase64 = token.split('.')[1];
            const decodedPayload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
            const exp = decodedPayload.exp;
            if (!exp) {
                this.clearAuthCache();
                return true;
            }

            const isExpired = Date.now() >= exp * 1000;
            if (isExpired) {
                this.clearAuthCache();
            }

            return isExpired;
        } catch (error) {
            console.error("Error decoding token:", error.message);
            this.clearAuthCache();
            return true;
        }
    }
    async checkLogin() {
        const token = this.getToken();
        const cookie = this.getCookie();
        if (!token || !cookie) {
            return false;
        }

        if (this.isTokenExpired()) {
            return false;
        }
        return true;
    }

    async authenticateUser(mobileNumber,userSession) {
        try {
            // Step 1: Fetch anonymous token
            const tokenResponse = await OBDXService.serviceMeth(
                endpoints.anonymousToken,
                "POST",
                new Map([["Content-Type", "application/json"], ["x-digx-authentication-type", "JWT"]]),
                new Map(),
                {}
            );
    
            if (!tokenResponse) {
                console.error("Failed to obtain anonymous token:", tokenResponse);
                return { success: false, message: "Failed to initiate login. Please try again." };
            }
    
            console.log("first login call success and token is:",tokenResponse);
            // Set anonymous token and cookies
            this.setAnonymousToken(tokenResponse.headers.authorization);
            const setCookie = tokenResponse.headers['set-cookie'];
            if (setCookie) {
                this.authCache.cookie = setCookie;
            }
            console.log("mobilenum in second login api call:",mobileNumber);
            // Step 2: Verify OTP
            const otpResponse = await OBDXService.serviceMeth(
                endpoints.login,
                "POST",
                new Map([
                    ["Content-Type", "application/json"],
                    ["x-digx-authentication-type", "CHATBOT"],
                    ["Authorization", `Bearer ${this.getAnonymousToken()}`],
                    ["X-Token-Type", "JWT"],
                    ["X-Target-Unit", defaultHomeEntity]
                ]),
                new Map(),
                { mobileNumber: mobileNumber }
            );
    
            if (otpResponse.data.status.result !== "SUCCESSFUL") {
                console.error("OTP verification failed:", otpResponse);
                return { success: false, message: "OTP verification failed. Please try again." };
            }
    
    
        console.log("otpResponse.data is:",otpResponse.data);
            // Extract values from otpResponse
            const { authType, token: counter, registrationId } = otpResponse.data;
            if (!registrationId) {
                console.error("Registration ID missing in OTP response:", otpResponse);
                return { success: false, message: "Registration ID missing. Please try again." };
            }
    
    
           console.log("authType:",authType);
           console.log("COUNTER IS:",counter);
           console.log("registration id is:",registrationId);
           userSession.registrationId = registrationId;

            // Generate the message based on authType
            let message;
            switch (authType) {
                case "OTP":
                    message = "To verify your details, we have sent a one-time password to your mobile number. Please enter the password here.";
                    break;
                case "R_SOFT_TOKEN":
                    message = `Open the Soft Token App on your handheld device and log in with your PIN. Enter the Authorization Code ${counter} and generate an OTP. Please enter the code appearing on your Soft Token application.`;
                    break;
                case "PIN":
                    message = "Please enter your PIN.";
                    break;
                default:
                    console.error("Unknown authType:", authType);
                    message = "Unknown authentication method. Please try again.";
                    break;
            }
    
            return { success: true, registrationId, message };
        } catch (error) {
            console.error("Error during user authentication:", error.message);
            return { success: false, message: "An error occurred during authentication. Please try again." };
        }
    }


//3RD CALL
async fetchFinalLoginResponse(otp, mobileNumber, registrationId) {
    console.log("entering final api call");
    try {
        const queryParams = new Map([["locale", "en"]]);
        const finalLoginResponse = await OBDXService.serviceMeth(
            endpoints.login,
            "POST",
            new Map([
                ["Content-Type", "application/json"],
                ["x-digx-authentication-type", "CHATBOT"],
                ["TOKEN_ID", otp],
                ["Authorization", `Bearer ${this.getAnonymousToken()}`],
                ["X-Token-Type", "JWT"],
                ["X-Target-Unit", defaultHomeEntity]
            ]),
            queryParams,
            { mobileNumber: mobileNumber, registrationId }
        );

        const setCookieFinal = finalLoginResponse.headers['set-cookie'];
        if (setCookieFinal) {
            this.authCache.cookie = setCookieFinal.join('; ');
        } else {
            console.error("Cookie setting failed in final login.");
            return { success: false, error: "Final login failed. Please try again." };
        }

        this.setAuthDetails(finalLoginResponse.data.token, this.getCookie());

        // Optionally fetch user details
        const userDetails = await this.fetchUserDetails();
        return { success: true, userDetails };
    } catch (error) {
        console.error("Error during final login:", error.message);
        return { success: false, error: "Error during final login. Please try again." };
    }
}








    async fetchUserDetails() {
        const headers = new Map([
            ["Authorization", `Bearer ${this.getToken()}`],
            ["Cookie", this.getCookie()],
            ["Content-Type", "application/json"],
            ["X-Token-Type", "JWT"]
        ]);
        const response = await OBDXService.serviceMeth(
            endpoints.me,
            "GET",
            headers,
            new Map([["locale", "en"]]),
            null
        );
        return response.data;
    }
}

module.exports = new LoginService();
