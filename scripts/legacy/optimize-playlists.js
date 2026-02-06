const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function levelToValue(level) {
  const map = { beginner: 1, intermediate: 2, advanced: 3 };
  return map[level] || 1;
}

function techToValue(level) {
  const map = { new_to_daws: 1, familiar: 2, expert: 3 };
  return map[level] || 1;
}

function findPlaylistByBaseName(playlists, baseName) {
  return playlists.find(p => {
    if (!p.name) return false;
    const n = p.name.toLowerCase();
    const b = baseName.toLowerCase();
    return n === b || n.endsWith(` ${b}`) || n.endsWith(`. ${b}`) || n.includes(b);
  });
}

function pickPlaylistForCategory(playlists, video) {
  const cat = (video.feature_category || '').toLowerCase();
  switch (cat) {
    case 'music_theory':
      return findPlaylistByBaseName(playlists, 'Music Theory Basics');
    case 'voicing':
      return findPlaylistByBaseName(playlists, 'Voicing Settings');
    case 'sequencer':
      return findPlaylistByBaseName(playlists, 'Sequencer Settings');
    case 'transport':
    case 'timeline':
      return findPlaylistByBaseName(playlists, 'Transport & Timeline');
    case 'ai_generation':
      return findPlaylistByBaseName(playlists, 'AI & Generation');
    case 'midi':
    case 'audio_processing':
      return findPlaylistByBaseName(playlists, 'MIDI & Routing');
    case 'notation':
      return findPlaylistByBaseName(playlists, 'Notation & Export');
    case 'interface':
    case 'views':
    case 'foundation':
      return findPlaylistByBaseName(playlists, 'Getting Started');
    case 'creation':
    case 'progression':
    case 'track':
      return findPlaylistByBaseName(playlists, 'Composition Basics');
    case 'ui_elements':
    case 'system':
    case 'workflow':
    case 'additional':
    case 'performance':
      return findPlaylistByBaseName(playlists, 'Workflow & Productivity');
    case 'getting_connected':
      return findPlaylistByBaseName(playlists, 'Getting Connected');
    default:
      return findPlaylistByBaseName(playlists, 'Workflow & Productivity');
  }
}

