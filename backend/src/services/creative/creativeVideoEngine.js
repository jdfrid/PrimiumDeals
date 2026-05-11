import { prepare } from '../../config/database.js';
import { getCreativeStudioSettings } from './creativeStudioSettings.js';
import { generateCreativeBrief, normalizeKlingScenes } from './creativeScriptService.js';
import { searchVideoUrls, isPexelsConfigured } from './pexelsService.js';
import { getCharacterById, getCharacters } from './creativeAssets.js';
import {
  buildVerticalEdit,
  submitRender,
  waitForRender,
  isShotstackConfigured
} from './shotstackRenderService.js';
import {
  clampMagnificDuration,
  createKling4kT2vTask,
  getMagnificApiKeyFromSettings,
  isMagnificConfigured,
  waitForKling4kT2v
} from './magnificRenderService.js';
import { concatRemoteVideosForCreativeJob } from './creativeVideoMerge.js';

let creativeBusy = false;

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Spread clip choice across the merged pool so consecutive jobs do not always take the same first hits. */
function pickTimelineUrls(urls, jobId, count) {
  const n = urls.length;
  if (!n) return [];
  const take = Math.min(count, n);
  const start = jobId % n;
  const out = [];
  for (let i = 0; i < take; i++) out.push(urls[(start + i) % n]);
  return out;
}

export function isCreativeEngineBusy() {
  return creativeBusy;
}

function setting(key, fallback = '') {
  const row = prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return (row?.value ?? fallback).trim();
}

function buildMergedCreativePublicUrl(jobId) {
  const base = (process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_API_URL || '').trim().replace(/\/$/, '');
  const p = `/api/admin/creative-videos/jobs/${jobId}/merged.mp4`;
  return base ? `${base}${p}` : p;
}

export function assertCreativePipelineReady() {
  const settings = getCreativeStudioSettings();
  const provider = String(settings.creative_video_provider || 'shotstack').toLowerCase();

  if (provider === 'magnific') {
    if (!isMagnificConfigured(settings)) {
      throw new Error(
        'Magnific נבחר כספק רינדור — הוסף מפתח API בהגדרות Creative Studio או הגדר CREATIVE_MAGNIFIC_API_KEY בשרת'
      );
    }
    return;
  }

  if (!isPexelsConfigured()) {
    throw new Error('Pexels is not configured — set PEXELS_API_KEY on the server');
  }
  if (!isShotstackConfigured()) {
    throw new Error('Shotstack is not configured — set SHOTSTACK_API_KEY on the server');
  }
}

/**
 * @param {{ videoDescription: string, scriptTone: string, userNotes?: string, characterId?: string, triggerSource?: string }} input
 */
export async function createCreativeVideoJob(input) {
  assertCreativePipelineReady();

  const videoDescription = String(input.videoDescription || '').trim();
  if (videoDescription.length < 8) {
    throw new Error('Video description is too short (at least 8 characters)');
  }

  const scriptTone = String(input.scriptTone || 'adults').trim().toLowerCase();
  const userNotes = String(input.userNotes || '').trim().slice(0, 2000);
  const characterId = input.characterId ? String(input.characterId).trim() : '';
  const triggerSource = String(input.triggerSource || 'manual').slice(0, 32);

  const settings = getCreativeStudioSettings();
  const renderProvider = String(settings.creative_video_provider || 'shotstack').toLowerCase();

  const ins = prepare(
    `
    INSERT INTO creative_video_jobs (status, trigger_source, video_description, script_tone, user_notes, character_id, render_provider)
    VALUES ('pending', ?, ?, ?, ?, ?, ?)
  `
  ).run(
    triggerSource,
    videoDescription,
    scriptTone,
    userNotes || null,
    characterId || null,
    renderProvider || 'shotstack'
  );

  return { jobId: ins.lastInsertRowid };
}

