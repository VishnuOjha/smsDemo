const https = require("https");
const crypto = require("crypto");
const axios = require("axios");


const sendOTPSmsnew = async () => {
    try {
        const message = "Your OTP is 1234 - Digital India Corporation";
        const mobileNumber = "9924832781";
        const username = "NCoGSMS";
        const password = "NcOg!10#20$";
        const senderId = "NCOGIT";
        const secureKey = "0008031b-89f6-41d7-a771-c64a077e3e70";
        const templateId = "1307165847021622765";
        const apiUrl = "https://msdgweb.mgov.gov.in/esms/sendsmsrequestDLT";

        // Proxy configuration
        const proxyHost = "10.194.81.45";
        const proxyPort = 8080;

        console.log("Setting proxy:", `${proxyHost}:${proxyPort}`);
        console.log("Sending OTP message to:", mobileNumber);
        console.log("Message content:", message);

        // Step 1: Encrypt password (SHA-1)
        const encryptedPassword = crypto
            .createHash("sha1")
            .update(password, "iso-8859-1")
            .digest("hex");

        console.log("Encrypted password (SHA-1):", encryptedPassword);

        // Step 2: Generate hash key (SHA-512)
        const inputString = `${username.trim()}${senderId.trim()}${message.trim()}${secureKey.trim()}`;
        const generatedHashKey = crypto
            .createHash("sha512")
            .update(inputString)
            .digest("hex");

        console.log("Generated hash key (SHA-512):", generatedHashKey);

        // Step 3: Prepare request parameters
        const params = {
            mobileno: mobileNumber,
            senderid: senderId,
            content: message,
            smsservicetype: "otpmsg",
            username: username,
            password: encryptedPassword,
            key: generatedHashKey,
            templateid: templateId,
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
            url: apiUrl,
            data: queryString,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(queryString),
            },
            httpsAgent: httpsAgent,
            // Correctly configure proxy according to Axios docs
            // proxy: {
            //     protocol: "http",
            //     host: proxyHost,
            //     port: proxyPort,
            // },
            maxRedirects: 0,
            validateStatus: null,
        };

        try {
            console.log("Making API request to:", apiUrl);
            const response = await axios(axiosConfig);

            console.log("Response status:", response.status);

            if (response.status === 200) {
                console.log("Response data:", response.data);
                return res.json({
                    status: "success",
                    data: response.data,
                });
            } else {
                console.log("Non-success status code:", response.status);
                return res.status(response.status).json({
                    status: "error",
                    message: "API returned non-success status code",
                    statusCode: response.status,
                });
            }
        } catch (error) {
            console.log("API call error:", error.message);

            if (error.response) {
                console.log("Error status:", error.response.status);
                console.log("Error data:", error.response.data);
            }

            return res.status(500).json({
                status: "error",
                error: "API call failed",
                message: error.message,
            });
        }
    } catch (error) {
        console.error("Error processing request:", error);
        return res.status(500).json({
            status: "error",
            error: "Failed to process request",
            message: error.message,
        });
    }
};

/**
 * Generate a random OTP of specified length
 * @param {number} length - Length of OTP (default: 6)
 * @returns {string} - Generated OTP
 */
const generateOTP = (length = 6) => {
    // Generate a random OTP of specified length
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
};

module.exports = {
    sendOTPSmsnew,
    generateOTP
};