# CallKit 静态资源包

## 目录结构

```
callkit-static-assets/
├── icons/              # SVG 图标（21个）
├── images/             # 图片资源
├── sounds/             # 音频资源（需自行准备）
└── README.md          # 说明文档
```

## 📁 icons/ - SVG 图标清单

### 麦克风控制
- `mic_on.svg` - 麦克风开启
- `mic_slash.svg` - 麦克风静音

### 摄像头控制
- `video_camera.svg` - 摄像头
- `video_camera_slash.svg` - 摄像头关闭
- `video_camera_splus.svg` - 摄像头添加
- `video_camera_xmark.svg` - 摄像头禁用
- `camera_fill_arrows.svg` - 摄像头切换

### 电话控制
- `phone_pick.svg` - 接听/拨打电话
- `phone_hang.svg` - 挂断电话

### 扬声器控制
- `speaker_wave_2.svg` - 扬声器开启
- `speaker_xmark.svg` - 扬声器静音

### 窗口控制
- `chevron_4_all_around.svg` - 最大化/全屏
- `chevron_4_cluster.svg` - 最小化/退出全屏
- `boxes.svg` - 网格布局模式
- `arrow_right_square_fill.svg` - 屏幕共享

### 参与者管理
- `person_add.svg` - 添加参与者（线框）
- `person_add_fill.svg` - 添加参与者（填充）
- `person_minus.svg` - 移除参与者（线框）
- `person_minus_fill.svg` - 移除参与者（填充）
- `person_double_fill.svg` - 多人群组
- `person_single_fill.svg` - 单人

## 🖼️ images/ - 图片资源

- `callkit_bg.png` (71.8KB) - CallKit 默认背景图

## 🎵 sounds/ - 音频资源

**⚠️ 需要自行准备以下铃声文件：**
- `outgoing_ringtone.mp3` - 呼出铃声
- `incoming_ringtone.mp3` - 来电铃声

## 🔄 Vue 项目使用指南

### 1. 复制资源到 Vue 项目

```bash
# 复制整个文件夹到 Vue 项目
cp -r callkit-static-assets your-vue-project/src/assets/
```

### 2. Vue 3 Icon 组件示例

```vue
<!-- IconCallkit.vue -->
<template>
  <img :src="iconSrc" :style="iconStyle" :alt="type" />
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  type: { type: String, required: true },
  width: { type: [String, Number], default: 24 },
  height: { type: [String, Number], default: 24 }
});

const iconMap = {
  'mic-on': new URL('@/assets/callkit-static-assets/icons/mic_on.svg', import.meta.url).href,
  'mic-off': new URL('@/assets/callkit-static-assets/icons/mic_slash.svg', import.meta.url).href,
  'camera-on': new URL('@/assets/callkit-static-assets/icons/video_camera.svg', import.meta.url).href,
  'camera-off': new URL('@/assets/callkit-static-assets/icons/video_camera_slash.svg', import.meta.url).href,
  'speaker-on': new URL('@/assets/callkit-static-assets/icons/speaker_wave_2.svg', import.meta.url).href,
  'speaker-off': new URL('@/assets/callkit-static-assets/icons/speaker_xmark.svg', import.meta.url).href,
  'hangup': new URL('@/assets/callkit-static-assets/icons/phone_hang.svg', import.meta.url).href,
  'pickup': new URL('@/assets/callkit-static-assets/icons/phone_pick.svg', import.meta.url).href,
  'maximize': new URL('@/assets/callkit-static-assets/icons/chevron_4_all_around.svg', import.meta.url).href,
  'minimize': new URL('@/assets/callkit-static-assets/icons/chevron_4_cluster.svg', import.meta.url).href,
  'grid': new URL('@/assets/callkit-static-assets/icons/boxes.svg', import.meta.url).href,
  'share-screen': new URL('@/assets/callkit-static-assets/icons/arrow_right_square_fill.svg', import.meta.url).href,
  'add-person': new URL('@/assets/callkit-static-assets/icons/person_add_fill.svg', import.meta.url).href,
};

const iconSrc = computed(() => iconMap[props.type]);
const iconStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height
}));
</script>
```

### 3. 使用示例

