#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/.."

# Configuration
cd "$TERRAFORM_DIR"
PROJECT_ID=$(terraform output -raw project_id 2>/dev/null || grep 'project_id' terraform.tfvars | cut -d'"' -f2)
REGION=$(terraform output -raw region 2>/dev/null || grep 'region' terraform.tfvars | cut -d'"' -f2)
REPO_ID=$(terraform output -raw artifact_registry_repository_id 2>/dev/null || grep 'artifact_registry_repository_id' terraform.tfvars | cut -d'"' -f2)

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID not found. Please ensure terraform.tfvars is configured."
  exit 1
fi

echo "🚀 Starting Provisioning for Project: $PROJECT_ID in $REGION"

# 1. Initialize Terraform
terraform init

# 2. Stage 1: Create Artifact Registry & APIs
echo "📦 Stage 1: Provisioning Artifact Registry and APIs..."
terraform apply -target=google_project_service.required -target=google_artifact_registry_repository.docker -auto-approve

# Refresh state after Stage 1 to get outputs
terraform refresh

# Get values after refresh
PROJECT_ID=$(terraform output -raw project_id 2>/dev/null)
REGION=$(terraform output -raw region 2>/dev/null)
REPO_ID=$(terraform output -raw artifact_registry_repository_id 2>/dev/null)

# Fallback to terraform.tfvars if still empty
if [ -z "$PROJECT_ID" ]; then
  PROJECT_ID=$(grep 'project_id' terraform.tfvars | cut -d'"' -f2)
fi
if [ -z "$REGION" ]; then
  REGION=$(grep 'region' terraform.tfvars | cut -d'"' -f2)
fi
if [ -z "$REPO_ID" ]; then
  REPO_ID=$(grep 'artifact_registry_repository_id' terraform.tfvars | cut -d'"' -f2)
fi

if [ -z "$PROJECT_ID" ] || [ -z "$REGION" ] || [ -z "$REPO_ID" ]; then
  echo "Error: Missing required configuration. Please check terraform.tfvars."
  exit 1
fi

# 3. Build & Push Docker Images
REPO_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_ID}"

echo "🏗️ Building and Pushing Images to $REPO_URL..."

# Navigate to project root for docker build
cd "$SCRIPT_DIR/../../"

# Authenticate Docker
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

# Build Company Service
echo "Building Company Service..."
docker build -t ${REPO_URL}/company-service:latest --build-arg SERVICE_NAME=company-service .
docker push ${REPO_URL}/company-service:latest

# Build Attendance Service
echo "Building Attendance Service..."
docker build -t ${REPO_URL}/attendance:latest --build-arg SERVICE_NAME=attendance .
docker push ${REPO_URL}/attendance:latest

# Build Edge Gateway (Nginx)
echo "Building Edge Gateway..."
docker build -t ${REPO_URL}/edge-gateway:latest ./nginx
docker push ${REPO_URL}/edge-gateway:latest

# 4. Stage 2: Provision the rest of the Infrastructure
cd "$TERRAFORM_DIR"
echo "🚀 Stage 2: Provisioning Cloud Run Services, MongoDB, and API Gateway..."
terraform apply -auto-approve

echo "✅ Provisioning Complete!"
terraform output
