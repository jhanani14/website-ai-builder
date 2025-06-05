require("dotenv").config();
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/generate", async (req, res) => {
  const prompt = req.body.prompt;
  const siteId = `site-${uuidv4().split("-")[0]}`;
  const projectDir = path.join(__dirname, siteId);

  try {
    // Step 1: Ask OpenRouter AI to generate website code
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a web designer that builds complete HTML websites using a given theme/title. Output must be a complete index.html with styling and responsive layout."
          },
          {
            role: "user",
            content: `Build a responsive HTML/CSS website for: ${prompt}`
          }
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        }
      }
    );

    const html = response.data.choices[0].message.content;

    // Step 2: Save the generated site files
    fs.mkdirSync(projectDir);
    fs.writeFileSync(`${projectDir}/index.html`, html);

    // Step 3: Create a Firebase config file
    fs.writeFileSync(
      `${projectDir}/firebase.json`,
      JSON.stringify({
        hosting: {
          public: ".",
          ignore: ["firebase.json", "**/.*", "**/node_modules/**"]
        }
      })
    );

    // Step 4: Deploy the site to Firebase
    exec(
      `firebase deploy --project ${process.env.FIREBASE_PROJECT_ID} --only hosting --config firebase.json --cwd ${projectDir}`,
      (err, stdout) => {
        if (err) {
          console.error(err);
          return res.status(500).send({ error: "Deployment failed" });
        }

        // Step 5: Extract the live site URL from Firebase output
        const match = stdout.match(/https:\/\/[^\s]+\.web\.app/);
        const liveUrl = match ? match[0] : null;

        res.send({ url: liveUrl });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Generation or deployment failed" });
  }
});

// Start the server
app.listen(3000, () => console.log("Server running at http://localhost:3000"));
