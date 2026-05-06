import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GroupCallSignalHandler } from './GroupCallSignalHandler'
import { GroupCallSession } from '../state/GroupCallSession'
import { SingleCallStateMachine } from '../state/SingleCallStateMachine'
import { CALL_STATUS, CALL_TYPE, HANGUP_REASON } from '../types/callstate.types'

const CURRENT_USER_ID = 'user_local'

function createHandler() {
  const session = new GroupCallSession()
  const stateMachine = new SingleCallStateMachine()
  const handler = new GroupCallSignalHandler(session, stateMachine, CURRENT_USER_ID)
  return { session, stateMachine, handler }
}

const MOCK_GROUP_CALL = {
  callId: 'call_group_001',
  channel: 'ch_group_001',
  token: 'tkn_group',
  callerUserId: 'user_caller',
  callerDevId: 'dev_caller',
  groupId: 'group_001',
  groupName: 'Test Group',
}

describe('GroupCallSignalHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  describe('handleInviteTextMessage', () => {
    it('初始化群聊会话并返回 GROUP_CALL_INIT 事件', () => {
      const { session, handler } = createHandler()

      const events = handler.handleInviteTextMessage({
        from: MOCK_GROUP_CALL.callerUserId,
        ext: {
          action: 'invite' as any,
          callId: MOCK_GROUP_CALL.callId,
          callerIMName: MOCK_GROUP_CALL.callerUserId,
          channelName: MOCK_GROUP_CALL.channel,
          type: CALL_TYPE.VIDEO_MULTI,
          invitedMembers: ['user_1', 'user_2'],
          callkitGroupInfo: {
            groupId: MOCK_GROUP_CALL.groupId,
            groupName: MOCK_GROUP_CALL.groupName,
          },
          ease_chat_uikit_user_info: {
            nickname: 'Caller Nick',
            avatarURL: 'http://avatar/caller.png',
          },
        },
      })

      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        type: 'GROUP_CALL_INIT',
        callId: MOCK_GROUP_CALL.callId,
        groupId: MOCK_GROUP_CALL.groupId,
        groupName: MOCK_GROUP_CALL.groupName,
        channel: MOCK_GROUP_CALL.channel,
        callType: 'video',
        callerUserId: MOCK_GROUP_CALL.callerUserId,
        invitedMembers: ['user_1', 'user_2'],
      })

      // 验证 session 已初始化
      const snapshot = session.getSnapshot()
      expect(snapshot).not.toBeNull()
      expect(snapshot!.groupId).toBe(MOCK_GROUP_CALL.groupId)

      // 验证参与者
      const participants = session.getAllParticipants()
      expect(participants.length).toBe(4) // local + caller + user_1 + user_2
      expect(participants.find((p) => p.userId === CURRENT_USER_ID)?.isLocal).toBe(true)
      expect(participants.find((p) => p.userId === MOCK_GROUP_CALL.callerUserId)?.state).toBe('joinedRtc')
    })
  })

  describe('handleAnswerCall', () => {
    function setupGroupCallState(stateMachine: SingleCallStateMachine) {
      stateMachine.initInvite({
        calleeUserId: 'group_target',
        callType: CALL_TYPE.VIDEO_MULTI,
        callerDevId: MOCK_GROUP_CALL.callerDevId,
        callerUserId: MOCK_GROUP_CALL.callerUserId,
        callId: MOCK_GROUP_CALL.callId,
        channel: MOCK_GROUP_CALL.channel,
        token: MOCK_GROUP_CALL.token,
      })
    }

    it('群聊成员 accept → PARTICIPANT_STATE_CHANGED + PARTICIPANT_JOINED', () => {
      const { stateMachine, session, handler } = createHandler()
      setupGroupCallState(stateMachine)
      session.init({
        sessionId: MOCK_GROUP_CALL.channel,
        groupId: MOCK_GROUP_CALL.groupId,
        groupName: MOCK_GROUP_CALL.groupName,
        callType: 'video',
        callerUserId: MOCK_GROUP_CALL.callerUserId,
      })
      session.addParticipant({
        userId: 'user_1',
        nickname: 'User 1',
        state: 'invited',
        isLocal: false,
        isMuted: false,
        isCameraOn: false,
        isSpeaking: false,
      })

      const events = handler.handle({
        from: 'user_1',
        ext: {
          action: 'answerCall',
          callId: MOCK_GROUP_CALL.callId,
          result: 'accept',
        },
      })

      expect(events).toHaveLength(2)
      expect(events[0]).toMatchObject({
        type: 'PARTICIPANT_STATE_CHANGED',
        userId: 'user_1',
        state: 'accepted',
      })
      expect(events[1]).toMatchObject({
        type: 'PARTICIPANT_JOINED',
        userId: 'user_1',
      })
      expect(session.getParticipant('user_1')?.state).toBe('accepted')
    })

    it('群聊成员 refuse → PARTICIPANT_LEFT', () => {
      const { stateMachine, session, handler } = createHandler()
      setupGroupCallState(stateMachine)
      session.init({
        sessionId: MOCK_GROUP_CALL.channel,
        groupId: MOCK_GROUP_CALL.groupId,
        groupName: MOCK_GROUP_CALL.groupName,
        callType: 'video',
        callerUserId: MOCK_GROUP_CALL.callerUserId,
      })
      session.addParticipant({
        userId: 'user_1',
        nickname: 'User 1',
        state: 'invited',
        isLocal: false,
        isMuted: false,
        isCameraOn: false,
        isSpeaking: false,
      })

      const events = handler.handle({
        from: 'user_1',
        ext: {
          action: 'answerCall',
          callId: MOCK_GROUP_CALL.callId,
          result: 'refuse',
        },
      })

      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        type: 'PARTICIPANT_LEFT',
        userId: 'user_1',
        reason: 'refused',
      })
      expect(session.getParticipant('user_1')).toBeUndefined()
    })

    it('非群聊类型 → 忽略', () => {
      const { stateMachine, handler } = createHandler()
      stateMachine.initInvite({
        calleeUserId: 'user_b',
        callType: CALL_TYPE.VIDEO_1V1,
        callerDevId: 'dev_local',
        callerUserId: MOCK_GROUP_CALL.callerUserId,
        callId: MOCK_GROUP_CALL.callId,
        channel: MOCK_GROUP_CALL.channel,
        token: MOCK_GROUP_CALL.token,
      })

      const events = handler.handle({
        from: 'user_1',
        ext: {
          action: 'answerCall',
          callId: MOCK_GROUP_CALL.callId,
          result: 'accept',
        },
      })

      expect(events).toHaveLength(0)
    })

    it('callId 不匹配 → 忽略', () => {
      const { stateMachine, session, handler } = createHandler()
      setupGroupCallState(stateMachine)
      session.init({
        sessionId: MOCK_GROUP_CALL.channel,
        groupId: MOCK_GROUP_CALL.groupId,
        groupName: MOCK_GROUP_CALL.groupName,
        callType: 'video',
        callerUserId: MOCK_GROUP_CALL.callerUserId,
      })

      const events = handler.handle({
        from: 'user_1',
        ext: {
          action: 'answerCall',
          callId: 'wrong_id',
          result: 'accept',
        },
      })

      expect(events).toHaveLength(0)
    })
  })

  describe('handleCancelCall', () => {
    function setupGroupCallState(stateMachine: SingleCallStateMachine, status: CALL_STATUS = CALL_STATUS.INVITING) {
      stateMachine.initInvite({
        calleeUserId: 'group_target',
        callType: CALL_TYPE.VIDEO_MULTI,
        callerDevId: MOCK_GROUP_CALL.callerDevId,
        callerUserId: MOCK_GROUP_CALL.callerUserId,
        callId: MOCK_GROUP_CALL.callId,
        channel: MOCK_GROUP_CALL.channel,
        token: MOCK_GROUP_CALL.token,
      })
      if (status === CALL_STATUS.ALERTING) {
        stateMachine.receiveAlert('dev_callee')
      }
    }

    it('callId 不匹配 + 来自 caller + INVITING → CALL_CANCELED + CALL_ENDED', () => {
      const { stateMachine, handler } = createHandler()
      setupGroupCallState(stateMachine, CALL_STATUS.INVITING)

      const events = handler.handle({
        from: MOCK_GROUP_CALL.callerUserId,
        ext: {
          action: 'cancelCall',
          callId: 'wrong_id',
        },
      })

      expect(events).toHaveLength(2)
      expect(events[0]).toMatchObject({ type: 'CALL_CANCELED', isRemote: true })
      expect(events[1]).toMatchObject({ type: 'CALL_ENDED', reason: HANGUP_REASON.REMOTE_CANCEL })
    })

    it('callId 匹配 + 来自 caller + ALERTING → CALL_CANCELED + CALL_ENDED', () => {
      const { stateMachine, handler } = createHandler()
      setupGroupCallState(stateMachine, CALL_STATUS.ALERTING)

      const events = handler.handle({
        from: MOCK_GROUP_CALL.callerUserId,
        ext: {
          action: 'cancelCall',
          callId: MOCK_GROUP_CALL.callId,
        },
      })

      expect(events).toHaveLength(2)
      expect(events[0]).toMatchObject({ type: 'CALL_CANCELED', isRemote: true })
    })

    it('非群聊类型 → 忽略', () => {
      const { stateMachine, handler } = createHandler()
      stateMachine.initInvite({
        calleeUserId: 'user_b',
        callType: CALL_TYPE.VIDEO_1V1,
        callerDevId: 'dev_local',
        callerUserId: MOCK_GROUP_CALL.callerUserId,
        callId: MOCK_GROUP_CALL.callId,
        channel: MOCK_GROUP_CALL.channel,
        token: MOCK_GROUP_CALL.token,
      })

      const events = handler.handle({
        from: MOCK_GROUP_CALL.callerUserId,
        ext: {
          action: 'cancelCall',
          callId: MOCK_GROUP_CALL.callId,
        },
      })

      expect(events).toHaveLength(0)
    })
  })

  describe('handleLeaveCall', () => {
    function setupGroupCallState(stateMachine: SingleCallStateMachine, status: CALL_STATUS = CALL_STATUS.IN_CALL) {
      stateMachine.initInvite({
        calleeUserId: 'group_target',
        callType: CALL_TYPE.VIDEO_MULTI,
        callerDevId: MOCK_GROUP_CALL.callerDevId,
        callerUserId: MOCK_GROUP_CALL.callerUserId,
        callId: MOCK_GROUP_CALL.callId,
        channel: MOCK_GROUP_CALL.channel,
        token: MOCK_GROUP_CALL.token,
      })
      if (status === CALL_STATUS.ALERTING) {
        stateMachine.receiveAlert('dev_callee')
      } else if (status === CALL_STATUS.IN_CALL) {
        stateMachine.receiveAnswer('accept')
      }
    }

    it('ALERTING + 来自 caller → 挂断整个通话', () => {
      const { stateMachine, handler } = createHandler()
      setupGroupCallState(stateMachine, CALL_STATUS.ALERTING)

      const events = handler.handle({
        from: MOCK_GROUP_CALL.callerUserId,
        ext: {
          action: 'leaveCall',
          callId: MOCK_GROUP_CALL.callId,
        },
      })

      expect(events).toHaveLength(2)
      expect(events[0]).toMatchObject({ type: 'CALL_CANCELED', isRemote: true })
    })

    it('IN_CALL + 成员离开 → PARTICIPANT_LEFT', () => {
      const { stateMachine, session, handler } = createHandler()
      setupGroupCallState(stateMachine, CALL_STATUS.IN_CALL)
      session.init({
        sessionId: MOCK_GROUP_CALL.channel,
        groupId: MOCK_GROUP_CALL.groupId,
        groupName: MOCK_GROUP_CALL.groupName,
        callType: 'video',
        callerUserId: MOCK_GROUP_CALL.callerUserId,
      })
      session.addParticipant({
        userId: 'user_1',
        nickname: 'User 1',
        state: 'joinedRtc',
        isLocal: false,
        isMuted: false,
        isCameraOn: true,
        isSpeaking: false,
      })

      const events = handler.handle({
        from: 'user_1',
        ext: {
          action: 'leaveCall',
          callId: MOCK_GROUP_CALL.callId,
        },
      })

      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        type: 'PARTICIPANT_LEFT',
        userId: 'user_1',
        reason: 'left',
      })

      // 验证 participant 被标记为 left（延迟移除由 setTimeout 处理）
      expect(session.getParticipant('user_1')?.state).toBe('left')
    })

    it('非群聊类型 → 忽略', () => {
      const { stateMachine, handler } = createHandler()
      stateMachine.initInvite({
        calleeUserId: 'user_b',
        callType: CALL_TYPE.VIDEO_1V1,
        callerDevId: 'dev_local',
        callerUserId: MOCK_GROUP_CALL.callerUserId,
        callId: MOCK_GROUP_CALL.callId,
        channel: MOCK_GROUP_CALL.channel,
        token: MOCK_GROUP_CALL.token,
      })

      const events = handler.handle({
        from: 'user_1',
        ext: {
          action: 'leaveCall',
          callId: MOCK_GROUP_CALL.callId,
        },
      })

      expect(events).toHaveLength(0)
    })
  })
})
