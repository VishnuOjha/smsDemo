// otpService.js - Service for handling OTP operations

const { postData } = require("./apiService");

/**
 * Generates a timestamp for logging
 * @returns {string} - Formatted timestamp
 */
const getTimestamp = () => {
  const now = new Date();
  return now.toISOString();
};

/**
 * Format log message with timestamp and optional category
 * @param {string} message - Log message
 * @param {string} category - Log category
 * @returns {string} - Formatted log message
 */
const formatLog = (message, category = "INFO") => {
  return `[${getTimestamp()}] [${category}] ${message}`;
};

/**
 * Console log with different levels and consistent formatting
 */
const log = {
  info: (message, data = null) => {
    console.log(formatLog(message, "INFO"), data ? data : "");
  },
  debug: (message, data = null) => {
    console.log(formatLog(message, "DEBUG"), data ? data : "");
  },
  error: (message, error = null) => {
    console.error(formatLog(message, "ERROR"), error ? error : "");
    if (error && error.stack) {
      console.error(formatLog(`Stack trace: ${error.stack}`, "ERROR"));
    }
  },
  warn: (message, data = null) => {
    console.warn(formatLog(message, "WARN"), data ? data : "");
  },
  trace: (message, ...params) => {
    console.log(formatLog(message, "TRACE"), ...params);
  },
};

/**
 * Mask sensitive data for logging
 * @param {string} text - Text to mask
 * @param {number} visibleStart - Number of characters visible at start
 * @param {number} visibleEnd - Number of characters visible at end
 * @returns {string} - Masked text
 */
const maskSensitive = (text, visibleStart = 2, visibleEnd = 2) => {
  if (
    !text ||
    typeof text !== "string" ||
    text.length <= visibleStart + visibleEnd
  ) {
    return text;
  }

  const start = text.substring(0, visibleStart);
  const end = text.substring(text.length - visibleEnd);
  const masked = "*".repeat(text.length - visibleStart - visibleEnd);

  return `${start}${masked}${end}`;
};

/**
 * Generates a random OTP of specified length
 * @param {number} length - Length of the OTP (default: 6)
 * @returns {string} - Generated OTP
 */
const generateOTP = (length = 6) => {
  log.debug(`Generating OTP of length ${length}`);

  const digits = "0123456789";
  let OTP = "";

  for (let i = 0; i < length; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }

  log.debug(`OTP generation complete`, { length });
  return OTP;
};

/**
 * Generates a unique request ID
 * @returns {string} - Unique request ID
 */
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
};

/**
 * Sends OTP to the specified mobile number
 * @param {string} mobileNumber - Mobile number to send OTP to
 * @param {string} otp - OTP to be sent (if not provided, generates a random one)
 * @param {Object} options - Additional options for the request
 * @returns {Promise} - Promise resolving to the API response
 */
