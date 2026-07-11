#!/usr/bin/env python3
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image


def smoothstep(t):
    return t * t * (3.0 - 2.0 * t)


def zoom_layer(layer, width, height, anchor_x, anchor_y, scale):
    inv = 1.0 / scale
    return layer.transform(
        (width, height),
        Image.Transform.AFFINE,
        (
            inv,
            0.0,
            anchor_x * (1.0 - inv),
            0.0,
            inv,
            anchor_y * (1.0 - inv),
        ),
        resample=Image.Resampling.BICUBIC,
        fillcolor=(255, 255, 255, 255),
    )


def clear_overlay_bands(frame, width, height, main_art_top, main_art_bottom):
    frame.paste((255, 255, 255, 255), (0, 0, width, main_art_top))
    frame.paste((255, 255, 255, 255), (0, main_art_bottom, width, height))
    return frame


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: render-fixed-zoom.py <manifest.json>")

    manifest = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    width = int(manifest["width"])
    height = int(manifest["height"])
    fps = int(manifest["fps"])
    video_path = manifest["videoPath"]
    audio_path = manifest["audioPath"]
    zoom_end = float(manifest.get("zoomEnd", 1.04))
    transition_frames = max(0, int(manifest.get("transitionFrames", 0)))
    main_art_top = int(manifest.get("mainArtTop", 300))
    main_art_bottom = int(manifest.get("mainArtBottom", 1320))
    white_frame = Image.new("RGBA", (width, height), (255, 255, 255, 255))

    cmd = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "rawvideo",
        "-pixel_format",
        "rgb24",
        "-video_size",
        f"{width}x{height}",
        "-framerate",
        str(fps),
        "-i",
        "-",
        "-i",
        audio_path,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-af",
        "loudnorm=I=-16:TP=-1.5:LRA=11",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-shortest",
        "-movflags",
        "+faststart",
        video_path,
    ]

    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    if proc.stdin is None:
        raise RuntimeError("ffmpeg stdin is unavailable")

    scenes = []
    for scene in manifest["scenes"]:
        scenes.append(
            {
                **scene,
                "layer": Image.open(scene["artPath"]).convert("RGBA"),
                "overlay": Image.open(scene["overlayPath"]).convert("RGBA"),
            }
        )

    try:
        for scene_index, scene in enumerate(scenes):
            layer = scene["layer"]
            overlay = scene["overlay"]
            anchor_x, anchor_y = scene["anchor"]
            frame_count = int(scene["frames"])
            scene_transition_frames = min(transition_frames, max(0, frame_count // 3))

            for index in range(frame_count):
                t = 0.0 if frame_count == 1 else index / (frame_count - 1)
                scale = 1.0 + (zoom_end - 1.0) * smoothstep(t)
                frame = zoom_layer(layer, width, height, anchor_x, anchor_y, scale)
                if scene_index > 0 and index < scene_transition_frames:
                    fade_in = smoothstep((index + 1) / (scene_transition_frames + 1))
                    frame = Image.blend(white_frame, frame, fade_in)
                if (
                    scene_index < len(scenes) - 1
                    and scene_transition_frames
                    and index >= frame_count - scene_transition_frames
                ):
                    fade_index = index - (frame_count - scene_transition_frames)
                    fade_out = 1.0 - smoothstep(
                        (fade_index + 1) / (scene_transition_frames + 1)
                    )
                    frame = Image.blend(white_frame, frame, fade_out)

                # Keep generated art out of the fixed title/subtitle overlay bands
                # after zoom. The art layer is already masked before zoom, but the
                # affine transform can otherwise push edge content into those bands.
                frame = clear_overlay_bands(
                    frame,
                    width,
                    height,
                    main_art_top,
                    main_art_bottom,
                )
                frame.alpha_composite(overlay)
                proc.stdin.write(frame.convert("RGB").tobytes())
    finally:
        proc.stdin.close()

    return_code = proc.wait()
    if return_code != 0:
        raise RuntimeError(f"ffmpeg failed with exit code {return_code}")


if __name__ == "__main__":
    main()
