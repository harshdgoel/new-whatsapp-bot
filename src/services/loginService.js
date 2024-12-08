"use strict";

const OBDXService = require('../services/OBDXService');
const endpoints = require("../config/endpoints");
const config = require("../config/config");
const defaultHomeEntity = config.defaultHomeEntity;

class LoginService {
    constructor() {
        this.authCache = { token: null, cookie: null, anonymousToken: null };
        this.mobileNumber = "19890123000";
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
            console.log("Token or cookie is missing. Prompting for OTP.");
            return false;
        }

        if (this.isTokenExpired()) {
            console.log("Token is expired. Prompting for OTP.");
            return false;
        }

        console.log("Token and cookie are valid.");
        return true;
    }

    async verifyOTP(otp) {
        try {
            console.log("First API call to obtain anonymous token.");
            const tokenResponse = await OBDXService.serviceMeth(
                endpoints.anonymousToken,
                "POST",
                new Map([["Content-Type", "application/json"], ["x-authentication-type", "JWT"]]),
                new Map(),
                {}
            );

            if (tokenResponse) {
                this.setAnonymousToken(tokenResponse.headers.authorization);
                const setCookie = tokenResponse.headers['set-cookie'];
                if (setCookie) {
                    this.authCache.cookie = setCookie;
                    console.log("Cookies successfully stored:", this.authCache.cookie);
                }

                console.log("Second call with anonymous token:", this.getAnonymousToken());
                const otpResponse = await OBDXService.serviceMeth(
                    endpoints.login,
                    "POST",
                    new Map([
                        ["Content-Type", "application/json"],
                        ["x-authentication-type", "CHATBOT"],
                        ["TOKEN_ID", otp],
                        ["Authorization", `Bearer ${this.getAnonymousToken()}`],
                        ["X-Token-Type", "JWT"],
                        ["X-Target-Unit", defaultHomeEntity]
                    ]),
                    new Map(),
                    { mobileNumber: this.mobileNumber }
                );

                console.log("OTP Response for second call:", otpResponse);

                if (otpResponse.data.status.result === "SUCCESSFUL") {
                    console.log("OTP verified successfully.", otpResponse.data);
                    const registrationId = otpResponse.data.registrationId;

                    if (!registrationId) {
                        console.error("Registration ID missing in OTP response:", otpResponse);
                        return "Final login failed due to missing registration ID. Please try again.";
                    }
                    this.registrationId = registrationId;
                    const queryParams = new Map([["locale", "en"]]);

                    console.log("Third and final login API call.");
                    const finalLoginResponse = await OBDXService.serviceMeth(
                        endpoints.login,
                        "POST",
                        new Map([
                            ["Content-Type", "application/json"],
                            ["x-authentication-type", "CHATBOT"],
                            ["TOKEN_ID", otp],
                            ["Authorization", `Bearer ${this.getAnonymousToken()}`],
                            ["X-Token-Type", "JWT"],
                            ["X-Target-Unit", defaultHomeEntity]
                        ]),
                        queryParams,
                        { mobileNumber: this.mobileNumber, registrationId: this.registrationId }
                    );

                    console.log("Final Login Response:", finalLoginResponse);

                    const setCookieFinal = finalLoginResponse.headers['set-cookie'];
                    if (setCookieFinal) {
                        console.log("Cookies found in final response:", setCookieFinal);
                        this.authCache.cookie = setCookieFinal.join('; ');
                        console.log("Final cookies successfully stored:", this.authCache.cookie);
                    } else {
                        console.error("Cookie setting failed in final login.");
                        return "Final login failed. Please try again.";
                    }

                    console.log("Final token set:", finalLoginResponse.data.token);
                    this.setAuthDetails(finalLoginResponse.data.token, this.getCookie());

                    // Make the additional API call to fetch user details
                    const userDetails = await this.fetchUserDetails();
                    console.log(" Me call made succesfully and the User details retrieved successfully:", userDetails);
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
        console.log("Making API call to fetch user details.");
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
