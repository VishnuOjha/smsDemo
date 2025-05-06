// smsService.js - Service for sending SMS messages through government API

const https = require('https');
const crypto = require('crypto');
const axios = require('axios');

/**
 * Sends an OTP SMS message through the government SMS gateway
 * @param {string} mobileNumber - The recipient mobile number
 * @param {string} otp - The OTP to be sent
 * @param {Object} options - Additional options for SMS sending
 * @returns {Promise} - Promise resolving to the API response
 */
const sendSmsOtp = async (mobileNumber, otp, options = {}) => {
    try {
        // Default values
        const defaults = {
            username: "NCoGSMS",
            password: "NcOg!10#20$",
            senderId: "NCOGIT",
            secureKey: "0008031b-89f6-41d7-a771-c64a077e3e70",
            templateId: "1307165847021622765",
            apiUrl: "https://msdgweb.mgov.gov.in/esms/sendsmsrequestDLT",
            proxyHost: "10.194.81.45",
            proxyPort: 8080,
            messagePrefix: "Your OTP is",
            messageSuffix: "- Digital India Corporation"
        };

        // Merge default options with provided options
        const config = { ...defaults, ...options };

        // Format the OTP message
        const message = `${config.messagePrefix} ${otp} ${config.messageSuffix}`;

        console.log("Setting proxy:", `${config.proxyHost}:${config.proxyPort}`);
        console.log("Sending OTP message to:", mobileNumber);
        console.log("Message content:", message);

        // Step 1: Encrypt password (SHA-1)
        const encryptedPassword = crypto
            .createHash("sha1")
            .update(config.password, "iso-8859-1")
            .digest("hex");

        console.log("Encrypted password (SHA-1):", encryptedPassword);

        // Step 2: Generate hash key (SHA-512)
        const inputString = `${config.username.trim()}${config.senderId.trim()}${message.trim()}${config.secureKey.trim()}`;
        const generatedHashKey = crypto
            .createHash("sha512")
            .update(inputString)
            .digest("hex");

        console.log("Generated hash key (SHA-512):", generatedHashKey);

        // Step 3: Prepare request parameters
        const params = {
            mobileno: mobileNumber,
            senderid: config.senderId,
            content: message,
            smsservicetype: "otpmsg",
            username: config.username,
            password: encryptedPassword,
            key: generatedHashKey,
            templateid: config.templateId,
        };

        // Build query string
        const queryString = new URLSearchParams(params).toString();
        console.log("Query string:", queryString);

        // Custom HTTPS agent for TLS version and certificate validation
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false,
            maxVersion: "TLSv1.2",
            minVersion: "TLSv1.2",
        });

        // Configure the request properly based on Axios documentation
        const axiosConfig = {
            method: "post",
            url: config.apiUrl,
            data: queryString,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(queryString),
            },
            httpsAgent: httpsAgent,
            // Correctly configure proxy according to Axios docs
            proxy: {
                protocol: "http",
                host: config.proxyHost,
                port: config.proxyPort,
            },
            maxRedirects: 0,
            validateStatus: null,
        };

        console.log("Making API request to:", config.apiUrl);
        const response = await axios(axiosConfig);

        console.log("Response status:", response.status);

        if (response.status === 200) {
            console.log("Response data:", response.data);
            return {
                success: true,
                data: response.data,
                message: "SMS sent successfully"
            };
        } else {
            console.log("Non-success status code:", response.status);
            return {
                success: false,
                statusCode: response.status,
                message: "API returned non-success status code"
            };
        }
    } catch (error) {
        console.log("API call error:", error.message);

        if (error.response) {
            console.log("Error status:", error.response.status);
            console.log("Error data:", error.response.data);
        }

        return {
            success: false,
            error: "API call failed",
            message: error.message
        };
    }
};

/**
 * Generate a random OTP of specified length
 * @param {number} length - Length of the OTP (default: 4)
 * @returns {string} - Generated OTP
 */
const generateOTP = (length = 4) => {
    const digits = '0123456789';
    let OTP = '';

    for (let i = 0; i < length; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }

    return OTP;
};

module.exports = {
    sendSmsOtp,
    generateOTP
};