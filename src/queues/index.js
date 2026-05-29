const { Queue } = require('bullmq');
const { Worker } = require('bullmq');

const connection = {
  url: process.env.REDIS_URL,
};

const classificationQueue = new Queue('classification', { connection });

module.exports = { classificationQueue, connection };