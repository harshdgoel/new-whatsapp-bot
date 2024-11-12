"use strict";

const OBDXService = require('../services/OBDXService');
const jwt = require("jsonwebtoken");

class LoginService {
    constructor() {
        this.authCache = { token: null, cookie: null, anonymousToken: null };
        this.mobileNumber = "916378582419";
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
        console.log("Auth cache cleared due to expired token.");
    }

    isTokenExpired() {
        const token = this.getToken();
        if (!token) return true;
        try {
            const { exp } = jwt.decode(token);
            const isExpired = Date.now() >= exp * 1000;
            if (isExpired) {
                this.clearAuthCache();
            }
            return isExpired;
        } catch {
            this.clearAuthCache();
            return true;
        }
    }

    async checkLogin() {
        if (this.isTokenExpired()) {
            console.log("Token expired or missing. OTP verification required.");
            return false; // Return false if token is missing or expired
        }
        return true; // Return true if token is still valid
    }

    async verifyOTP(otp) {
        try {
            console.log("First API call to obtain anonymous token.");
            const tokenResponse = await OBDXService.serviceMeth(
                "/digx-infra/login/v1/anonymousToken",
                "POST",
                new Map([["Content-Type", "application/json"], ["x-authentication-type", "JWT"]]),
                new Map(),
                {}
            );

            console.log("THE RESPONSE COMING FROM OBDX SERVICE FOR FIRST LOGIN", tokenResponse);

            if (tokenResponse.status === "200") {
                console.log("tokenResponse is:", tokenResponse);
                console.log("Anonymous token obtained successfully.", tokenResponse.headers.authorization);
                console.log("Cookie is:", tokenResponse.headers['set-cookie']);
                this.setAnonymousToken(tokenResponse.authorization);

                // Correct handling of set-cookie
                const setCookie = tokenResponse.headers['set-cookie'];
                if (setCookie) {
                    this.authCache.cookie = setCookie.join('; '); // Ensure we store the cookie correctly
                    console.log("Cookies successfully stored:", this.authCache.cookie);
                }

                // Second call to validate OTP
                const otpResponse = await OBDXService.serviceMeth(
                    "/digx-infra/login/v1/login?locale=en",
                    "POST",
                    new Map([
                        ["Content-Type", "application/json"],
                        ["x-authentication-type", "CHATBOT"],
                        ["TOKEN_ID", otp],
                        ["Authorization", `Bearer ${this.getAnonymousToken()}`],
                        ["X-Token-Type", "JWT"],
                        ["X-Target-Unit", "OBDX_BU"]
                    ]),
                    new Map(),
                    { mobileNumber: this.mobileNumber }
                );

                console.log("OTP Response:", otpResponse);

                if (otpResponse?.status?.result === "SUCCESSFUL") {
                    console.log("OTP verified successfully.");

                    const registrationId = otpResponse?.registrationId || otpResponse.data?.registrationId;

                    if (!registrationId) {
                        console.error("Registration ID missing in OTP response:", otpResponse);
                        return "Final login failed due to missing registration ID. Please try again.";
                    }
                    this.registrationId = registrationId;

                    // Third and final call to get session token and cookie
                    const finalLoginResponse = await OBDXService.serviceMeth(
                        "/digx-infra/login/v1/login?locale=en",
                        "POST",
                        new Map([
                            ["Content-Type", "application/json"],
                            ["x-authentication-type", "CHATBOT"],
                            ["TOKEN_ID", otp],
                            ["Authorization", `Bearer ${this.getAnonymousToken()}`],
                            ["X-Token-Type", "JWT"],
                            ["X-Target-Unit", "OBDX_BU"]
                        ]),
                        new Map(),
                        { mobileNumber: this.mobileNumber, registrationId: this.registrationId }
                    );

                    console.log("Final Login Response:", finalLoginResponse);

                    // Check for cookies in the response headers set by OBDXService
                    const setCookieFinal = finalLoginResponse.headers['set-cookie'];
                    if (setCookieFinal) {
                        console.log("Cookies found in final response:", setCookieFinal);
                        this.authCache.cookie = setCookieFinal.join('; '); // Store the final cookies in authCache
                        console.log("Final cookies successfully stored:", this.authCache.cookie);
                    } else {
                        console.error("Cookie setting failed in final login.");
                        return "Final login failed. Please try again.";
                    }

                    // Store token in authCache after successful login
                    this.setAuthDetails(finalLoginResponse.data.token, this.getCookie());
                    return true;
                } else {
                    console.error("OTP verification failed:", otpResponse);
                    return "OTP verification failed. Please try again.";
                }
            } else {
                console.error("Failed to obtain anonymous token:", tokenResponse);
                return "Failed to initiate login. Please try again.";
            }
        } catch (error) {
            console.error("Error during login process:", error.message);
            return "An error occurred during verification. Please try again.";
        }
    }
}

module.exports = new LoginService();
