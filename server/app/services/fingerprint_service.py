import mmh3

def simhash(text: str, bits: int = 64) -> int:
    tokens = text.split()
    if not tokens:
        return 0

    v = [0] * bits
    for t in tokens:
        h = mmh3.hash_bytes(t)
        for i in range(bits):
            byte = h[i // 8]
            bit = (byte >> (i % 8)) & 1
            v[i] += 1 if bit else -1

    result = 0
    for i, val in enumerate(v):
        if val > 0:
            result |= (1 << i)

    mask = (1 << bits) - 1
    unsigned = result & mask
    if bits == 64 and unsigned >= (1 << 63):
        return unsigned - (1 << 64)
    return unsigned


def hamming_distance(x: int, y: int, bits: int = 64) -> int:
    mask = (1 << bits) - 1
    ux = x & mask
    uy = y & mask
    return bin(ux ^ uy).count("1")

