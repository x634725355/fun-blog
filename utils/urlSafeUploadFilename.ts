function safeBasename(name: string): string {
  return name.replace(/^.*[/\\]/, '').replace(/\0/g, '').slice(0, 200) || 'file'
}

/** 上传用文件名：仅保留 URL 路径/查询可安全传输的字符 */
export function urlSafeUploadFilename(name: string): { uploadName: string, originalName: string } {
  const originalName = safeBasename(name)
  const dot = originalName.lastIndexOf('.')
  const base = dot > 0 ? originalName.slice(0, dot) : originalName
  const ext = dot > 0
    ? originalName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16)
    : ''

  let slug = base
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w.-]/g, '')
    .replace(/[-._]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)

  if (!slug) {
    slug = `file-${crypto.randomUUID().slice(0, 8)}`
  }

  const uploadName = ext ? `${slug}.${ext}` : slug
  return { uploadName, originalName }
}
