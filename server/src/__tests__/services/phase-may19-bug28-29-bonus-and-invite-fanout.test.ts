// Bug 28 (19 May Ali + Stefan) — bonus-round badge. Stefan agreed in
// his 19 May WhatsApp chat: "Another Round" presses ARE counted in the
// event total (DB + UI + recap), framed as "bonus" rounds on top of the
// originally-configured count. UI surfaces a "Bonus" pill on the round
// header for any round past `numberOfRounds - bonusRoundsAdded`, and
// recap shows the honest "3 original + 1 bonus" split.
//
// Bug 29 (19 May Ali) — invite-accept was a real-time hole. Routes for
// pod add/remove/role-change/approve/reject all called notifyPodChanged
// at routes/pods.ts:319/342/365/449/473, but POST /invites/:code/accept
// (in routes/invites.ts) added the user via inviteService.acceptInvite
// and never fanned out. Result: when Raja accepted Waseem's pod invite,
// Raja's UI saw himself as active but Waseem's pod page kept showing
// "Pending Invite" until a manual refresh. Wire the same notify calls
// into the accept path so every member converges within ~2 s.

import * as nodeFs from 'fs';
import * as nodePath from 'path';

function readServer(rel: string): string {
  return nodeFs.readFileSync(nodePath.join(__dirname, '../../', rel), 'utf8');
}
function readClient(rel: string): string {
  return nodeFs.readFileSync(
    nodePath.join(__dirname, '../../../../client/src', rel),
    'utf8',
  );
}
function readShared(rel: string): string {
  return nodeFs.readFileSync(
    nodePath.join(__dirname, '../../../../shared/src', rel),
    'utf8',
  );
}

