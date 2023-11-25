// backend/app.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const path = require('path');

const app = express();

app.use(cors());
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/img2txt', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('./models/User');
const Image = require('./models/Image'); // Import the Image model

// Multer configuration for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

// Tesseract OCR configuration
const tesseractConfig = require('./tesseractConfig');

// Define a POST route for file uploads
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const { path } = req.file;
    const text = await tesseract.recognize(path, tesseractConfig);

    // Save image details to the database
    const originalFilename = req.file.originalname; // Use the original filename
    const extractedText = text;
    const newImage = new Image({ filename: originalFilename, extractedText });
    await newImage.save();

    res.json({ text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred during text extraction.' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (user && (await user.comparePassword(password))) {
      res.json({ success: true, message: 'Login successful!' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An error occurred during login.' });
  }
});

app.post('/signup', async (req, res) => {
  const { username, password, phoneNumber } = req.body;

  try {
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      res.status(400).json({ success: false, message: 'Username is already taken.' });
    } else {
      const newUser = new User({ username, password, phoneNumber });
      await newUser.save();
      res.json({ success: true, message: 'Signup successful!' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An error occurred during signup.' });
  }
});

app.post('/forgot-password', async (req, res) => {
  const { username, phoneNumber, newPassword } = req.body;

  try {
    // Validate the username and phoneNumber
    if (!username || !phoneNumber) {
      res.status(400).json({ success: false, message: 'Please provide both username and phone number.' });
      return;
    }

    // Find the user based on the provided username and phoneNumber
    const user = await User.findOne({ username, phoneNumber });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    // Update the user's password
    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An error occurred during password update.' });
  }
});


// To something like this:
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

