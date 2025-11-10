export type MaskDraft = {
  uri: string
  createdAt: number
}

let currentDraft: MaskDraft | null = null

export function setMaskDraft(draft: MaskDraft | null) {
  currentDraft = draft
}

export function consumeMaskDraft(): MaskDraft | null {
  const draft = currentDraft
  currentDraft = null
  return draft
}
