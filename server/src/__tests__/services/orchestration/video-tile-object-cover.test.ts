// Tests for Bug #2 — Mobile self-view grey/black rectangle (regression).
//
// Stefan's mobile screenshot shows partner's portrait video rendered in a
// landscape container with `object-contain`, causing letterboxing / pillarboxing
// (large black bars on the sides). The earlier hotfix only added bg-black
// when hasVideo — it did NOT change the object-fit, so pinned tiles (which is
// what users see in 1:1 breakouts) still letterbox.
//
// Real fix: VideoTrack must use object-cover UNIVERSALLY — never object-contain
// — so portrait videos crop to fill landscape containers (matching FaceTime /
// Google Meet / WhatsApp behavior). Cropped face beats tiny portrait centered
// in black bars.

describe('Bug #2 — VideoTile uses object-cover universally (no letterbox / pillarbox)', () => {
  let videoRoomSrc = '';

  beforeAll(async () => {
    const fs = await import('fs');
    const path = await import('path');
    videoRoomSrc = fs.readFileSync(
      path.join(__dirname, '../../../../../client/src/features/live/VideoRoom.tsx'),
      'utf8',
    );
  });

  it('VideoTrack className never uses object-contain (which causes letterbox bars)', () => {
    // Search the entire VideoRoom.tsx — no VideoTrack should reference object-contain
    // (regardless of pinned state).
    const videoTrackBlocks = videoRoomSrc.match(/<VideoTrack[\s\S]*?\/>/g) || [];
    expect(videoTrackBlocks.length).toBeGreaterThan(0);

    for (const block of videoTrackBlocks) {
      expect(block).not.toMatch(/object-contain/);
    }
  });

  it('VideoTrack className uses object-cover', () => {
    const videoTrackBlocks = videoRoomSrc.match(/<VideoTrack[\s\S]*?\/>/g) || [];
    expect(videoTrackBlocks.length).toBeGreaterThan(0);

    for (const block of videoTrackBlocks) {
      expect(block).toMatch(/object-cover/);
    }
  });

  it('VideoTile component does not branch object-fit on isPinned (single uniform fit)', () => {
    // Defensive: even if someone re-introduces a ternary later, fail loudly
    // if isPinned is used to gate object-contain vs object-cover on the video
    // element itself.
    expect(videoRoomSrc).not.toMatch(/isPinned\s*\?\s*['"`][^'"`]*object-contain/);
    expect(videoRoomSrc).not.toMatch(/object-contain[^'"`]*['"`]\s*:\s*['"`][^'"`]*object-cover/);
  });

  it('Mobile self-view PIP wrapper renders VideoTile (which uses object-cover)', () => {
    // The self-view PIP for mobile 1:1 and trio modes lives in absolute-positioned
    // wrappers. They render <VideoTile trackRef={localTrack} label="You" /> — the
    // tile itself enforces object-cover, so as long as the PIP uses VideoTile
    // (not a raw VideoTrack), the fix propagates.
    // Both PIP wrappers have w-32 h-44 sm:w-36 sm:h-48 rounded-xl markers.
    const pipMatches = videoRoomSrc.match(/w-32 h-44 sm:w-36 sm:h-48[\s\S]{0,400}<VideoTile\s+trackRef=\{localTrack\}\s+label="You"/g);
    expect(pipMatches).not.toBeNull();
    // Two PIP wrappers (1:1 mobile + trio mobile)
    expect((pipMatches || []).length).toBeGreaterThanOrEqual(2);
  });
});
