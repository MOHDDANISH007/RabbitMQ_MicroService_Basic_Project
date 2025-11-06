const amqplib = require('amqplib');

let connection, channel;

async function start() {
  try {
    // Use simple connection without credentials
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
    connection = await amqplib.connect(rabbitmqUrl);
    channel = await connection.createChannel();

    // ✅ Ensure queue exists
    await channel.assertQueue('tasks_created', { durable: true });

    console.log('✅ Connected to RabbitMQ');
    console.log('📩 Notification Service is listening for messages...');

    // ✅ Set prefetch to 1 to handle one message at a time
    channel.prefetch(1);

    // ✅ Start consuming messages
    channel.consume('tasks_created', async (msg) => {
      if (msg) {
        try {
          const { taskID, userID, title } = JSON.parse(msg.content.toString());
          console.log(`📨 Received new task:`);
          console.log(`   Task ID: ${taskID}`);
          console.log(`   User ID: ${userID}`);
          console.log(`   Title: ${title}`);
          
          // Simulate some processing time
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          console.log(`✅ Processed notification for task: ${title}`);
          
          // ✅ Acknowledge message after successful processing
          channel.ack(msg);
        } catch (err) {
          console.error('⚠️ Error processing message:', err.message);
          // Reject message (without requeue to avoid infinite loop)
          channel.nack(msg, false, false);
        }
      }
    });

    // Handle connection errors
    connection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err.message);
    });

    connection.on('close', () => {
      console.warn('🔌 RabbitMQ connection closed. Attempting to reconnect...');
      setTimeout(start, 5000);
    });

  } catch (error) {
    console.error('❌ RabbitMQ connection failed:', error.message);

    // 🔁 Retry connection every 5 seconds if RabbitMQ is not ready
    setTimeout(start, 5000);
  }
}

// Add health check endpoint if needed
const express = require('express');
const healthApp = express();
const port = 3003;

healthApp.get('/health', (req, res) => {
  const status = {
    service: 'Notification Service',
    status: 'OK',
    rabbitmq: channel ? 'Connected' : 'Disconnected'
  };
  res.json(status);
});

healthApp.listen(port, () => {
  console.log(`🔔 Notification service health check running on port ${port}`);
  start(); // Start RabbitMQ connection
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down notification service gracefully...');
  if (channel) await channel.close();
  if (connection) await connection.close();
  process.exit(0);
});