import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isNative } from './native'

/**
 * Saving and sharing that works both on the web and in the Android app.
 * The app's web view has no Web Share API and ignores <a download>, so there
 * the file is written to the app's cache and handed to the system share
 * sheet, where people can save it to Files/Drive or send it.
 */

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })

const cancelled = (e: unknown) => /cancel/i.test(e instanceof Error ? e.message : String(e))

/** Shares or saves a file. Resolves once the share sheet closes or the download starts. */
export async function saveFile(name: string, blob: Blob, title = name) {
  if (isNative) {
    const { uri } = await Filesystem.writeFile({ path: name, data: await toBase64(blob), directory: Directory.Cache })
    try {
      await Share.share({ title, files: [uri], dialogTitle: title })
    } catch (e) {
      if (!cancelled(e)) throw e
    }
    return
  }
  const file = new File([blob], name, { type: blob.type })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      return await navigator.share({ files: [file], title })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      // sharing refused here; download instead
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

/** Shares a link with the share sheet, or copies it. */
export async function shareUrl(title: string, url: string): Promise<'shared' | 'cancelled' | 'copied'> {
  if (isNative) {
    try {
      await Share.share({ title, url, dialogTitle: title })
      return 'shared'
    } catch (e) {
      if (cancelled(e)) return 'cancelled'
    }
  } else if (navigator.share) {
    try {
      await navigator.share({ title, url })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // sharing not allowed here; fall back to copying
    }
  }
  await navigator.clipboard.writeText(url)
  return 'copied'
}
