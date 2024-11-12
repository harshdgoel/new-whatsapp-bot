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

            if (tokenResponse?.status?.result === "SUCCESSFUL") {
                console.log("Anonymous token obtained successfully.");
                this.setAnonymousToken(tokenResponse.token);

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

                if (otpResponse?.status?.result === "SUCCESSFUL") {
                    console.log("OTP verified successfully.");
                    this.registrationId = otpResponse.data.registrationId;

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

                    const setCookie = finalLoginResponse.headers?.["set-cookie"];
                    if (setCookie) {
                        this.setAuthDetails(finalLoginResponse.data.token, setCookie);
                        console.log("Token and cookies set successfully.");
                        return true;
                    } else {
                        console.error("Cookie setting failed in final login.");
                        return "Final login failed. Please try again.";
                    }
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
