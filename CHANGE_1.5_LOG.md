Change 1.5 — Feedback Fixes (2026-03-19)

We reviewed the Change 1.5 feedback and shipped these fixes. Please test on app.rsn.network — log out and log back in first.

For each item: Pass / Fail / Partial + screenshot if something is off.

---

1. Invite Acceptance Fix
   - Invites now work for any email — no more "sent to a different email" error
   - Anyone with an invite link can accept it, regardless of which email they sign in with
   - Rate limit raised from 10 to 100 invites per day
   - Only pending invites count against the limit (accepted/expired ones don't)

2. Notification Text — Full Event Name
   - Notification titles now show the complete event or pod name (no more truncation)
   - Body text wraps instead of cutting off

3. Notification Details — Event Date & Time
   - Event invite notifications now show: event name, day, and time in the body
   - Pod invite notifications show the pod name and who invited you
   - Example: "Speed Networking · Thu, Mar 20 at 3:00 PM"

4. Notifications Update on All Pages
   - Bell icon now polls for new notifications every 30 seconds on all pages
   - Previously only updated inside live events (via socket) or when you clicked the bell
   - You'll now see the red badge update while browsing Dashboard, Pods, Events, etc.

5. Profile Page — No More Dark Flash
   - Clicking a profile link no longer shows a brief dark flash before the page loads
   - Main content area now has explicit white background

6. Google Login — Single Click
   - Google login no longer forces the consent screen every time
   - Now uses "select account" prompt — pick your account and you're in
   - No more double-click or re-authorizing

7. Admin Sidebar Navigation
   - When you're on any Admin page, the left sidebar now shows all admin sub-pages:
     Users, Pods, Events, Join Requests, Moderation, Templates, Email
   - Click any sub-page directly from the sidebar (no need to go back to the dashboard)

8. Bulk Change Role (Admin)
   - Admin → Users → select multiple users → new "Bulk Change Role" dropdown in the action bar
   - Options: Member, Admin, Super Admin
   - Existing bulk actions (Suspend, Ban, Reactivate) still work as before

9. Admin Pods & Events — Clickable
   - Admin → Pods: clicking a pod name now opens that pod's detail page
   - Admin → Events: clicking an event title now opens that event's detail page
   - Previously these were just text with no links

10. Auto-Join Pod on Event Invite
    - When you accept an event invite, you're now automatically added to the event's pod too
    - No more "you must be a pod member first" friction
    - If you're already a member, nothing changes

---

Questions? Reply with screenshots and we'll fix anything immediately.
