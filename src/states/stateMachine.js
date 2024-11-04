const axios = require("axios");
const config = require("../config/config");
const dns = require('dns');  // Ensure this is at the top
require('dotenv').config();

const states = {
    INITIAL: 'INITIAL',
    OTP_VERIFICATION: 'OTP_VERIFICATION',
    LOGGED_IN: 'LOGGED_IN',
    // Other states...
};

class StateMachine {
    constructor() {
        this.state = states.INITIAL;
        this.mobileNumber = '';
        this.interactionId = '';
        this.token = '';
        this.registrationId = ''; // Store registrationId
    }

    async handleMessage(from, messageBody, intent) {
        if (this.state === states.OTP_VERIFICATION) {
            return await this.verifyOTP(messageBody); // Call verifyOTP if in OTP_VERIFICATION state
        }

        const responseMessage = await this.transition(intent, from);
        await this.sendResponse(from, responseMessage);
    }

    async transition(intent, from) {
        switch (this.state) {
            case states.INITIAL:
                return this.handleInitialState(intent, from);
            // Handle other states...
            default:
                return "I'm not sure how to help with that.";
        }
    }

    async handleInitialState(intent, from) {
        if (['BALANCE', 'RECENT_TRANSACTIONS', 'BILL_PAYMENT', 'MONEY_TRANSFER'].includes(intent)) {
            this.mobileNumber = '916378582419'; // Use the sender's number directly
            this.state = states.OTP_VERIFICATION; // Transition to OTP verification state
            return "An OTP has been sent to your mobile number. Please enter the OTP to verify.";
        }
        return "I can help you with balance, transactions, bill payments, and money transfers. Please enter your request.";
    }
    async verifyOTP(otp) {
        try {
        dns.lookup('rnoex-148-87-23-5.a.free.pinggy.link', (err, address) => {
            if (err) {
                console.error('DNS lookup failed:', err);
            } else {
                console.log('Resolved address:', address);
            }
        });
            console.log("First API call to get an anonymous token")
            const tokenResponse = await axios.post('https://rnoex-148-87-23-5.a.free.pinggy.link/digx-infra/login/v1/anonymousToken', {}, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-authentication-type': 'JWT'                }
            });

            if (tokenResponse.data.status.result === "SUCCESSFUL") {
                console.log("First API call to get an anonymous token is success")
                this.interactionId = tokenResponse.data.interactionId;
                this.token = tokenResponse.data.token;
                // Second API call to verify the OTP
                console.log('otp', otp);
                console.log('mobileno', this.mobileNumber); 
                console.log('token',this.token);
                console.log('tokenResponse',tokenResponse);
                console.log('interactionId', tokenResponse.data.interactionId)
                const otpResponse = await axios.post('https://rnoex-148-87-23-5.a.free.pinggy.link/digx-infra/login/v1/login?locale=en', {
                    mobileNumber: this.mobileNumber
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-authentication-type': 'CHATBOT',
                        'TOKEN_ID': otp,
                        'Authorization': `Bearer ${this.token}`,
                        'X-Token-Type': 'JWT',
                        'X-Target-Unit': 'OBDX_BU',
                        'Cookie': 'secretKey=i0gWjmcjtQlaXniQ7yA3sObMhIY1Z3Ap'
                    }
                });

                if (otpResponse.data.status.result === "SUCCESSFUL") {
                                console.log("Second login call");
                                console.log("otpResponse",otpResponse);
                                console.log("registrationId",otpResponse.data.registrationId);


                    this.registrationId = otpResponse.data.registrationId; // Store registrationId
                    
                    // Final API call to login with registrationId
                    const finalLoginResponse = await axios.post('https://rnoex-148-87-23-5.a.free.pinggy.link/digx-infra/login/v1/login?locale=en', {
                        mobileNumber: this.mobileNumber,
                        registrationId: this.registrationId // Use the registrationId here
                    }, {
                        headers: {
                            'Content-Type': 'application/json',
                            'x-authentication-type': 'CHATBOT',
                            'TOKEN_ID': otp,
                            'Authorization': `Bearer ${this.token}`,
                            'X-Token-Type': 'JWT',
                            'X-Target-Unit': 'OBDX_BU',
                            'Cookie': 'secretKey=i0gWjmcjtQlaXniQ7yA3sObMhIY1Z3Ap'
                        }
                    });
                    console.log("finalLoginResponse:", finalLoginResponse);
                    console.log(finalLoginResponse.data.status.result);
                    if (finalLoginResponse.data.status.result === "SUCCESSFUL") {
                        this.state = states.LOGGED_IN; // Transition to logged-in state
                        console.log("login now success");
                        return "You have successfully verified your OTP and logged in. You can now access your account.";
                    } else {
                        console.error("Final login failed:", finalLoginResponse.data); // Log the failure response
                        return "Final login failed. Please try again.";
                    }
                } else {
                    console.error("OTP verification failed:", otpResponse.data); // Log the OTP failure response
                    return "OTP verification failed. Please try again.";
                }
            } else {
                console.error("Failed to initiate login:", tokenResponse.data); // Log the token initiation failure
                return "Failed to initiate login. Please try again.";
            }
        } catch (error) {
            console.error("Error during login process:", error.message, error.stack); // Enhanced logging
            return "An error occurred during verification. Please try again.";
        }
    }

    async sendResponse(to, message) {
        const responseMessage = {
            messaging_product: "whatsapp",
            to: to,
            text: {
                body: message
            }
        };
        const url = `https://graph.facebook.com/v17.0/${config.phoneNumberId}/messages?access_token=${config.whatsappToken}`;
        try {
            const result = await axios.post(url, responseMessage);
            console.log("Response sent successfully:", result.data);
        } catch (error) {
            console.error("Error sending response:", error.response ? error.response.data : error.message);
        }
    }

    // Additional methods for other states...
}

module.exports = StateMachine;
