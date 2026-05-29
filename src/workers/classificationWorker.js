const { Worker } = require('bullmq');
const { connection } = require('../queues');
const { classifyRequest } = require('../services/ai/mockProvider');
const pool = require('../db');

const worker = new Worker('classification', async (job) => {
  const { requestId } = job.data;
  console.log(`Processing classification for request: ${requestId}`);

  try {
    // 1. Get the original message
    const reqResult = await pool.query(
      'SELECT message FROM customer_requests WHERE id = $1',
      [requestId]
    );

    if (!reqResult.rows[0]) throw new Error('Request not found');
    const { message } = reqResult.rows[0];

    // 2. Update request status to 'processing'
    await pool.query(
      'UPDATE customer_requests SET status = $1, updated_at = now() WHERE id = $2',
      ['processing', requestId]
    );

    // 3. Run AI classification
    const aiResult = await classifyRequest(message);

    // 4. Store AI output separately
    await pool.query(
      `INSERT INTO ai_classifications 
        (request_id, provider, category, priority, summary, confidence, reason, raw_output, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        requestId,
        'mock',
        aiResult.category,
        aiResult.priority,
        aiResult.summary,
        aiResult.confidence,
        aiResult.reason,
        JSON.stringify(aiResult),
        'completed'
      ]
    );

    // 5. Update request with AI results snapshot + status open
    await pool.query(
      `UPDATE customer_requests 
       SET status = 'open', category_snapshot = $1, priority_snapshot = $2, updated_at = now()
       WHERE id = $3`,
      [aiResult.category, aiResult.priority, requestId]
    );

    // 6. Log event
    await pool.query(
      `INSERT INTO request_events (request_id, event_type, old_value, new_value, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        requestId,
        'classified',
        'queued',
        'open',
        JSON.stringify({ category: aiResult.category, priority: aiResult.priority })
      ]
    );

    console.log(`Classification complete for ${requestId}: ${aiResult.category} / ${aiResult.priority}`);
    return aiResult;

  } catch (error) {
    console.error(`Classification failed for ${requestId}:`, error.message);

    // Store failure state — request creation is NOT broken
    await pool.query(
      `INSERT INTO ai_classifications (request_id, provider, error_message, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [requestId, 'mock', error.message, 'failed']
    );

    await pool.query(
      `UPDATE customer_requests SET status = 'open', updated_at = now() WHERE id = $1`,
      [requestId]
    );

    throw error; // BullMQ will mark job as failed
  }
}, { connection });

worker.on('completed', job => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

module.exports = worker;