// Minimal ZIP creator for text files (stored, no compression).
// ~2KB vs ~100KB for jszip.

// --- CRC32 ---

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i += 1) {
  let crc = i;
  for (let j = 0; j < 8; j += 1) {
    crc = (crc & 1) === 1 ? (crc >>> 1) ^ 0xED_B8_83_20 : crc >>> 1;
  }
  CRC_TABLE[i] = crc;
}

function crc32(data: Uint8Array): number {
  let crc = 0xFF_FF_FF_FF;
  for (const di of data) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ di) & 0xFF];
  }
  return (crc ^ 0xFF_FF_FF_FF) >>> 0;
}

// --- Binary helpers ---

function u16le(val: number): Uint8Array {
  return new Uint8Array([val & 0xFF, (val >>> 8) & 0xFF]);
}

function u32le(val: number): Uint8Array {
  return new Uint8Array([
    val & 0xFF,
    (val >>> 8) & 0xFF,
    (val >>> 16) & 0xFF,
    (val >>> 24) & 0xFF,
  ]);
}

function concat(...parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function encodeString(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// --- ZIP format ---

interface ZipEntry {
  data: Uint8Array;
  name: string;
}

function createLocalFileHeader(entry: ZipEntry, crc: number): Uint8Array {
  const nameBytes = encodeString(entry.name);
  return concat(
    // signature
    new Uint8Array([0x50, 0x4B, 0x03, 0x04]),
    // version needed
    new Uint8Array([20, 0]),
    // flags
    new Uint8Array([0, 0]),
    // compression method (0 = stored)
    new Uint8Array([0, 0]),
    // mod time
    u16le(0),
    // mod date
    u16le(0),
    // crc32
    u32le(crc),
    // compressed size
    u32le(entry.data.length),
    // uncompressed size
    u32le(entry.data.length),
    // file name length
    u16le(nameBytes.length),
    // extra field length
    u16le(0),
    // file name
    nameBytes
  );
}

function createCentralDirectoryHeader(
  entry: ZipEntry,
  crc: number,
  localHeaderOffset: number
): Uint8Array {
  const nameBytes = encodeString(entry.name);
  return concat(
    // signature
    new Uint8Array([0x50, 0x4B, 0x01, 0x02]),
    // version made by
    new Uint8Array([20, 0]),
    // version needed
    new Uint8Array([20, 0]),
    // flags
    new Uint8Array([0, 0]),
    // compression method
    new Uint8Array([0, 0]),
    // mod time
    u16le(0),
    // mod date
    u16le(0),
    // crc32
    u32le(crc),
    // compressed size
    u32le(entry.data.length),
    // uncompressed size
    u32le(entry.data.length),
    // file name length
    u16le(nameBytes.length),
    // extra field length
    u16le(0),
    // file comment length
    u16le(0),
    // disk number start
    u16le(0),
    // internal file attributes
    u16le(0),
    // external file attributes
    u32le(0),
    // relative offset of local header
    u32le(localHeaderOffset),
    // file name
    nameBytes
  );
}

function createEndOfCentralDirectory(
  centralDirSize: number,
  centralDirOffset: number,
  fileCount: number
): Uint8Array {
  return concat(
    // signature
    new Uint8Array([0x50, 0x4B, 0x05, 0x06]),
    // disk number
    u16le(0),
    // disk with central dir
    u16le(0),
    // number of entries on this disk
    u16le(fileCount),
    // total number of entries
    u16le(fileCount),
    // central dir size
    u32le(centralDirSize),
    // central dir offset
    u32le(centralDirOffset),
    // comment length
    u16le(0)
  );
}

export function createZip(
  files: { content: string; fileName: string }[]
): Blob {
  const entries: ZipEntry[] = files.map((f) => ({
    data: encodeString(f.content),
    name: f.fileName,
  }));

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const entryCrc = crc32(entry.data);
    const localHeader = createLocalFileHeader(entry, entryCrc);
    localParts.push(localHeader, entry.data);
    centralParts.push(createCentralDirectoryHeader(entry, entryCrc, offset));
    offset += localHeader.length + entry.data.length;
  }

  const centralDir = concat(...centralParts);
  const endOfCentralDir = createEndOfCentralDirectory(
    centralDir.length,
    offset,
    entries.length
  );

  const zip = concat(...localParts, centralDir, endOfCentralDir);
  return new Blob([zip], { type: "application/zip" });
}
