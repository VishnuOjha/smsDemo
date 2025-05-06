// otpService.js - Service for handling OTP operations

const { postData } = require("./apiService");
const logger = require("./logger");

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
    // Create request-specific logger with unique request ID
    const requestId = `otp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const reqLogger = logger.requestLogger(requestId);
    
    // Mask mobile number for logging
    const maskedMobile = logger.maskSensitiveData(mobileNumber, { showFirst: 4, showLast: 2 });
    reqLogger.info(`Starting OTP send process for mobile: ${maskedMobile}`);
    
    // Validate mobile number
    if (!mobileNumber || mobileNumber.length < 10) {
      reqLogger.error("Invalid mobile number provided");
      throw new Error("Invalid mobile number");
    }

    // Generate OTP if not provided
    const otpToSend = otp || generateOTP();

    // For security, don't log complete OTP in production
    reqLogger.info(`Sending OTP to mobile: ${maskedMobile}`);
    
    // Only log full OTP in development environment
    if (process.env.NODE_ENV === 'development') {
      reqLogger.debug(`Development mode - OTP value: ${otpToSend}`);
    } else {
      reqLogger.debug(`Production mode - OTP value: ${logger.maskSensitiveData(otpToSend, { showFirst: 0, showLast: 0 })}`);
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

    reqLogger.info(`Using proxy: ${finalOptions.proxyHost}:${finalOptions.proxyPort}`);

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
        secure: finalOptions.secureProxy !== false // Default to true unless explicitly set to false
      },
      // Add agent keep-alive settings
      agent: {
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 10,
        maxFreeSockets: 5
      }
    };

    reqLogger.debug('Sending OTP request with options:', {
      url: "https://amritsarovar.gov.in/EmailSmsServer/api/sendotp",
      requestData: { mobile_no: maskedMobile },
      timeout: apiOptions.timeout,
      proxySettings: {
        host: apiOptions.proxy.host,
        port: apiOptions.proxy.port,
        rejectUnauthorized: apiOptions.proxy.rejectUnauthorized
      }
    });
    
    // Log API call
    logger.apiCall(
      "https://amritsarovar.gov.in/EmailSmsServer/api/sendotp", 
      "POST", 
      { requestId }
    );

    // Use logger.measure for timing and logging
    const { response, duration: requestDuration } = await logger.measure(
      'OTP API Request',
      async () => {
        const startTime = Date.now();
        const response = await postData(
          "https://amritsarovar.gov.in/EmailSmsServer/api/sendotp",
          requestData,
          apiOptions
        );
        return { 
          response,
          duration: Date.now() - startTime
        };
      }
    );

    reqLogger.info(`OTP send completed in ${requestDuration}ms with status: ${response.status || 'unknown'}`);
    
    if (response.success) {
      reqLogger.debug('OTP send response details:', {
        status: response.status,
        requestId: response.requestId || 'unknown'
      });
      
      // Log successful HTTP response
      logger.httpResponse(
        { 
          statusCode: response.status || 200,
          getHeader: () => undefined
        }, 
        requestDuration
      );
    } else {
      reqLogger.warn('OTP send failed with response:', {
        status: response.status,
        error: response.error || 'unknown error'
      });
      
      // Log failed HTTP response
      logger.httpResponse(
        { 
          statusCode: response.status || 500,
          getHeader: () => undefined
        }, 
        requestDuration
      );
    }

    return {
      success: true,
      message: "OTP sent successfully",
      otp: otpToSend, // Return the OTP for verification purposes (in real app, store securely)
      response: response,
      durationMs: requestDuration
    };
  } catch (error) {
    const maskedMobile = mobileNumber ? 
      logger.maskSensitiveData(mobileNumber, { showFirst: 4, showLast: 2 }) :
      'invalid';
    
    logger.error("Error sending OTP:", {
      error: error.message,
      stack: error.stack,
      mobileNumber: maskedMobile,
      requestId: requestId || 'unknown'
    });
    
    return {
      success: false,
      message: `Failed to send OTP: ${error.message}`,
      error: error.message
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
  logger.debug('Verifying OTP');
  const isValid = providedOTP === expectedOTP;
  
  if (isValid) {
    logger.info('OTP verification successful');
  } else {
    logger.warn('OTP verification failed');
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
  // Create a retry-specific logger with unique retry ID
  const retryId = `retry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const retryLogger = logger.child({ retryId, operation: 'retrySendOTP' });
  
  // Mask mobile number for logging
  const maskedMobile = logger.maskSensitiveData(mobileNumber, { showFirst: 4, showLast: 2 });
  
  let lastError = null;
  let attempt = 0;
  
  retryLogger.info(`Starting OTP retry process for ${maskedMobile} with max ${maxRetries} attempts`);
  
  while (attempt < maxRetries) {
    attempt++;
    try {
      retryLogger.info(`OTP send attempt ${attempt}/${maxRetries}`);
      
      // Calculate backoff time: 2^attempt * 1000ms + random(0-500)ms
      const backoffTime = attempt > 1 ? (Math.pow(2, attempt - 1) * 1000) + Math.random() * 500 : 0;
      
      if (backoffTime > 0) {
        retryLogger.debug(`Backing off for ${Math.round(backoffTime)}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
      
      // Add retry information to options
      const retryOptions = {
        ...options,
        headers: {
          ...(options.headers || {}),
          'X-Retry-Attempt': attempt,
          'X-Retry-ID': retryId
        }
      };
      
      const result = await sendOTP(mobileNumber, null, retryOptions);
      
      if (result.success) {
        retryLogger.info(`OTP send succeeded on attempt ${attempt}`);
        return {
          ...result,
          attempt,
          retryId
        };
      }
      
      retryLogger.warn(`Attempt ${attempt} returned failure response: ${result.message}`);
      lastError = new Error(result.message);
    } catch (error) {
      retryLogger.error(`Attempt ${attempt} failed with error:`, {
        error: error.message,
        stack: error.stack
      });
      lastError = error;
    }
  }
  
  retryLogger.error(`All ${maxRetries} attempts to send OTP failed`, {
    mobileNumber: maskedMobile,
    lastError: lastError ? lastError.message : 'Unknown error'
  });
  
  throw lastError || new Error('Failed to send OTP after multiple attempts');
};

// Export functions
module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP,
  retrySendOTP
};