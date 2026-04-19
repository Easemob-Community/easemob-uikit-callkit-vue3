---
name: agora-rtc-vue3-callkit-debug
description: >
  Debug and fix common Agora RTC + Vue3 + Pinia issues in the Easemob CallKit Vue3 project.
  Use this skill when working on video/audio call features involving:
  (1) Agora SDK subscription errors (INVALID_REMOTE_USER), track assignment failures,
      or remote video/audio not rendering after subscribe success.
  (2) Vue3 reactivity bugs with Pinia stores holding Map/Set/Array of objects
      (especially when mutating nested properties like participant.videoTrack).
  (3) uid-to-userId mapping resolution for Agora remote users in group calls.
  (4) Component-level video element lifecycle issues (v-if + track.play timing).
  (5) Migrating from old call architecture to new group call architecture
      while keeping legacy component inactive via feature flags.
---

# Agora RTC + Vue3 CallKit Debug Skill

## Trap 1: `INVALID_REMOTE_USER` on `client.subscribe()`

### Symptom
`client.subscribe(user, 'video')` throws `INVALID_REMOTE_USER` even though the user is in the channel.

### Root Cause
Agora SDK internally checks `user instanceof RemoteUser` on the passed object. The `user` object from event callbacks (`user-published`, `user-joined`) may not share the same reference as SDK's internal `_users` array. When the instanceof check fails, SDK falls back to treating the argument as a uid string (`remoteUsers.find(t => t.uid === user)`), but since `user` is an object, `t.uid === user` is always `false`.

### Fix
Pass the raw `uid` (number or string) instead of the `IAgoraRTCRemoteUser` object:

```ts
// ❌ BAD - passes object reference that may not match SDK internal instance
await client.subscribe(user, 'video')

// ✅ GOOD - passes uid, SDK looks up the internal RemoteUser by uid
await client.subscribe(user.uid, 'video')
```

After subscription, fetch the **actual** `RemoteUser` instance from `client.remoteUsers` to read the track:

```ts
await client.subscribe(uid, 'video')
const remoteUser = client.remoteUsers.find(u => u.uid === uid)
if (remoteUser?.videoTrack) {
  remoteVideoTracks.set(uid.toString(), remoteUser.videoTrack)
}
```

### Related Log Patterns
- `INVALID_REMOTE_USER`
- `Failed to subscribe remote user`

---

## Trap 2: Vue3 `ref(Map)` Shallow Reactivity

### Symptom
Store action sets `participant.videoTrack = track`, but the UI (`computed`, `watch`) does **not** update. The video tile stays blank even though logs confirm the track was stored.

### Root Cause
In Vue3, `ref(new Map())` is **shallow reactive** for the Map's contents. Mutating an object inside the Map (`map.get(key).prop = value`) does **not** trigger reactivity. Vue tracks `Map.set()` / `Map.delete()` / ref reassignment, but not property mutations on existing values.

### Fix
After mutating properties on a Map value, reassign the entire Map:

```ts
// Pinia store with ref<Map>
const participants = ref<Map<string, Participant>>(new Map())

function setVideoTrack(userId: string, track: IRemoteVideoTrack | null) {
  const p = participants.value.get(userId)
  if (!p) return
  p.videoTrack = track        // mutation alone does NOT trigger reactivity!
  p.state = track ? 'publishing' : 'joinedRtc'
  
  // ✅ Force Vue to detect the change
  participants.value = new Map(participants.value)
}
```

Apply this pattern to **all** store actions that mutate Participant properties:
- `setVideoTrack`
- `setAudioTrack`
- `setLocalStream`
- `setMuteState`
- `setCameraState`
- `setSpeakingState`
- `setParticipantState`

### Alternative (less preferred)
Use `participants.value.set(userId, { ...p, videoTrack: track })` instead of property mutation. Both approaches work; reassignment of the whole Map is less error-prone when multiple properties are mutated.

---

## Trap 3: `v-if` + Video Element Mount Timing

### Symptom
Remote video track exists and `showVideo` computed becomes `true`, but the `<video>` element never plays the track. The placeholder "已接通，等待画面..." stays visible.

### Root Cause
`ParticipantTile.vue` uses `v-if="showVideo"` to conditionally render the `<video>` element. The `watch` was listening to `track?.getTrackId?.()` and `stream?.id`. When `showVideo` flips from `false` to `true` (e.g., state changes from `joinedRtc` to `publishing`), the `<video>` element is mounted **after** the watch has already fired. If the track reference itself did not change, the watch callback does not re-run, so `track.play(el)` is never called on the newly mounted element.

### Fix
Add the `videoEl` ref itself to the watch dependencies:

