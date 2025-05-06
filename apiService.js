// apiService.js - Helper functions for making API calls

const axios = require('axios');


const fetchData = async (url, options = {}) => {
    try {
        console.log(`Fetching data from: ${url}`);
        const response = await axios.get(url, options);
        console.log('Data fetched successfully!');
        return response.data;
    } catch (error) {
        console.error('Error fetching data:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
};


const postData = async (url, data, options = {}) => {
    try {
        console.log(`Posting data to: ${url}`);
        const response = await axios.post(url, data, options);
        console.log('Data posted successfully!');
        console.log('Response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error posting data:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
};

module.exports = {
    fetchData,
    postData
};