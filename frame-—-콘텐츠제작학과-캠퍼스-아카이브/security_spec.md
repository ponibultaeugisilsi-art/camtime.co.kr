# Security Specification — FRAME Campus Archive

## 1. Data Invariants
1. **Identity Integrity**: Every user-authored document (`contests`, `clubs`, `studyTips`, `teamRecruits`, `portfolioWorks`, `equipGuides`, `communityPosts`, `departmentNews`, and all subcollection `comments`) MUST have `authorId == request.auth.uid` on creation and immutable `authorId` on update.
2. **Verified Users Only**: All database writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **PII Isolation**: Sensitive fields (`email`, `studentNumber`) live exclusively in `usersPrivate/{userId}` where only `request.auth.uid == userId` can read or write; `list` is explicitly denied.
4. **Parent-Child Relational Integrity**: Subcollection comments (`clubs/{clubId}/comments`, `teamRecruits/{recruitId}/comments`, `portfolioWorks/{workId}/comments`, `communityPosts/{postId}/comments`) verify `exists(...)` on the parent document and `incoming().parentId == <parentId>`.
5. **Temporal Integrity**: `createdAt` must equal `request.time` on create and remain immutable on update; `updatedAt` must equal `request.time` on create and update.
6. **Terminal State Locking**: `teamRecruits` and `clubs` enforce explicit status transitions via `affectedKeys().hasOnly(...)` and validate enum values; once `teamRecruits.status == '마감'`, non-admin edits to closed recruitment are restricted unless re-opened or updated only by the owner/admin within valid enum constraints (or locked if finished). Specifically, once `teamRecruits.status == '마감'`, further updates are blocked unless performed by `isAdmin()`.
7. **Strict Key & Size Boundaries**: Every write validates `keys().hasAll(...)` and `keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` on update, and `.size()` limits on every string and array.
8. **Report Privacy & Moderation Integrity**: Documents in `/reports/{reportId}` use deterministic IDs (`${reporterId}_${targetType}_${targetId}`) to prevent duplicate spam reports, validate parent/target existence via `exists(...)` on create, start strictly at `status == '접수됨'` and `adminNote == ''`, restrict reads/list queries strictly to the reporter (`reporterId == request.auth.uid`) or verified admin, and allow status/adminNote updates and deletes exclusively by `isAdmin()`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on Contest Create**: `{ ..., isFeatured: true, views: 99999 }` -> Rejected by `hasOnly(...)`.
2. **Identity Spoofing on Community Post**: `{ authorId: "other_uid", ... }` -> Rejected by `authorId == request.auth.uid`.
3. **Unverified Email Write**: Auth token with `email_verified: false` attempting `contests` create -> Rejected by `isVerified()`.
4. **PII Scraping (`usersPrivate` list)**: Unauthenticated or other user running `getDocs(collection(db, 'usersPrivate'))` -> Rejected by `allow list: if false`.
5. **Cross-User PII Read**: User B reading `/usersPrivate/userA` -> Rejected by `isOwner(userId)`.
6. **ID Poisoning**: Creating `/contests/../../etc/passwd` or 200-char ID -> Rejected by `isValidId(contestId)`.
7. **Timestamp Forgery**: Creating a post with backdated `createdAt` instead of `serverTimestamp()` -> Rejected by `createdAt == request.time`.
8. **Immutable Field Mutation**: Updating `contests` while changing `authorId` or `createdAt` -> Rejected by `affectedKeys().hasOnly(...)` and immutability check.
9. **Value Poisoning on Update**: Updating `teamRecruits` `status` to `"무제한"` (invalid enum) or 10KB string -> Rejected because `isValidTeamRecruit(incoming())` wraps the entire update block.
10. **Orphaned Comment Write**: Creating a comment under `/clubs/nonexistent_id/comments/c1` -> Rejected by `exists(/databases/$(database)/documents/clubs/$(clubId))`.
11. **Unbounded Array Bomb**: Creating `teamRecruits` with 50 strings in `neededRoles` -> Rejected by `data.neededRoles.size() >= 1 && data.neededRoles.size() <= 6`.
12. **Bookmark & Report Hijacking / Moderation Escalation**: User B reading/listing User A's bookmark or report, or a non-admin creating/updating a report with `status: '조치완료'` -> Rejected by `resource.data.reporterId == request.auth.uid`, `incoming().status == '접수됨'`, and `isAdmin()` update gate.

