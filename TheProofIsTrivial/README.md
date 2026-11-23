# The Proof Is Trivial

## Run locally

The frontend uses Node.js, Vite, and React. The API remains a Python FastAPI
application. Run the frontend and backend in separate terminals.

### Configure TiDB and Gemini

1. Copy `.env.example` to `.env`.
2. Set `TIDB_USER` and `TIDB_PASSWORD` to the TiDB Cloud credentials for your
   cluster. Keep `.env` private; it is ignored by Git.
3. Confirm `TIDB_HOST`, `TIDB_PORT`, and `TIDB_DB_NAME` match your TiDB Cloud
   connection details and the database where you ran `init.sql`.
4. Set `CA_PATH` to a trusted CA certificate bundle if your system does not use
   `/etc/ssl/certs/ca-certificates.crt`.
5. Set `GEMINI_API_KEY` from Google AI Studio. This is only needed when generating
   a new proof; the backend reads it from `.env`.

### Start the backend

From the project directory, create and activate a virtual environment and
install the Python dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn api:app --reload
```

The API listens at `http://127.0.0.1:8000`. Check TiDB connectivity at
`http://127.0.0.1:8000/health`; a successful response includes
`"database": "connected"`.

Alternatively, after creating `.env`, you can start the backend with
`./setEnvironment.sh`.

### Start the frontend

In a second terminal, from the project directory:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173`). In
development, Vite proxies `/api` requests to the Python backend on port 8000.

To build the frontend for deployment, run `npm run build`. Set
`VITE_API_BASE_URL` to the deployed API URL when building the frontend for a
different production backend; otherwise it uses the existing Render API.

## Usage

Log in or create an account, then enter a proposition and choose
**Trivialize the Proof**. Use **Manage your Proofs** to see or remove saved
proofs. The account menu also lets you sign out or delete your account.