async function runShotstackPipeline(id, row, brief) {
  const queries = brief.pexels_search_queries.map(q => String(q).trim()).filter(Boolean);
  const videoUrls = [];
  const seen = new Set();
  const qSlice = queries.slice(0, 4);
  const pexels_pages_used = qSlice.map((q, idx) => ({
    query: q,
    page: 1 + (hashString(`${id}:${idx}:${q}`) % 12)
  }));
  for (let idx = 0; idx < qSlice.length; idx++) {
    const q = qSlice[idx];
    const page = pexels_pages_used[idx]?.page ?? 1;
    const batch = await searchVideoUrls(q, { perPage: 5, page, orientation: 'portrait' });
    for (const u of batch) {
      if (!seen.has(u)) {
        seen.add(u);
        videoUrls.push(u);
      }
      if (videoUrls.length >= 8) break;
    }
    if (videoUrls.length >= 6) break;
  }

  if (!videoUrls.length) {
    throw new Error('Pexels returned no usable portrait videos for these queries');
  }

  let char = row.character_id ? getCharacterById(row.character_id) : null;
  if (!char) {
    const all = getCharacters();
    char = all[0] || null;
  }
  const characterImageUrl = char?.image_url || null;

  const totalDurationSec = 30;
  const clipsCount = Math.min(5, Math.max(3, Math.ceil(totalDurationSec / 12)));
  const urlsForTimeline = pickTimelineUrls(videoUrls, id, clipsCount);
  const segmentLengthSec = totalDurationSec / urlsForTimeline.length;

  const briefForDb = {
    ...brief,
    debug: {
      ...(brief.debug || {}),
      pexels_pages_used,
      pexels_candidate_urls: videoUrls.slice(0, 16),
      pexels_timeline_urls: urlsForTimeline,
      character_image_url: characterImageUrl,
      character_id_used: char?.id || null
    }
  };

  if (briefForDb.clean_delivery?.material_context) {
    Object.assign(briefForDb.clean_delivery.material_context, {
      character_image_url: characterImageUrl,
      timeline_stock_video_urls: urlsForTimeline
    });
  }

  const edit = buildVerticalEdit({
    videoUrls: urlsForTimeline,
    segmentLengthSec,
    narration: brief.narration,
    voice: brief.shotstack_voice || 'Matthew',
    ttsLanguage: brief.tts_language || 'en-US',
    scenes: (brief.scenes || []).map(s => ({
      text: s.text,
      start_sec: s.start_sec,
      duration_sec: s.duration_sec
    })),
    characterImageUrl,
    totalDurationSec
  });

  const narrationFull = String(brief.narration || '');
  const narrationInTts = narrationFull.slice(0, 4500);
  briefForDb.debug.render_provider_package = {
    provider: 'shotstack',
    narration_full: brief.narration || '',
    narration_in_shotstack_tts_clip: narrationInTts,
    narration_truncated_for_provider: narrationFull.length > narrationInTts.length,
    voice: brief.shotstack_voice || 'Matthew',
    tts_language: brief.tts_language || 'en-US',
    on_screen_captions: (brief.scenes || []).map(s => ({
      text: s.text,
      start_sec: s.start_sec,
      duration_sec: s.duration_sec
    })),
    character_image_url: characterImageUrl,
    background_stock_video_urls: urlsForTimeline,
    segment_length_sec: segmentLengthSec,
    total_duration_sec: totalDurationSec,
    shotstack_request_body: edit,
    clean_delivery: briefForDb.clean_delivery || null
  };

  prepare(
    `
      UPDATE creative_video_jobs SET
        brief_json = ?,
        pexels_urls_json = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
  ).run(JSON.stringify(briefForDb), JSON.stringify(videoUrls), id);

  const renderId = await submitRender(edit);
  prepare(
    `
      UPDATE creative_video_jobs SET external_render_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `
  ).run(renderId, id);

  const { url } = await waitForRender(renderId);

  prepare(
    `
      UPDATE creative_video_jobs SET
        status = 'completed',
        output_url = ?,
        error_message = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
  ).run(url, id);
}

async function runMagnificPipeline(id, brief, apiKey) {
  const scenesRaw =
    brief.clean_delivery?.kling_scenes?.length >= 3 ? brief.clean_delivery.kling_scenes : normalizeKlingScenes(brief);
  const scenes = scenesRaw.slice(0, 3);

  const briefForDb = {
    ...brief,
    debug: {
      ...(brief.debug || {}),
      magnific_text_to_video: 'kling-4k-t2v',
      magnific_segments_planned: scenes.length,
      pexels_skipped: true
    }
  };

  const segmentResults = [];
  const segmentUrls = [];
  const taskIds = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const prompt = String(scene.visual_prompt || scene.narrative_beat || brief.narration || '')
      .trim()
      .slice(0, 2500);
    if (!prompt) {
      throw new Error(`Magnific: חסר פרומפט ויזואלי לסצנה ${i + 1}`);
    }
    const duration = clampMagnificDuration(scene.target_seconds_hint);

    const taskId = await createKling4kT2vTask(apiKey, {
      prompt,
      aspect_ratio: '9:16',
      duration,
      cfg_scale: 0.5,
      negative_prompt: 'blur, distort, and low quality'
    });
    taskIds.push(taskId);

    const done = await waitForKling4kT2v(apiKey, taskId);
    segmentResults.push({
      index: i + 1,
      role: scene.role,
      label_he: scene.label_he,
      task_id: taskId,
      duration_seconds: duration,
      url: done.url
    });
    segmentUrls.push(done.url);
  }

  await concatRemoteVideosForCreativeJob(id, segmentUrls);
  const outputUrl = buildMergedCreativePublicUrl(id);

  briefForDb.debug.render_provider_package = {
    provider: 'magnific',
    model: 'kling-4k-t2v',
    note:
      'שלושת קטעי הווידאו נוצרו מטקסט (clean_delivery.kling_scenes) דרך Magnific; קובץ ממוזג זמין ב-endpoint המאוחד.',
    magnific_tasks: taskIds,
    magnific_segments: segmentResults,
    merged_mp4_auth_url: outputUrl.startsWith('http') ? outputUrl : `(same-origin) ${outputUrl}`,
    clean_delivery: briefForDb.clean_delivery || null
  };

  prepare(
    `
      UPDATE creative_video_jobs SET
        brief_json = ?,
        pexels_urls_json = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
  ).run(JSON.stringify(briefForDb), JSON.stringify(segmentUrls), id);

  prepare(
    `
      UPDATE creative_video_jobs SET external_render_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `
  ).run(`magnific:${taskIds.join(',')}`, id);

  prepare(
    `
      UPDATE creative_video_jobs SET
        status = 'completed',
        output_url = ?,
        error_message = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
  ).run(outputUrl, id);
}