```ts
// ❌ BAD - misses the case where v-if mounts the element after track exists
watch(
  () => [props.participant.videoTrack?.getTrackId?.(), props.participant.localStream?.id],
  () => { /* play */ },
  { immediate: true }
)

// ✅ GOOD - also reacts when the video element is mounted/unmounted
watch(
  [() => props.participant.videoTrack, () => props.participant.localStream, videoEl],
  () => {
    const el = videoEl.value
    if (!el) return
    
    if (props.participant.isLocal && props.participant.localStream) {
      el.srcObject = props.participant.localStream
      el.play().catch(() => {})
      return
    }
    
    const track = props.participant.videoTrack
    if (track) {
      track.play(el)
    } else {
      el.srcObject = null
    }
  },
  { immediate: true }
)
```

---

## Trap 4: uid → userId Mapping Corruption

### Symptom
Remote user's video appears on the **local** participant's tile, or the wrong nickname is shown for a remote uid. Logs show `uid 32 -> userId 'pfh'` (local user) instead of `'hfp'` (remote user).

### Root Cause
In receiver scenarios, the `acceptedMembers` set may contain **only the local user** at the moment `user-joined` fires. An L2 inference that looks at `acceptedMembers` to find "the only unmapped user" will incorrectly map the remote uid to the local userId.

### Fix
Use a **strict three-tier lookup** and **never guess**:

```ts
async function resolveUid(uid: string): Promise<string | null> {
  // L1: already mapped in new architecture store
  let userId = groupCallStore.uidToUserIdMap.get(uid)
  if (userId) return userId
  
  // L2: fallback to legacy architecture store (may have callerUserId inference)
  userId = rtcChannelStore.getUserIdByUid(uid)
  if (userId) {
    groupCallStore.setUidMapping(uid, userId)  // sync to new store
    return userId
  }
  
  // L3: API - the only accurate source when inference is impossible
  const chatClient = useChatClientStore().getChatClient
  if (chatClient?.getUserIdByRTCUIds) {
    const res = await chatClient.getUserIdByRTCUIds([uid])
    userId = res?.data?.[uid]
    if (userId) {
      groupCallStore.setUidMapping(uid, userId)
      return userId
    }
  }
  
  return null
}
```

**Rules:**
- ❌ Never use `acceptedMembers.length === 1` to infer mapping
- ❌ Never do mapping inference inside UI components
- ✅ Always call `chatClient.getUserIdByRTCUIds([uid])` as the authoritative source when other lookups fail

---

## Trap 5: Legacy Component Leaking into New Architecture

### Symptom
New architecture (`USE_NEW_GROUP_CALL = true`) is enabled, but old component's event listeners, polling loops, and logs still appear. Old and new logic compete: duplicate `user-published` handlers, duplicate subscriptions, conflicting `uidToUserIdMap` writes.

### Root Cause
`EasemobChatMultiCall.vue` acts as a wrapper. Its `onMounted` had:
```ts
if (USE_NEW_GROUP_CALL && groupCallShellRef.value) {
  // new path
  return
}
// old path - binds client.on(), starts polling, etc.
```
If `groupCallShellRef.value` is `null` at mount time (e.g., `v-if="isVisible"` delays rendering), the old path executes even though the new architecture is enabled.

### Fix
Gate the entire old path on `USE_NEW_GROUP_CALL` alone, not on the ref's presence. Also short-circuit legacy composables and watchers:

```ts
onMounted(async () => {
  // New architecture: NEVER enter old logic
  if (USE_NEW_GROUP_CALL) {
    const initShell = () => {
      if (groupCallShellRef.value) {
        groupCallShellRef.value.startSession({...})
      }
    }
    initShell()
    if (!groupCallShellRef.value) nextTick(initShell)
    return
  }
  
  // Old path (only reachable when USE_NEW_GROUP_CALL === false)
  startCall()
  // ... bind listeners, start polling
})
```

Short-circuit legacy `computed` and `watch`:
```ts
const internalParticipants = USE_NEW_GROUP_CALL
  ? computed(() => [])
  : useParticipants(props.currentUserId).participants

if (!USE_NEW_GROUP_CALL) {
  watch(() => participants.value, () => { /* old render logic */ })
  watch(() => rtcChannelStore.localStream, () => { /* old render logic */ })
  // ... other old watches
}
```

---

## Quick Diagnostic Checklist

| Symptom | Likely Trap | Quick Check |
|---------|-------------|-------------|
| `INVALID_REMOTE_USER` on subscribe | Trap 1 | Are you passing `user` object or `user.uid`? |
| Subscribe succeeds but video blank | Trap 2 | Does `setVideoTrack` reassign `participants.value = new Map(...)`? |
| State = publishing but no video | Trap 3 | Does `ParticipantTile` watch include `videoEl`? |
| Wrong user's video on wrong tile | Trap 4 | Is mapping resolved via API, not inference? |
| Old logs (`【轮询检查】`) still appear | Trap 5 | Is `USE_NEW_GROUP_CALL` guarding all old paths? |
