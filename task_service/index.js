const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const amqplib = require('amqplib')

const app = express()
const port = 3002

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))

// ✅ MongoDB connection
mongoose
  .connect('mongodb://mongodb:27017/task_service', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err))

// ✅ Task Schema
const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    userID: { type: String, required: true }
  },
  { timestamps: true }
)

// ✅ Task Model
const Task = mongoose.model('Task', taskSchema)

// ✅ RabbitMQ connection
let connection, channel

async function connectRabbitMQWithRetry(retries = 5, delay = 3000) {
  while (retries > 0) {
    try {
      // Use simple connection without credentials
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
      connection = await amqplib.connect(rabbitmqUrl)
      channel = await connection.createChannel()
      await channel.assertQueue('tasks_created', { durable: true })
      console.log('✅ Connected to RabbitMQ')
      return
    } catch (error) {
      console.error(`❌ RabbitMQ connection failed (${retries} retries left):`, error.message)
      retries--
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  console.error('❌ Could not connect to RabbitMQ after multiple attempts.')
}

// ✅ Get all tasks
app.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.find({})
    res.json(tasks)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ✅ Create a new task
app.post('/tasks', async (req, res) => {
  try {
    const { title, description, userID } = req.body

    if (!title || !description || !userID) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    const newTask = await Task.create({ title, description, userID })

    const message = {
      taskID: newTask._id,
      userID: newTask.userID,
      title: newTask.title
    }

    if (!channel) {
      console.warn('⚠️ RabbitMQ channel not ready. Message not sent.')
    } else {
      await channel.sendToQueue('tasks_created', Buffer.from(JSON.stringify(message)), {
        persistent: true
      })
      console.log('📩 Task message sent to RabbitMQ')
    }

    res.status(201).json(newTask)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// ✅ Health check endpoint
app.get('/health', (req, res) => {
  const status = {
    service: 'Task Service',
    status: 'OK',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    rabbitmq: channel ? 'Connected' : 'Disconnected'
  }
  res.json(status)
})

// ✅ Start server
app.listen(port, () => {
  console.log(`🚀 Task service running on port ${port}`)
  connectRabbitMQWithRetry()
})

// ✅ Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...')
  if (channel) await channel.close()
  if (connection) await connection.close()
  process.exit(0)
})