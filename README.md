# WeMarket4U
We help your business stand out with AI-powered marketing materials. Our expert agents create eye-catching visuals and persuasive descriptions tailored to your brand, ensuring your message captivates audiences and drives engagement for better marketing results.

## Local development (Windows PowerShell)

 1) Create env files

 - Copy `backend/.env.example` to `backend/.env` and set values:
	 - GOOGLE_API_KEY, SONAR_API_KEY (Python)
	 - PY_BACKEND_URL (Node -> Python), default: http://127.0.0.1:8000
	 - GEMINI_API_KEY (optional, chatbot)
	 - SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM (email)

 2) Start FastAPI (Python)

 - Install Python dependencies:
	 - Use a venv (recommended) and run:
		 - `pip install -r backend/requirements.txt`
 - Start FastAPI (in the `backend` folder):
	 - `uvicorn image_gen_with_image_input:app --host 127.0.0.1 --port 8000 --reload`

 3) Start Node server

 - In a new terminal, change to `backend` folder:
	 - `cd backend`
	 - `npm install`
	 - `npm start`
 - The site will be served at: http://localhost:3000

 4) Try it

 - Open http://localhost:3000
 - Scroll to "Try Our Product"
 - Fill in email, prompt, and upload a logo image
 - Click "Try Now"; after generation completes, you should receive an email (if SMTP configured)

 ## Troubleshooting

 - Empty/invalid JSON response
	 - The proxy now returns a clear error with backend text if Python returns non-JSON.
 - Email not delivered
	 - Verify SMTP_* vars and check spam. Try a simple inbox first (e.g., Gmail). Some providers require app passwords.
 - Image not visible
	 - The Python endpoint returns a relative path like `backend/output_with_logo_*.png`. Node serves the project root statically, so the URL `http://localhost:3000/backend/output_with_logo_*.png` should load.
