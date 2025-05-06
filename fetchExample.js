// fetchExamples.js - Examples of fetching data from various APIs

const { fetchData } = require('./apiService');

/**
 * Example function to fetch users from JSONPlaceholder API
 */
const fetchUsers = async () => {
    try {
        const users = await fetchData('https://jsonplaceholder.typicode.com/users');
        console.log('\n=== USERS DATA ===');
        users.forEach(user => {
            console.log(`ID: ${user.id} | Name: ${user.name} | Email: ${user.email}`);
        });
        return users;
    } catch (error) {
        console.error('Failed to fetch users:', error.message);
    }
};

/**
 * Example function to fetch posts from JSONPlaceholder API
 */
const fetchPosts = async () => {
    try {
        const posts = await fetchData('https://jsonplaceholder.typicode.com/posts', {
            params: { _limit: 5 } // Only fetch 5 posts
        });
        console.log('\n=== POSTS DATA ===');
        posts.forEach(post => {
            console.log(`ID: ${post.id} | Title: ${post.title.substring(0, 30)}...`);
        });
        return posts;
    } catch (error) {
        console.error('Failed to fetch posts:', error.message);
    }
};

/**
 * Example function to fetch weather data
 * Note: You would need to use a real API key for OpenWeatherMap
 */
const fetchWeather = async (city = 'London') => {
    // Replace 'YOUR_API_KEY' with your actual OpenWeatherMap API key
    const API_KEY = 'YOUR_API_KEY';
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`;

        // For demo purposes, just log what we would do
        console.log(`\n=== WEATHER DATA (Demo) ===`);
        console.log(`Would fetch weather for: ${city}`);
        console.log(`Using URL: ${url}`);
        console.log('Note: You need a real API key to make this request work');

        // If you have a real API key, uncomment this code:
        /*
        const weather = await fetchData(url);
        console.log(`\n=== WEATHER DATA FOR ${city.toUpperCase()} ===`);
        console.log(`Temperature: ${weather.main.temp}°C`);
        console.log(`Conditions: ${weather.weather[0].description}`);
        console.log(`Humidity: ${weather.main.humidity}%`);
        return weather;
        */
    } catch (error) {
        console.error(`Failed to fetch weather for ${city}:`, error.message);
    }
};

// Function to run all examples
const runAllExamples = async () => {
    await fetchUsers();
    await fetchPosts();
    await fetchWeather();
    console.log('\nAll examples completed!');
};

// Export individual functions and the combined runner
module.exports = {
    fetchUsers,
    fetchPosts,
    fetchWeather,
    runAllExamples
};

// Run examples directly if this file is executed (not imported)
if (require.main === module) {
    console.log('Running API fetch examples...');
    runAllExamples();
}