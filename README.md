# 🎳 Lawn Bowls Scoreboard

A modern, responsive, real-time live digital scoreboard and match management application designed specifically for Lawn Bowls tournaments, clubs, and casual matches.

🌐 **Live Website:** [https://lawn-bowls-scoreboard-3088.web.app](https://lawn-bowls-scoreboard-3088.web.app)

---

## ✨ Features

- **Live Scoring:** Real-time end-by-end score tracking for Singles, Pairs, Triples, and Fours.
- **Bi-directional Live Sync:** Powered by Firebase Firestore for real-time spectator view and multi-device scorekeeping.
- **Match Summaries & PDF Export:** Generate and download official match scorecard PDFs instantly with `jspdf`.
- **Sound & Haptics:** Audio cues and vibration feedback for game events and victory celebrations.
- **Customizable Themes:** Switch themes (including Emerald green lawn style) and tailor the scoreboard aesthetics.
- **Offline & Local Storage:** Match state persists seamlessly via localStorage in case of connectivity drops.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS, Motion
- **Backend / Real-time Database:** Firebase Firestore, Firebase Hosting, Firebase Auth
- **Icons & Effects:** Lucide React, Canvas Confetti

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Sugarloaf00/lawn-bowls-scoreboard.git
   cd lawn-bowls-scoreboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

---

## 📄 License

MIT
