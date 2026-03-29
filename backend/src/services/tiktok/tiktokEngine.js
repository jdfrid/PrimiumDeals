import fs from 'fs';
import path from 'path';
import { prepare, getDataRoot } from '../../config/database.js';
import { getTikTokSettings, getSiteBaseUrl, isVideoAutomationEnabled } from './tiktokSettings.js';
import { selectDealForTikTok } from './tiktokDealSelector.js';
import { generateTikTokScript } from './tiktokScriptService.js';
import { synthesizeOpenAITts } from './tiktokTtsService.js';
import { renderTikTokVideo } from './tiktokVideoRenderer.js';

let engineBusy = false;

export function isTikTokEngineBusy() {
  return engineBusy;
}

/** Alias: video pipeline shares one worker lock. */
export function isVideoEngineBusy() {
  return engineBusy;
}

async function downloadToFile(url, dest) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`Image download failed (${r.status})`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 500) throw new Error('Downloaded image too small');
  fs.writeFileSync(dest, buf);
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

/**
 * Create job row and return { jobId, dealId }.
 * @param {number|null} dealId — optional; if set, creates video for that deal only (no discount rule).
 * @param {{ autoPick?: boolean }} [opts] — autoPick true = daily/automatic selection (uses min discount + anti-repeat)
 */
export async function startTikTokJob(dealId = null, opts = {}) {
  const settings = getTikTokSettings();
  const key = (settings.tiktok_openai_api_key || '').trim();
  if (!key) {
    throw new Error('Video engine: add OpenAI API key in admin settings');
  }

  const minDiscount = Math.max(0, parseInt(settings.tiktok_min_discount || '15', 10) || 15);
  const repeatDays = Math.max(1, parseInt(settings.tiktok_repeat_days || '14', 10) || 14);
  const forced = dealId != null && dealId !== '' ? parseInt(String(dealId), 10) : null;
  if (forced != null && Number.isNaN(forced)) throw new Error('Invalid deal ID');

  const autoPick = opts.autoPick === true;
  const skipMinDiscountWhenForced = !autoPick && forced != null;

  const deal = selectDealForTikTok({
    minDiscount,
    repeatDays,
    forcedDealId: forced,
    skipMinDiscountWhenForced
  });

  const ins = prepare(`
    INSERT INTO tiktok_video_jobs (deal_id, status)
    VALUES (?, 'pending')
  `).run(deal.id);

  const jobId = ins.lastInsertRowid;
  return { jobId, dealId: deal.id };
}

/**
 * Full pipeline for one job id.
 */
