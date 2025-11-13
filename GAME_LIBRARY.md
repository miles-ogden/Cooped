# Cooped Game Library

## Game Registry & Documentation

This file tracks all interrupt sequence games and their specifications for reference and future expansion.

---

## Game 1: Vocabulary Challenge

**File Reference**: [content-script.js:160-404](src/content/content-script.js#L160-L404)

**Status**: ✅ Saved & Production Ready

**Game Name**: Vocabulary Challenge

**Description**: Fill-in-the-blank vocabulary game where players select the correct word to complete a sentence.

**Mechanics**:
- Player reads a sentence with a blank
- Four word options displayed vertically on the right
- Chicken animates to selected word, then to blank position
- When correct answer selected, advances to next page
- Wrong answers show red flash with "Try Again" feedback

**Current Question**:
- Sentence: "Jeremiah went to the store and realized that he had a(n) __________ of groceries in his shopping cart"
- Correct Answer: "plethora"
- Options: plethora, squadral, surreal, flora

**UI Layout** (Page 2):
- Top: Sentence with blank box (light gray background, centered)
- Bottom: Split layout
  - Left (350x350px): SVG chicken image
  - Right: Word buttons stacked vertically (full-width, 15px padding)

**Animations**:
- Word click triggers chicken animation sequence:
  1. Chicken moves to selected word (0.5s)
  2. Chicken moves to blank position (0.5s)
  3. Chicken returns to center (0.3s)
- Second click (deselect) cancels animation, just resets state

**Future Improvements**:
- [ ] Add variety of questions (multiple sentences)
- [ ] Implement difficulty scaling
- [ ] Add category-based vocabulary sets
- [ ] Smoother animation transitions

---

## Game 2: Math Challenge

**File Reference**: [content-script.js:409-729](src/content/content-script.js#L409-L729)

**Status**: ✅ Saved & Production Ready

**Game Name**: Math Challenge

**Description**: Math problem game where players accumulate eggs by clicking/dragging egg denomination buttons to build the correct answer. The chicken sits on a nest and moves up each time eggs are added.

**Current Question**:
- Problem: "50 ÷ 2 = ?"
- Correct Answer: 25

**Mechanics**:
- Math question displayed at top center (32px, bold)
- Four egg denomination buttons: 100, 50, 10, 1 (with egg emoji 🥚)
- Buttons are clickable or draggable
- Chicken SVG positioned on nest.png background
- Each click/drag:
  1. Chicken animates upward (0.4s) - reveals nest below
  2. Egg count incremented by denomination value
  3. Chicken returns to starting position (0.4s)
- Running total displayed below nest shows accumulated egg count
- Submit button validates answer (exact match required)
- Wrong answers flash red feedback, prompt to try again

**Button Denominations** (Larger buttons - 20px padding, 18px font):
- 100 eggs 🥚 (for tens place)
- 50 eggs 🥚
- 10 eggs 🥚 (for ones place in lower values)
- 1 egg 🥚 (for precise adjustment)

**UI Layout** (Page 2):
- Top (flex: 0 0 auto): Math question (32px font, 20px margin top)
- Second row (flex: 0 0 auto): Four egg buttons (flexbox, centered, 15px gap, 30px margin top)
- Third row (flex: 0 0 auto): Undo and Reset buttons (↶ Undo, ⟲ Reset - light gray borders)
- Middle (flex: 1): Chicken on nest container (relative positioning)
  - Nest background: 300x200px
  - Chicken wrapper: 280x280px, positioned at bottom (0px) - sits lower on nest
  - Chicken transitions on translateY for up/down animation
- Below (flex: 0 0 auto): Total display (28px font, bold) showing "Total: X 🥚"
- Bottom (flex: 0 0 auto): Submit button

**Animations**:
- Click animation: Chicken up (0.4s) → update count → chicken down (0.4s)
- Drag animation (on drop): Chicken down (0.4s) → update count
- Drag preview (on dragover): Chicken up (0.2s) to reveal nest
- Drag preview (on dragleave): Chicken down (0.2s) to hide nest
- Chicken up: `transform: translateY(-60px)` with `transition: 0.4s ease`
- Chicken down: `transform: translateY(0)` with `transition: 0.4s ease` or `0.2s ease`
- Animation state locked during click/drag sequence (isAnimating flag)

**Interaction Methods**:
- **Click on egg button**: Adds eggs with full animation (chicken up 0.4s, count updates, chicken down 0.4s)
- **Drag egg button onto chicken/nest**:
  - Chicken moves up (0.2s) on dragover (reveals nest preview)
  - Chicken moves down (0.2s) on dragleave (hides nest)
  - On drop: Chicken animates down (0.4s), then count updates and displays total
  - Button becomes semi-transparent (50% opacity) during drag
- **Undo button** (↶): Goes back one step in history (undo last click/drag). Can be clicked multiple times to step back through all previous states
- **Reset button** (⟲): Clears total back to 0 and erases all history
- Can click/drag same button multiple times (cumulative totals)
- Each click/drag is recorded in history for undo functionality
- Wrong answer feedback: 1s red background flash on total display

**Math Problem Types** (To be added):
- [x] Division (current implementation)
- [ ] Multiplication
- [ ] Exponents
- [ ] Addition/Subtraction
- [ ] Mixed operations

**Future Enhancements**:
- [ ] Variety of math problems (externalized question bank)
- [ ] Difficulty scaling (more complex operations)
- [ ] Progressive difficulty curves
- [ ] Hint system for wrong answers
- [ ] Timer-based challenges
- [ ] Negative numbers and decimal support

---

## Game Framework

### Common Features
- All games use SVG chicken mascot
- Light gray background (#f5f5f5)
- Dark text (#333)
- 750x750px modal container
- Responsive button layouts
- Animation-based user feedback

### Game Integration Points
- [content-script.js:24](src/content/content-script.js#L24) - `currentGameType` global variable tracks which game (vocabulary, math)
- [content-script.js:117-130](src/content/content-script.js#L117-L130) - Page rendering dispatcher with game selection
- [content-script.js:160](src/content/content-script.js#L160) - `renderVocabularyChallengeInline()` - Vocabulary game
- [content-script.js:409](src/content/content-script.js#L409) - `renderMathChallengeInline()` - Math game
- Pages 1-3 are part of interrupt sequence (Page 1: welcome, Page 2: game, Page 3: completion)
- Future: Randomize which game appears on page 2 using `currentGameType`

---

## Notes for Development

- All question data should be externalized (not hardcoded)
- Consider creating a `games/` directory structure for scalability
- Each game should follow same submission/validation pattern:
  1. Display question
  2. Allow user interaction (clicks/drags)
  3. Validate answer on submit
  4. Show success/error feedback
  5. Advance to next page on correct answer
- XP rewards can vary by game type and difficulty
- Update this file when adding new games or modifying existing mechanics
- Reference this file to understand game frameworks and patterns before implementing new games
