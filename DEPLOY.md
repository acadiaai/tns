# GCP Deployment Guide

## Prerequisites

1. **GCP Project**: Create a project at https://console.cloud.google.com
2. **Enable APIs**:
   ```bash
   gcloud services enable \
     cloudrun.googleapis.com \
     cloudsql.googleapis.com \
     artifactregistry.googleapis.com \
     secretmanager.googleapis.com \
     vpcaccess.googleapis.com
   ```

3. **Install Tools**:
   - `gcloud` CLI: https://cloud.google.com/sdk/docs/install
   - `terraform`: https://www.terraform.io/downloads

## Setup Steps

### 1. Configure GCP Authentication

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 2. Create Terraform State Bucket

```bash
gsutil mb -p YOUR_PROJECT_ID gs://YOUR_PROJECT_ID-tfstate
gsutil versioning set on gs://YOUR_PROJECT_ID-tfstate
```

### 3. Create Artifact Registry Repository

```bash
gcloud artifacts repositories create therapy-nav-images \
  --repository-format=docker \
  --location=us-central1
```

### 4. Set GitHub Secrets

In your GitHub repository settings, add:
- `GCP_PROJECT_ID`: Your GCP project ID
- `GCP_SERVICE_ACCOUNT`: terraform@YOUR_PROJECT_ID.iam.gserviceaccount.com
- `GCP_WORKLOAD_IDENTITY_PROVIDER`: (see Workload Identity setup below)

### 5. Deploy Infrastructure

```bash
cd infra

# Initialize Terraform
terraform init -backend-config="bucket=YOUR_PROJECT_ID-tfstate"

# Create workspace for dev
terraform workspace new dev

# Set variables
export TF_VAR_gcp_project_id="YOUR_PROJECT_ID"
export TF_VAR_environment_name="dev"
export TF_VAR_db_password="secure-password-here"

# Deploy
terraform plan
terraform apply
```

### 6. Set Secrets in Secret Manager

```bash
# Add your Gemini API key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key-dev --data-file=-

# Add JWT secret
echo -n "$(openssl rand -base64 32)" | gcloud secrets create jwt-secret-dev --data-file=-
```

### 7. Build and Deploy

#### Manual Deploy (for testing):

```bash
# Configure Docker
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build and push backend
cd backend
docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/therapy-nav-images/api:latest .
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/therapy-nav-images/api:latest

# Build and push frontend
cd ../frontend
docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/therapy-nav-images/frontend:latest .
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/therapy-nav-images/frontend:latest

# Update Cloud Run services
gcloud run deploy therapy-nav-api-dev \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/therapy-nav-images/api:latest \
  --region us-central1

gcloud run deploy therapy-nav-frontend-dev \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/therapy-nav-images/frontend:latest \
  --region us-central1
```

#### Automatic Deploy (via GitHub Actions):

Simply push to `main` branch:
```bash
git push origin main
```

## Database Migration

### Export from SQLite (local):
```bash
sqlite3 backend/therapy.db .dump > therapy_dump.sql
```

### Import to Cloud SQL:
```bash
# Get Cloud SQL connection details
INSTANCE_CONNECTION=$(gcloud sql instances describe therapy-nav-db-dev --format="value(connectionName)")

# Connect via Cloud SQL Proxy
cloud_sql_proxy -instances=$INSTANCE_CONNECTION=tcp:5432 &

# Import data
psql -h localhost -U therapy_app -d therapy < therapy_dump.sql
```

## Monitoring

### View logs:
```bash
gcloud run logs read --service therapy-nav-api-dev --region us-central1
```

### Check service URL:
```bash
gcloud run services describe therapy-nav-frontend-dev --region us-central1 --format="value(status.url)"
```

## Costs

### Dev Environment (estimated):
- Cloud Run: ~$15-20/month (with WebSockets)
- Cloud SQL (micro): ~$10/month
- VPC Connector: ~$0.36/month
- **Total: ~$25-30/month**

### Production Optimizations:
- Use Cloud SQL connection pooling
- Enable Cloud CDN for frontend
- Consider Firestore for lower costs
- Use Cloud Scheduler to warm up instances

## Troubleshooting

### WebSocket Connection Issues:
- Ensure timeout is set to 3600s in Cloud Run
- Check CORS settings allow your domain
- Verify VPC connector for Cloud SQL

### Database Connection:
- Check DATABASE_URL environment variable
- Verify Cloud SQL has public IP enabled (for dev)
- Ensure password is set correctly

### Build Failures:
- Check Artifact Registry permissions
- Verify Docker authentication
- Review build logs in Cloud Build

## Workload Identity Federation Setup (for GitHub Actions)

```bash
# Create service account
gcloud iam service-accounts create terraform \
  --display-name="Terraform Service Account"

# Grant necessary roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:terraform@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/editor"

# Create workload identity pool
gcloud iam workload-identity-pools create github \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Configure OIDC provider
gcloud iam workload-identity-pools providers create-oidc github \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Grant service account access
gcloud iam service-accounts add-iam-policy-binding \
  terraform@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/YOUR_GITHUB_USERNAME/therapy-navigation-system"
```

## Next Steps

1. **Set up monitoring**: Cloud Monitoring dashboards
2. **Configure alerts**: Budget alerts, error rate alerts
3. **Add custom domain**: Cloud Load Balancer + SSL
4. **Implement CI/CD**: Staging environment, automated tests
5. **Security hardening**: Cloud Armor, IAP for admin access