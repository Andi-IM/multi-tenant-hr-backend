#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../terraform"

# Configuration
cd "$TERRAFORM_DIR"
PROJECT_ID=$(terraform output -raw project_id 2>/dev/null || grep 'project_id' terraform.tfvars | cut -d'"' -f2)
REGION=$(terraform output -raw region 2>/dev/null || grep 'region' terraform.tfvars | cut -d'"' -f2)

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID not found. Please ensure terraform.tfvars is configured."
  exit 1
fi

echo "🚀 Starting Provisioning for Project: $PROJECT_ID in $REGION"

# 1. Initialize Terraform
terraform init

# 2. Stage 1: Create APIs, Artifact Registry (optional), and Service Account
echo "📦 Stage 1: Provisioning APIs and Service Account..."
terraform apply -target=google_project_service.required -target=google_service_account.cloud_run_runtime -target=google_secret_manager_secret.jwt_secret -target=google_secret_manager_secret.refresh_token_secret -target=google_secret_manager_secret_iam_member.runtime_can_read_jwt -target=google_secret_manager_secret_iam_member.runtime_can_read_refresh -auto-approve

# 3. Build & Deploy Services using gcloud run deploy --source
echo "🏗️ Building and Deploying Services to Cloud Run..."

# Navigate to project root
cd "$SCRIPT_DIR/../../"

# Build and Deploy Company A Service
echo "Building and Deploying Company A Service..."
gcloud run deploy company-a \
  --source . \
  --region $REGION \
  --project $PROJECT_ID \
  --platform managed \
  --service-account mthrb-cloudrun-runtime@$PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars NODE_ENV=production,COMPANY_ID=A,SERVICE_NAME=company-service \
  --set-secrets JWT_SECRET=mthrb-jwt-secret:latest \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 1

# Build and Deploy Company B Service
echo "Building and Deploying Company B Service..."
gcloud run deploy company-b \
  --source . \
  --region $REGION \
  --project $PROJECT_ID \
  --platform managed \
  --service-account mthrb-cloudrun-runtime@$PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars NODE_ENV=production,COMPANY_ID=B,SERVICE_NAME=company-service \
  --set-secrets JWT_SECRET=mthrb-jwt-secret:latest \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 1

# Get service URLs for attendance service
COMPANY_A_URL=$(gcloud run services describe company-a --region=$REGION --project=$PROJECT_ID --format="value(status.url)" 2>/dev/null)
COMPANY_B_URL=$(gcloud run services describe company-b --region=$REGION --project=$PROJECT_ID --format="value(status.url)" 2>/dev/null)

echo "Company A URL: $COMPANY_A_URL"
echo "Company B URL: $COMPANY_B_URL"

# Build and Deploy Attendance Service
echo "Building and Deploying Attendance Service..."
gcloud run deploy attendance \
  --source . \
  --region $REGION \
  --project $PROJECT_ID \
  --platform managed \
  --service-account mthrb-cloudrun-runtime@$PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars NODE_ENV=production,COMPANY_A_SERVICE_URL=$COMPANY_A_URL,COMPANY_B_SERVICE_URL=$COMPANY_B_URL,SERVICE_NAME=attendance \
  --set-secrets JWT_SECRET=mthrb-jwt-secret:latest \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 1

# Get attendance URL for edge gateway
ATTENDANCE_URL=$(gcloud run services describe attendance --region=$REGION --project=$PROJECT_ID --format="value(status.url)" 2>/dev/null)

echo "Attendance URL: $ATTENDANCE_URL"

# Build and Deploy Edge Gateway (Nginx)
echo "Building and Deploying Edge Gateway..."
gcloud run deploy edge-gateway \
  --source ./nginx \
  --region $REGION \
  --project $PROJECT_ID \
  --platform managed \
  --service-account mthrb-cloudrun-runtime@$PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars TZ=Asia/Jakarta,COMPANY_A_URL=$COMPANY_A_URL,COMPANY_B_URL=$COMPANY_B_URL,ATTENDANCE_URL=$ATTENDANCE_URL \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 1

# 4. Stage 2: Provision the rest of the Infrastructure (MongoDB, etc.)
cd "$TERRAFORM_DIR"
echo "🚀 Stage 2: Provisioning MongoDB..."
terraform apply -target=google_compute_instance.mongodb -target=google_compute_firewall.allow_mongodb_internal -auto-approve

# Update terraform state to use the deployed service URLs
echo "📥 Updating Terraform state with deployed service URLs..."
terraform state mv google_cloud_run_v2_service.company_a "google_cloud_run_v2_service.company_a" 2>/dev/null || true

# 5. Apply remaining resources (API Gateway, etc.)
echo "🚀 Stage 3: Provisioning API Gateway..."
terraform apply -auto-approve

echo "✅ Provisioning Complete!"
echo ""
echo "Service URLs:"
echo "- Company A: $(gcloud run services describe company-a --region=$REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null)"
echo "- Company B: $(gcloud run services describe company-b --region=$REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null)"
echo "- Attendance: $(gcloud run services describe attendance --region=$REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null)"
echo "- Edge Gateway: $(gcloud run services describe edge-gateway --region=$REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null)"

terraform output