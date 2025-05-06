// otpService.js - Service for handling OTP operations

const { postData } = require('./apiService');

/**
 * Generates a random OTP of specified length
 * @param {number} length - Length of the OTP (default: 6)
 * @returns {string} - Generated OTP
 */
const generateOTP = (length = 6) => {
    const digits = '0123456789';
    let OTP = '';

    for (let i = 0; i < length; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }

    return OTP;
};

/**
 * Sends OTP to the specified mobile number
 * @param {string} mobileNumber - Mobile number to send OTP to
 * @param {string} otp - OTP to be sent (if not provided, generates a random one)
 * @param {Object} options - Additional options for the request
 * @returns {Promise} - Promise resolving to the API response
 */
const sendOTP = async (mobileNumber, otp = null, options = {}) => {
    try {
        // Validate mobile number
        if (!mobileNumber || mobileNumber.length < 10) {
            throw new Error('Invalid mobile number');
        }

        // Generate OTP if not provided
        const otpToSend = otp || generateOTP();

        console.log(`Sending OTP: ${otpToSend} to mobile: ${mobileNumber}`);

        // Default options
        const defaultOptions = {
            proxyHost: "10.194.81.45",  // Default proxy host
            proxyPort: 8080,            // Default proxy port
            timeout: 5000,              // 5 second timeout
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "OTPService/1.0",
            }
        };

        // Merge default options with user-provided options
        const finalOptions = { ...defaultOptions, ...options };

        // Prepare request data
        const requestData = {
            mobile_no: mobileNumber,
            otp: otpToSend
        };

        console.log(`Using proxy: ${finalOptions.proxyHost}:${finalOptions.proxyPort}`);

        // Configure proxy for the API call
        const apiOptions = {
            timeout: finalOptions.timeout,
            headers: finalOptions.headers,
            proxy: {
                host: finalOptions.proxyHost,
                port: finalOptions.proxyPort,
                protocol: 'http'
            }
        };

        // Send OTP request to the server
        const response = await postData(
            'https://amritsarovar.gov.in/EmailSmsServer/api/sendotp',
            requestData,
            apiOptions
        );

        console.log('OTP send response:', response);
        return {
            success: true,
            message: 'OTP sent successfully',
            otp: otpToSend, // Return the OTP for verification purposes (in real app, store securely)
            response: response
        };
    } catch (error) {
        console.error('Error sending OTP:', error.message);
        return {
            success: false,
            message: `Failed to send OTP: ${error.message}`
        };
    }
};

/**
 * Verifies an OTP against what's expected
 * @param {string} providedOTP - The OTP provided by the user
 * @param {string} expectedOTP - The expected OTP (from storage/cache)
 * @returns {boolean} - Whether the OTP is valid
 */
const verifyOTP = (providedOTP, expectedOTP) => {
    return providedOTP === expectedOTP;
};

// Export functions
module.exports = {
    generateOTP,
    sendOTP,
    verifyOTP
};