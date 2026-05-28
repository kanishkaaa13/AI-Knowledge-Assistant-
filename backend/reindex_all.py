import httpx

def main():
    client = httpx.Client(base_url="http://localhost:8000")
    
    # Login
    resp = client.post("/api/v1/auth/login", data={"username": "kanishkaarde99@gmail.com", "password": "test12345"})
    if resp.status_code != 200:
        print("Login failed:", resp.text)
        return
    
    print("Logged in successfully.")
    
    # Get documents
    resp = client.get("/api/v1/documents")
    if resp.status_code != 200:
        print("Failed to get documents:", resp.text)
        return
        
    docs = resp.json().get("items", [])
    print(f"Found {len(docs)} documents.")
    
    for doc in docs:
        print(f"Reindexing document: {doc['title']} ({doc['id']})")
        r = client.post(f"/api/v1/documents/{doc['id']}/reindex")
        if r.status_code == 200:
            print("  Success")
        else:
            print("  Failed:", r.text)

if __name__ == "__main__":
    main()
