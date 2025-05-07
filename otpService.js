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

        // Create a promise that will be resolved with the API response or rejected on timeout
        const apiPromise = new Promise((resolve, reject) => {
            // Determine if we should use http or https module
            const urlObj = new URL('https://amritsarovar.gov.in/EmailSmsServer/api/sendotp');
            const isHttps = urlObj.protocol === 'https:';
            const http = isHttps ? require('https') : require('http');

            const requestOptions = {
                hostname: finalOptions.proxyHost,
                port: finalOptions.proxyPort,
                path: urlObj.href, // Use the full URL in the path when using a proxy
                method: 'POST',
                headers: {
                    ...finalOptions.headers,
                    // Additional headers for proxy communication
                    'Host': urlObj.host
                }
            };

            const req = http.request(requestOptions, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const responseData = JSON.parse(data);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(responseData);
                        } else {
                            reject(new Error(`HTTP error! Status: ${res.statusCode}`));
                        }
                    } catch (error) {
                        reject(new Error(`Error parsing response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            // Write request body
            req.write(JSON.stringify(requestData));
            req.end();
        });

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Request timed out after ${finalOptions.timeout}ms`));
            }, finalOptions.timeout);
        });

        // Race the API call against the timeout
        const responseData = await Promise.race([apiPromise, timeoutPromise]);
        console.log('OTP send response:', responseData);

        return {
            success: true,
            message: 'OTP sent successfully',
            otp: otpToSend, // Return the OTP for verification purposes (in real app, store securely)
            response: responseData
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