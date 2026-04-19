import arrowRightSquareFill from '../../../callkit-static-assets/icons/arrow_right_square_fill.svg?raw'
import boxes from '../../../callkit-static-assets/icons/boxes.svg?raw'
import cameraFillArrows from '../../../callkit-static-assets/icons/camera_fill_arrows.svg?raw'
import chevron4AllAround from '../../../callkit-static-assets/icons/chevron_4_all_around.svg?raw'
import chevron4Cluster from '../../../callkit-static-assets/icons/chevron_4_cluster.svg?raw'
import micOn from '../../../callkit-static-assets/icons/mic_on.svg?raw'
import micSlash from '../../../callkit-static-assets/icons/mic_slash.svg?raw'
import personAdd from '../../../callkit-static-assets/icons/person_add.svg?raw'
import personAddFill from '../../../callkit-static-assets/icons/person_add_fill.svg?raw'
import personDoubleFill from '../../../callkit-static-assets/icons/person_double_fill.svg?raw'
import personMinus from '../../../callkit-static-assets/icons/person_minus.svg?raw'
import personMinusFill from '../../../callkit-static-assets/icons/person_minus_fill.svg?raw'
import personSingleFill from '../../../callkit-static-assets/icons/person_single_fill.svg?raw'
import phoneHang from '../../../callkit-static-assets/icons/phone_hang.svg?raw'
import phonePick from '../../../callkit-static-assets/icons/phone_pick.svg?raw'
import speakerWave2 from '../../../callkit-static-assets/icons/speaker_wave_2.svg?raw'
import speakerXmark from '../../../callkit-static-assets/icons/speaker_xmark.svg?raw'
import videoCamera from '../../../callkit-static-assets/icons/video_camera.svg?raw'
import videoCameraSlash from '../../../callkit-static-assets/icons/video_camera_slash.svg?raw'
import videoCameraSplus from '../../../callkit-static-assets/icons/video_camera_splus.svg?raw'
import videoCameraXmark from '../../../callkit-static-assets/icons/video_camera_xmark.svg?raw'

/**
 * 处理 SVG 字符串，统一替换颜色为 currentColor
 */
function processSvg(svg: string): string {
  // 1. 替换已有的固定颜色 fill
  svg = svg.replace(/fill="#[0-9A-Fa-f]{3,6}"/g, 'fill="currentColor"')
  // 2. 替换已有的固定颜色 stroke
  svg = svg.replace(/stroke="#[0-9A-Fa-f]{3,6}"/g, 'stroke="currentColor"')
  // 3. 给没有 fill 属性的 path 添加 fill="currentColor"（但保留 fill="none"）
  svg = svg.replace(/<path(?![^>]*fill=)([^>]*)>/g, '<path fill="currentColor"$1>')
  return svg
}

export const iconRegistry: Record<string, string> = {
  'arrow-right-square-fill': processSvg(arrowRightSquareFill),
  boxes: processSvg(boxes),
  'camera-fill-arrows': processSvg(cameraFillArrows),
  'chevron-4-all-around': processSvg(chevron4AllAround),
  'chevron-4-cluster': processSvg(chevron4Cluster),
  'mic-on': processSvg(micOn),
  'mic-slash': processSvg(micSlash),
  'person-add': processSvg(personAdd),
  'person-add-fill': processSvg(personAddFill),
  'person-double-fill': processSvg(personDoubleFill),
  'person-minus': processSvg(personMinus),
  'person-minus-fill': processSvg(personMinusFill),
  'person-single-fill': processSvg(personSingleFill),
  'phone-hang': processSvg(phoneHang),
  'phone-pick': processSvg(phonePick),
  'speaker-wave-2': processSvg(speakerWave2),
  'speaker-xmark': processSvg(speakerXmark),
  'video-camera': processSvg(videoCamera),
  'video-camera-slash': processSvg(videoCameraSlash),
  'video-camera-splus': processSvg(videoCameraSplus),
  'video-camera-xmark': processSvg(videoCameraXmark),
}

export const iconNames = Object.keys(iconRegistry) as string[]
