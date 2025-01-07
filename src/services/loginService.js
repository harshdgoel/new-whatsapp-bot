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

    async verifyOTP(otp,mobileNumber) {
        console.log("mobile number is:", mobileNumber);
        try {
            const tokenResponse = await OBDXService.serviceMeth(
                endpoints.anonymousToken,
                "POST",
                new Map([["Content-Type", "application/json"], ["x-digx-authentication-type", "JWT"]]),
                new Map(),
                {}
            );

            if (tokenResponse) {
                this.setAnonymousToken(tokenResponse.headers.authorization);
                const setCookie = tokenResponse.headers['set-cookie'];
                if (setCookie) {
                    this.authCache.cookie = setCookie;
                }

                const otpResponse = await OBDXService.serviceMeth(
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
                    new Map(),
                    { mobileNumber: mobileNumber }
                );
                if (otpResponse.data.status.result === "SUCCESSFUL") {
                    const registrationId = otpResponse.data.registrationId;
                    if (!registrationId) {
                        console.error("Registration ID missing in OTP response:", otpResponse);
                        return "Final login failed due to missing registration ID. Please try again.";
                    }
                    this.registrationId = registrationId;
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
                        { mobileNumber: mobileNumber, registrationId: this.registrationId }
                    );

                    const setCookieFinal = finalLoginResponse.headers['set-cookie'];
                    if (setCookieFinal) {
                        this.authCache.cookie = setCookieFinal.join('; ');
                    } else {
                        console.error("Cookie setting failed in final login.");
                        return "Final login failed. Please try again.";
                    }
                    this.setAuthDetails(finalLoginResponse.data.token, this.getCookie());
                    // Make the additional API call to fetch user details
                    const userDetails = await this.fetchUserDetails();
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
