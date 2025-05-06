// Import required modules
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const { getData, fetchData } = require("./apiService");
const { sendOTP } = require("./otpService");
const { sendSmsOtp, generateOTP } = require("./smsService");
const { callAPIWithStaticDataAndProperSSL } = require("./smsServiceSSL");
const axios = require("axios");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 9000;

// Middleware setup
app.use(morgan("dev")); // HTTP request logger
app.use(bodyParser.json()); // Parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.static(path.join(__dirname, "public"))); // Serve static files

// Default route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the API" });
});

// Sample API route
app.get("/api/data", (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" },
      { id: 3, name: "Item 3" },
    ],
  });
});

// Route that fetches external API data and returns it
app.get("/api/users", async (req, res) => {
  try {
    const users = await fetchData("https://api.restful-api.dev/objects");
    // Log data to console
    console.log("Users fetched successfully:");
    console.log(users.map((user) => ({ id: user.id, name: user.name })));

    // Return data to client
    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Error in /api/users route:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

// Route to send OTP to a mobile number
app.get("/api/send-otp", async (req, res) => {
  try {
    // const { mobileNumber } = req.body;
    const mobileNumber = "7984085918";
    if (!mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    console.log(`Received request to send OTP to: ${mobileNumber}`);

    const result = await sendOTP(mobileNumber);
    console.log("OTP send result:", result);

    if (result.success) {
      res.json({
        success: true,
        message: "OTP sent successfully",
        // In a production app, don't send the OTP back to the client
        // This is only for demonstration purposes
        otp: result.otp,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("Error in /api/send-otp route:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
});

app.get("/api/send-govt-sms", async (req, res) => {
  try {
    // const { mobileNumber } = req.body;
    const mobileNumber = "7984085918";

    if (!mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    console.log(
      `Received request to send Government SMS OTP to: ${mobileNumber}`
    );

    // Generate a 4-digit OTP
    const otp = generateOTP(4);

    // Send the OTP using the Government SMS Gateway
    const result = await sendSmsOtp(mobileNumber, otp);
    console.log("Government SMS OTP send result:", result);

    if (result.success) {
      res.json({
        success: true,
        message: "OTP sent successfully via Government SMS Gateway",
        otp: otp, // In production, don't return the OTP to the client
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || "Failed to send OTP",
      });
    }
  } catch (error) {
    console.error("Error in /api/send-govt-sms route:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to send Government SMS OTP",
    });
  }
});

app.get("/api/send-sms-ssl", callAPIWithStaticDataAndProperSSL);

async function testProxy() {
  try {
    const response = await axios.get(
      "https://amritsarovar.gov.in/EmailSmsServer/api/sendotp",
      {
        proxy: {
          host: "10.194.81.45",
          port: 8080,
          protocol: "http",
        },
        timeout: 20000,
      }
    );
    console.log("Proxy is working:", response.data);
  } catch (error) {
    console.error("Proxy test failed:", error.message);
  }
}

testProxy();

async function testDirectConnection() {
  try {
    const response = await axios.get(
      "https://amritsarovar.gov.in/EmailSmsServer/api/sendotp",
      {
        timeout: 5000,
      }
    );
    console.log("Direct connection working:", response.data);
  } catch (error) {
    console.error("Direct connection failed:", error.message);
  }
}
testDirectConnection();

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
  });
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app; // Export for testing purposes
