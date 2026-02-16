# Presentation Trainer

A web-based tool for practicing presentations with timed slides and speaker notes.

## Features

- **PDF Slides**: Upload your presentation PDF
- **Speaker Notes**: Import notes from a Markdown file (parsed using H1 headings as slide separators)
- **Timed Practice**: Track total presentation time and time per slide
- **Mobile-Friendly**: Works on desktop, tablet, and mobile devices
- **Swipe Navigation**: Navigate slides with touch gestures on mobile

## How to Use

1. Open `index.html` in a web browser
2. Drop or select your PDF slides and Markdown speaker notes
3. Click "Start Presentation" to begin
4. Use arrow keys (desktop) or swipe gestures (mobile) to navigate
5. Press Space to pause/resume the timer
6. View your practice statistics when finished

## Speaker Notes Format

Speaker notes should be a Markdown file with H1 headings (`#`) as slide separators:

```markdown
# Title Slide
Welcome to my presentation

# First Content Slide
Key points to cover:
- Point 1
- Point 2

# Second Content Slide
More notes here...
```

Each H1 heading starts a new slide's notes. The number of H1 headings should match your PDF slide count.

## File Structure

- `index.html` - Main HTML file
- `styles.css` - All styling
- `app.js` - Application logic

## Technologies

- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF rendering
- [Marked](https://marked.js.org/) - Markdown parsing
- [Lucide](https://lucide.dev/) - Icons

## License

MIT
