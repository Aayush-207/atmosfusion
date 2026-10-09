# AtmosFusion Web — Hybrid AI-NWP Multi-Model Forecast Blending System
![Build Status](https://img.shields.io/badge/build-passing-brightgreen)

## Overview
AtmosFusion is a platform built for NCMRWF / Ministry of Earth Sciences (MoES) to blend physics-based NWP models (GFS, ECMWF, NCUM, WRF) with AI-based weather models (GraphCast, AIFS) using dynamic cell-by-cell weighting.

## Features
- Real-time Multi-Model Consensus Blending
- Interactive 2D/3D Mapping (OpenStreetMap & Google Maps)
- SHAP Explainability for Weight Assignments
- Alert Tracking for Heavy Rainfall Events

## Quickstart
### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
npm install
npm run dev
```

## Environment Variables
Create a `.env` file in the root directory:
```
VITE_GOOGLE_MAPS_API_KEY=your_key_here
```
