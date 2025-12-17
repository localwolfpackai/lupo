# LUPO

> A scroll-responsive WebGL hero experience with dithered black & white aesthetics.

![Hero Animation](https://github.com/user-attachments/assets/placeholder.gif)

## ✨ Features

- **LUPO Letter Cycling** — Morphing 3D cubes form L → U → P → O
- **B&W Dithered Aesthetic** — 4×4 Bayer matrix pattern with film grain
- **Scroll-Driven Animation** — Letters respond to scroll position
- **Animated "move" Text** — Dramatic drop and bounce synced with 3D
- **Glassmorphism Sections** — Hero, About, Work, Contact

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/anthonylupo/lupo.git
cd lupo

# Install dependencies
npm install

# Start dev server (opens browser automatically)
npm run dev
```

## 🎨 Tech Stack

- **[Phenomenon.js](https://github.com/vaneenige/phenomenon)** — Lightweight WebGL renderer (2kB)
- **[Vite](https://vitejs.dev)** — Fast dev server with HMR
- **Custom Shaders** — Bayer dithering, morphing geometry
- **CSS Animations** — Keyframe-driven text effects

## 📁 Structure

```
lupo/
├── index.html          # Website with hero + sections
├── src/
│   ├── main.js         # WebGL animation + scroll logic
│   └── styles.css      # Layout + animations
└── package.json
```

## 🎬 How It Works

1. **Hero Section** — Full-screen canvas with dithered LUPO animation
2. **Scroll Trigger** — Letters cycle based on scroll depth
3. **Text Sync** — "move" word drops/vanishes on 8-second cycle
4. **Sections Below** — Content scrolls over fixed canvas background

## 📝 License

MIT © [Anthony Lupo](https://github.com/anthonylupo)

---

*Made with ⚡ Phenomenon.js*
