# SFGC Church Mobile App & Backend — Performance Audit Report

## Overview
This document contains the complete performance audit for the SFGC Church Mobile App and Node.js/Express/MongoDB backend. All issues have been analyzed across frontend React Native components, global state management, list rendering, network API requests, image handling, Socket.IO real-time channels, push notification listeners, and backend database queries.

---

## Identified Performance Issues & Recommendations

### 1. Unnecessary Re-renders from AppContext Provider Value
- **File**: `mobile-app/src/context/AppContext.tsx`
- **Why it affects performance**: The context provider value object is constructed inline on every render of `AppProvider`. Whenever any state item (`liveSession`, `favorites`, `setlist`, `notices`, `events`, `loading`) changes, every component subscribed to `useApp()` is forced to re-render, causing cascade re-renders throughout the application.
- **Severity**: Critical
- **Recommended Fix**: Wrap the provider `value` in `useMemo` with explicit dependency arrays. Wrap context action handlers (`login`, `logout`, `toggleFavorite`, `addToSetlist`, `removeFromSetlist`, etc.) in `useCallback`.

---

### 2. Excessive API Response Payloads (Song List Includes Full Lyrics)
- **File**: `backend/src/controllers/songController.ts` & `mobile-app/src/services/songsService.ts`
- **Why it affects performance**: `GET /api/songs` returns full Mongoose documents containing all multi-slide `lyrics` arrays for every song in the database. For 100+ songs, this generates a massive JSON payload (hundreds of KB to MBs) over the network every time the song list or app data refreshes.
- **Severity**: High
- **Recommended Fix**: Add field projection on `GET /api/songs` (`.select('-lyrics -chords')`) to return only summary fields required for list rendering (`_id`, `title`, `language`, `category`, `tags`, `youtubeLink`, `viewsCount`). Fetch full lyrics only when opening an individual song via `GET /api/songs/:id`.

---

### 3. Inline Render Functions & Missing Memoization in FlatLists
- **Files**: `mobile-app/src/app/songs.tsx`, `mobile-app/src/app/index.tsx`, `mobile-app/src/app/live-lyrics.tsx`
- **Why it affects performance**: FlatList `renderItem` functions are declared inline inside screen components, causing new function instances to be created on every render pass. List item components are not memoized, causing all visible items to re-render whenever parent screen state (such as search text or scroll position) changes.
- **Severity**: High
- **Recommended Fix**: Extract list items (`SongCard`, `VideoCard`) into standalone components wrapped with `React.memo`. Memoize `renderItem` and `keyExtractor` functions with `useCallback`.

---

### 4. Excessive API Re-fetching on Screen Focus & Socket Events
- **Files**: `mobile-app/src/context/AppContext.tsx`, `mobile-app/src/app/index.tsx`, `mobile-app/src/app/events.tsx`, `mobile-app/src/app/songs.tsx`
- **Why it affects performance**: Receiving any socket notification (`newEvent`, `new_video_notification`, `new_promise_notification`) triggers `refreshData()`, which executes a full `Promise.all([songsService.getSongs(), eventsService.getEvents(), noticesService.getNotices()])`. Additionally, screens execute `refreshData()` unconditionally on every screen focus via `useFocusEffect`.
- **Severity**: High
- **Recommended Fix**: Implement selective socket updates (updating local state directly with the received socket item rather than re-fetching the entire DB). Cache API responses in memory with a timestamp TTL to avoid duplicate fetches on rapid screen navigation.

---

### 5. Standard Image Component Used Instead of Expo-Image Caching
- **Files**: `mobile-app/src/app/index.tsx`, `mobile-app/src/app/events.tsx`, `mobile-app/src/app/notifications.tsx`, `mobile-app/src/app/live-lyrics.tsx`
- **Why it affects performance**: Remote images (YouTube thumbnails, event banners, notice pictures) use React Native's core `<Image>` component without memory or disk caching. This leads to flickering, higher memory usage, and repeated image downloads.
- **Severity**: Medium
- **Recommended Fix**: Replace `Image` from `react-native` with `Image` from `expo-image` (already available in `package.json`), setting memory and disk caching policies (`contentFit="cover"`, `transition={200}`).