describe('Bug 28 — bonus-round counter + UI badge + recap split', () => {
  describe('Shared types carry bonusRoundsAdded', () => {
    const sessionTypes = readShared('types/session.ts');
    const matchTypes = readShared('types/match.ts');
    const eventsTypes = readShared('types/events.ts');

    it('SessionConfig declares optional bonusRoundsAdded: number', () => {
      expect(sessionTypes).toMatch(/bonusRoundsAdded\?:\s*number/);
    });

    it('PeopleMet declares optional bonusRoundsAdded: number for the recap', () => {
      expect(matchTypes).toMatch(/bonusRoundsAdded\?:\s*number/);
    });

    it('host:event_plan_repaired payload carries optional bonusRoundsAdded', () => {
      const idx = eventsTypes.indexOf("'host:event_plan_repaired'");
      expect(idx).toBeGreaterThan(-1);
      const window = eventsTypes.slice(idx, idx + 1200);
      expect(window).toMatch(/bonusRoundsAdded\?:\s*number/);
    });
  });

  describe('Server bumps + persists bonusRoundsAdded on "Another Round"', () => {
    const flowSrc = readServer('services/orchestration/handlers/matching-flow.ts');

    it('handleHostGenerateMatches increments bonusRoundsAdded alongside numberOfRounds', () => {
      expect(flowSrc).toMatch(
        /const\s+bonusRoundsAdded\s*=\s*\(activeSession\.config\.bonusRoundsAdded\s*\?\?\s*0\)\s*\+\s*1/,
      );
      // The mutated config carries both new fields.
      expect(flowSrc).toMatch(
        /activeSession\.config\s*=\s*\{[\s\S]{0,400}numberOfRounds:\s*bumpedRounds[\s\S]{0,80}bonusRoundsAdded/,
      );
    });

    it('nested jsonb_set rewrites BOTH numberOfRounds and bonusRoundsAdded in one UPDATE', () => {
      expect(flowSrc).toMatch(
        /jsonb_set\s*\(\s*jsonb_set\(config,\s*'\{numberOfRounds\}'[\s\S]{0,200}'\{bonusRoundsAdded\}'/,
      );
    });

    it('host:event_plan_repaired broadcast includes bonusRoundsAdded', () => {
      const emitIdx = flowSrc.indexOf("emit('host:event_plan_repaired'");
      expect(emitIdx).toBeGreaterThan(-1);
      const window = flowSrc.slice(emitIdx, emitIdx + 800);
      expect(window).toMatch(/bonusRoundsAdded/);
    });
  });

  describe('Snapshot + recap surface the count', () => {
    const snapshotSrc = readServer('services/session/session-state-snapshot.service.ts');
    const ratingSrc = readServer('services/rating/rating.service.ts');

    it('SessionStateSnapshot interface declares bonusRoundsAdded: number', () => {
      expect(snapshotSrc).toMatch(/bonusRoundsAdded:\s*number/);
    });

    it('snapshot builder reads bonusRoundsAdded from config (0 fallback)', () => {
      expect(snapshotSrc).toMatch(
        /bonusRoundsAdded:\s*\(config as any\)\?\.bonusRoundsAdded\s*\?\?\s*0/,
      );
    });

    it('getPeopleMet pulls bonusRoundsAdded from session config (0 fallback)', () => {
      expect(ratingSrc).toMatch(
        /bonusRoundsAdded\s*=\s*typeof\s+config\?\.bonusRoundsAdded\s*===\s*'number'/,
      );
      // Returned in the PeopleMet payload.
      expect(ratingSrc).toMatch(/return\s*\{[\s\S]{0,500}bonusRoundsAdded,/);
    });
  });

  describe('Client hydrates + renders the "Bonus" badge', () => {
    const storeSrc = readClient('stores/sessionStore.ts');
    const socketSrc = readClient('hooks/useSessionSocket.ts');
    const livePageSrc = readClient('features/live/LiveSessionPage.tsx');
    const recapSrc = readClient('features/sessions/RecapPage.tsx');

    it('store carries bonusRoundsAdded with a setter and a default of 0', () => {
      expect(storeSrc).toMatch(/bonusRoundsAdded:\s*number;/);
      expect(storeSrc).toMatch(/bonusRoundsAdded:\s*0,/);
      expect(storeSrc).toMatch(/setBonusRoundsAdded:\s*\(count:\s*number\)\s*=>\s*void/);
    });

    it('snapshot hydrator pulls bonusRoundsAdded from snapshot', () => {
      expect(storeSrc).toMatch(
        /bonusRoundsAdded:\s*typeof\s*\(snapshot as any\)\.bonusRoundsAdded\s*===\s*'number'/,
      );
    });

    it('host:event_plan_repaired handler pushes bonusRoundsAdded into store when present', () => {
      const fnIdx = socketSrc.indexOf("socket.on('host:event_plan_repaired'");
      const fn = socketSrc.slice(fnIdx, fnIdx + 3500);
      expect(fn).toMatch(
        /typeof\s+data\?\.bonusRoundsAdded\s*===\s*'number'[\s\S]{0,250}store\.setBonusRoundsAdded\(/,
      );
    });

    it('EventStateBanner renders a "Bonus" pill on rounds past the original count', () => {
      // The badge must depend on (totalRounds - bonusRoundsAdded) — that's
      // the original count. Any currentRound past it is bonus.
      expect(livePageSrc).toMatch(/originalRounds\s*=\s*totalRounds\s*-\s*bonusCount/);
      expect(livePageSrc).toMatch(/currentRound\s*>\s*originalRounds/);
      // And the literal "Bonus" pill exists.
      expect(livePageSrc).toMatch(/>\s*Bonus\s*</);
    });

    it('Recap participation line shows the "(N original + M bonus)" split when present', () => {
      expect(recapSrc).toMatch(/\(data\.bonusRoundsAdded\s*\?\?\s*0\)\s*>\s*0/);
      expect(recapSrc).toMatch(/data\.totalRounds\s*-\s*\(data\.bonusRoundsAdded\s*\?\?\s*0\)/);
      expect(recapSrc).toMatch(/\{data\.bonusRoundsAdded\}[\s\S]{0,40}bonus/);
    });
  });
});

describe('Bug 29 — invite-accept fans out pod + session list changes', () => {
  const invitesRoute = readServer('routes/invites.ts');

  it('imports orchestrationService so the route can call notifyPodChanged + notifySessionListChanged', () => {
    expect(invitesRoute).toMatch(
      /import\s+\*\s+as\s+orchestrationService\s+from\s+['"]\.\.\/services\/orchestration\/orchestration\.service['"]/,
    );
  });

  it('accept route calls notifyPodChanged after acceptInvite when a pod is involved', () => {
    const acceptIdx = invitesRoute.indexOf("'/:code/accept'");
    expect(acceptIdx).toBeGreaterThan(-1);
    const acceptEnd = invitesRoute.indexOf('// ─── POST /invites/:code/mark-accepted', acceptIdx);
    const fn = invitesRoute.slice(acceptIdx, acceptEnd > -1 ? acceptEnd : acceptIdx + 4000);
    expect(fn).toMatch(/result\.registeredFor\.podId/);
    expect(fn).toMatch(
      /orchestrationService[\s\S]{0,80}notifyPodChanged\([\s\S]{0,200}'invite_accepted'/,
    );
  });

  it('accept route also fires notifySessionListChanged for session-typed invites', () => {
    const acceptIdx = invitesRoute.indexOf("'/:code/accept'");
    const acceptEnd = invitesRoute.indexOf('// ─── POST /invites/:code/mark-accepted', acceptIdx);
    const fn = invitesRoute.slice(acceptIdx, acceptEnd > -1 ? acceptEnd : acceptIdx + 4000);
    expect(fn).toMatch(/result\.registeredFor\.sessionId/);
    expect(fn).toMatch(
      /orchestrationService[\s\S]{0,80}notifySessionListChanged\([\s\S]{0,300}'invite_accepted'/,
    );
  });
});
