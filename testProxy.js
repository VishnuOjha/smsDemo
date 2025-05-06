const axios = require('axios');

async function testProxy() {
    try {
        const response = await axios.get('https://httpbin.org/ip', {
            proxy: {
                host: '10.194.81.45',
                port: 8080,
                protocol: 'http'
            },
            timeout: 5000
        });
        console.log('Proxy is working:', response.data);
    } catch (error) {
        console.error('Proxy test failed:', error.message);
    }
}

testProxy();