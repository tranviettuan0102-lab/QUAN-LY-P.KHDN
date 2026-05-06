# Security Specification for V-Banker Pro

## 1. Data Invariants
- A `KPI` must belong to a valid `User`. Only `Managers` can create/update `target` for any user. `RMs` can only update their own `actual` values.
- A `Dossier` must belong to a `User`. Only the owner can update it.
- A `Customer` must belong to a `User`. Only the owner can view/update.
- `ActivityLog` entries are immutable once created (or at least strictly owner-controlled).

## 2. The "Dirty Dozen" Payloads (Red Team Test Cases)
1. CR-01: RM attempts to update another RM's KPI target.
2. CR-02: User attempts to create a User profile with `role: 'Manager'` if they are not authorized.
3. CR-03: RM attempts to delete a Dossier they don't own.
4. CR-04: Anonymous user attempts to read the `customers` collection.
5. CR-05: User sends a 1MB string in `Customer.notes` (Resource Poisoning).
6. CR-06: User attempts to change `userId` of an existing Dossier.
7. CR-07: User attempts to create a KPI with a non-existent `userId`.
8. CR-08: User attempts to update `updatedAt` with a client-side timestamp instead of `request.time`.
9. CR-09: User attempts to list `dossiers` without a filter (Query Scraping).
10. CR-10: User attempts to inject special characters into a document ID.
11. CR-11: User attempts to update a Dossier that is already in `Giải ngân` (Terminal State Locking).
12. CR-12: User attempts to create a profile with an unverified email.

## 3. Test Runner (Draft)
(Implement in firestore.rules.test.ts if needed, but for now I'll focus on the rules)
