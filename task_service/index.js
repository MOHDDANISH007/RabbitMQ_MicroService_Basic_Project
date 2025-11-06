const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')

const app = express()
const port = 3002

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))

// MongoDB connection
mongoose
  .connect('mongodb://mongodb:27017/task_service')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log(err))

// Task Schema
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    userID: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
)

// Task Model
const Task = mongoose.model('Task', taskSchema)

// Get all tasks
app.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.find({})
    res.send(tasks)
  } catch (e) {
    res.status(500).send(e)
  }
})

// Create a new task
app.post('/tasks', async (req, res) => {
  try {
    const { title, description, userID } = req.body

    // Create a new task
    const newTask = await Task.create({ title, description, userID })
    res.status(201).send(newTask)
  } catch (e) {
    res.status(400).send(e)
  }
})

// Start server
app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
    