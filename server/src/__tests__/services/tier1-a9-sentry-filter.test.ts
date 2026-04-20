// Tier-1 A9 — silence known-benign LiveKit / WebRTC error noise in client Sentry
//
// These patterns fire one alert email per occurrence even though they're
// functionally non-bugs: user-denied permissions, LiveKit SDK internal
// races during rapid mobile room transitions, camera hardware conflicts.
// Server-side Sentry is unaffected.

import * as nodeFs from 'fs';
import * as nodePath from 'path';

function readClient(relPath: string): string {
  return nodeFs.readFileSync(
    nodePath.join(__dirname, '../../../../client/src', relPath),
    'utf8',
  );
}

describe('Tier-1 A9 — client Sentry filters benign LiveKit/WebRTC noise', () => {
  const src = readClient('lib/sentry.ts');

  it('declares a BENIGN_ERROR_PATTERNS array', () => {
    expect(src).toMatch(/BENIGN_ERROR_PATTERNS:\s*RegExp\[\]/);
  });

  it('filters LiveKit track-publish races (RSN-CLIENT-2/3/4)', () => {
    expect(src).toMatch(/publishing rejected as engine not connected/i);
  });

  it('filters LiveKit transport AbortError (RSN-CLIENT-7)', () => {
    expect(src).toMatch(/AbortError:\\s\*The operation was aborted/i);
  });

  it('filters user-denied permission errors (RSN-CLIENT-5)', () => {
    expect(src).toMatch(/NotAllowedError:\\s\*Permission denied/i);
  });

  it('filters camera-source-unreadable errors (RSN-CLIENT-6)', () => {
    expect(src).toMatch(/NotReadableError:\\s\*Could not start video source/i);
  });

  it('keeps the existing Network Error filter', () => {
    expect(src).toMatch(/Network Error/);
  });

  it('beforeSend iterates the pattern list and returns null on match', () => {
    const beforeSendStart = src.indexOf('beforeSend(event)');
    const beforeSendEnd = src.indexOf('},', beforeSendStart);
    const block = src.slice(beforeSendStart, beforeSendEnd);
    expect(block).toMatch(/for\s*\(\s*const pattern of BENIGN_ERROR_PATTERNS\s*\)/);
    expect(block).toMatch(/return null/);
  });
});
