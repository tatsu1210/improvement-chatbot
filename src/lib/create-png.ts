import { deflate } from 'node:zlib'
import { promisify } from 'node:util'

const deflateAsync = promisify(deflate)

const CRC_TABLE = (() => {
  const table: number[] = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c
  }
  return table
})()

function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0)
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf])
}

type RGB = [number, number, number]

export async function createSectionedPng(
  width: number,
  height: number,
  sections: RGB[]
): Promise<Buffer> {
  const sectionCount = sections.length
  const sectionWidth = Math.floor(width / sectionCount)

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 2 // color type: RGB
  const ihdr = pngChunk('IHDR', ihdrData)

  const stride = width * 3 + 1
  const raw = Buffer.alloc(stride * height)

  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0 // filter: None
    for (let x = 0; x < width; x++) {
      const idx = Math.min(Math.floor(x / sectionWidth), sectionCount - 1)
      const [r, g, b] = sections[idx]
      const off = y * stride + 1 + x * 3
      raw[off] = r
      raw[off + 1] = g
      raw[off + 2] = b
    }
  }

  const compressed = await deflateAsync(raw)
  const idat = pngChunk('IDAT', compressed)
  const iend = pngChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdr, idat, iend])
}
