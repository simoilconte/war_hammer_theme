"""Synthesize two short, original laser alerts. No downloads or external samples."""
import math
import struct
import wave
import argparse
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "mods/imperial-status/sounds"
RATE = 44100


def laser(start, end, duration, gain=.20):
    samples = []
    phase = 0.0
    for i in range(round(RATE * duration)):
        t = i / RATE
        fraction = t / duration
        freq = start * (end / start) ** fraction
        phase += 2 * math.pi * freq / RATE
        attack = min(1, t / .009)
        release = min(1, (duration - t) / .035)
        envelope = attack * release * math.exp(-2.2 * fraction)
        # Smooth retro laser, a quiet harmonic and mild sci-fi modulation.
        tone = math.sin(phase + .28 * math.sin(2 * math.pi * 38 * t)) + .16 * math.sin(phase * 2)
        samples.append(gain * envelope * tone)
    return samples


def write(name, segments):
    data = []
    for segment in segments:
        data.extend(segment)
    # Low, fixed peak; no device volume or system settings are changed.
    assert max(abs(s) for s in data) < .3
    with wave.open(str(OUT / (name + ".wav")), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(b"".join(struct.pack("<h", round(s * 32767)) for s in data))
    print(name, round(len(data) / RATE, 3), "seconds")


OUT.mkdir(parents=True, exist_ok=True)
silence = lambda seconds: [0.0] * round(RATE * seconds)
write("mission-complete", [laser(2000, 620, .19), silence(.065), laser(2600, 980, .25, .18)])
write("orders-required", [laser(1050, 1950, .145), silence(.075), laser(1050, 2300, .145), silence(.075), laser(1400, 2600, .20, .18)])

parser = argparse.ArgumentParser()
parser.add_argument("--encoder-dir", help="Temporary folder containing lameenc; no global install required")
args = parser.parse_args()
if args.encoder_dir:
    sys.path.insert(0, args.encoder_dir)
    import lameenc
    for name in ("mission-complete", "orders-required"):
        with wave.open(str(OUT / (name + ".wav")), "rb") as source:
            pcm = source.readframes(source.getnframes())
        encoder = lameenc.Encoder()
        encoder.set_bit_rate(128)
        encoder.set_in_sample_rate(RATE)
        encoder.set_channels(1)
        encoder.set_quality(2)
        (OUT / (name + ".mp3")).write_bytes(encoder.encode(pcm) + encoder.flush())
        print("Encoded", name + ".mp3")
