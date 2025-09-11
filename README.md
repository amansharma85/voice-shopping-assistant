🛒 Voice Command Shopping Assistant

A multilingual, voice-first shopping list assistant built with React (Vite) frontend and Express.js backend.
Users can manage shopping lists by speaking natural commands in English, Hindi, or Spanish, and get smart suggestions, substitutes, and seasonal items — all in real time.

This project was developed as part of an internship assignment with focus on voice-first UI, NLP, and minimalistic UX.

✨ Features
🎤 Voice Input

Add/remove items with natural voice commands:

“Add 2 apples”

“ब्रेड हटाओ” (Remove bread)

Multilingual support: English (US), Hindi (India), Spanish

Real-time transcript with visual feedback

💡 Smart Suggestions

Recommendations from past purchase history

Seasonal / sale items

Substitutes when items are unavailable

Example: milk → almond milk

🛍️ Shopping List Management

Add / remove / clear items via voice or button

Quantity parsing (supports spoken numbers in English & Hindi)

Automatic categorization (e.g., Dairy, Produce, Snacks)

🔎 Voice-Activated Search

Search for items by voice (brand, price filters)

“Find toothpaste under $5”

“₹50 से कम का दूध खोजो” (Find milk under ₹50)

🖥️ UI/UX

Minimalist, mobile-friendly interface

Visual feedback for recognized commands

Loading states, spinners, and smooth animations

Category badges for better readability

📦 Technical

Frontend: React (Vite) + Hooks + Axios

Backend: Express.js + CORS + JSON persistence

Persistence: localStorage (client) + data.json (server)

Deployment-ready (Vercel + Render setup)
