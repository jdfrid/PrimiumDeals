import express from 'express';
import {
  createGoogleAuthUrl,
  getVoicePlannerStatus,
  handleGoogleCallback,
  processVoicePlannerCommand
} from '../services/voicePlannerService.js';

const router = express.Router();

function buildRedirectUri(req) {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
  return `${proto}://${req.get('host')}/api/voice-planner/google/callback`;
}

function buildAppUrl(req, params = '') {
  if (process.env.VOICE_PLANNER_APP_URL) {
    return `${process.env.VOICE_PLANNER_APP_URL.replace(/\/$/, '')}${params}`;
  }
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
  return `${proto}://${req.get('host')}/voice-planner${params}`;
}

function requireOptionalAccessKey(req, res, next) {
  const configuredKey = (process.env.VOICE_PLANNER_ACCESS_KEY || '').trim();
  if (!configuredKey) return next();
  const supplied = req.get('x-voice-planner-key') || req.query.key || req.body?.accessKey;
  if (supplied === configuredKey) return next();
  return res.status(401).json({ error: 'Voice planner access key is required.' });
}

router.get('/status', (req, res) => {
  res.json(getVoicePlannerStatus());
});

router.get('/google/auth-url', requireOptionalAccessKey, (req, res) => {
  try {
    res.json({ url: createGoogleAuthUrl(buildRedirectUri(req)) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/google/callback', async (req, res) => {
  try {
    await handleGoogleCallback({
      code: req.query.code,
      state: req.query.state,
      redirectUri: buildRedirectUri(req)
    });
    res.redirect(buildAppUrl(req, '?google=connected'));
  } catch (error) {
    res.redirect(buildAppUrl(req, `?google=error&message=${encodeURIComponent(error.message)}`));
  }
});

router.post('/process', requireOptionalAccessKey, async (req, res) => {
  try {
    const result = await processVoicePlannerCommand(req.body || {});
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
