// sendOtpExample.js - Example of sending OTP

const { sendOTP } = require('./otpService');

/**
 * Example function to demonstrate OTP sending
 */
async function sendOTPExample() {
    try {
        // Replace with the actual mobile number you want to send OTP to
        const mobileNumber = '9876543210'; // Example mobile number

        console.log('===== OTP SENDING EXAMPLE =====');
        console.log(`Attempting to send OTP to ${mobileNumber}...`);

        // Call the sendOTP function
        const result = await sendOTP(mobileNumber);

        if (result.success) {
            console.log(`Success! OTP: ${result.otp} sent to ${mobileNumber}`);
            console.log('Server response:', result.response);
        } else {
            console.error('Failed to send OTP:', result.message);
        }
    } catch (error) {
        console.error('Error in OTP example:', error.message);
    }
}

// Run the example if this file is executed directly
if (require.main === module) {
    console.log('Running OTP sending example...');
    sendOTPExample();
}

module.exports = { sendOTPExample };