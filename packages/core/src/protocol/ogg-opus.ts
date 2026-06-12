const OPUS_HEAD = Buffer.from([
  0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64, 0x01, 0x01, 0x38, 0x01, 0x80, 0xbb, 0x00, 0x00,
  0x00, 0x00, 0x00
]);
const OPUS_TAGS = Buffer.from("OpusTags\r\0\0\0WatchAgent\0\0\0\0", "binary");
const OGG_CAPTURE = Buffer.from("OggS");
const CRC_TABLE = makeCrcTable();

export function rawOpusPacketsToOgg(packets: Uint8Array[], sampleRate = 16000): Uint8Array {
  let sequence = 0;
  const serial = Math.floor(Math.random() * 0xffffffff);
  const head = Buffer.from(OPUS_HEAD);
  head.writeUInt32LE(sampleRate, 12);
  const pages: Buffer[] = [
    createPage({ packet: head, headerType: 2, granulePosition: 0n, serial, sequence: sequence++ }),
    createPage({ packet: OPUS_TAGS, headerType: 0, granulePosition: 0n, serial, sequence: sequence++ })
  ];
  let granule = 0n;
  for (const packet of packets) {
    granule += BigInt(Math.round((sampleRate * 60) / 1000));
    pages.push(createPage({ packet: Buffer.from(packet), headerType: 0, granulePosition: granule, serial, sequence: sequence++ }));
  }
  return Buffer.concat(pages);
}

export function oggOpusToRawPackets(ogg: Uint8Array): Uint8Array[] {
  const data = Buffer.from(ogg);
  const packets: Uint8Array[] = [];
  let offset = 0;
  while (offset + 27 <= data.length) {
    if (!data.subarray(offset, offset + 4).equals(OGG_CAPTURE)) {
      const next = data.indexOf(OGG_CAPTURE, offset + 1);
      if (next === -1) break;
      offset = next;
      continue;
    }
    const segmentCount = data[offset + 26];
    const segmentTableStart = offset + 27;
    const payloadStart = segmentTableStart + segmentCount;
    if (payloadStart > data.length) break;
    const sizes = [...data.subarray(segmentTableStart, payloadStart)];
    const payloadSize = sizes.reduce((sum, size) => sum + size, 0);
    const payloadEnd = payloadStart + payloadSize;
    if (payloadEnd > data.length) break;
    let cursor = payloadStart;
    let packetParts: Buffer[] = [];
    for (const size of sizes) {
      packetParts.push(data.subarray(cursor, cursor + size));
      cursor += size;
      if (size < 255) {
        const packet = Buffer.concat(packetParts);
        packetParts = [];
        if (!packet.subarray(0, 8).equals(Buffer.from("OpusHead")) && !packet.subarray(0, 8).equals(Buffer.from("OpusTags"))) {
          packets.push(packet);
        }
      }
    }
    offset = payloadEnd;
  }
  return packets;
}

function createPage(input: { packet: Buffer; headerType: number; granulePosition: bigint; serial: number; sequence: number }): Buffer {
  const laces: number[] = [];
  let remaining = input.packet.length;
  while (remaining >= 255) {
    laces.push(255);
    remaining -= 255;
  }
  laces.push(remaining);
  const header = Buffer.alloc(27 + laces.length);
  OGG_CAPTURE.copy(header, 0);
  header[4] = 0;
  header[5] = input.headerType;
  header.writeBigUInt64LE(input.granulePosition, 6);
  header.writeUInt32LE(input.serial >>> 0, 14);
  header.writeUInt32LE(input.sequence >>> 0, 18);
  header.writeUInt32LE(0, 22);
  header[26] = laces.length;
  Buffer.from(laces).copy(header, 27);
  const page = Buffer.concat([header, input.packet]);
  page.writeUInt32LE(oggCrc(page), 22);
  return page;
}

function makeCrcTable(): number[] {
  const table: number[] = [];
  for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let bit = 0; bit < 8; bit++) {
      r = (r & 0x80000000) !== 0 ? ((r << 1) ^ 0x04c11db7) : r << 1;
    }
    table[i] = r >>> 0;
  }
  return table;
}

function oggCrc(buffer: Buffer): number {
  let crc = 0;
  for (const byte of buffer) {
    crc = ((crc << 8) ^ CRC_TABLE[((crc >>> 24) & 0xff) ^ byte]) >>> 0;
  }
  return crc >>> 0;
}
