# Wim Hof Breathing Trainer 🌬️

A minimalist, high-performance web application designed to guide users through the Wim Hof breathing method. Featuring a high-precision breathing engine, synchronized audio cues, and a robust progress tracking system.

**[🌐 Live Demo](https://hignst.github.io/Wim-Hof-Breathing/)**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

## ✨ Features

- **Interactive Breathing Engine**: A 60fps synchronized visual guide that mimics the natural rhythm of deep breathing.
- **Precision Audio Cues**: Additive synthesis tones (Inhale, Exhale, Hold, Recovery) generated via Web Audio API.
- **Progress Dashboard**: 
    - **Session History**: Track your last 7 sessions with interactive charts.
    - **Activity Calendar**: Visual heat-map of your practice days.
    - **Streaks & Stats**: Keep track of your daily streak and personal best hold times.
- **Advanced Hold Modes**: 
    - **Target Mode**: Work towards specific hold goals per round.
    - **Infinity Mode**: Push your limits with an open-ended timer.
- **Safety First**: Integrated safety protocols and warnings before every session.
- **Deep Space UI**: A beautiful, distraction-free minimalist interface designed for focus.

## 🛠️ Tech Stack

- **Framework**: [React](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Audio**: Web Audio API

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation & Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/hignst/Wim-Hof-Breathing.git
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Start development server:**
   ```bash
   npm run dev
   ```

### 📦 Production & Deployment

This project is configured to build into a **single, portable HTML file** using the `vite-plugin-singlefile`.

1. **Generate the build:**
   ```bash
   npm run build
   ```
2. The output is a single `dist/index.html` containing all CSS, JS, and assets.

#### 🌐 GitHub Pages Deployment

The live site is hosted via GitHub Pages: [hignst.github.io/Wim-Hof-Breathing/](https://hignst.github.io/Wim-Hof-Breathing/)

To update the live site:
1. Run `npm run build`.
2. Move/upload the resulting `dist/index.html` to your deployment branch (`main` or `gh-pages`).

## ⚠️ Disclaimer

This application is for educational purposes. The Wim Hof Method involves deep breathing and breath retention which can cause physiological changes. **Always practice in a safe environment (lying down or sitting). NEVER practice while driving, swimming, or in water.** Consult a doctor if you have any pre-existing medical conditions.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