export async function processTikTokJob(jobId) {
  const settings = getTikTokSettings();
  const key = (settings.tiktok_openai_api_key || '').trim();
  const model = (settings.tiktok_openai_model || 'gpt-4o-mini').trim();
  const ttsModel = (settings.tiktok_tts_model || 'tts-1').trim();
  const ttsVoice = (settings.tiktok_tts_voice || 'alloy').trim();
  const siteBase = getSiteBaseUrl(settings);

  const jobRow = prepare(`
    SELECT j.*, d.title as deal_title, d.image_url, d.current_price, d.original_price,
           d.discount_percent, d.currency, d.ebay_url, c.name as category_name
    FROM tiktok_video_jobs j
    JOIN deals d ON d.id = j.deal_id
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE j.id = ?
  `).get(jobId);

  if (!jobRow) throw new Error('Job not found');
  if (jobRow.status === 'completed') return;

  prepare(`UPDATE tiktok_video_jobs SET status = ?, updated_at = CURRENT_TIMESTAMP, error_message = NULL WHERE id = ?`).run(
    'processing',
    jobId
  );

  const dataRoot = getDataRoot();
  const outDir = path.join(dataRoot, 'tiktok', 'out');
  const tmpRoot = path.join(dataRoot, 'tiktok', 'tmp');
  ensureDir(outDir);
  ensureDir(tmpRoot);

  const workDir = path.join(tmpRoot, String(jobId));
  ensureDir(workDir);

  const imagePath = path.join(workDir, 'product.jpg');
  const audioPath = path.join(workDir, 'voice.mp3');
  const outputPath = path.join(outDir, `${jobId}.mp4`);
  const relOut = path.posix.join('tiktok', 'out', `${jobId}.mp4`);

  try {
    const deal = {
      title: jobRow.deal_title,
      image_url: jobRow.image_url,
      current_price: jobRow.current_price,
      original_price: jobRow.original_price,
      discount_percent: jobRow.discount_percent,
      currency: jobRow.currency,
      category_name: jobRow.category_name
    };

    const script = await generateTikTokScript({
      apiKey: key,
      model,
      deal
    });

    const hashtags = Array.isArray(script.hashtags) ? script.hashtags.map(h => (h.startsWith('#') ? h : `#${h}`)).join(' ') : '';
    const caption = [script.caption || '', hashtags].filter(Boolean).join('\n\n');
    const utmSource = encodeURIComponent((settings.video_utm_source || 'short_video').trim() || 'short_video');
    const trackingUrl = `${siteBase}/api/track/click/${jobRow.deal_id}?utm_source=${utmSource}&utm_medium=video&utm_campaign=video_engine&utm_content=job_${jobId}`;

    prepare(
      `
      UPDATE tiktok_video_jobs SET
        status = ?,
        angle_type = ?,
        hook_text = ?,
        body_text = ?,
        value_text = ?,
        cta_text = ?,
        narration_text = ?,
        screen_texts_json = ?,
        caption = ?,
        hashtags = ?,
        tracking_url = ?,
        openai_model = ?,
        updated_at = CURRENT_TIMESTAMP,
        error_message = NULL
      WHERE id = ?
    `
    ).run(
      'rendering',
      script.angle || '',
      script.hook || '',
      script.body || '',
      script.value || '',
      script.cta || '',
      script.narration || '',
      JSON.stringify(script.screen_lines || []),
      caption,
      hashtags,
      trackingUrl,
      model,
      jobId
    );

    await downloadToFile(deal.image_url, imagePath);

    await synthesizeOpenAITts({
      apiKey: key,
      model: ttsModel,
      voice: ttsVoice,
      text: script.narration,
      outPath: audioPath
    });

    const { durationSec, sizeBytes } = await renderTikTokVideo({
      workDir,
      imagePath,
      audioPath,
      outputPath,
      screenLines: script.screen_lines || []
    });

    prepare(`DELETE FROM tiktok_video_outputs WHERE job_id = ?`).run(jobId);
    prepare(
      `
      INSERT INTO tiktok_video_outputs (job_id, file_path, duration_sec, file_size_bytes)
      VALUES (?, ?, ?, ?)
    `
    ).run(jobId, relOut, durationSec, sizeBytes);

    prepare(`UPDATE tiktok_video_jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run('completed', jobId);

    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  } catch (err) {
    console.error(`TikTok job ${jobId} failed:`, err);
    prepare(
      `UPDATE tiktok_video_jobs SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run('failed', String(err.message || err).slice(0, 2000), jobId);
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch { /* ignore */ }
    throw err;
  }
}

export async function runDailyTikTokIfEnabled() {
  return runDailyVideoJobIfEnabled();
}

/** Scheduled: one automatic MP4 for a scored deal (no TikTok upload). */
export async function runDailyVideoJobIfEnabled() {
  const s = getTikTokSettings();
  if (!isVideoAutomationEnabled(s)) {
    console.log('📹 Video auto-run: disabled (turn on "Automatic daily video" in admin)');
    return;
  }
  if (engineBusy) {
    console.log('📹 Video auto-run: skipped (engine busy)');
    return;
  }
  if (!(s.tiktok_openai_api_key || '').trim()) {
    console.log('📹 Video auto-run: skipped (no OpenAI API key)');
    return;
  }

  engineBusy = true;
  try {
    const { jobId } = await startTikTokJob(null, { autoPick: true });
    await processTikTokJob(jobId);
    console.log(`✅ Video auto job ${jobId} completed`);
  } catch (e) {
    console.error('📹 Video auto-run failed:', e.message);
  } finally {
    engineBusy = false;
  }
}

/**
 * Manual / per-deal run: enqueue MP4 generation only (no platform upload).
 */
export async function enqueueManualTikTokJob(dealId = null) {
  return enqueueVideoJob(dealId);
}

export async function enqueueVideoJob(dealId = null) {
  if (engineBusy) {
    throw new Error('Video engine is busy; wait for the current job to finish');
  }
  engineBusy = true;
  try {
    const { jobId } = await startTikTokJob(dealId, { autoPick: !dealId });
    processTikTokJob(jobId)
      .catch(e => console.error('Video engine background job error:', e))
      .finally(() => {
        engineBusy = false;
      });
    return { jobId };
  } catch (e) {
    engineBusy = false;
    throw e;
  }
}

/** Re-run pipeline for an existing job in the background (same as manual run — avoids HTTP timeouts). */
export async function retryTikTokJobBackground(jobId) {
  if (engineBusy) {
    throw new Error('Video engine is busy; wait for the current job to finish');
  }
  const id = parseInt(String(jobId), 10);
  const row = prepare(`SELECT id FROM tiktok_video_jobs WHERE id = ?`).get(id);
  if (!row) throw new Error('Job not found');

  prepare(
    `UPDATE tiktok_video_jobs SET status = 'pending', error_message = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(id);
  prepare(`DELETE FROM tiktok_video_outputs WHERE job_id = ?`).run(id);

  const outFile = path.join(getDataRoot(), 'tiktok', 'out', `${id}.mp4`);
  try {
    if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
  } catch { /* ignore */ }

  engineBusy = true;
  processTikTokJob(id)
    .catch(e => console.error('Video job retry error:', e))
    .finally(() => {
      engineBusy = false;
    });

  return { jobId: id };
}
