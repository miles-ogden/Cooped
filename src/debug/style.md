# Wake the Flock / Cooped Brand Style Guide

## Brand Essence

A rebellious, witty, anti-propaganda aesthetic that flips Big Media's manipulative UX patterns on their head. The tone is playful but pointed, like a chicken coop staging a revolt. The world feels handmade, imperfect, punchy, and defiant.

The experience should feel like:
- A protest poster turned into a UI.
- A punk zine that learned CSS.
- A surreal Dada collage that knows you're addicted to the feed — and calls you out with a wink.

This is the antithesis of slick corporate design.

---

## 🧠 Core Themes

- Rebellion Against Algorithms
- Anti-Feed / Anti-Doomscrolling Activism
- Surreal Humor & Satire
- Chicken / Flock Wordplay
- Handmade, Imperfect, Human-first Design
- Randomness, disruption, pattern-breaking

---

## 🎨 Visual Style

### Color Palette

Use bold, high-contrast protest colors:
- **Punch Red**: #FF2B2B
- **Signal Yellow**: #FFE800
- **Carbon Black**: #090909
- **Bone White**: #F8F6F1 (for paper texture)
- **Chicken-Comb Pink**: #FF4F7B (accent)

Avoid gradients except deliberately ugly or jarring ones.

### Texture

Simulate physical materials:
- Halftone dots
- Paper grain
- Screenprint misalignment
- Rough, imperfect edges
- Tape strips / cutout effects
- Offset shadows

Textures should feel applied, not procedural.

---

## ✏️ Typography

### Primary Fonts

- A condensed grotesk for loud statements (Impact, League Gothic, Anton, etc.)
- A wonky handwriting or typewriter font for annotations or "subversive" commentary

### Rules

- Use uppercase headlines in big blocks.
- Use tight spacing (like old protest posters).
- Occasionally let text break grids.
- Introduce "intentional mistakes" (misalignment, underline, strikethrough, arrows).

---

## 🐓 Iconography & Motifs

These should appear repeatedly across UI screens:

### Chicken-Themed Motifs

- Crude line-art chickens
- Warning symbols using chicken silhouettes
- "Flock alerts" (megaphone + chicken head)
- Eggs (used as buttons or notification counters)
- Chicken footprints as directional cues

### Anti-Feed Motifs

- Red "X" over infinite scroll icons
- Newspaper-style halftone gradients
- Torn paper edges revealing UI sections
- Big arrows pointing at manipulative patterns ("THIS IS A TRAP")

### Rebellion Motifs

- Stamp textures
- Spray-paint blobs
- Cut-out magazine letters
- Overlays that resemble protest stickers

These are minimal but iconic, easily repeatable in CSS.

---

## 🧩 UI Layout Principles

### 1. Grids Should Look "Broken"

Technically aligned, visually chaotic.

Examples:
- Intentionally offset card borders
- Tilted banners or headers
- Overlapping zines and tape layers

### 2. Use "Punch Boxes"

Big rectangles with thick borders for callouts:
- BLOCKED SITE
- WAKE THE FLOCK
- QUIZ CHECKPOINT
- BRAIN BREAK

### 3. Use Micro-Animations

- Wobble
- Offset jitter
- Halftone pulsing
- Scratchy sketch-in effects

---

## 💬 Messaging & Tone

### 1. Replace Addiction With Play

Microlearning interrupts doomscrolling using:
- Quizzes
- Puzzles
- Tiny challenges
- "Flock alerts"

### 2. Humor as a Weapon

UI copy should feel like a rebellious friend pulling you out of the algorithmic trance:
- "Hey. Hey! WAKE THE FLOCK UP."
- "You've been scrolling for 9½ minutes. How about not?"
- "Answer this egg quiz to escape the feed."

### 3. Small Chaotic Moments

Tiny random flourishes:
- Random chicken doodles
- Cutout arrows pointing at buttons
- A chicken peck animation when you complete a quiz

---

## 🖥️ Challenge Overlay Styling

### Darkened Background with Hatch Pattern

When a challenge overlay is shown:
- The page background is desaturated (grayscale)
- A white diagonal hatch pattern overlay (40% opacity) covers the darkened page
- This creates visual separation and emphasis on the challenge modal itself

**Implementation Details:**
- Desaturation applied via CSS `filter: grayscale(100%)` on background elements
- Diagonal hatching created with SVG pattern or CSS repeating gradient
- Hatch pattern: white diagonal lines at ~45° angle, 40% opacity
- Maintains contrast and visual hierarchy

---

## Subject-Specific Style Variations

*To be defined as we develop each subject's unique voice*

### Math Challenges
*Styling rules for math-specific variations*

### Vocabulary Challenges
*Styling rules for vocabulary-specific variations*

### History Challenges
*Styling rules for history-specific variations (detective theme)*

### General Knowledge Challenges
*Styling rules for general knowledge variations*

---

**Last Updated**: 2025-11-16
**Related Files**: See CLAUDE.md for project context and file structure