---

### 6. Socket.IO Connection Cleanup & Listener Duplication
- **Files**: `mobile-app/src/context/AppContext.tsx`, `mobile-app/src/app/live-lyrics.tsx`
- **Why it affects performance**: `initGlobalSocket` in `AppContext.tsx` sets up socket event listeners. If `initGlobalSocket` is called multiple times without explicitly removing existing listeners (`socket.off(...)`), duplicate callback execution and memory leaks occur.
- **Severity**: High
- **Recommended Fix**: Ensure socket event listeners are attached once and cleaned up properly on unmount or socket disconnect using `socket.off()`.

---

### 7. Un-cached AsyncStorage Access & Repeated JSON Parsing
- **Files**: `mobile-app/src/services/mongoService.ts`, `mobile-app/src/services/apiClient.ts`, `mobile-app/src/context/AppContext.tsx`
- **Why it affects performance**: `apiClient.ts` reads `AsyncStorage.getItem('userToken')` on EVERY single HTTP request. `mongoService` reads and parses chunked JSON from AsyncStorage on every local query without an in-memory cache layer.
- **Severity**: Medium
- **Recommended Fix**: Maintain an in-memory variable cache for auth token and local collections. Read from AsyncStorage only once on application startup or when items are explicitly updated.

---

### 8. Missing MongoDB Database Indexes
- **Files**: `backend/src/models/Event.ts`, `backend/src/models/Notice.ts`, `backend/src/models/User.ts`
- **Why it affects performance**: `Event` documents are sorted by `{ date: 1 }` without an index. `Notice` documents are sorted by `{ createdAt: -1 }` without an index. `User` authentication queries `{ mobileNumber }` without an index.
- **Severity**: Medium
- **Recommended Fix**: Define Mongoose indexes:
  - `EventSchema.index({ date: 1 })`
  - `NoticeSchema.index({ createdAt: -1 })`
  - `UserSchema.index({ mobileNumber: 1 })`
  - `UserSchema.index({ email: 1 })`

---

### 9. Full Document Write Cycle for View Count Increments
- **File**: `backend/src/controllers/songController.ts`
- **Why it affects performance**: `getSongById` fetches the song document, increments `song.viewsCount`, and executes `await song.save()`. This triggers full Mongoose schema validation and updates all fields instead of performing a fast atomic update.
- **Severity**: Medium
- **Recommended Fix**: Use `Song.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } }, { new: true })`.

---

### 10. Repeated Event Reminder Scheduling Loops
- **Files**: `mobile-app/src/context/AppContext.tsx`, `mobile-app/src/services/notificationService.ts`
- **Why it affects performance**: `refreshData()` iterates over all events and calls `notificationService.scheduleLocalEventReminder(evt)` for every single event on every data load, causing redundant local notification scheduling calls.
- **Severity**: Low
- **Recommended Fix**: Maintain a set of already scheduled local notification IDs to avoid re-scheduling identical event reminders.

---

## Action Plan (Phases 2 – 18)

1. **Context & State Optimization**: Memoize `AppContext` value and handlers.
2. **Backend API & Payload Optimization**: Add `.select('-lyrics -chords')` to song list endpoint and add MongoDB indexes on `Event`, `Notice`, and `User` models.
3. **API & Service Layer Caching**: Implement TTL memory caching in `songsService`, `eventsService`, and `noticesService`.
4. **List & Component Optimization**: Extract memoized item components (`SongListItem`, `VideoCarouselItem`) with stable callbacks.
5. **Image Component Upgrade**: Replace `react-native` `Image` with `expo-image` across screens.
6. **Socket & Notification Cleanups**: Audit socket event registration and notification response listeners.
7. **AsyncStorage Cache**: Cache token in memory for `apiClient`.
8. **Testing & Verification**: Run typecheck, lint, build checks, and generate final performance report.
