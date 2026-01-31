import firebase_admin
from firebase_admin import credentials, db
import os

cred = credentials.Certificate(os.path.join(os.path.dirname(__file__), "serviceAccountKey.json"))

firebase_admin.initialize_app(cred, {
    "databaseURL": "https://officeoffice-49de2-default-rtdb.firebaseio.com/"
})

def get_ref(path="/"):
    return db.reference(path)
