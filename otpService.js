// otpService.js - Service for handling OTP operations

const { postData } = require("./apiService");
const logger = require("./logger"); // Assuming you have a logger module

/**
 * Generates a random OTP of specified length
 * @param {number} length - Length of the OTP (default: 6)
 * @returns {string} - Generated OTP
 */
const generateOTP = (length = 6) => {
  const digits = "0123456789";
  let OTP = "";

  for (let i = 0; i < length; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }

  logger.debug(`Generated OTP of length ${length}`);
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
    logger.info(
      `Starting OTP send process for mobile: ${mobileNumber.substring(
        0,
        4
      )}****${mobileNumber.slice(-2)}`
    );

    // Validate mobile number
    if (!mobileNumber || mobileNumber.length < 10) {
      logger.error("Invalid mobile number provided");
      throw new Error("Invalid mobile number");
    }

    // Generate OTP if not provided
    const otpToSend = otp || generateOTP();

    // For security, don't log complete OTP in production
    logger.info(
      `Sending OTP to mobile: ${mobileNumber.substring(
        0,
        4
      )}****${mobileNumber.slice(-2)}`
    );

    // Only log full OTP in development environment
    if (process.env.NODE_ENV === "development") {
      logger.debug(`Development mode - OTP value: ${otpToSend}`);
    }

    // Default options
    const defaultOptions = {
      proxyHost: process.env.PROXY_HOST || "10.194.81.45", // Default proxy host
      proxyPort: parseInt(process.env.PROXY_PORT || "8080"), // Default proxy port
      timeout: 30000, // 30 seconds timeout
      headers: {
        "Content-Type": "application/json",
      },
    };

    // Merge default options with user-provided options
    const finalOptions = { ...defaultOptions, ...options };

    // Prepare request data
    const requestData = {
      mobile_no: mobileNumber,
      otp: otpToSend,
    };

    logger.info(
      `Using proxy: ${finalOptions.proxyHost}:${finalOptions.proxyPort}`
    );

    // Configure proxy for the API call with trust settings
    const apiOptions = {
      timeout: finalOptions.timeout,
      headers: finalOptions.headers,
      proxy: {
        host: finalOptions.proxyHost,
        port: finalOptions.proxyPort,
        protocol: "http",
        // Add proxy trust settings
        rejectUnauthorized: finalOptions.rejectUnauthorized !== false, // Default to true unless explicitly set to false
        secure: finalOptions.secureProxy !== false, // Default to true unless explicitly set to false
      },
      // Add agent keep-alive settings
      agent: {
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 10,
        maxFreeSockets: 5,
      },
    };

    logger.debug("Sending OTP request with options:", {
      url: "https://amritsarovar.gov.in/EmailSmsServer/api/sendotp",
      requestData: {
        mobile_no: `${mobileNumber.substring(0, 4)}****${mobileNumber.slice(
          -2
        )}`,
      },
      timeout: apiOptions.timeout,
      proxySettings: {
        host: apiOptions.proxy.host,
        port: apiOptions.proxy.port,
        rejectUnauthorized: apiOptions.proxy.rejectUnauthorized,
      },
    });

    // Timer for request duration tracking
    const startTime = Date.now();

    // Send OTP request to the server
    const response = await postData(
      "https://amritsarovar.gov.in/EmailSmsServer/api/sendotp",
      requestData,
      apiOptions
    );

    const requestDuration = Date.now() - startTime;
    logger.info(
      `OTP send completed in ${requestDuration}ms with status: ${
        response.status || "unknown"
      }`
    );

    if (response.success) {
      logger.debug("OTP send response details:", {
        status: response.status,
        requestId: response.requestId || "unknown",
      });
    } else {
      logger.warn("OTP send failed with response:", {
        status: response.status,
        error: response.error || "unknown error",
      });
    }

    return {
      success: true,
      message: "OTP sent successfully",
      otp: otpToSend, // Return the OTP for verification purposes (in real app, store securely)
      response: response,
      durationMs: requestDuration,
    };
  } catch (error) {
    logger.error("Error sending OTP:", {
      error: error.message,
      stack: error.stack,
      mobileNumber: mobileNumber
        ? `${mobileNumber.substring(0, 4)}****${mobileNumber.slice(-2)}`
        : "invalid",
    });

    return {
      success: false,
      message: `Failed to send OTP: ${error.message}`,
      error: error.message,
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
  logger.debug("Verifying OTP");
  const isValid = providedOTP === expectedOTP;

  if (isValid) {
    logger.info("OTP verification successful");
  } else {
    logger.warn("OTP verification failed");
  }

  return isValid;
};

/**
 * Retries sending OTP with exponential backoff
 * @param {string} mobileNumber - Mobile number to send OTP to
 * @param {Object} options - Additional options for the request
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise} - Promise resolving to the API response
 */
const retrySendOTP = async (mobileNumber, options = {}, maxRetries = 3) => {
  let lastError = null;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      logger.info(`OTP send attempt ${attempt}/${maxRetries}`);

      // Calculate backoff time: 2^attempt * 1000ms + random(0-500)ms
      const backoffTime =
        attempt > 1 ? Math.pow(2, attempt - 1) * 1000 + Math.random() * 500 : 0;

      if (backoffTime > 0) {
        logger.debug(`Backing off for ${backoffTime}ms before retry`);
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
      }

      const result = await sendOTP(mobileNumber, null, options);
      if (result.success) {
        return result;
      }

      lastError = new Error(result.message);
    } catch (error) {
      logger.error(`Attempt ${attempt} failed:`, error);
      lastError = error;
    }
  }

  logger.error(`All ${maxRetries} attempts to send OTP failed`);
  throw lastError || new Error("Failed to send OTP after multiple attempts");
};

// Export functions
module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP,
  retrySendOTP,
};
