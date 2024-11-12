"use strict";

const OBDXService = require('../services/OBDXService');
const jwt = require("jsonwebtoken");

class LoginService {
    constructor() {
        this.authCache = { token: null, cookie: null, anonymousToken: null };
        this.mobileNumber = "YOUR_MOBILE_NUMBER";
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
            console.log("Obtaining anonymous token...");
            const tokenResponse = await OBDXService.serviceMeth(
                "/digx-infra/login/v1/anonymousToken",
                "POST",
                new Map([["Content-Type", "application/json"], ["x-authentication-type", "JWT"]]),
                new Map(),
                {}
            );

            if (tokenResponse?.status?.result === "SUCCESSFUL") {
                console.log("Anonymous token obtained successfully");
                this.setAnonymousToken(tokenResponse.token);

                const otpResponse = await OBDXService.serviceMeth(
                    "/digx-infra/login/v1/login?locale=en",
                    "POST",
                    new Map([
                        ["Content-Type", "application/json"],
                        ["x-authentication-type", "CHATBOT"],
                        ["TOKEN_ID", otp],
                        ["Authorization", `Bearer ${this.getAnonymousToken()}`]
                    ]),
                    new Map(),
                    { mobileNumber: this.mobileNumber }
                );

                if (otpResponse?.status?.result === "SUCCESSFUL") {
                    console.log("OTP verification successful");
                    this.setAuthDetails(otpResponse.token, otpResponse.cookie);
                    return true;
                } else {
                    console.error("OTP verification failed");
                    return false;
                }
            } else {
                console.error("Failed to obtain anonymous token");
                return false;
            }
        } catch (error) {
            console.error("Error during OTP verification:", error.message);
            return false;
        }
    }
}

module.exports = new LoginService();
