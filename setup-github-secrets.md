# GitHub Secrets Setup for TNS Deployment

## Required Secrets

You need to set these secrets in your GitHub repository (Settings → Secrets and variables → Actions):

### 1. GCP_SERVICE_ACCOUNT_KEY
This is the JSON key for your GCP service account.

To create one:
```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deploy"

# Grant necessary permissions
gcloud projects add-iam-policy-binding therapy-nav-poc-quan \
  --member="serviceAccount:github-actions@therapy-nav-poc-quan.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding therapy-nav-poc-quan \
  --member="serviceAccount:github-actions@therapy-nav-poc-quan.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding therapy-nav-poc-quan \
  --member="serviceAccount:github-actions@therapy-nav-poc-quan.iam.gserviceaccount.com" \
  --role="roles/firebase.admin"

# Create and download key
gcloud iam service-accounts keys create key.json \
  --iam-account=github-actions@therapy-nav-poc-quan.iam.gserviceaccount.com

# Copy the contents of key.json to GitHub secret
cat key.json
```

### 2. GEMINI_API_KEY
Your Gemini API key for the AI coach functionality.

### 3. Firebase Secrets (get from Firebase Console)
- FIREBASE_API_KEY
- FIREBASE_MESSAGING_SENDER_ID
- FIREBASE_APP_ID

## Namecheap DNS Configuration

After deployment, configure DNS in Namecheap:

1. Go to Namecheap Dashboard
2. Click "MANAGE" on acadia.sh
3. Go to "Advanced DNS"
4. Add a new CNAME Record:
   - **Type:** CNAME
   - **Host:** tns
   - **Value:** therapy-nav-poc-quan.web.app
   - **TTL:** Automatic

5. (Optional) For custom backend URL:
   - **Type:** CNAME
   - **Host:** api.tns
   - **Value:** tns-backend-[hash].a.run.app
   - **TTL:** Automatic

## Manual Deployment (before GitHub Action)

To deploy manually first time:

```bash
# Deploy backend
cd backend
gcloud run deploy tns-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 3 \
  --port 8080 \
  --session-affinity

# Get backend URL
BACKEND_URL=$(gcloud run services describe tns-backend --region us-central1 --format 'value(status.url)')

# Build frontend
cd ../frontend
VITE_API_URL=$BACKEND_URL npm run build

# Deploy to Firebase
firebase init hosting  # Choose "dist" as public folder
firebase deploy
```