export async function processCreativeVideoJob(jobId) {
  const id = parseInt(String(jobId), 10);
  const row = prepare(`SELECT * FROM creative_video_jobs WHERE id = ?`).get(id);
  if (!row) throw new Error('Job not found');
  if (row.status === 'completed') return;

  prepare(
    `UPDATE creative_video_jobs SET status = 'processing', error_message = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(id);

  try {
    assertCreativePipelineReady();

    const settings = getCreativeStudioSettings();
    const provider = String(settings.creative_video_provider || 'shotstack').toLowerCase();

    const brief = await generateCreativeBrief(settings, {
      videoDescription: row.video_description,
      toneId: row.script_tone,
      userNotes: row.user_notes || ''
    });

    if (provider === 'magnific') {
      const apiKey = getMagnificApiKeyFromSettings(settings);
      await runMagnificPipeline(id, brief, apiKey);
      return;
    }

    await runShotstackPipeline(id, row, brief);
  } catch (e) {
    console.error(`Creative video job ${id} failed:`, e);
    prepare(
      `
      UPDATE creative_video_jobs SET
        status = 'failed',
        error_message = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    ).run(String(e.message || e).slice(0, 2000), id);
    throw e;
  }
}

export function enqueueCreativeVideoJob(jobId) {
  if (creativeBusy) {
    throw new Error('Creative video engine is busy; wait for the current job to finish');
  }
  creativeBusy = true;
  processCreativeVideoJob(jobId)
    .catch(err => console.error('Creative video background job error:', err))
    .finally(() => {
      creativeBusy = false;
    });
}

export async function startNewCreativeVideoJob(input) {
  assertCreativePipelineReady();
  if (creativeBusy) {
    throw new Error('Creative video engine is busy; wait for the current job to finish');
  }
  creativeBusy = true;
  try {
    const { jobId } = await createCreativeVideoJob(input);
    processCreativeVideoJob(jobId)
      .catch(err => console.error('Creative video background job error:', err))
      .finally(() => {
        creativeBusy = false;
      });
    return { jobId };
  } catch (e) {
    creativeBusy = false;
    throw e;
  }
}

export function recoverStuckCreativeJobs(staleMinutes = 45) {
  const msg = `Stuck in processing for over ${staleMinutes} minutes (timeout or server restart).`;
  prepare(
    `
    UPDATE creative_video_jobs
    SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP
    WHERE status = 'processing'
      AND datetime(updated_at) < datetime('now', ?)
  `
  ).run(msg, `-${staleMinutes} minutes`);
}

export async function runScheduledCreativeIfEnabled() {
  const enabled = setting('creative_video_auto_enabled', 'false') === 'true';
  if (!enabled) {
    console.log('🎬 Creative video cron: disabled');
    return;
  }
  if (creativeBusy) {
    console.log('🎬 Creative video cron: skipped (engine busy)');
    return;
  }
  try {
    assertCreativePipelineReady();
  } catch (e) {
    console.log('🎬 Creative video cron: skipped —', e.message);
    return;
  }

  const videoDescription = setting(
    'creative_auto_description',
    'Short vertical video with a useful tip for online shoppers.'
  );
  const scriptTone = setting('creative_auto_tone', 'adults');

  try {
    await startNewCreativeVideoJob({
      videoDescription,
      scriptTone,
      userNotes: 'Scheduled automatic run — keep pacing tight and friendly.',
      triggerSource: 'schedule'
    });
    console.log('🎬 Creative video cron: started new job');
  } catch (e) {
    console.error('🎬 Creative video cron failed:', e.message);
  }
}

export async function retryCreativeVideoJob(jobId) {
  if (creativeBusy) {
    throw new Error('Creative video engine is busy; wait for the current job to finish');
  }
  const id = parseInt(String(jobId), 10);
  const row = prepare(`SELECT id FROM creative_video_jobs WHERE id = ?`).get(id);
  if (!row) throw new Error('Job not found');

  prepare(
    `
    UPDATE creative_video_jobs SET
      status = 'pending',
      error_message = NULL,
      output_url = NULL,
      external_render_id = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  ).run(id);

  enqueueCreativeVideoJob(id);
  return { jobId: id };
}