```vue
<template>
  <div class="callkit-controls">
    <!-- 静音按钮 -->
    <button @click="toggleMute">
      <IconCallkit :type="muted ? 'mic-off' : 'mic-on'" :width="32" />
    </button>
    
    <!-- 摄像头按钮 -->
    <button @click="toggleCamera">
      <IconCallkit :type="cameraEnabled ? 'camera-on' : 'camera-off'" :width="32" />
    </button>
    
    <!-- 扬声器按钮 -->
    <button @click="toggleSpeaker">
      <IconCallkit :type="speakerEnabled ? 'speaker-on' : 'speaker-off'" :width="32" />
    </button>
    
    <!-- 挂断按钮 -->
    <button @click="hangup" class="hangup-btn">
      <IconCallkit type="hangup" :width="32" />
    </button>
    
    <!-- 最小化按钮 -->
    <button @click="minimize">
      <IconCallkit type="minimize" :width="24" />
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import IconCallkit from '@/components/IconCallkit.vue';

const muted = ref(false);
const cameraEnabled = ref(true);
const speakerEnabled = ref(true);

const toggleMute = () => { muted.value = !muted.value; };
const toggleCamera = () => { cameraEnabled.value = !cameraEnabled.value; };
const toggleSpeaker = () => { speakerEnabled.value = !speakerEnabled.value; };
const hangup = () => { console.log('挂断通话'); };
const minimize = () => { console.log('最小化窗口'); };
</script>
```

### 4. 铃声播放示例

```javascript
// useRingtone.js
import { ref } from 'vue';

export function useRingtone() {
  const outgoingAudio = ref(null);
  const incomingAudio = ref(null);
  
  const initRingtones = () => {
    outgoingAudio.value = new Audio('/sounds/outgoing_ringtone.mp3');
    incomingAudio.value = new Audio('/sounds/incoming_ringtone.mp3');
    
    outgoingAudio.value.loop = true;
    incomingAudio.value.loop = true;
  };
  
  const playOutgoing = () => {
    outgoingAudio.value?.play();
  };
  
  const playIncoming = () => {
    incomingAudio.value?.play();
  };
  
  const stopAll = () => {
    outgoingAudio.value?.pause();
    incomingAudio.value?.pause();
    if (outgoingAudio.value) outgoingAudio.value.currentTime = 0;
    if (incomingAudio.value) incomingAudio.value.currentTime = 0;
  };
  
  return {
    initRingtones,
    playOutgoing,
    playIncoming,
    stopAll
  };
}
```

## 📋 图标功能映射表

| 功能 | 开启图标 | 关闭图标 | 建议命名 |
|------|---------|---------|---------|
| 静音 | `mic_on.svg` | `mic_slash.svg` | `mic-on` / `mic-off` |
| 摄像头 | `video_camera.svg` | `video_camera_slash.svg` | `camera-on` / `camera-off` |
| 扬声器 | `speaker_wave_2.svg` | `speaker_xmark.svg` | `speaker-on` / `speaker-off` |
| 挂断 | - | `phone_hang.svg` | `hangup` |
| 接听 | `phone_pick.svg` | - | `pickup` |
| 最大化 | `chevron_4_all_around.svg` | - | `maximize` |
| 最小化 | `chevron_4_cluster.svg` | - | `minimize` |
| 网格模式 | `boxes.svg` | - | `grid` |
| 屏幕共享 | `arrow_right_square_fill.svg` | - | `share-screen` |
| 添加成员 | `person_add_fill.svg` | - | `add-person` |

## 🎨 在线背景资源（可选）

如果不想使用本地背景图，可以使用这些在线背景：

```javascript
const backgrounds = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop&sat=-100',
  'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1200&h=800&fit=crop',
  'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=800&fit=crop',
];
```

## 📝 注意事项

1. **SVG 图标**：已提取所有 CallKit 相关图标，可直接使用
2. **铃声文件**：需要自行准备 mp3 格式的铃声文件
3. **图标颜色**：SVG 图标支持通过 CSS 修改颜色（如果 SVG 使用 currentColor）
4. **文件大小**：所有 SVG 图标总大小约 20KB，非常轻量
