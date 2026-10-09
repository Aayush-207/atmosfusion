<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/cloud-lightning.svg" width="80" alt="AtmosFusion Logo" />
  
  # 🌪️ AtmosFusion
  
  **Hybrid AI–NWP Multi-Model Forecast Blending System**  
  *Built for NCMRWF / Ministry of Earth Sciences (MoES)*

  [![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](#)
  [![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](#)
  [![SIH 2026](https://img.shields.io/badge/SIH-2026-FF9900?style=for-the-badge)](#)
</div>

<br/>

## 🎯 Overview

**AtmosFusion** is an advanced meteorological platform designed to intelligently blend physics-based NWP models (GFS, ECMWF, NCUM, WRF) with state-of-the-art AI weather models (GraphCast, AIFS). Using dynamic cell-by-cell weighting, it provides unparalleled localized forecast accuracy and extreme weather alerts.

---

## ✨ Key Features

| 🛠️ Feature | 📖 Description |
| :--- | :--- |
| 🌍 **Interactive 3D Mapping** | Real-time geospatial visualization using OpenStreetMap & Deck.gl. |
| ⚖️ **Dynamic Blending** | Cell-by-cell consensus weighting for AI and NWP models. |
| 🧠 **Explainable AI (XAI)** | SHAP values to explain dynamic weight assignments per model. |
| 🚨 **Extreme Alerts** | Automated tracking for heavy rainfall and atmospheric anomalies. |

---

## 🏗️ System Architecture

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

The project is structured as a monorepo containing both the **Frontend** and **Backend**.

### 1️⃣ Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
> 📍 **API Docs:** Available at `http://localhost:8000/docs`

### 2️⃣ Frontend Setup (Vite + React)
```bash
cd frontend
npm install
npm run dev
```
> 📍 **Dashboard:** Available at `http://localhost:5173`

---

## ⚙️ Environment Variables

Create a `.env` file inside the `frontend/` directory for maps integration:
```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key_here
```

<br/>

<div align="center">
  <i>Developed with ❤️ for Smart India Hackathon</i>
</div>
