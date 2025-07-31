# Local Setup Guide

Quick setup instructions for the Real-Time Orderbook Viewer.

## Prerequisites

- **Node.js 18+** and npm

## Installation


# Clean install dependencies
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## Running Locally

```bash
# Development server (with hot reload)
npm run dev



Access the application at `http://localhost:3000`

## Project Overview

The app provides:
- Live orderbook data from OKX and Deribit exchanges
- Order simulation with market impact analysis
- Interactive market depth charts


---

For detailed architecture information, see `FOLDER_STRUCTURE.md`. 