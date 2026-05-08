export interface MobileRecordItem {
  id: number
  kind: 'text' | 'file'
  body: string | null
  r2_key: string | null
  mime: string | null
  original_name: string | null
  created_at: number
}

export interface MobileRecordsListResponse {
  items: MobileRecordItem[]
  nextCursor: string | null
}
