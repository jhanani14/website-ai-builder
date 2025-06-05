const axios = require("axios");

async function testBackend() {
  try {
    const response = await axios.post("http://localhost:5000/make-site", {
      idea: "test website from helper script",
    });
    console.log("Response from backend:", response.data);
  } catch (error) {
    if (error.response) {
      console.log("Error response:", error.response.data);
    } else {
      console.log("Error:", error.message);
    }
  }
}

testBackend();
