// apiService.js - Helper functions for making API calls

const axios = require("axios");
const https = require("https");

/**
 * Creates an Axios instance with custom configuration
 * @param {Object} options - Configuration options for the Axios instance
 * @returns {Object} - Configured Axios instance
 */
const createAxiosInstance = (options = {}) => {
  // Default options
  const defaultOptions = {
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
    },
    // By default, disable certificate validation in development
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
  };

  // Merge with user options
  const finalOptions = { ...defaultOptions, ...options };

  // Create instance with merged options
  return axios.create(finalOptions);
};

/**
 * Fetches data from an external API
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Additional axios request options
 * @returns {Promise} - Promise resolving to the API response data
 */
const fetchData = async (url, options = {}) => {
  try {
    console.log(`Fetching data from: ${url}`);

    // Handle proxy configuration if provided
    const axiosOptions = { ...options };
    const axiosInstance = createAxiosInstance(axiosOptions);

    // Make the request
    const response = await axiosInstance.get(url);

    console.log("Data fetched successfully!");
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
};

/**
 * Posts data to an external API
 * @param {string} url - The API endpoint URL
 * @param {Object} data - The data to post
 * @param {Object} options - Additional axios request options
 * @returns {Promise} - Promise resolving to the API response data
 */
const postData = async (url, data, options = {}) => {
  try {
    console.log(`Posting data to: ${url}`);
    console.log("Request data:", JSON.stringify(data, null, 2));

    // Handle proxy configuration if provided
    const axiosOptions = { ...options };
    const axiosInstance = createAxiosInstance(axiosOptions);

    // Make the request
    const response = await axiosInstance.post(url, data);

    console.log("Data posted successfully!");
    return response.data;
  } catch (error) {
    console.error("Error posting data:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
};

module.exports = {
  fetchData,
  postData,
  createAxiosInstance,
};
