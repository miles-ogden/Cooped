# Debug & Preview Tools

This folder contains development tools for previewing and testing Cooped features.

## Challenge Style Preview

**File:** `challenge-preview.html`

A live preview tool for testing and iterating on challenge UI designs across different subjects.

### Features:
- ✅ Preview all 4 subject types (Math, Vocabulary, History, General Knowledge)
- ✅ Test all 3 difficulty levels (Easy, Medium, Hard)
- ✅ Live CSS updates (just refresh the page)
- ✅ No need to trigger actual blocked sites
- ✅ Test magnifying glass mechanic for History challenges

### How to Use:

#### Option 1: Open Directly in Browser
1. Navigate to `/Users/mogden/Documents/Cooped/src/debug/challenge-preview.html`
2. Right-click → Open with → Google Chrome
3. Use the controls on the right to switch subjects and difficulties
4. Click "Show Challenge" to preview
5. Edit CSS in `src/content/challenge-overlay.css`
6. Refresh the page to see changes

#### Option 2: Via Extension (Recommended)
1. Load the extension in Chrome (`chrome://extensions/`)
2. Click the Cooped icon to open the popup
3. Look for the "🎨 Preview Challenges" button at the bottom
4. Opens in a new tab for easy testing

### Styling Guidelines

#### Neo-Brutalist Base Style
- Bold borders (2-3px solid black)
- Sharp corners (border-radius: 0 or minimal)
- High contrast colors
- Bold typography
- Flat design (minimal shadows)

#### Subject-Specific Variations

**Math (📐)**
- Primary color: Blue (#1565c0)
- Accent: Light blue (#e3f2fd)
- Style: Clean, geometric, grid-based
- Font: Monospace for numbers?

**Vocabulary (📚)**
- Primary color: Purple (#6a1b9a)
- Accent: Light purple (#f3e5f5)
- Style: Literary, elegant serif accents
- Font: Mix serif headings with sans body

**History (🏛️)**
- Primary color: Amber/Gold (#f57f17)
- Accent: Light yellow (#fff9c4)
- Style: Antiquated, detective/mystery theme
- Special: Magnifying glass interaction

**General Knowledge (🌍)**
- Primary color: Green (#2e7d32)
- Accent: Light green (#e8f5e9)
- Style: Worldly, diverse, encyclopedic
- Font: Clean, accessible

### CSS Classes to Customize

#### Per-Subject Styling
Add to `challenge-overlay.css`:

```css
/* Math challenges */
#cooped-overlay[data-subject="math"] .cooped-question {
  border-color: #1565c0;
  /* ... */
}

/* Vocabulary challenges */
#cooped-overlay[data-subject="vocabulary"] .cooped-question {
  border-color: #6a1b9a;
  /* ... */
}

/* History challenges */
#cooped-overlay[data-subject="history"] .cooped-question {
  border-color: #f57f17;
  /* ... */
}

/* General Knowledge challenges */
#cooped-overlay[data-subject="general-knowledge"] .cooped-question {
  border-color: #2e7d32;
  /* ... */
}
```

### Quick Tips:
- Use `data-subject` attribute on `#cooped-overlay` to target specific subjects
- Test with different screen sizes (responsive design)
- Check color contrast for accessibility
- Keep the chicken mascot prominent
- Ensure text is readable on all backgrounds

### Troubleshooting:
- **Challenges not loading?** Check browser console for errors
- **CSS not updating?** Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
- **History magnifying glass not working?** Check that clues have proper IDs

---

**Pro Tip:** Keep this page open in a separate window while you edit CSS for instant visual feedback!