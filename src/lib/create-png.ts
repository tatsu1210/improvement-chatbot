import sharp from 'sharp'

type RGB = [number, number, number]

export interface MenuSection {
  color: RGB
  icon: string
  label: string
}

export async function createSectionedPng(
  width: number,
  height: number,
  sections: MenuSection[],
  columns?: number
): Promise<Buffer> {
  const cols = columns ?? sections.length
  const rows = Math.ceil(sections.length / cols)
  const cellWidth = Math.floor(width / cols)
  const cellHeight = Math.floor(height / rows)

  const rects = sections.map((section, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = col * cellWidth
    const y = row * cellHeight
    const w = col === cols - 1 ? width - x : cellWidth
    const [r, g, b] = section.color
    const cx = x + w / 2

    return `
      <rect x="${x}" y="${y}" width="${w}" height="${cellHeight}" fill="rgb(${r},${g},${b})"/>
      <text x="${cx}" y="${y + cellHeight * 0.42}"
        font-family="Hiragino Sans,Yu Gothic,Meiryo,Arial,sans-serif"
        font-size="160" text-anchor="middle" dominant-baseline="middle"
        fill="white">${section.icon}</text>
      <text x="${cx}" y="${y + cellHeight * 0.72}"
        font-family="Hiragino Sans,Yu Gothic,Meiryo,Arial,sans-serif"
        font-size="110" font-weight="bold" text-anchor="middle" dominant-baseline="middle"
        fill="white">${section.label}</text>
    `
  })

  const vDividers = Array.from({ length: cols - 1 }, (_, i) => {
    const x = (i + 1) * cellWidth
    return `<line x1="${x}" y1="20" x2="${x}" y2="${height - 20}" stroke="rgba(255,255,255,0.4)" stroke-width="6"/>`
  })

  const hDividers = Array.from({ length: rows - 1 }, (_, i) => {
    const y = (i + 1) * cellHeight
    return `<line x1="20" y1="${y}" x2="${width - 20}" y2="${y}" stroke="rgba(255,255,255,0.4)" stroke-width="6"/>`
  })

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    ${rects.join('')}
    ${vDividers.join('')}
    ${hDividers.join('')}
  </svg>`

  return sharp(Buffer.from(svg)).png().toBuffer()
}
