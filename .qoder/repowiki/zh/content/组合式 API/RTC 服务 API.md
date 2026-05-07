# RTC 服务 API

<cite>
**本文档引用的文件**
- [lib/index.ts](file://lib/index.ts)
- [lib/types.ts](file://lib/types.ts)
- [lib/types/callstate.types.ts](file://lib/types/callstate.types.ts)
- [lib/composables/useRtcService.ts](file://lib/composables/useRtcService.ts)
- [lib/composables/useJoinChannel.ts](file://lib/composables/useJoinChannel.ts)
- [lib/composables/useCallService.ts](file://lib/composables/useCallService.ts)
- [lib/composables/useParticipants.ts](file://lib/composables/useParticipants.ts)
- [lib/services/RtcService.ts](file://lib/services/RtcService.ts)
- [lib/services/CallService.ts](file://lib/services/CallService.ts)
- [lib/store/rtcChannel.ts](file://lib/store/rtcChannel.ts)
- [lib/store/types.ts](file://lib/store/types.ts)
- [lib/modules/groupCall/media/RtcMediaBridge.ts](file://lib/modules/groupCall/media/RtcMediaBridge.ts)
- [lib/modules/groupCall/viewModel/GroupCallStore.ts](file://lib/modules/groupCall/viewModel/GroupCallStore.ts)
- [lib/modules/groupCall/viewModel/useGroupCallViewModel.ts](file://lib/modules/groupCall/viewModel/useGroupCallViewModel.ts)
</cite>

## 更新摘要
**变更内容**
- 新增 RtcService 的手动订阅控制功能，支持 setAutoSubscribe 方法
- 增强 subscribeRemoteUser 方法，支持传入 uid 而非 user 对象
- 新增 RtcMediaBridge 作为 GroupCallModule 的媒体桥接层
- 改进轨道处理机制，支持更精确的订阅控制
- 新增 GroupCallStore 作为群组通话的单一事实源
- 增强 useJoinChannel 与 GroupCallStore 的集成
- **新增** 重要订阅状态泄漏防护：leaveChannel() 方法包含 finally 块重置 autoSubscribe 属性回 true
- **新增** 改进的用户发布事件处理：向 subscribeRemoteUser 传递原始 UID 而非整个用户对象，避免 INVALID_REMOTE_USER 错误
- **新增** v1.0.4 版本重大改进：useRtcService 增加了智能降级机制和错误处理，新增 getRtcServiceInstance() 辅助函数，提供 RTC 服务不可用时的优雅降级路径

## 目录
1. [简介](#简介)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构总览](#架构总览)
5. [详细组件分析](#详细组件分析)
6. [依赖关系分析](#依赖关系分析)
7. [性能考虑](#性能考虑)
8. [故障排查指南](#故障排查指南)
9. [结论](#结论)
10. [附录](#附录)

## 简介
本文件系统性梳理并说明 RTC 服务相关的组合式 API，重点覆盖 useRtcService、useJoinChannel、useCallService、useParticipants 等能力，并结合 RtcService、CallService、rtcChannel store 等模块，解释如何通过这些函数管理 Agora RTC SDK 的连接、加入/离开频道、设备开关、音视频轨道发布与订阅、网络质量监控、参与者列表生成等关键能力。

**更新** 本次更新重点关注 GroupCallModule 架构的引入，包括手动订阅控制、改进的轨道处理机制、RtcMediaBridge 媒体桥接层和 GroupCallStore 单一事实源的设计。**特别关注** 新增的关键订阅状态泄漏防护机制，确保 leaveChannel() 方法能够正确重置 autoSubscribe 属性，防止订阅状态泄漏影响后续单聊等旧流程。**v1.0.4 版本重大改进** 新增了 useRtcService 的智能降级机制，当 RTC 服务不可用时提供优雅降级路径，确保应用在异常情况下仍能保持基本功能。

## 项目结构
围绕 RTC 服务 API 的关键目录与文件如下：
- 组合式 API：lib/composables 下的 useRtcService、useJoinChannel、useCallService、useParticipants 等
- 服务层：lib/services 下的 RtcService、CallService
- 状态管理：lib/store 下的 rtcChannel.ts 与 store/types.ts
- 群组通话模块：lib/modules/groupCall 下的媒体桥接、视图模型和存储
- 类型定义：lib/types.ts、lib/types/callstate.types.ts
- 入口导出：lib/index.ts

```mermaid
graph TB
subgraph "组合式API"
UR["useRtcService.ts"]
UJ["useJoinChannel.ts"]
UC["useCallService.ts"]
UP["useParticipants.ts"]
end
subgraph "服务层"
RS["RtcService.ts"]
CS["CallService.ts"]
end
subgraph "状态管理"
RCS["rtcChannel.ts"]
ST["store/types.ts"]
end
subgraph "群组通话模块"
GCM["GroupCallStore.ts"]
GCV["useGroupCallViewModel.ts"]
RMB["RtcMediaBridge.ts"]
end
IDX["lib/index.ts"]
UR --> RCS
UJ --> RCS
UJ --> RS
UC --> ST
UP --> RCS
RS --> RCS
RS --> RMB
CS --> RS
CS --> RCS
GCV --> GCM
GCV --> RMB
RMB --> RS
IDX --> UR
IDX --> UJ
IDX --> UC
IDX --> UP
IDX --> RS
```

**图表来源**
- [lib/index.ts:1-64](file://lib/index.ts#L1-L64)
- [lib/composables/useRtcService.ts:1-219](file://lib/composables/useRtcService.ts#L1-L219)
- [lib/composables/useJoinChannel.ts:1-222](file://lib/composables/useJoinChannel.ts#L1-L222)
- [lib/composables/useCallService.ts:1-440](file://lib/composables/useCallService.ts#L1-L440)
- [lib/composables/useParticipants.ts:1-120](file://lib/composables/useParticipants.ts#L1-L120)
- [lib/services/RtcService.ts:1-741](file://lib/services/RtcService.ts#L1-L741)
- [lib/services/CallService.ts:1-440](file://lib/services/CallService.ts#L1-L440)
- [lib/store/rtcChannel.ts:1-264](file://lib/store/rtcChannel.ts#L1-L264)
- [lib/store/types.ts:1-86](file://lib/store/types.ts#L1-L86)
- [lib/modules/groupCall/viewModel/GroupCallStore.ts:1-223](file://lib/modules/groupCall/viewModel/GroupCallStore.ts#L1-L223)
- [lib/modules/groupCall/viewModel/useGroupCallViewModel.ts:1-141](file://lib/modules/groupCall/viewModel/useGroupCallViewModel.ts#L1-L141)
- [lib/modules/groupCall/media/RtcMediaBridge.ts:1-282](file://lib/modules/groupCall/media/RtcMediaBridge.ts#L1-L282)

## 核心组件
- useRtcService：封装 RTC 服务的组合式 API，提供本地/远端流、音视频开关、设备切换、状态查询与重置等能力。**v1.0.4 版本重大改进** 新增智能降级机制，当 RTC 服务不可用时自动降级到 store 状态操作，确保应用稳定性
- useJoinChannel：负责在信令确认后获取 RTC Token、初始化/复用 RtcService、创建并发布本地音视频轨道、加入频道并启动通话计时。**增强** 支持与 GroupCallStore 的集成
- RtcService：封装 Agora RTC SDK 的客户端、轨道管理、发布/订阅、设备切换、事件监听与销毁。**增强** 支持手动订阅控制和改进的轨道处理机制，**新增** 关键的订阅状态泄漏防护
- CallService：统一挂断流程，清理媒体资源与连接，重置通话状态
- rtcChannel store：集中管理 RTC 频道状态、本地/远端流、音视频开关、UID/用户ID映射、参与者集合与计时器。**改进** 增强了状态重置和频道管理能力
- useCallService：提供通话状态与操作的组合式 API（当前实现以 store 为中心）
- useParticipants：自动生成并过滤参与者的列表，屏蔽 leftUsers 等细节
- **新增** RtcMediaBridge：群组通话的媒体桥接层，负责监听 Agora 事件、订阅远程流并将 track 写入 GroupCallStore
- **新增** GroupCallStore：群组通话参与者与状态的单一事实源，替代旧架构中的 useParticipants + rtcChannelStore 分散逻辑

**章节来源**
- [lib/composables/useRtcService.ts:1-219](file://lib/composables/useRtcService.ts#L1-L219)
- [lib/composables/useJoinChannel.ts:1-222](file://lib/composables/useJoinChannel.ts#L1-L222)
- [lib/services/RtcService.ts:1-741](file://lib/services/RtcService.ts#L1-L741)
- [lib/services/CallService.ts:1-440](file://lib/services/CallService.ts#L1-L440)
- [lib/store/rtcChannel.ts:1-264](file://lib/store/rtcChannel.ts#L1-L264)
- [lib/composables/useCallService.ts:1-440](file://lib/composables/useCallService.ts#L1-L440)
- [lib/composables/useParticipants.ts:1-120](file://lib/composables/useParticipants.ts#L1-L120)
- [lib/modules/groupCall/media/RtcMediaBridge.ts:1-282](file://lib/modules/groupCall/media/RtcMediaBridge.ts#L1-L282)
- [lib/modules/groupCall/viewModel/GroupCallStore.ts:1-223](file://lib/modules/groupCall/viewModel/GroupCallStore.ts#L1-L223)

## 架构总览
下图展示 RTC 服务 API 的整体交互：UI 层通过组合式 API 调用服务层与状态层；服务层与 SDK 交互并回写状态；状态层驱动 UI 响应式更新。**新增** GroupCallModule 通过 RtcMediaBridge 实现对 RtcService 的精细控制。**特别关注** 订阅状态泄漏防护机制确保 leaveChannel() 方法能够正确重置 autoSubscribe 属性。**v1.0.4 版本重大改进** 新增智能降级机制，当 RTC 服务不可用时提供优雅降级路径。

```mermaid
sequenceDiagram
participant UI as "UI组件"
participant Join as "useJoinChannel"
participant RS as "RtcService"
participant RC as "rtcChannel.store"
participant CS as "CallService"
participant GCV as "useGroupCallViewModel"
participant RMB as "RtcMediaBridge"
UI->>Join : 调用 joinChannel()
Join->>RC : 检查重复加入状态
Join->>RS : 检测当前频道并处理切换
Join->>RS : joinChannel(channel, token, uid, appId)
RS-->>Join : 返回 uid
Join->>RS : createAudioTrack()/createVideoTrack()
Join->>RS : publishTracks(tracks)
Join->>RC : 更新 isConnected/activeChannel
Join->>RC : startCallTimer()
UI->>GCV : 绑定 RtcService
GCV->>RMB : 创建媒体桥接器
RMB->>RS : setAutoSubscribe(false)
RS-->>RMB : 关闭自动订阅
RMB->>RS : subscribeRemoteUser(uid, mediaType)
RMB->>GCV : 写入参与者状态
UI->>CS : 调用挂断流程
CS->>RS : leaveChannel()
Note over RS : finally块重置autoSubscribe=true
CS->>RC : reset()
CS->>RC : 重置通话状态
```

**图表来源**
- [lib/composables/useJoinChannel.ts:86-222](file://lib/composables/useJoinChannel.ts#L86-L222)
- [lib/services/RtcService.ts:118-147](file://lib/services/RtcService.ts#L118-L147)
- [lib/services/RtcService.ts:189-234](file://lib/services/RtcService.ts#L189-L234)
- [lib/services/RtcService.ts:239-251](file://lib/services/RtcService.ts#L239-L251)
- [lib/services/CallService.ts:25-72](file://lib/services/CallService.ts#L25-L72)
- [lib/services/CallService.ts:288-314](file://lib/services/CallService.ts#L288-L314)
- [lib/store/rtcChannel.ts:242-272](file://lib/store/rtcChannel.ts#L242-L272)
- [lib/modules/groupCall/viewModel/useGroupCallViewModel.ts:111-118](file://lib/modules/groupCall/viewModel/useGroupCallViewModel.ts#L111-L118)
- [lib/modules/groupCall/media/RtcMediaBridge.ts:19-33](file://lib/modules/groupCall/media/RtcMediaBridge.ts#L19-L33)
- [lib/modules/groupCall/media/RtcMediaBridge.ts:140-154](file://lib/modules/groupCall/media/RtcMediaBridge.ts#L140-L154)

## 详细组件分析

### useRtcService 组件分析
职责与能力：
- 提供本地/远端流、音视频开关、连接状态、活跃频道等响应式状态
- 提供切换视频/音频、切换摄像头/麦克风、获取/设置流、重置状态等方法
- 通过 rtcChannel store 管理状态，保证与 RtcService 的一致性
- **v1.0.4 版本重大改进** 新增智能降级机制：当 RTC 服务不可用时，自动降级到 store 状态操作，确保应用稳定性

**更新** 新增手动订阅控制能力，可通过 setAutoSubscribe 方法控制自动订阅行为。

```mermaid
classDiagram
class useRtcService {
+localStream
+remoteStreams
+isVideoEnabled
+isAudioEnabled
+isConnected
+activeChannel
+getRtcServiceInstance()
+toggleVideo(enabled?)
+toggleAudio(enabled?)
+switchCamera(deviceId?)
+switchMicrophone(deviceId?)
+getLocalStream()
+getRemoteStream(userId)
+addRemoteStream(userId, stream)
+removeRemoteStream(userId)
+setLocalStream(stream)
+reset()
}
class RtcService {
+autoSubscribe : boolean
+setAutoSubscribe(enabled)
+subscribeRemoteUser(userOrUid, mediaType)
}
class rtcChannel_store {
+channels
+activeChannelId
+isConnected
+localStream
+remoteStreams
+audioEnabled
+videoEnabled
+setAudioEnabled()
+setVideoEnabled()
+setLocalStream()
+addRemoteStream()
+removeRemoteStream()
+reset()
}
useRtcService --> rtcChannel_store : "读取/写入状态"
RtcService --> rtcChannel_store : "读写状态/映射"
RtcService --> RtcService : "setAutoSubscribe()"
```

**图表来源**
- [lib/composables/useRtcService.ts:52-219](file://lib/composables/useRtcService.ts#L52-L219)
- [lib/services/RtcService.ts:56-78](file://lib/services/RtcService.ts#L56-L78)
- [lib/services/RtcService.ts:110-113](file://lib/services/RtcService.ts#L110-L113)
- [lib/services/RtcService.ts:416-443](file://lib/services/RtcService.ts#L416-L443)
- [lib/store/rtcChannel.ts:11-28](file://lib/store/rtcChannel.ts#L11-L28)

使用要点：
- 切换音视频时，内部通过 store 更新状态，避免直接操作底层轨道
- 设备切换预留接口，需配合 RtcService 的设备枚举与 setDevice 实现
- 流管理方法用于将本地/远端 MediaStream 写入 store，便于 UI 绑定
- **新增** 通过 setAutoSubscribe 控制自动订阅行为，支持手动订阅控制
- **新增** 订阅状态泄漏防护：leaveChannel() 方法包含 finally 块确保 autoSubscribe 属性重置为 true
- **v1.0.4 版本重大改进** 智能降级机制：getRtcServiceInstance() 方法提供 RTC 服务实例获取，当服务不可用时自动降级到 store 状态操作，确保应用稳定性

**章节来源**
- [lib/composables/useRtcService.ts:1-219](file://lib/composables/useRtcService.ts#L1-L219)
- [lib/services/RtcService.ts:110-113](file://lib/services/RtcService.ts#L110-L113)
- [lib/store/rtcChannel.ts:373-408](file://lib/store/rtcChannel.ts#L373-L408)

### useJoinChannel 组件分析
职责与能力：
- 在信令确认后获取 RTC Token（通过环信 SDK），并初始化/复用 RtcService
- 创建本地音视频轨道并发布，加入频道，更新 store 状态并启动通话计时
- **增强** 支持与 GroupCallStore 的集成，同步本地用户状态

```mermaid
flowchart TD
Start(["进入 joinChannel"]) --> CheckInit["检查 RtcService 是否存在"]
CheckInit --> |不存在| ReturnErr["返回错误"]
CheckInit --> |存在| CheckState["检查客户端连接状态与 store 状态"]
CheckState --> |已在连接/已连接| CheckChannel{"检查是否在同一频道?"}
CheckChannel --> |是| Warn["警告：已在目标频道中"] --> End
CheckChannel --> |否| LeaveCurrent["离开当前频道"] --> GetToken
CheckState --> |空闲| GetToken["获取 RTC Token 与 appId/uid"]
GetToken --> HasToken{"是否获取到 Token?"}
HasToken --> |否| Fail["记录错误并返回"] --> End
HasToken --> |是| Join["调用 RtcService.joinChannel"]
Join --> Tracks["创建本地轨道(音频/视频)"]
Tracks --> Publish["发布轨道"]
Publish --> Update["更新 store: isConnected/activeChannel/startCallTimer"]
Update --> SyncGroup["同步本地用户到 GroupCallStore"]
SyncGroup --> End(["完成"])
```

**图表来源**
- [lib/composables/useJoinChannel.ts:86-222](file://lib/composables/useJoinChannel.ts#L86-L222)
- [lib/services/RtcService.ts:118-147](file://lib/services/RtcService.ts#L118-L147)
- [lib/services/RtcService.ts:189-234](file://lib/services/RtcService.ts#L189-L234)
- [lib/services/RtcService.ts:239-251](file://lib/services/RtcService.ts#L239-L251)

使用要点：
- **新增** 与 GroupCallStore 的集成：成功加入频道后，将本地用户状态同步到 GroupCallStore
- 仅在需要时创建轨道，避免重复创建
- 发布前确保客户端已连接，避免发布失败
- 通过 store 的 startCallTimer 启动计时，便于 UI 展示
- **新增** 改进的用户发布事件处理：向 subscribeRemoteUser 传递原始 UID 而非整个用户对象，避免 INVALID_REMOTE_USER 错误

**章节来源**
- [lib/composables/useJoinChannel.ts:1-222](file://lib/composables/useJoinChannel.ts#L1-L222)
- [lib/services/RtcService.ts:1-741](file://lib/services/RtcService.ts#L1-L741)
- [lib/store/rtcChannel.ts:242-272](file://lib/store/rtcChannel.ts#L242-L272)

### RtcService 组件分析
职责与能力：
- 封装 Agora RTC SDK 客户端、轨道创建与发布/订阅、设备切换、事件监听与销毁
- 提供网络质量、音量指示等回调扩展点
- 与 rtcChannel store 协作，维护 UID/用户ID映射与参与者集合
- **增强** 支持手动订阅控制和改进的轨道处理机制
- **新增** 关键的订阅状态泄漏防护机制

```mermaid
classDiagram
class RtcService {
-client
-localAudioTrack
-localVideoTrack
-remoteAudioTracks
-remoteVideoTracks
-localVideoStream
-currentCameraDeviceId
-autoSubscribe : boolean
+initialize()
+joinChannel(channel, token, uid, appId?)
+leaveChannel()
+createAudioTrack()
+createVideoTrack()
+publishTracks(tracks)
+toggleAudio(enabled)
+toggleVideo(enabled)
+switchCamera(deviceId)
+switchMicrophone(deviceId)
+setAutoSubscribe(enabled)
+subscribeRemoteUser(userOrUid, mediaType)
+getLocalVideoStream()
+getRemoteVideoTrack(userId)
+getRemoteAudioTrack(userId)
+getClient()
+destroy()
}
class rtcChannel_store {
+setLocalStream()
+setAudioEnabled()
+setVideoEnabled()
+setUidToUserIdMapping()
+markUserJoinedRtc()
+markUserLeftRtc()
}
RtcService --> rtcChannel_store : "读写状态/映射"
```

**图表来源**
- [lib/services/RtcService.ts:42-78](file://lib/services/RtcService.ts#L42-L78)
- [lib/services/RtcService.ts:110-113](file://lib/services/RtcService.ts#L110-L113)
- [lib/services/RtcService.ts:416-443](file://lib/services/RtcService.ts#L416-L443)
- [lib/services/RtcService.ts:189-234](file://lib/services/RtcService.ts#L189-L234)
- [lib/store/rtcChannel.ts:373-408](file://lib/store/rtcChannel.ts#L373-L408)
- [lib/store/rtcChannel.ts:292-315](file://lib/store/rtcChannel.ts#L292-L315)

使用要点：
- **增强** 支持手动订阅控制：通过 setAutoSubscribe(false) 关闭自动订阅，由上层统一处理订阅逻辑
- **改进** subscribeRemoteUser 方法：支持传入 uid（number/string）而非 IAgoraRTCRemoteUser 对象，避免 SDK 内部引用不一致导致 INVALID_REMOTE_USER 错误
- **新增** 关键的订阅状态泄漏防护：leaveChannel() 方法包含 finally 块，确保无论发生什么错误都会将 autoSubscribe 属性重置为 true，防止影响后续单聊等旧流程
- 切换视频时，若轨道失效则重新创建并更新本地流
- 订阅远程用户时自动播放音频轨道
- 事件监听中维护 UID/用户ID映射与加入/离开集合

**章节来源**
- [lib/services/RtcService.ts:1-741](file://lib/services/RtcService.ts#L1-L741)
- [lib/store/rtcChannel.ts:1-264](file://lib/store/rtcChannel.ts#L1-L264)

### RtcMediaBridge 组件分析
职责与能力：
- **新增** 作为 GroupCallModule 的媒体桥接层，负责监听 Agora 事件、订阅远程流并将 track 写入 GroupCallStore
- 不处理 UI，不处理信令，只做纯粹的 RTC -> Store 桥接
- **增强** 支持手动订阅控制：关闭 RtcService 内部自动订阅，由桥接器统一处理订阅逻辑

```mermaid
classDiagram
class RtcMediaBridge {
-rtcService : RtcService
-store : GroupCallStore
-rtcChannelStore : RtcChannelStore
-client : IAgoraRTCClient
+constructor(rtcService)
+destroy()
+bindEvents()
+unbindEvents()
+handleUserJoined(user)
+handleUserLeft(user)
+handleUserPublished(user, mediaType)
+handleUserUnpublished(user, mediaType)
+handleVolumeIndicator(volumes)
+fetchUserIdByUid(uid)
}
class GroupCallStore {
+setParticipantState(userId, state)
+setVideoTrack(userId, track)
+setAudioTrack(userId, track)
+setUidMapping(uid, userId)
}
class RtcService {
+setAutoSubscribe(enabled)
+subscribeRemoteUser(userOrUid, mediaType)
}
RtcMediaBridge --> GroupCallStore : "写入参与者状态"
RtcMediaBridge --> RtcService : "订阅远程用户"
```

**图表来源**
- [lib/modules/groupCall/media/RtcMediaBridge.ts:13-33](file://lib/modules/groupCall/media/RtcMediaBridge.ts#L13-L33)
- [lib/modules/groupCall/media/RtcMediaBridge.ts:134-204](file://lib/modules/groupCall/media/RtcMediaBridge.ts#L134-L204)
- [lib/modules/groupCall/viewModel/GroupCallStore.ts:103-157](file://lib/modules/groupCall/viewModel/GroupCallStore.ts#L103-L157)
- [lib/services/RtcService.ts:110-113](file://lib/services/RtcService.ts#L110-L113)
- [lib/services/RtcService.ts:416-443](file://lib/services/RtcService.ts#L416-L443)

使用要点：
- **新增** 关闭 RtcService 自动订阅：通过 setAutoSubscribe(false) 避免重复订阅导致 INVALID_REMOTE_USER 错误
- **改进** 订阅逻辑：传入 uid 而非 user 对象，让 SDK 通过 remoteUsers.find(t => t.uid === uid) 正确定位 RemoteUser 实例
- **增强** 用户映射：支持从 GroupCallStore、RtcChannelStore 和 API 多种途径获取用户映射
- **新增** 临时用户占位：当无法解析 uid 时创建临时占位，后续解析成功后执行迁移
- **新增** 订阅状态泄漏防护：destroy() 方法中恢复 RtcService 自动订阅，确保不会影响其他流程

**章节来源**
- [lib/modules/groupCall/media/RtcMediaBridge.ts:1-282](file://lib/modules/groupCall/media/RtcMediaBridge.ts#L1-L282)
- [lib/modules/groupCall/viewModel/GroupCallStore.ts:103-157](file://lib/modules/groupCall/viewModel/GroupCallStore.ts#L103-L157)

### GroupCallStore 组件分析
职责与能力：
- **新增** 群组通话参与者与状态的单一事实源，替代旧架构中的 useParticipants + rtcChannelStore 分散逻辑
- 提供参与者管理、状态跟踪、UID 映射解析等核心功能
- 支持参与者状态机：invited -> accepted -> joinedRtc -> publishing -> left

```mermaid
flowchart TD
Start(["GroupCallStore 初始化"]) --> Init["initSession(session)"]
Init --> AddLocal["addParticipant(local)"]
AddLocal --> AddCaller["addParticipant(caller)"]
AddCaller --> Pending["等待远程用户加入"]
Pending --> UserJoined["handleUserJoined(uid)"]
UserJoined --> Resolve["resolveUid(uid)"]
Resolve --> |certain| Map["setUidMapping(uid, userId)"]
Resolve --> |inferred| Map
Resolve --> |unknown| Temp["创建临时占位"]
Map --> State["setParticipantState(userId, joinedRtc)"]
Temp --> State
State --> Publishing["setVideoTrack/setAudioTrack"]
Publishing --> Left["handleUserLeft(uid)"]
Left --> Remove["removeParticipant(userId)"]
```

**图表来源**
- [lib/modules/groupCall/viewModel/GroupCallStore.ts:43-57](file://lib/modules/groupCall/viewModel/GroupCallStore.ts#L43-L57)
- [lib/modules/groupCall/viewModel/GroupCallStore.ts:112-130](file://lib/modules/groupCall/viewModel/GroupCallStore.ts#L112-L130)
- [lib/modules/groupCall/viewModel/GroupCallStore.ts:132-157](file://lib/modules/groupCall/viewModel/GroupCallStore.ts#L132-L157)

使用要点：
- **新增** 单一事实源：集中管理群组通话的所有状态，避免分散在多个 store 中
- **增强** UID 解析：支持 certain/inferred/unknown 三种置信度级别，提供 L2 推断机制
- **改进** 参与者状态机：支持完整的状态转换，便于 UI 精确控制
- **新增** 临时占位机制：当无法立即解析用户时创建占位，后续解析成功后迁移

**章节来源**
- [lib/modules/groupCall/viewModel/GroupCallStore.ts:1-223](file://lib/modules/groupCall/viewModel/GroupCallStore.ts#L1-L223)

### useCallService 组件分析
职责与能力：
- 提供通话状态与操作的组合式 API（当前实现以 store 为中心）
- 提供 startCall、acceptCall、rejectCall、endCall、toggleAudio/Video/Speaker 等方法
- 提供事件监听方法占位，便于后续接入

```mermaid
flowchart TD
Enter(["调用 useCallService"]) --> Expose["暴露状态与方法"]
Expose --> Start["startCall -> 更新 store 状态"]
Expose --> Accept["acceptCall -> 更新 store 状态"]
Expose --> Reject["rejectCall -> 重置 store 状态"]
Expose --> End["endCall -> 重置 store 状态"]
Expose --> Toggle["toggleAudio/Video/Speaker -> 更新 store 状态"]
Expose --> Events["onCallStarted/Connected/Ended/Failed/... -> 占位"]
```

**图表来源**
- [lib/composables/useCallService.ts:91-440](file://lib/composables/useCallService.ts#L91-L440)

注意：当前实现主要通过 store 更新状态，具体服务层方法需按实际实现补齐。

**章节来源**
- [lib/composables/useCallService.ts:1-440](file://lib/composables/useCallService.ts#L1-L440)
- [lib/store/types.ts:43-55](file://lib/store/types.ts#L43-L55)

### useParticipants 组件分析
职责与能力：
- 自动生成群组参与者列表，自动过滤已明确离开的用户
- 结合 rtcChannel store 的 joinedRtcUsers、leftUsers、uidToUserIdMap 等状态
- 输出包含用户 ID、昵称、头像、是否静音、是否邀请中、是否已加入等字段

```mermaid
flowchart TD
Start(["计算 participants"]) --> ReadState["读取 callState 与 rtcChannel 状态"]
ReadState --> AddSelf["添加当前用户"]
AddSelf --> AddCaller["添加主叫方(条件: 未明确离开 或 在邀请列表)"]
AddCaller --> AddOthers["遍历 invitedMembers 过滤已明确离开用户"]
AddOthers --> Filter["仅保留 hasJoined 或 isInviting 的用户"]
Filter --> Return(["返回 participants 列表"])
```

**图表来源**
- [lib/composables/useParticipants.ts:27-114](file://lib/composables/useParticipants.ts#L27-L114)
- [lib/store/rtcChannel.ts:292-329](file://lib/store/rtcChannel.ts#L292-L329)

**章节来源**
- [lib/composables/useParticipants.ts:1-120](file://lib/composables/useParticipants.ts#L1-L120)
- [lib/store/rtcChannel.ts:292-329](file://lib/store/rtcChannel.ts#L292-L329)

### CallService 组件分析
职责与能力：
- 统一挂断流程：根据原因选择策略、清理媒体资源、断开连接、重置状态
- 清理媒体资源：取消发布本地轨道
- 清理连接：调用 RtcService.leaveChannel 并重置 rtcChannel store
- 事件日志：记录挂断原因与状态变更

```mermaid
sequenceDiagram
participant UI as "UI组件"
participant CS as "CallService"
participant RS as "RtcService"
participant RC as "rtcChannel.store"
UI->>CS : hangup(reason)
CS->>CS : 选择策略(普通/取消/远程)
CS->>RS : cleanupMediaResources()
CS->>RS : leaveChannel()
Note over RS : finally块重置autoSubscribe=true
CS->>RC : reset()
CS->>CS : resetState()
CS-->>UI : 完成
```

**图表来源**
- [lib/services/CallService.ts:25-72](file://lib/services/CallService.ts#L25-L72)
- [lib/services/CallService.ts:251-314](file://lib/services/CallService.ts#L251-L314)
- [lib/services/CallService.ts:316-337](file://lib/services/CallService.ts#L316-L337)

**章节来源**
- [lib/services/CallService.ts:1-440](file://lib/services/CallService.ts#L1-L440)

## 依赖关系分析
- useRtcService 依赖 rtcChannel store 提供的状态与方法，**v1.0.4 版本重大改进** 新增 getRtcServiceInstance() 辅助函数提供智能降级机制
- useJoinChannel 依赖 rtcChannel store 与 RtcService，负责加入/发布/计时。**增强** 支持与 GroupCallStore 的集成
- RtcService 依赖 Agora SDK 与 rtcChannel store，负责轨道与事件。**改进** 支持手动订阅控制和改进的轨道处理，**新增** 订阅状态泄漏防护
- **新增** RtcMediaBridge 依赖 RtcService 和 GroupCallStore，负责媒体事件监听和订阅控制
- **新增** GroupCallStore 独立管理群组通话状态，替代旧架构中的分散逻辑
- CallService 依赖 rtcChannel store 与 RtcService，负责挂断清理。**增强** 与改进后的频道管理协同工作
- useCallService 与 useParticipants 依赖 store 与 rtcChannel store

```mermaid
graph LR
UR["useRtcService"] --> RCS["rtcChannel.store"]
UJ["useJoinChannel"] --> RCS
UJ --> RS["RtcService"]
RS --> RCS
RS --> RMB["RtcMediaBridge"]
CS["CallService"] --> RS
CS --> RCS
GCV["useGroupCallViewModel"] --> GCS["GroupCallStore"]
GCV --> RMB
RMB --> RS
RMB --> GCS
UC["useCallService"] --> ST["store/types"]
UP["useParticipants"] --> RCS
```

**图表来源**
- [lib/composables/useRtcService.ts:48-53](file://lib/composables/useRtcService.ts#L48-L53)
- [lib/composables/useJoinChannel.ts:12-29](file://lib/composables/useJoinChannel.ts#L12-L29)
- [lib/services/RtcService.ts:65-66](file://lib/services/RtcService.ts#L65-L66)
- [lib/services/CallService.ts:12-23](file://lib/services/CallService.ts#L12-L23)
- [lib/composables/useCallService.ts:42-45](file://lib/composables/useCallService.ts#L42-L45)
- [lib/composables/useParticipants.ts:1-4](file://lib/composables/useParticipants.ts#L1-L4)
- [lib/modules/groupCall/media/RtcMediaBridge.ts:13-27](file://lib/modules/groupCall/media/RtcMediaBridge.ts#L13-L27)
- [lib/modules/groupCall/viewModel/useGroupCallViewModel.ts:44-46](file://lib/modules/groupCall/viewModel/useGroupCallViewModel.ts#L44-L46)

**章节来源**
- [lib/index.ts:8-29](file://lib/index.ts#L8-L29)

## 性能考虑
- 避免重复创建轨道：在切换视频时检查轨道有效性，必要时才重新创建并更新本地流
- 条件发布：仅在客户端已连接且轨道未发布时执行发布，减少不必要的网络操作
- **增强** 智能频道切换：useJoinChannel 会检测重复加入并自动处理频道切换，避免不必要的网络请求
- **新增** 手动订阅控制：通过 setAutoSubscribe(false) 关闭自动订阅，由上层统一处理订阅逻辑，避免重复订阅
- **新增** 精确订阅机制：subscribeRemoteUser 支持传入 uid 而非 user 对象，避免 SDK 内部引用不一致导致的错误
- **新增** 订阅状态泄漏防护：leaveChannel() 方法的 finally 块确保 autoSubscribe 属性始终重置为 true，防止影响后续流程
- **v1.0.4 版本重大改进** 智能降级机制：当 RTC 服务不可用时自动降级到 store 状态操作，减少异常处理开销
- 资源及时释放：离开频道与挂断时取消发布、停止轨道、清理 store，防止内存泄漏
- 计时器管理：通话结束后停止计时器，避免后台持续运行
- 事件监听：销毁时移除监听，避免内存泄漏与重复触发

## 故障排查指南
常见问题与定位思路：
- 加入频道失败
  - 检查 RtcService 是否初始化、客户端连接状态、Token 是否获取成功
  - 查看日志输出，关注"获取Token失败""加入频道失败"等错误
  - **新增** 检查是否出现重复加入检测导致的提前返回
- 音视频轨道异常
  - 切换视频时轨道失效，需重新创建并更新本地流
  - 发布失败时检查客户端连接状态与轨道是否已发布
- 设备切换无效
  - 当前 useRtcService 中设备切换为预留实现，需配合 RtcService 的设备枚举与 setDevice
- 参与者列表异常
  - 检查 rtcChannel.store 的 uidToUserIdMap、joinedRtcUsers、leftUsers 状态
  - 确认事件监听是否正确维护映射与集合
- **新增** 频道切换问题
  - 检查 useJoinChannel 的重复加入检测逻辑是否正确
  - 确认 RtcService.leaveChannel 是否正常执行
  - 验证 rtcChannel.store.reset 是否完全清理状态
- **新增** 手动订阅控制问题
  - 检查 RtcService.setAutoSubscribe(false) 是否正确执行
  - 确认 RtcMediaBridge 是否正确绑定事件监听
  - 验证 subscribeRemoteUser 是否使用 uid 而非 user 对象
- **新增** 订阅状态泄漏问题
  - 检查 leaveChannel() 方法是否包含 finally 块
  - 确认 autoSubscribe 属性是否正确重置为 true
  - 验证后续单聊等旧流程是否受到影响
- **新增** GroupCallStore 状态异常
  - 检查 UID 解析机制是否正常工作
  - 确认参与者状态转换是否符合预期
  - 验证临时占位机制是否正确迁移
- **v1.0.4 版本重大改进** 智能降级问题
  - 检查 getRtcServiceInstance() 方法是否正确返回 null
  - 确认降级路径是否正确更新 store 状态
  - 验证降级操作是否产生预期的日志输出
- 日志与调试
  - 使用 logger 输出关键路径日志，便于定位问题
  - 在开发环境开启调试模式，观察状态变化与事件触发

**章节来源**
- [lib/composables/useJoinChannel.ts:86-111](file://lib/composables/useJoinChannel.ts#L86-L111)
- [lib/services/RtcService.ts:118-147](file://lib/services/RtcService.ts#L118-L147)
- [lib/composables/useRtcService.ts:98-123](file://lib/composables/useRtcService.ts#L98-L123)
- [lib/composables/useParticipants.ts:34-44](file://lib/composables/useParticipants.ts#L34-L44)
- [lib/modules/groupCall/media/RtcMediaBridge.ts:24-33](file://lib/modules/groupCall/media/RtcMediaBridge.ts#L24-L33)
- [lib/modules/groupCall/viewModel/GroupCallStore.ts:112-130](file://lib/modules/groupCall/viewModel/GroupCallStore.ts#L112-L130)

## 结论
本套 RTC 服务 API 通过组合式 API、服务层与状态层的清晰分层，提供了从频道加入、设备控制、网络质量监控到参与者管理的完整能力。useRtcService 与 useJoinChannel 分别承担"状态与设备控制"和"加入与发布"的职责，RtcService 与 rtcChannel store 协同实现底层 SDK 与 UI 状态的一致性，CallService 则统一了挂断流程与资源清理。

**更新** 本次更新显著增强了 GroupCallModule 架构的支持，包括手动订阅控制、改进的轨道处理机制、RtcMediaBridge 媒体桥接层和 GroupCallStore 单一事实源。**特别关注** 新增的关键订阅状态泄漏防护机制，确保 leaveChannel() 方法能够正确重置 autoSubscribe 属性，防止订阅状态泄漏影响后续单聊等旧流程。**v1.0.4 版本重大改进** 新增了 useRtcService 的智能降级机制，当 RTC 服务不可用时提供优雅降级路径，确保应用在异常情况下仍能保持基本功能。这些增强使得 RTC 服务在群组通话场景下更加稳定可靠，支持更复杂的订阅控制和状态管理需求。

建议在实际集成中遵循"先状态、后服务"的顺序，配合完善的日志与错误处理，确保稳定可靠的通话体验。

## 附录

### 使用示例（场景化指引）
- 音频/视频设备切换
  - 通过 useRtcService 的切换方法触发，内部依赖 RtcService 的设备切换能力
  - 注意：当前设备切换为预留实现，需在 RtcService 中完善设备枚举与 setDevice
- 屏幕共享
  - 可通过 Agora SDK 的屏幕共享轨道创建与发布，结合 RtcService 的轨道管理与发布流程
  - 建议在加入频道前完成屏幕共享轨道的创建与发布
- 网络质量检测
  - RtcService 提供网络质量事件回调，可在初始化时注入回调，将质量数据写入 store 或 UI 状态
- 通话状态协调
  - useCallService 与 rtcChannel store 协同，通过 CallService 的挂断流程统一清理资源与状态
- **新增** 群组通话场景
  - 使用 useGroupCallViewModel 绑定 RtcService，创建 RtcMediaBridge 实现精细的订阅控制
  - 通过 GroupCallStore 管理参与者状态，支持完整的状态机转换
  - 利用手动订阅控制避免重复订阅导致的 INVALID_REMOTE_USER 错误
  - **新增** 订阅状态泄漏防护：确保 leaveChannel() 方法正确重置 autoSubscribe 属性
- **新增** 手动订阅控制场景
  - 调用 RtcService.setAutoSubscribe(false) 关闭自动订阅
  - 通过 RtcMediaBridge 统一处理订阅逻辑，传入 uid 而非 user 对象
  - 支持精确的轨道处理和状态同步
  - **新增** 订阅状态泄漏防护：destroy() 方法中恢复 RtcService 自动订阅
- **v1.0.4 版本重大改进** 智能降级场景
  - 当 RTC 服务不可用时，useRtcService 的 toggleVideo/toggleAudio 方法会自动降级到 store 状态操作
  - getRtcServiceInstance() 辅助函数提供 RTC 服务实例获取，当服务不可用时返回 null 并记录警告日志
  - 应用层可以通过检查返回值来决定是否执行降级逻辑，确保用户体验的一致性