const sendOTP = async (mobileNumber, otp = null, options = {}) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  log.info(`[${requestId}] OTP process started`, {
    requestId,
    mobileMasked: maskSensitive(mobileNumber, 4, 2),
  });

  try {
    // Validate mobile number
    log.debug(`[${requestId}] Validating mobile number`);
    if (!mobileNumber || mobileNumber.length < 10) {
      log.error(`[${requestId}] Invalid mobile number provided`, {
        mobileLength: mobileNumber ? mobileNumber.length : 0,
      });
      throw new Error("Invalid mobile number");
    }

    // Generate OTP if not provided
    log.debug(
      `[${requestId}] ${otp ? "Using provided OTP" : "Generating new OTP"}`
    );
    const otpToSend = otp || generateOTP();

    log.info(
      `[${requestId}] Sending OTP to mobile: ${maskSensitive(
        mobileNumber,
        4,
        2
      )}`,
      { otpMasked: maskSensitive(otpToSend, 1, 1) }
    );

    // Default options
    log.debug(`[${requestId}] Setting up default options`);
    const defaultOptions = {
      proxyHost: process.env.PROXY_HOST || "10.194.81.45", // Default proxy host
      proxyPort: parseInt(process.env.PROXY_PORT || "8080"), // Default proxy port
      timeout: parseInt(process.env.API_TIMEOUT || "30000"), // Default 30s timeout
      headers: {
        "Content-Type": "application/json",
      },
    };

    // Merge default options with user-provided options
    const finalOptions = { ...defaultOptions, ...options };
    log.debug(`[${requestId}] Options configured`, {
      timeout: finalOptions.timeout,
      headers: Object.keys(finalOptions.headers),
    });

    // Prepare request data
    const requestData = {
      mobile_no: mobileNumber,
      otp: otpToSend,
    };

    log.info(
      `[${requestId}] Using proxy: ${finalOptions.proxyHost}:${finalOptions.proxyPort}`
    );

    // Configure proxy for the API call
    const apiOptions = {
      timeout: finalOptions.timeout,
      headers: finalOptions.headers,
      proxy: {
        host: finalOptions.proxyHost,
        port: finalOptions.proxyPort,
        protocol: "http",
      },
      requestId: requestId,
    };

    // Additional logging for proxy configuration
    log.debug(`[${requestId}] Proxy configuration complete`, {
      host: apiOptions.proxy.host,
      port: apiOptions.proxy.port,
      timeout: apiOptions.timeout,
    });

    // Log before API call
    log.info(`[${requestId}] Initiating API call to send OTP`, {
      endpoint: "https://amritsarovar.gov.in/EmailSmsServer/api/sendotp",
      mobileDigits: mobileNumber.length,
      otpLength: otpToSend.length,
    });

    const apiCallStartTime = Date.now();
    // Send OTP request to the server
    const response = await postData(
      "https://amritsarovar.gov.in/EmailSmsServer/api/sendotp",
      requestData,
      apiOptions
    );
    const apiCallDuration = Date.now() - apiCallStartTime;

    // Log API call duration
    log.info(`[${requestId}] API call completed in ${apiCallDuration}ms`);

    // Detailed response logging
    if (response && response.status) {
      log.info(`[${requestId}] OTP send response status: ${response.status}`);
    }

    if (response && response.data) {
      log.debug(`[${requestId}] OTP send response data received`, {
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
      });
    }

    // Log any errors
    if (response && !response.success) {
      log.warn(`[${requestId}] API call returned non-success status`, {
        status: response.status,
        message: response.message || "No message provided",
      });
    }

    const totalDuration = Date.now() - startTime;
    log.info(`[${requestId}] OTP process completed in ${totalDuration}ms`, {
      success: response && response.success ? true : false,
      apiCallDuration,
    });

    return {
      success: true,
      message: "OTP sent successfully",
      otp: otpToSend, // Return the OTP for verification purposes (in real app, store securely)
      response: response,
      requestId: requestId,
      durationMs: totalDuration,
    };
  } catch (error) {
    const errorDuration = Date.now() - startTime;

    log.error(
      `[${requestId}] Error sending OTP after ${errorDuration}ms:`,
      error
    );
    log.error(`[${requestId}] Error details:`, {
      message: error.message,
      name: error.name,
      code: error.code || "UNKNOWN",
    });

    if (error.response) {
      log.error(`[${requestId}] API error response:`, {
        status: error.response.status,
        data: error.response.data,
      });
    }

    return {
      success: false,
      message: `Failed to send OTP: ${error.message}`,
      requestId: requestId,
      error: {
        message: error.message,
        code: error.code,
        name: error.name,
      },
      durationMs: errorDuration,
    };
  }
};

/**
 * Verifies an OTP against what's expected
 * @param {string} providedOTP - The OTP provided by the user
 * @param {string} expectedOTP - The expected OTP (from storage/cache)
 * @param {Object} options - Additional options for verification
 * @returns {boolean} - Whether the OTP is valid
 */
