"use strict";

const OBDXService = require('../services/OBDXService');
const endpoints = require("../config/endpoints");
const defaultHomeEntity = process.env.DEFAULT_HOME_ENTITY;

class LoginService {
    constructor() {
        // Private Map to store tokens and cookies based on phoneNumber or facebookId
        const authSessions = new Map();

        // Helper function to generate the session key based on channel
        const generateSessionKey = (userId, channel) => {
            return channel === "facebook" ? `facebook_${userId}` : `whatsapp_${userId}`;
        };

        // Add or update user session
        this.setSession = (userId, channel, token, cookie) => {
            const sessionKey = generateSessionKey(userId, channel);
            authSessions.set(sessionKey, { token, cookie });
        };

        // Get user session
        this.getSession = (userId, channel) => {
            const sessionKey = generateSessionKey(userId, channel);
            return authSessions.get(sessionKey) || { token: null, cookie: null };
        };

        // Delete user session
        this.deleteSession = (userId, channel) => {
            const sessionKey = generateSessionKey(userId, channel);
            authSessions.delete(sessionKey);
        };

        // Check if token is expired
        this.isTokenExpired = (token) => {
            if (!token) return true;
            try {
                const payloadBase64 = token.split('.')[1];
                const decodedPayload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
                const exp = decodedPayload.exp;
                if (!exp) return true; // Expiry missing, assume expired

                const isExpired = Date.now() >= exp * 1000;
                return isExpired;
            } catch (error) {
                console.error("Error decoding token:", error.message);
                return true; // Treat as expired if decoding fails
            }
        };

        // Clear expired sessions
        this.cleanupSessions = () => {
            for (const [key, session] of authSessions.entries()) {
                if (this.isTokenExpired(session.token)) {
                    console.log(`Session expired for key: ${key}, removing it.`);
                    authSessions.delete(key);
                }
            }
        };

        // Periodic cleanup every 10 minutes
        setInterval(this.cleanupSessions, 10 * 60 * 1000);
    }

    async checkLogin(userId, channel) {
        const { token, cookie } = this.getSession(userId, channel);
        if (!token || !cookie || this.isTokenExpired(token)) {
            this.deleteSession(userId, channel);
            return false;
        }
        return true;
    }

    async verifyOTP(userId, channel, otp, mobileNumber) {
        try {
            const tokenResponse = await OBDXService.serviceMeth(
                endpoints.anonymousToken,
                "POST",
                new Map([["Content-Type", "application/json"], ["x-digx-authentication-type", "JWT"]]),
                new Map(),
                {}
            );

            if (tokenResponse) {
                const anonymousToken = tokenResponse.headers.authorization;
                const setCookie = tokenResponse.headers['set-cookie'];

                const otpResponse = await OBDXService.serviceMeth(
                    endpoints.login,
                    "POST",
                    new Map([
                        ["Content-Type", "application/json"],
                        ["x-digx-authentication-type", "CHATBOT"],
                        ["TOKEN_ID", otp],
                        ["Authorization", `Bearer ${anonymousToken}`],
                        ["X-Token-Type", "JWT"],
                        ["X-Target-Unit", defaultHomeEntity]
                    ]),
                    new Map(),
                    { mobileNumber: "919819250898" }
                );

                if (otpResponse.data.status.result === "SUCCESSFUL") {
                    const registrationId = otpResponse.data.registrationId;
                    console.log("registrationId is:",registrationId);
                    if (!registrationId) {
                        console.error("Registration ID missing in OTP response");
                        return "Final login failed. Please try again.";
                    }
                    const requestBody = {
    mobileNumber: "916378582419",
    registrationId: String(registrationId) 
};

console.log("Final Login Request Body:", JSON.stringify(requestBody)); // Log to debug the payload

                    const finalLoginResponse = await OBDXService.serviceMeth(
                        endpoints.login,
                        "POST",
                        new Map([
                            ["Content-Type", "application/json"],
                            ["x-digx-authentication-type", "CHATBOT"],
                            ["TOKEN_ID", otp],
                            ["Authorization", `Bearer ${anonymousToken}`],
                            ["X-Token-Type", "JWT"],
                            ["X-Target-Unit", defaultHomeEntity]
                        ]),
                        new Map([["locale", "en"]]),
                       requestBody
                    );

                    const finalToken = finalLoginResponse.data.token;
                    const setCookieFinal = finalLoginResponse.headers['set-cookie'];

                    if (finalToken && setCookieFinal) {
                        this.setSession(userId, channel, finalToken, setCookieFinal.join('; '));
                        return "Login successful.";
                    } else {
                        return "Final login failed. Please try again.";
                    }
                } else {
                    return "OTP verification failed. Please try again.";
                }
            }
        } catch (error) {
            console.error("Error during OTP verification:", error.message);
            return "An error occurred during login. Please try again.";
        }
    }

    async fetchUserDetails(userId, channel) {
        const { token, cookie } = this.getSession(userId, channel);

        const headers = new Map([
            ["Authorization", `Bearer ${token}`],
            ["Cookie", cookie],
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
