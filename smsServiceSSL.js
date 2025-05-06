// Import the axios library
const axios = require('axios');
// Import HttpsAgent for custom SSL/TLS options
const https = require('https');
// Import URLSearchParams for formatting form data
const { URLSearchParams } = require('url');
// const fs = require('fs'); // Uncomment if you need to load CA certificates from files

// --- Static Configuration ---
// WARNING: Replace these placeholder values with your actual static data.
// It's generally recommended to manage sensitive data like URLs or credentials
// through environment variables or configuration files rather than hardcoding,
// especially for production applications.
const STATIC_MOBILE_NO = '7984085918'; // Replace with your static mobile number
const STATIC_OTP = '654321';           // Replace with your static OTP
const STATIC_API_URL = 'https://amritsarovar.gov.in/EmailSmsServer/api/sendotp'; // Replace with your static URL

// Proxy Configuration (adjust as needed or set to null/undefined if no proxy)
const PROXY_CONFIG = {
    protocol: 'http',
    host: '10.194.81.45', // Replace with your proxy host or remove if not needed
    port: 8080,           // Replace with your proxy port
    // auth: { // If your proxy requires authentication
    //     username: 'proxyuser',
    //     password: 'proxypassword'
    // }
};
// To disable proxy, you can set PROXY_CONFIG to null or an empty object,
// and then conditionally add it to axiosConfig.
// For simplicity here, it's always included if defined.

/**
 * Makes an API call with static mobile_no, otp, URL, and proper SSL/TLS verification.
 *
 * @returns {Promise<string>} A promise that resolves with the response body as a string,
 * or rejects with an error.
 */
async function callAPIWithStaticDataAndProperSSL() {
    // 1. Prepare the static data
    const params = new URLSearchParams();
    params.append('mobile_no', STATIC_MOBILE_NO);
    params.append('otp', STATIC_OTP);

    // 2. Configure SSL/TLS Agent
    const agent = new https.Agent({
        // rejectUnauthorized: true, // Default, ensures SSL certificates are validated.
        minVersion: 'TLSv1.2',
        // ca: [fs.readFileSync('path/to/your/ca-cert.pem')] // Example for custom CA
    });

    const axiosConfig = {
        method: 'POST',
        url: STATIC_API_URL,
        data: {
            mobile_no: STATIC_MOBILE_NO,
            otp: STATIC_OTP,
        }, // URLSearchParams object will be sent as application/x-www-form-urlencoded
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        httpsAgent: agent,
        // Only include proxy if PROXY_CONFIG is set and has a host
        ...(PROXY_CONFIG && PROXY_CONFIG.host ? { proxy: PROXY_CONFIG } : {}),
        maxRedirects: 0,
        responseType: 'text',
    };

    try {
        console.log(`Attempting POST request to static URL: ${STATIC_API_URL}`);
        console.log(`With static data (form-urlencoded): ${params.toString()}`);
        if (axiosConfig.proxy && axiosConfig.proxy.host) {
            console.log(`Using proxy: ${axiosConfig.proxy.host}:${axiosConfig.proxy.port}`);
        } else {
            console.log("Not using a proxy.");
        }
        console.log("SSL/TLS certificate validation is ENABLED.");

        const response = await axios(axiosConfig);

        if (response.status === 200) {
            return response.data;
        } else {
            console.error(`Request failed with status code: ${response.status}`);
            return ""; // Or throw an error: throw new Error(`Request failed with status ${response.status}`);
        }
    } catch (error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error(`Error Status: ${error.response.status}`);
            console.error(`Error Data: ${typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data)}`);
        } else if (error.request) {
            // The request was made but no response was received
            console.error(`Error Request: No response received or SSL/TLS handshake issue. ${error.message}`);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error(`Error Message: ${error.message}`);
        }
        if (error.code) {
            console.error(`Error Code: ${error.code}`); // e.g., ENOTFOUND, ECONNREFUSED, UNABLE_TO_VERIFY_LEAF_SIGNATURE
        }
        console.error(`Full error details: ${error.stack}`);
        return ""; // Or re-throw: throw error;
    }
}

// --- Example Usage ---
async function main() {
    console.log("--- Node.js Static API Call Example (Proper SSL) ---");
    try {
        // Call the function without any arguments as data is static
        const result = await callAPIWithStaticDataAndProperSSL();

        if (result) {
            console.log("\nAPI Response:");
            // If the response is JSON, you might want to parse it
            try {
                const jsonResponse = JSON.parse(result);
                console.log(jsonResponse);
            } catch (parseError) {
                console.log("Response is not JSON, printing as text:");
                console.log(result);
            }
        } else {
            console.log("\nAPI call failed, returned empty response, or an error occurred.");
        }
    } catch (e) {
        // This catch block will only be hit if callAPIWithStaticDataAndProperSSL re-throws an error
        console.error("\nUnhandled error in main:", e.message);
    }
    console.log("--- End of Example ---");
}

// To run the example:
// main();

// Export for use in other modules if needed
module.exports = { callAPIWithStaticDataAndProperSSL };
