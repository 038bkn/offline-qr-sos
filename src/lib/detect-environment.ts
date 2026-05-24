export type DeviceEnvironment =
  | 'ios-safari'
  | 'ios-chrome'
  | 'android-chrome'
  | 'pc'
  | 'fallback'

export function detectEnvironment(): DeviceEnvironment {
  if (typeof navigator === 'undefined') return 'fallback'

  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isAndroid = /Android/.test(ua)
  // Chrome on iOS reports "CriOS" in UA; regular Chrome does not
  const isChromeOnIOS = /CriOS\//.test(ua)
  const isChrome = /Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua)

  if (isIOS) return isChromeOnIOS ? 'ios-chrome' : 'ios-safari'
  if (isAndroid && isChrome) return 'android-chrome'
  if (!isIOS && !isAndroid) return 'pc'
  return 'fallback'
}
