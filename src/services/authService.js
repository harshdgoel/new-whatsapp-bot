const axios = require('axios');
require('dotenv').config();

class AuthService {
    constructor() {
        this.anonymousToken = '';
        this.sessionToken = '';
        this.cookies = '';
    }

    setAnonymousToken(token) {
        this.anonymousToken = token;
    }

    setSessionToken(token) {
        this.sessionToken = token;
    }

    setCookies(cookies) {
        this.cookies = cookies;
    }

    getAnonymousToken() {
        return this.anonymousToken;
    }

    getSessionToken() {
        return this.sessionToken;
    }

    getCookies() {
        return this.cookies;
    }

    async fetch(resource, options = {}) {
        if (this.sessionToken) {
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${this.sessionToken}`,
            };
        }
        if (this.cookies) {
            options.headers = {
                ...options.headers,
                'Cookie': this.cookies,
            };
        }
        return axios.post(resource, options.data, options);
    }

    async initiateLogin() {
        try {
            console.log("Initiating login to get anonymous token");
            const tokenResponse = await axios.post('https://your-api-url.com/anonymousToken', {}, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-authentication-type': 'JWT',
                },
            });

            if (tokenResponse.data.status.result === "SUCCESSFUL") {
                console.log("Successfully obtained anonymous token");
                this.setAnonymousToken(tokenResponse.data.token);
                return tokenResponse.data.token;
            }
        } catch (error) {
            console.error("Error initiating login:", error);
            throw error;
        }
    }

    async verifyOTP(otp, mobileNumber) {
        try {
            const otpResponse = await axios.post('https://your-api-url.com/verifyOTP', {
                mobileNumber,
                otp,
            }, {
                headers: {
                    'Authorization': `Bearer ${this.getAnonymousToken()}`,
                    'Content-Type': 'application/json',
                },
            });

            if (otpResponse.data.status.result === "SUCCESSFUL") {
                return otpResponse.data.registrationId;
            } else {
                throw new Error('OTP verification failed');
            }
        } catch (error) {
            console.error("Error verifying OTP:", error);
            throw error;
        }
    }

    async finalLogin(mobileNumber, registrationId, otp) {
        try {
            const finalLoginResponse = await axios.post('https://your-api-url.com/finalLogin', {
                mobileNumber,
                registrationId,
            }, {
                headers: {
                    'Authorization': `Bearer ${this.getAnonymousToken()}`,
                    'X-Token-Type': 'JWT',
                    'Content-Type': 'application/json',
                },
            });

            if (finalLoginResponse.data.status.result === "SUCCESSFUL") {
                this.setSessionToken(finalLoginResponse.data.token);
                const setCookie = finalLoginResponse.headers['set-cookie'];
                if (setCookie) {
                    this.setCookies(setCookie);
                }
                return finalLoginResponse.data.token;
            }
        } catch (error) {
            console.error("Error during final login:", error);
            throw error;
        }
    }
}

module.exports = new AuthService();