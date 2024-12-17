"use strict";

const OBDXService = require('../services/OBDXService');
const endpoints = require("../config/endpoints");
const config = require("../config/config");
const defaultHomeEntity = config.defaultHomeEntity;

class LoginService {
    constructor() {
        // Closure: Map to persist token and cookie against user identifiers
        const authMap = new Map();

        // Helper to check if a JWT token is expired
        const isTokenExpired = (token) => {
            if (!token) return true;
            try {
                const payloadBase64 = token.split('.')[1];
                const decodedPayload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
                const exp = decodedPayload.exp;
                return !exp || Date.now() >= exp * 1000; // Check expiration
            } catch (error) {
                console.error("Error decoding token:", error.message);
                return true;
            }
        };

        // Store token and cookie for a given user
        this.setAuthDetails = (channel, userId, token, cookie) => {
            if (!userId || !token || !cookie) {
                console.error("Invalid parameters for setting auth details.");
                return;
            }

            authMap.set(userId, { token, cookie, timestamp: Date.now() });
            console.log(`Auth details set for ${channel}:${userId}`);
        };

        // Get token and cookie for a given user
        this.getAuthDetails = (channel, userId) => {
            if (!authMap.has(userId)) {
                console.log(`No auth details found for ${channel}:${userId}`);
                return { token: null, cookie: null };
            }

            const { token, cookie } = authMap.get(userId);
            if (isTokenExpired(token)) {
                console.log(`Token expired for ${channel}:${userId}, clearing details.`);
                authMap.delete(userId);
                return { token: null, cookie: null };
            }

            return { token, cookie };
        };

        // Clear auth details for a given user
        this.clearAuthDetails = (channel, userId) => {
            if (authMap.has(userId)) {
                authMap.delete(userId);
                console.log(`Cleared auth details for ${channel}:${userId}`);
            }
        };

        // Verify if the user is logged in
        this.checkLogin = (channel, userId) => {
            const { token, cookie } = this.getAuthDetails(channel, userId);
            if (!token || !cookie) {
                console.log(`Login required for ${channel}:${userId}`);
                return false;
            }
            return true;
        };

        // OTP Verification and Login Flow
        this.verifyOTP = async (channel, userId, otp, mobileNumber) => {
            try {
                console.log("First API call to obtain anonymous token.");
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

                    console.log("Second API call to verify OTP.");
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
                        { mobileNumber }
                    );

                    if (otpResponse.data.status.result === "SUCCESSFUL") {
                        console.log("OTP verified successfully.");
                        const registrationId = otpResponse.data.registrationId;

                        console.log("Final API call to complete login.");
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
                            { mobileNumber, registrationId }
                        );

                        const finalToken = finalLoginResponse.data.token;
                        const finalCookie = finalLoginResponse.headers['set-cookie'].join('; ');

                        // Save the token and cookie
                        this.setAuthDetails(channel, userId, finalToken, finalCookie);

                        console.log("Login completed successfully.");
                        return true;
                    } else {
                        console.error("OTP verification failed.");
                        return false;
                    }
                }
            } catch (error) {
                console.error("Error during OTP verification:", error.message);
                return false;
            }
        };

        // Fetch User Details (example additional API)
        this.fetchUserDetails = async (channel, userId) => {
            const { token, cookie } = this.getAuthDetails(channel, userId);
            if (!token || !cookie) {
                console.error("User is not logged in.");
                return null;
            }

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

            console.log("User details fetched successfully.");
            return response.data;
        };
    }
}

module.exports = new LoginService();
