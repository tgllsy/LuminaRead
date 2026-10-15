use crate::infra::parser::security::MAX_DECOMPRESSED_BYTES;

pub fn decompress_palmdoc_lz77(src: &[u8]) -> Vec<u8> {
    let max_out = (MAX_DECOMPRESSED_BYTES as usize).min(64 * 1024 * 1024);
    let mut out = Vec::with_capacity(src.len().saturating_mul(2).min(1024 * 1024));
    let mut i = 0;
    while i < src.len() && out.len() < max_out {
        let b = src[i];
        i += 1;
        if b == 0x00 || (0x09..=0x7f).contains(&b) {
            out.push(b);
        } else if (0x01..=0x08).contains(&b) {
            let count = b as usize;
            for _ in 0..count {
                if i < src.len() && out.len() < max_out {
                    out.push(src[i]);
                    i += 1;
                }
            }
        } else if b >= 0xc0 {
            out.push(b' ');
            out.push(b ^ 0x80);
        } else {
            if i >= src.len() {
                break;
            }
            let b2 = src[i];
            i += 1;
            let pair = ((b as u16) << 8) | (b2 as u16);
            let dist = ((pair >> 3) & 0x07ff) as usize;
            let len = ((pair & 0x07) + 3) as usize;
            if dist > 0 && dist <= out.len() {
                let copy_start = out.len() - dist;
                for k in 0..len {
                    if out.len() >= max_out {
                        break;
                    }
                    out.push(out[copy_start + k]);
                }
            }
        }
    }
    out
}

pub fn strip_mobi_trailing_data(mut rec: &[u8], flags: usize) -> &[u8] {
    let mut extra = flags >> 1;
    while extra > 0 {
        if extra & 1 != 0 {
            if rec.is_empty() {
                break;
            }
            let mut sz: usize = 0;
            let mut shift = 0;
            let mut p = rec.len();
            while p > 0 && p >= rec.len().saturating_sub(4) {
                p -= 1;
                let b = rec[p];
                sz |= ((b & 0x7f) as usize) << shift;
                shift += 7;
                if b & 0x80 != 0 {
                    break;
                }
            }
            if sz > 0 && sz <= rec.len() {
                rec = &rec[..rec.len() - sz];
            }
        }
        extra >>= 1;
    }
    if flags & 1 != 0 && !rec.is_empty() {
        let overlap = ((rec[rec.len() - 1] & 0x03) + 1) as usize;
        if overlap <= rec.len() {
            rec = &rec[..rec.len() - overlap];
        }
    }
    rec
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_palmdoc_lz77_decompression() {
        let src = b"Hello, World!";
        let out = decompress_palmdoc_lz77(src);
        assert_eq!(&out, src);

        let src = vec![b'H', b'i', 0x80 | b'a'];
        let out = decompress_palmdoc_lz77(&src);
        assert_eq!(&out, b"Hi a");
    }
}
