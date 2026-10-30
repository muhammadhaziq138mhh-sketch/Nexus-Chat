# Security Specification for Nexus Social & Real-Time Messaging

## 1. Data Invariants
- A user can only write to their own `/users/{userId}` and `/userSettings/{userId}` document.
- Users cannot grant themselves the 'admin' role in `/users/{userId}`; admin access is strictly checked via admin email or privileged collection.
- Posts can only be created by signed-in users with `authorId == request.auth.uid`.
- Posts can only be edited or deleted by the post author or an administrator.
- Comments and reactions must be authored by the signed-in user and linked to an existing post.
- Direct or group messages can only be sent by members of the conversation.
- WebRTC call signaling documents can only be accessed and modified by participants of the call (`callerId` or `receiverId`).
- Notifications can only be listed/read by their designated `recipientId`.
- Moderation reports can be created by any authenticated user, but only reviewed and updated by administrators.

## 2. The Dirty Dozen Payloads (Negative Test Payloads)
1. **Unauthenticated User Profile Mutation**: An unauthenticated user attempts to create or overwrite `/users/victim_user`. Expected: PERMISSION_DENIED.
2. **Privilege Escalation in Profile**: Authenticated user attempts to set `role: "admin"` on their own profile. Expected: PERMISSION_DENIED.
3. **Ghost Profile Tampering**: User A attempts to update User B's displayName or bio. Expected: PERMISSION_DENIED.
4. **Post Impersonation**: User A submits a post with `authorId: "user_B"`. Expected: PERMISSION_DENIED.
5. **Unauthorized Post Deletion**: User B attempts to delete User A's post. Expected: PERMISSION_DENIED.
6. **Comment Identity Spoofing**: User A adds a comment under User B's authorId. Expected: PERMISSION_DENIED.
7. **Foreign Conversation Sniffing**: User C queries or listens to a direct conversation between User A and User B where User C is not in `participantIds`. Expected: PERMISSION_DENIED.
8. **Message Injection into Private Room**: User C attempts to post a message into a conversation between User A and User B. Expected: PERMISSION_DENIED.
9. **Private Call Signaling Interception**: User C attempts to read SDP offers or ICE candidates from a call between User A and User B. Expected: PERMISSION_DENIED.
10. **Notification Scraping**: User B attempts to list notifications meant for User A (`recipientId == "user_A"`). Expected: PERMISSION_DENIED.
11. **Report Tampering by Standard User**: A non-admin user attempts to change a moderation report status from `pending` to `resolved`. Expected: PERMISSION_DENIED.
12. **Settings Leak**: A non-owner attempts to read or mutate `/userSettings/{userId}`. Expected: PERMISSION_DENIED.
