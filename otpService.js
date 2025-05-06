// otpService.js - Service for handling OTP operations

const { postData } = require('./apiService');


const generateOTP = (length = 6) => {
    const digits = '0123456789';
    let OTP = '';

    for (let i = 0; i < length; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }

    return OTP;
};


const sendOTP = async (mobileNumber, otp = null) => {
    try {
        // Validate mobile number
        if (!mobileNumber || mobileNumber.length < 10) {
            throw new Error('Invalid mobile number');
        }

        // Generate OTP if not provided
        const otpToSend = otp || generateOTP();

        console.log(`Sending OTP: ${otpToSend} to mobile: ${mobileNumber}`);

        // Prepare request data
        const requestData = {
            mobile_no: mobileNumber,
            otp: otpToSend
        };

        // Send OTP request to the server
        const response = await postData(
            'https://amritsarovar.gov.in/EmailSmsServer/api/sendotp',
            requestData,
            {
                timeout: 5000, // 5 second timeout
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "OTPService/1.0",
                },
            }
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

// Export functions
module.exports = {
    generateOTP,
    sendOTP
};