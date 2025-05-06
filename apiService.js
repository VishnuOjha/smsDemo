// apiService.js - Service for making API calls

const axios = require("axios");
const https = require("https");
const logger = require("./logger");

/**
 * Creates a configured HTTP agent with the given proxy settings
 * @param {Object} proxyConfig - Proxy configuration
 * @returns {https.Agent} - Configured HTTPS agent
 */
const createProxyAgent = (proxyConfig) => {
  if (!proxyConfig || !proxyConfig.host || !proxyConfig.port) {
    return new https.Agent({
      keepAlive: true,
      rejectUnauthorized: true,
    });
  }

  const {
    host,
    port,
    protocol = "http",
    rejectUnauthorized = true,
  } = proxyConfig;

  // Use HttpsProxyAgent for HTTPS proxy support
  const { HttpsProxyAgent } = require("https-proxy-agent");

  return new HttpsProxyAgent({
    host,
    port,
    protocol,
    rejectUnauthorized,
  });
};

/**
 * Makes a POST request to the specified URL
 * @param {string} url - URL to make the request to
 * @param {Object} data - Data to send in the request body
 * @param {Object} options - Additional options for the request
 * @returns {Promise} - Promise resolving to the API response
 */
const postData = async (url, data, options = {}) => {
  try {
    const requestId =
      options.requestId ||
      `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const reqLogger = logger.child({ requestId, url, method: "POST" });

    reqLogger.debug("Preparing API request");

    // Configure axios options
    const axiosOptions = {
      method: "POST",
      url,
      data,
      headers: options.headers || { "Content-Type": "application/json" },
      timeout: options.timeout || 30000,
      validateStatus: null, // Don't throw on any status code
    };

    // Add proxy agent if proxy config is provided
    if (options.proxy) {
      reqLogger.debug("Configuring proxy agent", {
        host: options.proxy.host,
        port: options.proxy.port,
      });

      const httpsAgent = createProxyAgent(options.proxy);
      axiosOptions.httpsAgent = httpsAgent;
    }

    // Add request tracking headers
    axiosOptions.headers["X-Request-ID"] = requestId;

    // Log the request (with sensitive data masked)
    reqLogger.info(`Making ${axiosOptions.method} request to ${url}`);

    // Calculate timeout with jitter
    const jitter = Math.floor(Math.random() * 500);
    axiosOptions.timeout = axiosOptions.timeout + jitter;

    reqLogger.debug("Request details", {
      timeout: axiosOptions.timeout,
      headers: Object.keys(axiosOptions.headers),
    });

    // Execute the request with timing
    const startTime = Date.now();
    const response = await axios(axiosOptions);
    const requestDuration = Date.now() - startTime;

    // Log the response
    reqLogger.info(
      `Received response with status ${response.status} in ${requestDuration}ms`
    );

    // Add timing headers to the response for debugging
    response.headers["x-response-time"] = requestDuration;

    // Enhanced response object
    return {
      status: response.status,
      success: response.status >= 200 && response.status < 300,
      data: response.data,
      headers: response.headers,
      requestId,
      durationMs: requestDuration,
      error: response.status >= 400 ? response.statusText : null,
    };
  } catch (error) {
    // Handle request errors
    logger.error("API request failed", {
      url,
      error: error.message,
      code: error.code,
      timeout: options.timeout,
      isAxiosError: error.isAxiosError,
    });

    // Return a structured error response
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.message,
      code: error.code,
      data: error.response?.data,
      isTimeout: error.code === "ECONNABORTED",
    };
  }
};

/**
 * Makes a GET request to the specified URL
 * @param {string} url - URL to make the request to
 * @param {Object} options - Additional options for the request
 * @returns {Promise} - Promise resolving to the API response
 */
const getData = async (url, options = {}) => {
  // Similar implementation to postData but for GET requests
  options.method = "GET";
  return postData(url, null, options);
};

module.exports = {
  postData,
  getData,
};
