<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/cloud-lightning.svg" width="100" alt="AtmosFusion Logo" />
  
  # 🌪️ AtmosFusion
  
  **Hybrid AI–NWP Multi-Model Forecast Blending System**  
  *Built for NCMRWF / Ministry of Earth Sciences (MoES)*

  [![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](#)
  [![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](#)
  [![SIH 2026](https://img.shields.io/badge/SIH-2026-FF9900?style=for-the-badge)](#)

  <br/>
  
  ### 🚀 **[Live Demo: atmosfusion-web.netlify.app](https://atmosfusion-web.netlify.app)**

  <br/>
  
  > *AtmosFusion leverages the power of Artificial Intelligence and numerical physics to deliver highly accurate, localized, and explainable weather forecasts.*
</div>

---

## 🎯 Project Overview

**AtmosFusion** is an advanced meteorological platform designed to bridge the gap between traditional **physics-based NWP models** (like GFS, ECMWF, NCUM, and WRF) and state-of-the-art **AI weather models** (such as GraphCast and AIFS). 

Instead of relying on a single source of truth, the system employs **dynamic cell-by-cell weighting**. It analyzes historical and real-time performance across localized grids to intelligently blend these models, providing unparalleled forecast accuracy and proactive extreme weather alerts.

---

## 💻 Tech Stack

### Frontend Architecture
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Zustand](https://img.shields.io/badge/zustand-%2320232a.svg?style=for-the-badge&logo=react)

### Backend Engine
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Pandas](https://img.shields.io/badge/pandas-%23150458.svg?style=for-the-badge&logo=pandas&logoColor=white)
![Uvicorn](https://img.shields.io/badge/Uvicorn-%2320232a.svg?style=for-the-badge)

### Mapping & Visualization
![Deck.gl](https://img.shields.io/badge/Deck.gl-FFF?style=for-the-badge&logo=uber&logoColor=black)
![OpenStreetMap](https://img.shields.io/badge/OpenStreetMap-7EBC6F?style=for-the-badge&logo=openstreetmap&logoColor=white)
![Google Maps](https://img.shields.io/badge/Google%20Maps-4285F4?style=for-the-badge&logo=googlemaps&logoColor=white)

---

## ✨ Key Features

| 🛠️ Feature | 📖 Description |
| :--- | :--- |
| 🌍 **Interactive 3D Mapping** | Real-time geospatial visualization using OpenStreetMap & Deck.gl for high-performance rendering. |
| ⚖️ **Dynamic Blending Engine** | Calculates cell-by-cell consensus weighting for AI and NWP models to maximize accuracy. |
| 🧠 **Explainable AI (XAI)** | Features SHAP values and importance graphs to explain exactly *why* certain models were trusted over others. |
| 🚨 **Extreme Weather Alerts** | Automated tracking and threshold notifications for heavy rainfall and atmospheric anomalies. |

---

## 🏗️ System Architecture

The system operates on a decoupled architecture, ensuring that the heavy computational blending process is independent of the client rendering.

```mermaid
graph LR
    A[AI Models] -->|GraphCast, AIFS| C(Blending Engine)
    B[NWP Models] -->|GFS, ECMWF| C
    C -->|Cell-by-Cell Weights| D{FastAPI Backend}
    D -->|JSON / GeoJSON| E[React Frontend]
    E --> F((End User Dashboard))
    
    classDef ai fill:#3b82f6,stroke:#1d4ed8,color:white;
    classDef nwp fill:#10b981,stroke:#047857,color:white;
    classDef backend fill:#000000,stroke:#333,color:white;
    class A ai; class B nwp; class D backend;
```

---

## 🚀 Quick Start

The project is structured as a monorepo containing both the **Frontend** and **Backend** directories.

### Prerequisites
- Node.js (v18+)
- Python (3.9+)

### 1️⃣ Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
> 📍 **API Docs:** Available at `http://localhost:8000/docs` (Swagger UI)

### 2️⃣ Frontend Setup (Vite + React)
```bash
cd frontend
npm install
npm run dev
```
> 📍 **Dashboard:** Available at `http://localhost:5173`

---

## ⚙️ Environment Variables

Create a `.env` file inside the `frontend/` directory. You will need a Google Maps API Key if you wish to use the Google base map layer.
```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key_here
```

<br/>

<div align="center">
  <i>Developed for Smart India Hackathon</i>
</div>
