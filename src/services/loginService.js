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

    async checkLogin(baseURL, otp = null) {
        if (this.isTokenExpired()) {
            console.log("Token expired or missing. OTP verification required.");
            if (otp) {
                // OTP verification flow if OTP is provided
                return await this.verifyOTP(otp, baseURL);
            }
            return false;  // Return false if no OTP is provided
        }
        return true;
    }

    async verifyOTP(otp, baseURL) {
        try {
            console.log("Obtaining anonymous token...");
            const tokenResponse = await OBDXService.invokeService(
                "/digx-infra/login/v1/anonymousToken",
                "POST",
                new Map([["Content-Type", "application/json"], ["x-authentication-type", "JWT"]]),
                new Map(),
                {},
                null,
                this
            );

            const tokenData = tokenResponse.data || {};
            if (tokenData.status?.result === "SUCCESSFUL") {
                console.log("Anonymous token obtained successfully");
                this.setAnonymousToken(tokenData.token);
                this.interactionId = tokenData.interactionId;

                const otpResponse = await OBDXService.invokeService(
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
                    { mobileNumber: this.mobileNumber },
                    null,
                    this
                );

                const otpData = otpResponse.data || {};
                if (otpData.status?.result === "SUCCESSFUL") {
                    console.log("OTP verification successful");
                    this.registrationId = otpData.registrationId;

                    const finalLoginResponse = await OBDXService.invokeService(
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
                        { mobileNumber: this.mobileNumber, registrationId: this.registrationId },
                        null,
                        this
                    );

                    const finalLoginData = finalLoginResponse.data || {};
                    const setCookie = finalLoginResponse.headers?.["set-cookie"];
                    if (setCookie) {
                        this.authCache.cookie = setCookie;
                        console.log("Cookies set successfully:", setCookie);
                    }

                    if (finalLoginData.status?.result === "SUCCESSFUL") {
                        console.log("Login successful");
                        this.setAuthDetails(finalLoginData.token, setCookie);
                        return true;
                    } else {
                        console.error("Final login failed:", finalLoginData);
                        return "Final login failed. Please try again.";
                    }
                } else {
                    console.error("OTP verification failed:", otpData);
                    return "OTP verification failed. Please try again.";
                }
            } else {
                console.error("Failed to obtain anonymous token:", tokenData);
                return "Failed to initiate login. Please try again.";
            }
        } catch (error) {
            console.error("Error during login process:", error.message);
            return "An error occurred during verification. Please try again.";
        }
    }
}

module.exports = new LoginService();
