const express = require('express');
const { body, query, validationResult } = require('express-validator');
const pool = require('../db');
const auth = require('../middleware/auth');
const { classificationQueue } = require('../queues');
const router = express.Router();

// ─── POST /requests ───────────────────────────────────────────
router.post('/', [
  body('message').notEmpty().trim(),
  body('customer_name').optional().trim(),
  body('customer_email').optional().isEmail(),
  body('source_channel').optional().isIn(['api', 'whatsapp', 'email', 'website'])
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { message, customer_name, customer_email, source_channel = 'api', idempotency_key } = req.body;

    // Check idempotency — prevent duplicate requests
    if (idempotency_key) {
      const existing = await pool.query(
        'SELECT id FROM customer_requests WHERE idempotency_key = $1',
        [idempotency_key]
      );
      if (existing.rows[0]) {
        return res.status(200).json({ 
          message: 'Duplicate request', 
          request_id: existing.rows[0].id 
        });
      }
    }

    // 1. Save request immediately
    const result = await pool.query(
      `INSERT INTO customer_requests 
        (message, customer_name, customer_email, source_channel, idempotency_key)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [message, customer_name, customer_email, source_channel, idempotency_key || null]
    );

    const newRequest = result.rows[0];

    // 2. Log creation event
    await pool.query(
      `INSERT INTO request_events (request_id, event_type, new_value)
       VALUES ($1, $2, $3)`,
      [newRequest.id, 'created', 'queued']
    );

    // 3. Enqueue AI job — does NOT block response
    await classificationQueue.add('classify', { requestId: newRequest.id });

    // 4. Return immediately
    res.status(201).json({
      message: 'Request created and queued for classification',
      request: newRequest
    });

  } catch (err) { next(err); }
});

// ─── GET /requests ────────────────────────────────────────────
router.get('/', auth, [
  query('status').optional().isIn(['queued','processing','open','resolved','closed']),
  query('priority').optional().isIn(['low','medium','high']),
  query('category').optional().isIn(['support','sales','urgent','spam','other']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res, next) => {
  try {
    const { status, priority, category, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let conditions = [];
    let params = [];
    let i = 1;

    if (status)   { conditions.push(`status = $${i++}`);            params.push(status); }
    if (priority) { conditions.push(`priority_snapshot = $${i++}`); params.push(priority); }
    if (category) { conditions.push(`category_snapshot = $${i++}`); params.push(category); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT * FROM customer_requests ${where}
       ORDER BY created_at DESC
       LIMIT $${i++} OFFSET $${i++}`,
      [...params, limit, offset]
    );

    const count = await pool.query(
      `SELECT COUNT(*) FROM customer_requests ${where}`, params
    );

    res.json({
      requests: result.rows,
      total: parseInt(count.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (err) { next(err); }
});

// ─── GET /requests/:id ────────────────────────────────────────
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [request, classification, events, notes] = await Promise.all([
      pool.query('SELECT * FROM customer_requests WHERE id = $1', [id]),
      pool.query('SELECT * FROM ai_classifications WHERE request_id = $1 ORDER BY created_at DESC LIMIT 1', [id]),
      pool.query('SELECT * FROM request_events WHERE request_id = $1 ORDER BY created_at ASC', [id]),
      pool.query(`
        SELECT n.*, u.email as author_email 
        FROM internal_notes n
        LEFT JOIN users u ON n.author_id = u.id
        WHERE n.request_id = $1 ORDER BY n.created_at ASC`, [id])
    ]);

    if (!request.rows[0]) return res.status(404).json({ error: 'Request not found' });

    res.json({
      request: request.rows[0],
      ai_classification: classification.rows[0] || null,
      events: events.rows,
      notes: notes.rows
    });

  } catch (err) { next(err); }
});

// ─── PATCH /requests/:id/status ───────────────────────────────
router.patch('/:id/status', auth, [
  body('status').isIn(['queued','processing','open','resolved','closed'])
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { id } = req.params;
    const { status } = req.body;

    const current = await pool.query(
      'SELECT status FROM customer_requests WHERE id = $1', [id]
    );
    if (!current.rows[0]) return res.status(404).json({ error: 'Request not found' });

    const oldStatus = current.rows[0].status;

    await pool.query(
      'UPDATE customer_requests SET status = $1, updated_at = now() WHERE id = $2',
      [status, id]
    );

    // Log event
    await pool.query(
      `INSERT INTO request_events (request_id, event_type, old_value, new_value, actor_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, 'status_change', oldStatus, status, req.user.id]
    );

    // After updating status in DB
    const io = req.app.get('io');
    if (io) io.emit('request:updated', {
      requestId: id,
      status: status,
      updatedBy: req.user.email
    });
    
    res.json({ message: 'Status updated', old_status: oldStatus, new_status: status });

  } catch (err) { next(err); }
});

// ─── POST /requests/:id/notes ─────────────────────────────────
router.post('/:id/notes', auth, [
  body('body').notEmpty().trim()
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { id } = req.params;
    const { body: noteBody } = req.body;

    const result = await pool.query(
      `INSERT INTO internal_notes (request_id, author_id, body)
       VALUES ($1, $2, $3) RETURNING *`,
      [id, req.user.id, noteBody]
    );

    await pool.query(
      `INSERT INTO request_events (request_id, event_type, new_value, actor_id)
       VALUES ($1, $2, $3, $4)`,
      [id, 'note_added', noteBody.substring(0, 50), req.user.id]
    );

    res.status(201).json({ note: result.rows[0] });

  } catch (err) { next(err); }
});

module.exports = router;