

"use strict";
const axios = require("axios");
const URL = process.env.BASE_URL; 
const defaultHomeEntity = process.env.DEFAULT_HOME_ENTITY;

class OBDXService {
   
    populateHeaders(loginService, userSession) {
        const token = loginService.getToken();
        const cookie = loginService.getCookie();
    
        if (!token || !cookie) {
            throw new Error("Missing token or cookie for API call.");
        }
    
        const headers = {
            Authorization: `Bearer ${token}`,
            Cookie: cookie,
            "Content-Type": "application/json",
            "X-Token-Type": "JWT",
            "X-Target-Unit": defaultHomeEntity,
        };
    
        // Add X-CHALLENGE_RESPONSE header if OTP is present
        if (userSession?.authOTP) {
            headers["X-CHALLENGE_RESPONSE"] = JSON.stringify({
                otp: userSession.authOTP,
                referenceNo: userSession.XTOKENREFNO,
                authType: userSession.AUTH_TYPE,
            });
        }
    
        return headers;
    }
    
    async invokeService(ctxPath, method, queryParam = {}, body = null, loginService, userSession) {
        const headers = this.populateHeaders(loginService,userSession);
        const responseData = await this.serviceMeth(ctxPath, method, headers, queryParam, body,userSession);
        return responseData;}

    async serviceMeth(ctxPath, method, headers, queryParam, body,userSession) {

        const url = `${URL}${ctxPath}?${new URLSearchParams(queryParam).toString()}`;
         console.log("url is", url);
       console.log("headers is:",headers);
              console.log("data is", body);
        try {

           console.log( axios({
                url,
                method,
                headers,
                data: body,
            }));
            const response = await axios({
                url,
                method,
                headers,
                data: body,
            });

           console.log("response in service meth is:", response);
           
           if ([200, 201, 202].includes(response.status)) {
                return response.data;
            }
        } catch (error) {
            const statusCode = error.response?.status;
            const headers = error.response?.headers || {};
            const data = error.response?.data || {};

            if (statusCode === 417) {
                const challenge = headers["x-challenge"] ? JSON.parse(headers["x-challenge"]) : {};
                const authType = challenge.authType || "UNKNOWN";
                const refNo = challenge.referenceNo || null;

                userSession.IS_OTP_REQUIRED = true;
                userSession.AUTH_TYPE = authType;
                userSession.XTOKENREFNO = refNo;
                userSession.state = states.ACCOUNT_SELECTION;

                if (authType === "OTP") {
                    return "Please enter the One Time Password (OTP) sent to your registered number.";
                } else if (authType === "TOTP") {
                    return "Please enter your Time-based One Time Password (TOTP).";
                } else {
                    return `Please enter the HOPT code: ${challenge.randomNumber}`;
                }
            } else if (statusCode === 412) {
                userSession.IS_OTP_REQUIRED = false;
                throw new Error("Maximum OTP attempts exceeded. Please try again later.");
            } else if ([400, 403, 500].includes(statusCode)) {
                const errorMessage = data?.message?.validationError?.[0]?.errorMessage || 
                                     data?.message?.detail || 
                                     "Unknown error.";
                throw new Error(`Network Error: ${errorMessage}`);
            } else {
                throw new Error(`Unexpected error occurred: ${statusCode || "Unknown status"}`);
            }
        }        
    }

}

module.exports = new OBDXService();
