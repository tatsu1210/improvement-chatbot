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
  sections: MenuSection[]
): Promise<Buffer> {
  const count = sections.length
  const sectionWidth = Math.floor(width / count)

  const rects = sections.map((section, i) => {
    const x = i * sectionWidth
    const w = i === count - 1 ? width - x : sectionWidth
    const [r, g, b] = section.color
    const cx = x + w / 2

    return `
      <rect x="${x}" y="0" width="${w}" height="${height}" fill="rgb(${r},${g},${b})"/>
      <text x="${cx}" y="${height * 0.42}"
        font-family="Hiragino Sans,Yu Gothic,Meiryo,Arial,sans-serif"
        font-size="160" text-anchor="middle" dominant-baseline="middle"
        fill="white">${section.icon}</text>
      <text x="${cx}" y="${height * 0.72}"
        font-family="Hiragino Sans,Yu Gothic,Meiryo,Arial,sans-serif"
        font-size="110" font-weight="bold" text-anchor="middle" dominant-baseline="middle"
        fill="white">${section.label}</text>
    `
  })

  const dividers = Array.from({ length: count - 1 }, (_, i) => {
    const x = (i + 1) * sectionWidth
    return `<line x1="${x}" y1="20" x2="${x}" y2="${height - 20}" stroke="rgba(255,255,255,0.4)" stroke-width="6"/>`
  })

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    ${rects.join('')}
    ${dividers.join('')}
  </svg>`

  return sharp(Buffer.from(svg)).png().toBuffer()
}
