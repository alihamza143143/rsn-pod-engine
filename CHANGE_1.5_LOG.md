Hi! We've shipped Change 1.5 — a major live event UX overhaul. Please test on app.rsn.network — log out and log back in first to get a fresh session.

  For each item: Pass / Fail / Partial + screenshot if something is off.

  ---

  1. Event State Banner
  - Join any live event → persistent banner at top always shows current state
  - Before host starts: "Waiting for participants"
  - Host starts event: "Host introduction in progress"
  - Host clicks Match: "Matching participants"
  - Round begins: "Round 1 Live" (updates for Round 2, 3, etc.)
  - Between rounds: "Back in lobby"
  - Event ends: "Event completed"
  - Banner never disappears — always visible throughout the event

  2. Chat Open by Default
  - Join any event → chat panel is already open on the right side
  - No need to click the chat button to open it
  - Close it manually → stays closed (toggle still works)

  3. Clickable Links in Chat
  - Send a message containing a URL (e.g. https://rsn.network) → appears as a clickable blue link
  - Click the link → opens in new tab
  - Host sends announcement with a URL → link is clickable in the banner too
  - Plain text messages still render normally

  4. Recap — Round-by-Round Grouping
  - Complete an event with 2+ rounds → go to recap
  - Connections grouped under clear section headers: "Round 1", "Round 2", "Round 3"
  - Each section shows who you met in that specific round
  - Not a flat list anymore — visually separated sections

  5. Recap — Clickable Profiles
  - On the recap page → click any participant's name or avatar
  - Opens their profile page
  - Works on both the Event Complete screen and the /recap page

  6. Rating — No More Dead Time
  - After a round ends, submit your rating
  - If all participants in the round have rated → immediately moves to lobby (no waiting)
  - You should NOT be stuck on "Waiting for next round..." if everyone already rated
  - If some people haven't rated yet → normal countdown continues

  7. Leave Conversation (Back to Lobby)
  - During a breakout round → two separate buttons visible:
    a) "Back to Lobby" or "Leave Conversation" → returns you to the lobby, stays in event
    b) "Leave Event" → exits the event entirely
  - Click "Back to Lobby" → you're back in the lobby with other waiting participants
  - You can be rematched in the next round
  - Your partner sees a notification that you left the conversation

  8. Auto-Return if Alone
  - Your partner leaves the breakout room (via "Back to Lobby" or disconnect)
  - After a few seconds → you automatically return to the lobby
  - Message shown: "Your partner left — returning to lobby"
  - You're added to the rematch pool for the next round

  9. Matching Anticipation Screen
  - Host clicks "Match People" and confirms → all participants see a full-screen overlay
  - Animated graphic with "Matching people..." text
  - Holds for 2-3 seconds (building anticipation)
  - Then briefly shows "X breakout rooms created"
  - Then transitions into breakout rooms

  10. Emoji Reactions
  - During event (lobby or breakout room) → reaction buttons visible
  - Raise Hand: click → hand icon appears on your video tile, stays until dismissed
  - Heart: click → brief heart animation on your tile
  - Clap: click → brief clap animation on your tile
  - Host can see raised hands in participant panel
  - Reactions visible to everyone in the same room/lobby

  11. Participant List Sidebar
  - During any phase of the event → toggle a "Participants" sidebar
  - Shows all participants with: name, avatar, status (in lobby / in room / disconnected)
  - Available to all users (not just host)
  - Updates in real-time as people join, leave, or move between rooms

  12. Co-Host / Moderator Delegation
  - Host → participant panel → click a user → option to "Promote to Co-Host"
  - Works even after the event has started
  - Co-host can: manage rooms, trigger rematch, move users, help monitor
  - Host can remove co-host rights at any time

  13. Add People During Live Event
  - Host → invite button available during lobby or between rounds
  - Opens the normal invite modal (email, platform search, shareable link)
  - New participants join into lobby (not into an active round)
  - Does NOT require ending or restarting the event

  14. Select All in Invites (Events + Pods)
  - Invite platform users to an event OR a pod → platform user search
  - "Select All" checkbox at the top of search results (both event and pod invites)
  - Multi-select still works (checkboxes per user)
  - Bulk invite button shows count: "Send X Invite(s)"
  - Already-registered/members show as disabled with badge

  15. Unified Host Dashboard
  - Host → during event → always-visible status summary:
    "X in lobby | X in rooms | X disconnected | X left"
  - Updates in real-time
  - Available in all event phases (not just during rounds)

  16. Post-Event Feedback Prompt
  - After event completes → below the recap, text input appears
  - Prompt: "Is there anything you want to add?"
  - This is for overall event feedback (not per-round)
  - Submit → feedback saved
  - Host can view all participant feedback in their recap

  17. Host Event-Wide Recap
  - Host → recap page → host-specific view showing:
    - Full round breakdown: who matched with whom in every room
    - Participation stats per user
    - All collected feedback
    - Formatted export (not raw JSON)

  18. Virtual Background
  - In video room → background toggle button in controls bar
  - Options: None, Blur, or image backgrounds
  - Applies to your video feed only
  - Persists throughout the event

  19. Notifications Center
  - Bell icon in the top navigation bar
  - Click → dropdown showing: event invites, updates, reminders
  - Mark as read/unread
  - Persists across pages (not just toasts)

  20. Pin / Highlight Speaker
  - In video room → click a participant's tile to pin them as the main speaker
  - Pinned tile expands to be larger
  - Unpin to return to normal grid

  21. Layout Density Toggle
  - In lobby → toggle for: Compact, Medium, Spacious grid layout
  - Matters most when 10+ participants are in lobby
  - Host preference, not global

  ---

Questions? Reply with screenshots and we'll fix anything immediately.
