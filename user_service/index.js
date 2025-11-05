const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')

const app = express()
const port = 3001

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))

mongoose
  .connect('mongodb://mongodb:27017/user_service')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log(err))

// user Schema

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
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

// model

const User = mongoose.model('User', userSchema)

app.get('/users', async (req, res) => {
  try {
    const users = await User.find({})
    res.send(users)
  } catch (e) {
    res.status(500).send(e)
  }
})

app.post('/users', async (req, res) => {
  try {
    const { name, email, password } = req.body
    // check user exist or not

    const user = await User.findOne({ email })
    if (user) {
      return res.status(400).send({ error: 'User already exist' })
    }
    // create user
    const newUser = await User.create({ name, email, password })
    res.status(201).send(newUser)
  } catch (e) {
    res.status(400).send(e)
  }
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
