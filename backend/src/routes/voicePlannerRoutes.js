import express from 'express';

/**
 * Voice Planner API mount was wired in routes/index.js before this module existed,
 * which crashed production (ERR_MODULE_NOT_FOUND). These handlers are stubs until
 * the full calendar/tasks integration is implemented.
 */
const router = express.Router();

router.get('/status', (req, res) => {
  res.json({
    ok: false,
    configured: false,
    message: 'Voice Planner is not implemented on this deployment.',
  });
});

router.get('/google/auth-url', (req, res) => {
  res.status(503).json({ error: 'Voice Planner is not configured on this server.' });
});

router.get('/google/callback', (req, res) => {
  res.status(503).send('Voice Planner OAuth callback is not configured.');
});

router.post('/process', express.json(), (req, res) => {
  res.status(503).json({ error: 'Voice Planner is not configured on this server.' });
});

export default router;
