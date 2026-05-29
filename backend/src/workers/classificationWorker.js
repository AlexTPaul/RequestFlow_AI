const { Worker } = require('bullmq');
const { connection } = require('../queues');
const { classifyRequest } = require('../services/ai/mockProvider');
const pool = require('../db');

// We'll get io from a shared module
let io;
const setIO = (socketIO) => { io = socketIO; };

const worker = new Worker('classification', async (job) => {
  const { requestId } = job.data;

  try {
    const reqResult = await pool.query(
      'SELECT message FROM customer_requests WHERE id = $1',
      [requestId]
    );
    if (!reqResult.rows[0]) throw new Error('Request not found');

    await pool.query(
      'UPDATE customer_requests SET status = $1, updated_at = now() WHERE id = $2',
      ['processing', requestId]
    );

    // Emit processing status to dashboard
    if (io) io.emit('request:updated', { 
      requestId, 
      status: 'processing' 
    });

    const aiResult = await classifyRequest(reqResult.rows[0].message);

    await pool.query(
      `INSERT INTO ai_classifications 
        (request_id, provider, category, priority, summary, confidence, reason, raw_output, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [requestId, 'mock', aiResult.category, aiResult.priority,
       aiResult.summary, aiResult.confidence, aiResult.reason,
       JSON.stringify(aiResult), 'completed']
    );

    await pool.query(
      `UPDATE customer_requests 
       SET status = 'open', category_snapshot = $1, priority_snapshot = $2, updated_at = now()
       WHERE id = $3`,
      [aiResult.category, aiResult.priority, requestId]
    );

    await pool.query(
      `INSERT INTO request_events (request_id, event_type, old_value, new_value, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [requestId, 'classified', 'queued', 'open',
       JSON.stringify({ category: aiResult.category, priority: aiResult.priority })]
    );

    // Emit classification complete to dashboard
    if (io) io.emit('request:classified', {
      requestId,
      status: 'open',
      category: aiResult.category,
      priority: aiResult.priority,
      summary: aiResult.summary,
      confidence: aiResult.confidence
    });

    console.log(`Classified ${requestId}: ${aiResult.category} / ${aiResult.priority}`);
    return aiResult;

  } catch (error) {
    await pool.query(
      `INSERT INTO ai_classifications (request_id, provider, error_message, status)
       VALUES ($1, $2, $3, $4)`,
      [requestId, 'mock', error.message, 'failed']
    );

    await pool.query(
      `UPDATE customer_requests SET status = 'open', updated_at = now() WHERE id = $1`,
      [requestId]
    );

    // Emit failure to dashboard
    if (io) io.emit('request:failed', { requestId, error: error.message });

    throw error;
  }
}, { connection });

worker.on('completed', job => console.log(`Job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`Job ${job.id} failed:`, err.message));

module.exports = { worker, setIO };