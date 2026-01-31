from fastapi import FastAPI
from app.routes import router
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()
app.include_router(router)

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"message": "Backend running"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)