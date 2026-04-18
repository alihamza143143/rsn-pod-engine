// Bug 6 (April 18 round 2) — VideoTile uses object-CONTAIN, not object-cover.
//
// History:
//   - Original Bug #2 hotfix forced object-cover universally to stop mobile
//     letterbox bars on portrait video. That fix overshot: portrait phone
//     video rendered in landscape DESKTOP tiles got cropped so aggressively
//     that only the centre slice of the face was visible (Bug 6 reported
//     during 2026-04-18 live test).
//   - Bug 6 fix reverts to object-CONTAIN with bg-black on the parent. The
//     full source frame is preserved and padded with the tile's bg colour.
//     Matches Google Meet / FaceTime portrait-on-desktop behaviour.
//
// This file pins the new architectural rule so future "fix" attempts that
// flip back to object-cover fail fast in CI.

describe('Bug 6 — VideoTile uses object-contain (preserves full source frame)', () => {
  let videoRoomSrc = '';

  beforeAll(async () => {
    const fs = await import('fs');
    const path = await import('path');
    videoRoomSrc = fs.readFileSync(
      path.join(__dirname, '../../../../../client/src/features/live/VideoRoom.tsx'),
      'utf8',
    );
  });

  it('VideoTrack className uses object-contain', () => {
    const videoTrackBlocks = videoRoomSrc.match(/<VideoTrack[\s\S]*?\/>/g) || [];
    expect(videoTrackBlocks.length).toBeGreaterThan(0);
    for (const block of videoTrackBlocks) {
      expect(block).toMatch(/object-contain/);
    }
  });

  it('VideoTrack className never uses object-cover (would re-introduce desktop crop bug)', () => {
    const videoTrackBlocks = videoRoomSrc.match(/<VideoTrack[\s\S]*?\/>/g) || [];
    expect(videoTrackBlocks.length).toBeGreaterThan(0);
    for (const block of videoTrackBlocks) {
      expect(block).not.toMatch(/object-cover/);
    }
  });

  it('Parent tile keeps bg-black so letterbox padding feels intentional', () => {
    // bg-black on the wrapper (when hasVideo) ensures the contain padding
    // looks like an editorial frame, not a broken tile.
    expect(videoRoomSrc).toMatch(/hasVideo\s*\?\s*['"`]bg-black/);
  });

  it('Mobile self-view PIP wrapper still renders VideoTile (fix propagates)', () => {
    // Both PIP wrappers (1:1 mobile + trio mobile) use VideoTile, so the
    // object-contain rule applies there too automatically.
    const pipMatches = videoRoomSrc.match(/w-32 h-44 sm:w-36 sm:h-48[\s\S]{0,400}<VideoTile\s+trackRef=\{localTrack\}\s+label="You"/g);
    expect(pipMatches).not.toBeNull();
    expect((pipMatches || []).length).toBeGreaterThanOrEqual(2);
  });
});
