import mmh3
import numpy as np

def simhash(text: str, bits: int = 128) -> int:
    tokens = text.split()
    v = np.zeros(bits)
    for t in tokens:
        h = mmh3.hash_bytes(t)
        for i in range(bits):
            v[i] += 1 if (h[i // 8] >> (i % 8)) & 1 else -1
    return sum(1 << i for i, val in enumerate(v > 0))

def hamming_distance(x: int, y: int) -> int:
    return bin(x ^ y).count("1")
