# 🌐 Raigam SFA Web App

**Company:** The Kingdom of Raigam  
**Application Name:** Raigam SFA Web App

## 📋 Overview

**Raigam SFA Web App** is an industrial **Sales Force Automation (SFA)** web application developed for **Raigam – The Kingdom of Raigam**.  
The system is designed to streamline and digitize sales operations, enhance productivity, and provide real-time insights into sales performance and distribution activities.

## 🚀 Features

- 🔐 **Role-based user access** (System Admin, Sales Managers, Field Agents, etc.)
- 📊 **Dashboard & analytics** for performance tracking
- 🗺️ **Sales territory management**
- 🧾 **Invoice and stock viewing**
- 📍 **Outlet and customer module**
- 🎯 **Target and sales operations management**

## 🛠️ Tech Stack

**Frontend:** React.js, Vite, TypeScript, Tailwind CSS, shadcn/ui  
**Backend:** Spring Boot, Java  
**Database:** MySQL  
**Authentication:** JWT (Access + Refresh Tokens)  
**Deployment:** Docker / Cloud Deployment (as applicable)

## ⚡ Getting Started (React + Vite)

Follow these steps to set up the project locally:

1. **Clone the repository**

```bash
git clone https://github.com/your-repo/raigam-sfa-web.git
cd raigam-sfa-web
```

2. **Install dependencies**

```bash
npm install
```

3. **Run the development server**

```bash
npm run dev
```

- By default, Vite runs at: `http://localhost:5173`

4. **Build for production**

```bash
npm run build
```

- The production build output will be in the `dist/` folder.

5. **Preview production build locally**

```bash
npm run preview
```

## 🌱 Environment Variables

Create a `.env` file in the root of the project to manage environment-specific variables, e.g., API endpoints, keys, or feature flags.

Example `.env` for development:

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_AUTH_TOKEN_KEY=raigam_token_dev
VITE_APP_ENV=development
```

Example `.env.production` for production:

```env
VITE_API_BASE_URL=https://api.raigam.com
VITE_AUTH_TOKEN_KEY=raigam_token_prod
VITE_APP_ENV=production
```

> **Note:** All Vite environment variables must start with `VITE_` to be exposed to the frontend code.

Access variables in React:

```ts
const apiUrl = import.meta.env.VITE_API_BASE_URL
const tokenKey = import.meta.env.VITE_AUTH_TOKEN_KEY
```

## 👥 Team & Ownership

This project is developed and maintained by **Raigam IT Department – The Kingdom of Raigam**  
All rights reserved © 2025 Raigam.
