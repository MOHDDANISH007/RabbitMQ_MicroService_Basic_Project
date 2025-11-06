const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')

const app = express()
const port = 3001

// Middleware
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))

// MongoDB connection
mongoose
  .connect('mongodb://mongodb:27017/user_service')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err))

// User Schema
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true, // prevent duplicate emails
      lowercase: true
    },
    password: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
)

// Model
const User = mongoose.model('User', userSchema)

// Get all users
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({})
    res.status(200).json(users)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create a new user
app.post('/users', async (req, res) => {
  try {
    const { name, email, password } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    // Create new user
    const newUser = new User({ name, email, password })
    await newUser.save()

    res.status(201).json(newUser)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Start server
app.listen(port, () => {
  console.log(`🚀 App listening on port ${port}`)
})
