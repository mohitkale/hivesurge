# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/); versions follow SemVer with milestone tags.

## [Unreleased] — v0.1.0-slice (PR 002, awaiting review + playtest)

### Added

- Deterministic fixed-step swarm simulation (typed arrays, spatial hash, 600/400 unit caps with HP folding).
- Gates: add, multiply (clones incl. Queens), trap (absorbs N bees), moving gates.
- Contact attrition combat, wasp waves + ramping trickle, hornet tank enemy, nest/hive HP, timer.
- Queen launch with charge; rewarded revive (once, close calls only).
- Level 1 "Clover Run" with scripted-bot balance tests.
- Three.js instanced renderer with procedural original art, particles, screen shake, number pops.
- Touch, mouse and keyboard input; responsive portrait-first layout with safe-area insets.
- Adaptive pixel-ratio quality scaler targeting 60 fps.
- Design system (`src/ui/theme.ts`) with colour-blind palette; synth SFX + mute; haptics toggle.
- Local analytics ring buffer; versioned save store with cloud-sync merge seam.
- Sandbox platform adapter: 2X reward, revive, paced interstitials, mock purchases.

## [0.0.1] — scaffold

- Vite + TypeScript + Three.js, ESLint, Prettier, Vitest.
