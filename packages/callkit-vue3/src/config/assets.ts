/**
 * CallKit 静态资源配置
 * 
 * 提供默认的静态资源 URL，支持以下方式：
 * 1. 默认使用本地资源路径（/callkit-static-assets/）
 * 2. 用户通过 Props 传入自定义 URL
 * 3. 使用 CDN 路径（配置 CDN_BASE_URL）
 */

// CDN 基础路径（可选，用于自定义 CDN）
const CDN_BASE_URL = '';

// 本地资源基础路径
const LOCAL_BASE_URL = '/callkit-static-assets';

/**
 * 获取资源基础 URL
 */
function getBaseUrl(): string {
  // 如果配置了 CDN，优先使用 CDN
  if (CDN_BASE_URL) {
    return CDN_BASE_URL;
  }
  // 默认使用本地路径
  return LOCAL_BASE_URL;
}

/**
 * 背景图资源
 */
export const DEFAULT_BACKGROUND_IMAGE = `${getBaseUrl()}/images/callkit_bg.png`;

/**
 * 图标资源路径
 */
export const ICONS = {
  MIC_ON: `${getBaseUrl()}/icons/mic_on.svg`,
  MIC_OFF: `${getBaseUrl()}/icons/mic_slash.svg`,
  CAMERA_ON: `${getBaseUrl()}/icons/video_camera.svg`,
  CAMERA_OFF: `${getBaseUrl()}/icons/video_camera_slash.svg`,
  SPEAKER_ON: `${getBaseUrl()}/icons/speaker_wave_2.svg`,
  SPEAKER_OFF: `${getBaseUrl()}/icons/speaker_xmark.svg`,
  PHONE_HANG: `${getBaseUrl()}/icons/phone_hang.svg`,
  PHONE_PICK: `${getBaseUrl()}/icons/phone_pick.svg`,
  MAXIMIZE: `${getBaseUrl()}/icons/chevron_4_all_around.svg`,
  MINIMIZE: `${getBaseUrl()}/icons/chevron_4_cluster.svg`,
  GRID: `${getBaseUrl()}/icons/boxes.svg`,
  SHARE_SCREEN: `${getBaseUrl()}/icons/arrow_right_square_fill.svg`,
  PERSON_ADD: `${getBaseUrl()}/icons/person_add_fill.svg`,
  DEFAULT_AVATAR: `${getBaseUrl()}/images/default_avatar.png`,
} as const;

/**
 * 获取带回退的资源 URL
 * @param customUrl 用户自定义 URL
 * @param defaultUrl 默认 URL
 * @returns 最终使用的 URL
 */
export function getAssetUrl(customUrl: string | undefined, defaultUrl: string): string {
  return customUrl || defaultUrl;
}

/**
 * 检查资源是否可访问（用于调试）
 * @param url 资源 URL
 */
export function checkAssetAvailable(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}
