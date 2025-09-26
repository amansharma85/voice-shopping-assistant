# 🛒 Voice Command Shopping Assistant

A multilingual, voice-first shopping list assistant built with **React (Vite)** frontend and **Express.js** backend.  
Users can manage shopping lists by speaking natural commands in **English**, **Hindi**, or **Spanish**, and get **smart suggestions**, **substitutes**, and **seasonal items** — all in real time.

---

## 🚀 Live Demo

👉 [Click here to use the app](https://client-8vh22u1w5-amans-projects-53c71154.vercel.app)

---

This project was developed as part of an internship assignment with focus on **voice-first UI**, **natural language processing (NLP)**, and **minimalistic UX**.

---

## ✨ Features

### 🎤 Voice Input

- Add/remove items with natural voice commands  
  Examples:
  - “Add 2 apples”
  - “ब्रेड हटाओ” (Remove bread)

- Multilingual support: English (US), Hindi (India), Spanish  
- Real-time transcript with visual feedback

---

### 💡 Smart Suggestions

- Recommendations from past purchase history  
- Seasonal / sale items  
- Substitutes when items are unavailable  
  _Example: milk → almond milk_

---

### 🛍️ Shopping List Management

- Add / remove / clear items via voice or button  
- Quantity parsing (supports spoken numbers in English & Hindi)  
- Automatic categorization (e.g., Dairy, Produce, Snacks)

---

### 🔎 Voice-Activated Search

- Search items by voice with brand or price filters  
- “Find toothpaste under $5”  
- “₹50 से कम का दूध खोजो” (Find milk under ₹50)

---

### 🖥️ UI/UX

- Minimalist, mobile-friendly interface  
- Visual feedback for recognized commands  
- Loading states, spinners, and smooth animations  
- Category badges for better readability

---

## 📦 Technical Stack

- **Frontend**: React (Vite), React Hooks, Axios, Tailwind CSS  
- **Backend**: Express.js, CORS  
- **Persistence**: `localStorage` (client) + `data.json` (server)  
- **Deployment**: Vercel (frontend), Render (backend - optional)

---

## 🛠️ How to Run the Project Locally

### 📁 1. Clone the Repository

```bash
git clone https://github.com/amansharma85/voice-shopping-assistant.git
cd voice-shopping-assistant

---
## Run the Frontend 

cd client
npm install
npm run dev


---
## Run the Backend 

cd Server
npm install
npm run dev


---
# Folder Structure Overview

voice-shopping-assistant/
│
├── client/                # React frontend
│   ├── src/
│   ├── public/
│   └── ...
│
├── server/                # Express backend
│   ├── data.json          # Local persistence
│   └── index.js
│
├── README.md
└── package.json

