"use strict";

const OBDXService = require("../services/OBDXService");
const endpoints = require("../config/endpoints");
const defaultHomeEntity = process.env.DEFAULT_HOME_ENTITY;

class LoginService {
    constructor() {
        // Private Map to store tokens and cookies based on userId and channel
        this.authSessions = new Map();
        this.mobileNumber = "919819250898"; // Hardcoded mobile number for now
    }

    // Generate session key based on userId and channel (WhatsApp/Facebook)
    generateSessionKey(userId, channel) {
        return channel === "facebook" ? `facebook_${userId}` : `whatsapp_${userId}`;
    }

    // Store token and cookie in the session map
    setSession(userId, channel, token, cookie) {
        const sessionKey = this.generateSessionKey(userId, channel);
        this.authSessions.set(sessionKey, { token, cookie });
    }

    // Retrieve session details
    getSession(userId, channel) {
        const sessionKey = this.generateSessionKey(userId, channel);
        return this.authSessions.get(sessionKey) || { token: null, cookie: null };
    }

    // Delete session from the map
    deleteSession(userId, channel) {
        const sessionKey = this.generateSessionKey(userId, channel);
        this.authSessions.delete(sessionKey);
    }

    // Check if a token is expired
    isTokenExpired(token) {
        if (!token) return true;
        try {
            const payloadBase64 = token.split(".")[1];
            const decodedPayload = JSON.parse(Buffer.from(payloadBase64, "base64").toString("utf-8"));
            const exp = decodedPayload.exp;
            if (!exp) return true;

            return Date.now() >= exp * 1000;
        } catch (error) {
            console.error("Error decoding token:", error.message);
            return true;
        }
    }

    // Check login status for a user
    async checkLogin(userId, channel) {
        const { token, cookie } = this.getSession(userId, channel);
        if (!token || !cookie || this.isTokenExpired(token)) {
            this.deleteSession(userId, channel);
            return false;
        }
        return true;
    }

    // Verify OTP and perform the login process
    async verifyOTP(userId, otp, channel) {
        try {
            // Step 1: Get anonymous token
            const tokenResponse = await OBDXService.serviceMeth(
                endpoints.anonymousToken,
                "POST",
                new Map([["Content-Type", "application/json"], ["x-digx-authentication-type", "JWT"]]),
                new Map(),
                {}
            );

            if (!tokenResponse || !tokenResponse.headers.authorization) {
                console.error("Failed to fetch anonymous token");
                return "Failed to initiate login. Please try again.";
            }

            console.log("first login call success");
            const anonymousToken = tokenResponse.headers.authorization;
            const setCookie = tokenResponse.headers["set-cookie"];

            // Step 2: OTP Verification
            const otpResponse = await OBDXService.serviceMeth(
                endpoints.login,
                "POST",
                new Map([
                    ["Content-Type", "application/json"],
                    ["x-digx-authentication-type", "CHATBOT"],
                    ["TOKEN_ID", otp],
                    ["Authorization", `Bearer ${anonymousToken}`],
                    ["X-Token-Type", "JWT"],
                    ["X-Target-Unit", defaultHomeEntity],
                ]),
                new Map(),
                { mobileNumber: this.mobileNumber }
            );
            console.log("second login call success");

            if (otpResponse?.data?.status?.result !== "SUCCESSFUL") {
                console.error("OTP verification failed:", otpResponse?.data);
                return "OTP verification failed. Please try again.";
            }

            const registrationId = otpResponse.data.registrationId;
            if (!registrationId) {
                console.error("Missing registration ID in OTP response.");
                return "Login failed due to missing registration ID.";
            }

            // Step 3: Final Login
            const finalLoginResponse = await OBDXService.serviceMeth(
                endpoints.login,
                "POST",
                new Map([
                    ["Content-Type", "application/json"],
                    ["x-digx-authentication-type", "CHATBOT"],
                    ["TOKEN_ID", otp],
                    ["Authorization", `Bearer ${anonymousToken}`],
                    ["X-Token-Type", "JWT"],
                    ["X-Target-Unit", defaultHomeEntity],
                ]),
                new Map([["locale", "en"]]),
                { mobileNumber: this.mobileNumber, registrationId: String(registrationId) }
            );

            
            const finalToken = finalLoginResponse?.data?.token;
            const setCookieFinal = finalLoginResponse?.headers?.["set-cookie"];
            console.log("login success,token in:",finalToken);
            console.log("cookie is:",setCookieFinal);
            if (finalToken && setCookieFinal) {
                // Save token and cookie in session
                this.setSession(userId, channel, finalToken, setCookieFinal);
                
                // Fetch user details to confirm successful login
                const userDetails = await this.fetchUserDetails(userId, channel);
                console.log("User Details:", userDetails);

                return true; // Login successful
            } else {
                console.error("Final login failed. Missing token or cookie.");
                return "Final login failed. Please try again.";
            }
        } catch (error) {
            console.error("Error during login process:", error.message);
            return "An error occurred during login. Please try again.";
        }
    }

    // Fetch user details
    async fetchUserDetails(userId, channel) {
        const { token, cookie } = this.getSession(userId, channel);

        console.log("token in me call is:", token);
        console.log("cookie is:",cookie);
        if (!token || !cookie) {
            console.error("Missing token or cookie for fetching user details.");
            return null;
        }

        const headers = new Map([
            ["Authorization", `Bearer ${token}`],
            ["Cookie", cookie],
            ["Content-Type", "application/json"],
            ["X-Token-Type", "JWT"],
        ]);

        const response = await OBDXService.serviceMeth(
            endpoints.me,
            "GET",
            headers,
            new Map([["locale", "en"]]),
            null
        );
        
        return response?.data || null;
    }
}

module.exports = new LoginService();
