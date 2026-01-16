# VakyaShuddhi

A comprehensive tool for Hindi sentence purification, grammar checking, and paraphrasing.

## Project Structure

- **frontend/**: A React + TypeScript + Vite web application.
- **backend/**: A FastAPI backend server handling grammar checking, authentication, and paraphrasing logic.
- **hin-gpt/**: Jupyter notebooks and resources for fine-tuning and experimenting with Hindi GPT models.

## Getting Started

### Backend Setup

The backend is built with FastAPI and uses Firebase for authentication.

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv venv
    
    # Linux/Mac
    source venv/bin/activate
    
    # Windows
    .\venv\Scripts\Activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configuration:**
    - Ensure `serviceAccount.json` is present in the `backend/` root for Firebase Admin SDK.
    - Copy `.env.example` to `.env` and fill in the required values.
      ```bash
      cp .env.example .env
      ```

5.  **Run the Server:**
    ```bash
    python -m server.run
    ```
    The server typically runs on `http://localhost:8000`.

### Frontend Setup

The frontend is a modern React application.

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configuration:**
    - Copy `.env.example` to `.env` and fill in your Firebase credentials.
      ```bash
      cp .env.example .env
      ```

4.  **Run the Development Server:**
    ```bash
    npm run dev
    ```

### GPT / Model Training

Check the `hin-gpt/` directory for Jupyter notebooks (`.ipynb`) related to training and fine-tuning Hindi language models.

## Features

- **Grammar Checking**: backend uses `hunspell` and custom logic to verify Hindi grammar.
- **Paraphrasing**: AI-powered paraphrasing capabilities.
- **Authentication**: Secure user authentication using Firebase.
