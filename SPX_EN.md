## SPX File Format Specification
The `.spx` format is a 3DGS model format designed to be fle**X**ible, e**X**tensible, and e**X**clusive.


<br>


- [x] `Flexible` Optimized file header structure, flexible data blocks, and effective compression
- [x] `Extensible` Open format with reserved fields for future expansion
- [x] `Exclusive` Custom format identifiers for proprietary data protection



## File Header (128 bytes)
Fixed-length header for format identification, containing bounding box data for sorting optimization and custom identifiers.

| Byte Offset | Type      | Field Name            | Description                                                                 |
|-------------|-----------|-----------------------|-----------------------------------------------------------------------------|
| 0–2         | ASCII     | `*`Magic           | Fixed value `spx`                                                         |
| 3           | uint8     | `*`Version               | Current version: `1`                                                        |
| 4–7         | uint32    | `*`Gaussian Count        | Total number of Gaussian points                                             |
| 8–11        | float32   | `*`minX                  | Bounding box minimum X coordinate                                           |
| 12–15       | float32   | `*`maxX                  | Bounding box maximum X coordinate                                           |
| 16–19       | float32   | `*`minY                  | Bounding box minimum Y coordinate                                           |
| 20–23       | float32   | `*`maxY                  | Bounding box maximum Y coordinate                                           |
| 24–27       | float32   | `*`minZ                  | Bounding box minimum Z coordinate                                           |
| 28–31       | float32   | `*`maxZ                  | Bounding box maximum Z coordinate                                           |
| 32–35       | float32   | Center Height         | Model center height (Y-axis)                                                |
| 36–39       | float32   | Radius                | Bounding sphere radius                                                      |
| 40–43       | uint32    | Creation Date         | Date in `YYYYMMDD` format                                                   |
| 44–47       | uint32    | `*`Creater ID            | A unique value (other than `0` reserved for official use) to identify the creater  |
| 48–51       | uint32    | `*`Exclusive ID          | A non-zero value (where `0` indicates public formats) defines a proprietary/private data block format      |
| 52–63       | -         | Reserved              | Reserved for future use (3 × uint32)                                        |
| 64–123      | ASCII     | Comment               | Maximum 60 ASCII characters                    |
| 124–127     | uint32    | `*`Checksum              | Validates file integrity (creater-specific)                               |

---

## Data Blocks
Data blocks consist of a fixed header followed by customizable content.

### Data Block Structure
| Byte Offset | Type      | Field Name            | Description                                                                 |
|-------------|-----------|-----------------------|-----------------------------------------------------------------------------|
| 0–3         | int32     | `*`Block Length       | Length of content (excluding this field). `Negative if compressed with gzip` |
| 0–n         | bytes     | `*`Block Content      | Actual data (format defined below)                                          |

### Data Block Content
| Byte Offset | Type      | Field Name            | Description                                                                 |
|-------------|-----------|-----------------------|-----------------------------------------------------------------------------|
| 0–3         | uint32    | `*`Count              | Number of Gaussians in this block                                           |
| 4–7         | uint32    | `*`Format ID          | Identifies data layout (0–255 = open formats; >255 = exclusive)           |
| 8–n         | bytes     | `*`Data               | Structured per Format ID                                                    |

---

## Open Block Content Formats

he data block format encompasses both open and exclusive formats. The reserved range from 0 to 255 is designated for defining the open format, while other values are employed for exclusive formats.


✅  Format `20` (Open Standard)

| Byte Offset | Type      | Field Name            | Description                                                                 |
|-------------|-----------|-----------------------|-----------------------------------------------------------------------------|
| 0–3         | uint32    | `*`Gaussian Count     | Number of Gaussians                                                         |
| 4–7         | uint32    | `*`Format ID          | `20`                                                                 |
| 8–n         | bytes     | `*`Data               | x...y...z...sx...sy...sz...r...g...b...a...rx...ry...rz...rw... |

- **Coordinates**: 24-bit precision (`x`, `y`, `z`).
- **Scale**: 8-bit per axis (`sx`, `sy`, `sz`).
- **Color**: RGBA channels (8-bit each).
- **Rotation**: Quaternion components (8-bit each).

---
