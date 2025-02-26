"use strict";
const OBDXService = require('../services/OBDXService');
const endpoints = require("../config/endpoints");
const defaultHomeEntity = process.env.DEFAULT_HOME_ENTITY;

class LoginService {
    constructor() {
        // Map to store session details against user identifiers (phone number or Facebook ID)
        this.userSessions = new Map();
    }

    // Set auth details (token and cookie) for a specific user
    setAuthDetails(userId, token, cookie) {
        if (!this.userSessions.has(userId)) {
            this.userSessions.set(userId, { token: null, cookie: null, anonymousToken: null });
        }
        const session = this.userSessions.get(userId);
        session.token = token;
        session.cookie = cookie;
        console.log("session.token",  session.token);
        console.log("session.cookie",  session.cookie);
        this.userSessions.set(userId, session);
    }

    // Set anonymous token for a specific user
    setAnonymousToken(userId, token) {
        if (!this.userSessions.has(userId)) {
            this.userSessions.set(userId, { token: null, cookie: null, anonymousToken: null });
        }
        const session = this.userSessions.get(userId);
        session.anonymousToken = token;
        this.userSessions.set(userId, session);
    }

    // Get token for a specific user
    getToken(userId) {
        const session = this.userSessions.get(userId);
        return session ? session.token : null;
    }

    // Get cookie for a specific user
    getCookie(userId) {
        const session = this.userSessions.get(userId);
        return session ? session.cookie : null;
    }

    // Get anonymous token for a specific user
    getAnonymousToken(userId) {
        const session = this.userSessions.get(userId);
        return session ? session.anonymousToken : null;
    }

    // Clear auth details for a specific user
    clearAuthCache(userId) {
        this.userSessions.delete(userId);
    }

    // Check if a user's token is expired
    isTokenExpired(userId) {
        const token = this.getToken(userId);
        if (!token) return true;
        try {
            const payloadBase64 = token.split('.')[1];
            const decodedPayload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
            const exp = decodedPayload.exp;

            if (!exp) {
                console.log("Clearing token because expiration time is missing.");
                this.clearAuthCache(userId);
                return true;
            }

            const isExpired = Date.now() >= exp * 1000;
            if (isExpired) {
                console.log("Token expired. Clearing user session.");
                this.clearAuthCache(userId);
            }

            return isExpired;
        } catch (error) {
            console.error("Error decoding token:", error.message);
            this.clearAuthCache(userId);
            return true;
        }
    }

    // Check if a user is logged in
    async checkLogin(userId) {
        const token = this.getToken(userId);
        const cookie = this.getCookie(userId);
        if (!token || !cookie) {
            console.log("token expired", userId);
            return false;
        }

        if (this.isTokenExpired(userId)) {
            console.log("token expired", userId);
            return false;
        }
        return true;
    }

    // Authenticate user (Step 1: Fetch anonymous token and OTP)
    async authenticateUser(mobileNumber, userSession) {
        try {
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

            console.log("First login call success. Anonymous token:", tokenResponse.headers.authorization);
            const userId = mobileNumber;

            // Save anonymous token for the user
            this.setAnonymousToken(userId, tokenResponse.headers.authorization);

            const setCookie = tokenResponse.headers['set-cookie'];
            if (setCookie) {
                const session = this.userSessions.get(userId) || {};
                session.cookie = setCookie;
                this.userSessions.set(userId, session);
            }

            console.log("Mobile number for second login API call:", mobileNumber);

            const otpResponse = await OBDXService.serviceMeth(
                endpoints.login,
                "POST",
                new Map([
                    ["Content-Type", "application/json"],
                    ["x-digx-authentication-type", "CHATBOT"],
                    ["Authorization", `Bearer ${this.getAnonymousToken(userId)}`],
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

            console.log("OTP response data:", otpResponse.data);

            const { authType, token: counter, registrationId } = otpResponse.data;
            if (!registrationId) {
                console.error("Registration ID missing in OTP response:", otpResponse);
                return { success: false, message: "Registration ID missing. Please try again." };
            }

            console.log("AuthType:", authType);
            console.log("Registration ID:", registrationId);
            userSession.registrationId = registrationId;

            let message;
            switch (authType) {
                case "LOCAL":
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

    // Final login (Step 3: Verify OTP and log the user in)
    async fetchFinalLoginResponse(otp, mobileNumber, registrationId) {
        console.log("Entering final API call");
        const userId = mobileNumber;

        try {
            const queryParams = new Map([["locale", "en"]]);
            const finalLoginResponse = await OBDXService.serviceMeth(
                endpoints.login,
                "POST",
                new Map([
                    ["Content-Type", "application/json"],
                    ["x-digx-authentication-type", "CHATBOT"],
                    ["TOKEN_ID", otp],
                    ["Authorization", `Bearer ${this.getAnonymousToken(userId)}`],
                    ["X-Token-Type", "JWT"],
                    ["X-Target-Unit", defaultHomeEntity]
                ]),
                queryParams,
                { mobileNumber: mobileNumber, registrationId: registrationId }
            );

            const setCookieFinal = finalLoginResponse.headers['set-cookie'];
            if (setCookieFinal) {
                this.setAuthDetails(userId, finalLoginResponse.data.token, setCookieFinal.join('; '));
            } else {
                console.error("Cookie setting failed in final login.");
                return { success: false, error: "Final login failed. Please try again." };
            }

            return { success: true, userDetails: await this.fetchUserDetails(userId) };
        } catch (error) {
            console.error("Error during final login:", error.message);
            return { success: false, error: "Error during final login. Please try again." };
        }
    }

    // Fetch user details
    async fetchUserDetails(userId) {
        console.log("entering ME CALL");
        const headers = new Map([
            ["Authorization", `Bearer ${this.getToken(userId)}`],
            ["Cookie", this.getCookie(userId)],
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
