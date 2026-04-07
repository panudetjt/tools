# ZIP Local File Header Field Sizes

## Bug

The ZIP local file header and central directory header both have `mod time` (2 bytes) and `mod date` (2 bytes) fields. Writing them as 4-byte arrays shifts all subsequent fields (CRC, sizes, filename) by 4 bytes, producing an invalid zip that cannot be opened.

## Wrong

```typescript
// mod time — 4 bytes (WRONG, should be 2)
new Uint8Array([0, 0, 0, 0]),
// mod date — 4 bytes (WRONG, should be 2)
new Uint8Array([0, 0, 0, 0]),
```

## Correct

```typescript
// mod time — 2 bytes
u16le(0),
// mod date — 2 bytes
u16le(0),
```

## Reference

ZIP local file header layout (APPNOTE.TXT section 4.3.7):

| Offset | Size | Field                                    |
| ------ | ---- | ---------------------------------------- |
| 0      | 4    | Local file header signature (0x04034b50) |
| 4      | 2    | Version needed to extract                |
| 6      | 2    | General purpose bit flag                 |
| 8      | 2    | Compression method                       |
| 10     | 2    | Last mod file time                       |
| 12     | 2    | Last mod file date                       |
| 14     | 4    | CRC-32                                   |
| 18     | 4    | Compressed size                          |
| 22     | 4    | Uncompressed size                        |
| 26     | 2    | File name length                         |
| 28     | 2    | Extra field length                       |
| 30     | n    | File name                                |

Same mod time/date layout applies to the central directory header (section 4.3.12).
