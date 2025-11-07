# Icon Assets

This directory should contain the extension icons in the following sizes:

- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon32.png` - 32x32 pixels (Mac retina)
- `icon48.png` - 48x48 pixels (extension management)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Temporary Placeholders

For development, you can create simple placeholder icons using:

1. **Online Tools**:
   - https://favicon.io/emoji-favicons/ (use chicken emoji 🐔)
   - https://www.canva.com/ (free design tool)

2. **Command Line** (using ImageMagick):
   ```bash
   # Create simple colored squares as placeholders
   convert -size 16x16 xc:#667eea icon16.png
   convert -size 32x32 xc:#667eea icon32.png
   convert -size 48x48 xc:#667eea icon48.png
   convert -size 128x128 xc:#667eea icon128.png
   ```

3. **Design Requirements** (for final version):
   - Professional chicken mascot design
   - Clean, recognizable at small sizes
   - Matches extension color scheme (purple gradient)
   - PNG format with transparency
   - All required sizes

## Design Notes

The icon should represent:
- A friendly, approachable chicken
- Focus and productivity
- Growth/evolution theme
- Should work on light and dark backgrounds