async function optimize() {
  console.log('🔍 Optimizing playlists: removing duplicates, linking orphans, enforcing gating...');

  // Fetch playlists with videos
  const { data: playlists, error: playlistsError } = await supabase
    .from('tutorial_playlists')
    .select(`
      id, name, target_theory_level, target_tech_level, app_mode_filter,
      playlist_videos (
        id, video_id, sequence_order, is_optional, is_conditional,
        condition_theory_level, condition_tech_level, condition_app_mode,
        tutorial_videos (
          id, title, duration, feature_category,
          theory_level_required, tech_level_required, app_mode_applicability,
          musical_context
        )
      )
    `);

  if (playlistsError) {
    console.error('Error fetching playlists:', playlistsError);
    return;
  }

  // Fetch all videos and relationships to detect orphans
  const [{ data: videos, error: videosError }, { data: rels, error: relsError }] = await Promise.all([
    supabase.from('tutorial_videos').select('*'),
    supabase.from('playlist_videos').select('id, playlist_id, video_id')
  ]);

  if (videosError || relsError) {
    console.error('Error fetching videos/relationships:', videosError || relsError);
    return;
  }

  let duplicatesRemoved = 0;
  let gatingUpdated = 0;
  let orphansLinked = 0;

  // 1) Remove duplicate entries within each playlist
  for (const playlist of playlists) {
    const list = (playlist.playlist_videos || []).slice();
    const byVideo = new Map();
    for (const pv of list) {
      const key = pv.video_id;
      if (!byVideo.has(key)) {
        byVideo.set(key, [pv]);
      } else {
        byVideo.get(key).push(pv);
      }
    }

    for (const [videoId, entries] of byVideo.entries()) {
      if (entries.length > 1) {
        // Keep the one with smallest sequence_order
        entries.sort((a, b) => a.sequence_order - b.sequence_order);
        const keep = entries[0];
        const remove = entries.slice(1);
        const removeIds = remove.map(r => r.id);
        const { error: delErr } = await supabase
          .from('playlist_videos')
          .delete()
          .in('id', removeIds);
        if (!delErr) {
          duplicatesRemoved += removeIds.length;
          console.log(`🧹 Removed ${removeIds.length} duplicate(s) in playlist "${playlist.name}" for video_id ${videoId}`);
        } else {
          console.error('Error removing duplicates:', delErr);
        }
      }
    }
  }

  // 2) Enforce gating conditions based on playlist targets and video requirements
  for (const playlist of playlists) {
    const targetTheory = playlist.target_theory_level || 'beginner';
    const targetTech = playlist.target_tech_level || 'new_to_daws';
    const appModeFilter = playlist.app_mode_filter || 'both';

    for (const pv of (playlist.playlist_videos || [])) {
      const v = pv.tutorial_videos;
      if (!v) continue;

      let needsConditional = false;
      let condTheory = pv.condition_theory_level || null;
      let condTech = pv.condition_tech_level || null;
      let condApp = pv.condition_app_mode || null;

      if (levelToValue(v.theory_level_required || 'beginner') > levelToValue(targetTheory)) {
        needsConditional = true;
        condTheory = v.theory_level_required || condTheory;
      }
      if (techToValue(v.tech_level_required || 'new_to_daws') > techToValue(targetTech)) {
        needsConditional = true;
        condTech = v.tech_level_required || condTech;
      }
      if (v.app_mode_applicability && v.app_mode_applicability !== 'both' && v.app_mode_applicability !== appModeFilter) {
        needsConditional = true;
        condApp = v.app_mode_applicability;
      }

      if (needsConditional && (!pv.is_conditional || pv.condition_theory_level !== condTheory || pv.condition_tech_level !== condTech || pv.condition_app_mode !== condApp)) {
        const { error: upErr } = await supabase
          .from('playlist_videos')
          .update({
            is_conditional: true,
            condition_theory_level: condTheory,
            condition_tech_level: condTech,
            condition_app_mode: condApp
          })
          .eq('id', pv.id);
        if (!upErr) {
          gatingUpdated += 1;
        } else {
          console.error('Error updating gating:', upErr);
        }
      }
    }
  }

  // 3) Link orphan videos to appropriate playlists
  const videoIdToRelCount = new Map();
  for (const r of (rels || [])) {
    videoIdToRelCount.set(r.video_id, (videoIdToRelCount.get(r.video_id) || 0) + 1);
  }

  const orphanVideos = (videos || []).filter(v => !videoIdToRelCount.has(v.id));

  for (const v of orphanVideos) {
    const targetPlaylist = pickPlaylistForCategory(playlists, v);
    if (!targetPlaylist) continue;

    // Get max sequence_order in that playlist
    const { data: maxRow, error: maxErr } = await supabase
      .from('playlist_videos')
      .select('sequence_order')
      .eq('playlist_id', targetPlaylist.id)
      .order('sequence_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxErr) {
      console.error('Error reading max sequence:', maxErr);
      continue;
    }

    const nextSeq = maxRow ? (maxRow.sequence_order + 1) : 1;

    const insertRow = {
      playlist_id: targetPlaylist.id,
      video_id: v.id,
      sequence_order: nextSeq,
      is_optional: false,
      is_conditional: false,
      condition_theory_level: null,
      condition_tech_level: null,
      condition_app_mode: null
    };

    // Apply gating if video exceeds playlist target
    const targetTheory = targetPlaylist.target_theory_level || 'beginner';
    const targetTech = targetPlaylist.target_tech_level || 'new_to_daws';
    const appModeFilter = targetPlaylist.app_mode_filter || 'both';

    let needsConditional = false;
    if (levelToValue(v.theory_level_required || 'beginner') > levelToValue(targetTheory)) {
      needsConditional = true;
      insertRow.is_conditional = true;
      insertRow.condition_theory_level = v.theory_level_required;
    }
    if (techToValue(v.tech_level_required || 'new_to_daws') > techToValue(targetTech)) {
      needsConditional = true;
      insertRow.is_conditional = true;
      insertRow.condition_tech_level = v.tech_level_required;
    }
    if (v.app_mode_applicability && v.app_mode_applicability !== 'both' && v.app_mode_applicability !== appModeFilter) {
      needsConditional = true;
      insertRow.is_conditional = true;
      insertRow.condition_app_mode = v.app_mode_applicability;
    }

    const { error: insErr } = await supabase
      .from('playlist_videos')
      .insert([insertRow]);

    if (!insErr) {
      orphansLinked += 1;
      console.log(`🔗 Linked orphan video "${v.title}" → "${targetPlaylist.name}" at ${nextSeq}${needsConditional ? ' (conditional)' : ''}`);
    } else {
      console.error('Error linking orphan video:', insErr);
    }
  }

  // 4) Duration summary per playlist
  const durations = [];
  for (const playlist of playlists) {
    let total = 0;
    for (const pv of (playlist.playlist_videos || [])) {
      const v = pv.tutorial_videos;
      if (v && typeof v.duration === 'number') total += v.duration;
    }
    durations.push({ name: playlist.name, minutes: total });
  }

  console.log('\n📊 Optimization Summary:');
  console.log(`  - Duplicates removed: ${duplicatesRemoved}`);
  console.log(`  - Gating rows updated: ${gatingUpdated}`);
  console.log(`  - Orphan videos linked: ${orphansLinked}`);
  console.log('  - Playlist durations (minutes):');
  durations
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(d => console.log(`    • ${d.name}: ${d.minutes || 0} min`));

  console.log('\n✅ Optimization complete.');
}

optimize();








