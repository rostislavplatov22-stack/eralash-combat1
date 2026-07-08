# EraLash Combat — Combat Readability & Attack Pose Timing Hotfix 26.10

26.10 cleans up the first real attack-pose implementation so the fight reads as a fighting game instead of layered splash art.

## Highlights

- Resets stale Victory / result / KO state on boot and new match start.
- Shortens real attack pose display windows to fast animation keys:
  - Anticipation: ~0–70 ms
  - Contact: ~70–145 ms
  - Recovery: ~145–235 ms
  - then returns to premium base fighter art
- Reduces Raven slash overlays and Warden block shield rings.
- Reduces block FX opacity/scale so Warden stays visible.
- Adds contact spacing rules so Raven cannot visually sink deep into Iron Warden.
- Reduces burst damage and instant-KO feeling.
- Reduces attack lunge/root-motion so contact happens in front of the defender.
- Preserves Fighter Facing Lock 26.9.
- Preserves Fighter Scale / Grounding / Idle Presence 26.8.
- Preserves Premium Fighter Base Restore 26.7.
- Preserves Start Button Routing 26.6.
- Preserves approved fullscreen arenas.
