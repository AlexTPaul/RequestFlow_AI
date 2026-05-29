// Designed as a replaceable module
// Swap this with OpenAI/Gemini by just changing this file

const CATEGORIES = ['support', 'sales', 'urgent', 'spam', 'other'];
const PRIORITIES = ['low', 'medium', 'high'];

const rules = [
  { keywords: ['payment', 'billing', 'invoice', 'charge'], category: 'support', priority: 'high' },
  { keywords: ['cannot', 'broken', 'error', 'fail', 'not working'], category: 'support', priority: 'high' },
  { keywords: ['buy', 'purchase', 'pricing', 'plan', 'upgrade'], category: 'sales', priority: 'medium' },
  { keywords: ['urgent', 'asap', 'immediately', 'critical'], category: 'urgent', priority: 'high' },
  { keywords: ['spam', 'unsubscribe', 'stop', 'remove'], category: 'spam', priority: 'low' },
];

async function classifyRequest(message) {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const lower = message.toLowerCase();

  // Match against rules
  for (const rule of rules) {
    if (rule.keywords.some(k => lower.includes(k))) {
      return {
        category: rule.category,
        priority: rule.priority,
        summary: generateSummary(message, rule.category),
        confidence: parseFloat((0.75 + Math.random() * 0.2).toFixed(2)),
        reason: `Message contains ${rule.category}-related keywords requiring ${rule.priority} priority response.`,
        routing_queue: getRoutingQueue(rule.category)
      };
    }
  }

  // Default classification
  return {
    category: 'other',
    priority: 'medium',
    summary: generateSummary(message, 'other'),
    confidence: 0.60,
    reason: 'No specific patterns matched. Assigned default classification.',
    routing_queue: 'general'
  };
}

function generateSummary(message, category) {
  const trimmed = message.length > 100 ? message.substring(0, 100) + '...' : message;
  return `[${category.toUpperCase()}] ${trimmed}`;
}

function getRoutingQueue(category) {
  const routing = {
    support: 'support-team',
    sales: 'sales-team',
    urgent: 'escalation-team',
    spam: 'spam-filter',
    other: 'general'
  };
  return routing[category] || 'general';
}

module.exports = { classifyRequest };