const verifyOTP = (providedOTP, expectedOTP, options = {}) => {
  const verifyId = generateRequestId();
  log.info(`[${verifyId}] OTP verification started`, {
    providedOTPLength: providedOTP ? providedOTP.length : 0,
    expectedOTPLength: expectedOTP ? expectedOTP.length : 0,
    options: Object.keys(options),
  });

  // Case sensitivity option (default: case sensitive)
  const caseSensitive = options.caseSensitive !== false;

  let isValid;
  if (caseSensitive) {
    isValid = providedOTP === expectedOTP;
    log.debug(`[${verifyId}] Performing case-sensitive verification`);
  } else {
    isValid =
      String(providedOTP).toLowerCase() === String(expectedOTP).toLowerCase();
    log.debug(`[${verifyId}] Performing case-insensitive verification`);
  }

  if (isValid) {
    log.info(`[${verifyId}] OTP verification successful`);
  } else {
    log.warn(`[${verifyId}] OTP verification failed`, {
      providedLength: providedOTP ? providedOTP.length : 0,
      expectedLength: expectedOTP ? expectedOTP.length : 0,
      match: isValid,
    });

    // Detailed logging for mismatches
    if (
      providedOTP &&
      expectedOTP &&
      providedOTP.length === expectedOTP.length
    ) {
      log.debug(`[${verifyId}] OTP length matched but content different`);
    } else if (!providedOTP || !expectedOTP) {
      log.debug(`[${verifyId}] One of the OTPs is empty or null`);
    } else {
      log.debug(
        `[${verifyId}] OTP length mismatch: ${providedOTP.length} vs ${expectedOTP.length}`
      );
    }
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
  const retryId = generateRequestId();
  const startTime = Date.now();

  log.info(`[${retryId}] Starting OTP retry process`, {
    mobileMasked: maskSensitive(mobileNumber, 4, 2),
    maxRetries,
  });

  let lastError = null;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    const attemptStartTime = Date.now();

    log.info(`[${retryId}] OTP send attempt ${attempt}/${maxRetries}`);

    try {
      // Calculate backoff time: 2^attempt * 1000ms + random(0-500)ms
      const backoffTime =
        attempt > 1 ? Math.pow(2, attempt - 1) * 1000 + Math.random() * 500 : 0;

      if (backoffTime > 0) {
        log.debug(
          `[${retryId}] Backing off for ${Math.round(
            backoffTime
          )}ms before retry attempt ${attempt}`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
      }

      // Add retry information to the request
      const retryOptions = {
        ...options,
        headers: {
          ...(options.headers || {}),
          "X-Retry-Attempt": attempt,
          "X-Retry-Max": maxRetries,
          "X-Retry-ID": retryId,
        },
      };

      log.debug(`[${retryId}] Calling sendOTP for attempt ${attempt}`, {
        backoffMs: Math.round(backoffTime),
        elapsedMs: Date.now() - startTime,
      });

      const result = await sendOTP(mobileNumber, null, retryOptions);
      const attemptDuration = Date.now() - attemptStartTime;

      if (result.success) {
        log.info(
          `[${retryId}] OTP send succeeded on attempt ${attempt} in ${attemptDuration}ms`
        );

        const totalDuration = Date.now() - startTime;
        log.info(
          `[${retryId}] Total retry process completed successfully in ${totalDuration}ms`,
          {
            attempts: attempt,
            maxRetries,
          }
        );

        return {
          ...result,
          attempt,
          attempts: attempt,
          retryId,
          totalDurationMs: totalDuration,
        };
      }

      log.warn(
        `[${retryId}] Attempt ${attempt} failed after ${attemptDuration}ms: ${result.message}`
      );
      lastError = new Error(result.message);
    } catch (error) {
      const attemptDuration = Date.now() - attemptStartTime;
      log.error(
        `[${retryId}] Attempt ${attempt} encountered exception after ${attemptDuration}ms:`,
        error
      );
      lastError = error;
    }
  }

  const totalDuration = Date.now() - startTime;
  log.error(
    `[${retryId}] All ${maxRetries} attempts to send OTP failed after ${totalDuration}ms`,
    {
      mobileMasked: maskSensitive(mobileNumber, 4, 2),
      lastError: lastError ? lastError.message : "Unknown error",
    }
  );

  // Throw detailed error with retry information
  const enhancedError = new Error(
    `Failed to send OTP after ${maxRetries} attempts: ${
      lastError ? lastError.message : "Unknown error"
    }`
  );
  enhancedError.retryId = retryId;
  enhancedError.attempts = maxRetries;
  enhancedError.totalDurationMs = totalDuration;
  enhancedError.originalError = lastError;

  throw enhancedError;
};

// Export functions
module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP,
  retrySendOTP,
  // Expose logging utilities for external use
  log,
  maskSensitive,
  generateRequestId,
};
