#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../terraform"

cd "$TERRAFORM_DIR"
PROJECT_ID=$(terraform output -raw project_id 2>/dev/null || grep 'project_id' terraform.tfvars | cut -d'"' -f2)
REGION=$(terraform output -raw region 2>/dev/null || grep 'region' terraform.tfvars | cut -d'"' -f2)
REPOSITORY_ID=$(terraform output -raw artifact_registry_repository_id 2>/dev/null || grep 'artifact_registry_repository_id' terraform.tfvars | cut -d'"' -f2)
OWNER_EMAIL=$(terraform output -raw owner_email 2>/dev/null || grep 'owner_email' terraform.tfvars | cut -d'"' -f2)

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID not found. Please ensure terraform.tfvars is configured."
  exit 1
fi
if [ -z "${REGION:-}" ]; then
  REGION="us-central1"
fi
if [ -z "${REPOSITORY_ID:-}" ]; then
  REPOSITORY_ID="mthrb-repo"
fi

echo "🚀 Starting Provisioning for Project: $PROJECT_ID in $REGION"

terraform init

echo "📦 Stage 1: Provisioning APIs and Service Account..."
terraform apply -target=google_project_service.required -auto-approve

terraform import google_service_account.cloud_run_runtime "projects/$PROJECT_ID/serviceAccounts/mthrb-cloudrun-runtime@$PROJECT_ID.iam.gserviceaccount.com" 2>/dev/null || true
terraform import google_secret_manager_secret.jwt_secret "projects/$PROJECT_ID/secrets/mthrb-jwt-secret" 2>/dev/null || true
terraform import google_secret_manager_secret.refresh_token_secret "projects/$PROJECT_ID/secrets/mthrb-refresh-token-secret" 2>/dev/null || true
terraform import google_artifact_registry_repository.docker "projects/$PROJECT_ID/locations/$REGION/repositories/$REPOSITORY_ID" 2>/dev/null || true

if [ -n "${OWNER_EMAIL:-}" ]; then
  terraform import google_artifact_registry_repository_iam_member.docker_writer "projects/$PROJECT_ID/locations/$REGION/repositories/$REPOSITORY_ID/roles/artifactregistry.writer/user:$OWNER_EMAIL" 2>/dev/null || true
fi

terraform import google_secret_manager_secret_iam_member.runtime_can_read_jwt "projects/$PROJECT_ID/secrets/mthrb-jwt-secret/roles/secretmanager.secretAccessor/serviceAccount:mthrb-cloudrun-runtime@$PROJECT_ID.iam.gserviceaccount.com" 2>/dev/null || true
terraform import google_secret_manager_secret_iam_member.runtime_can_read_refresh "projects/$PROJECT_ID/secrets/mthrb-refresh-token-secret/roles/secretmanager.secretAccessor/serviceAccount:mthrb-cloudrun-runtime@$PROJECT_ID.iam.gserviceaccount.com" 2>/dev/null || true

terraform apply \
  -target=google_project_service.required \
  -target=google_artifact_registry_repository.docker \
  -target=google_artifact_registry_repository_iam_member.docker_writer \
  -target=google_service_account.cloud_run_runtime \
  -target=google_secret_manager_secret.jwt_secret \
  -target=google_secret_manager_secret.refresh_token_secret \
  -target=google_secret_manager_secret_iam_member.runtime_can_read_jwt \
  -target=google_secret_manager_secret_iam_member.runtime_can_read_refresh \
  -auto-approve

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
    return 0
  fi
  if command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
    return 0
  fi
  if command -v python >/dev/null 2>&1; then
    python - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
    return 0
  fi
  if command -v uuidgen >/dev/null 2>&1; then
    uuidgen | tr -d '\r\n'
    return 0
  fi
  echo "${RANDOM}${RANDOM}${RANDOM}${RANDOM}${RANDOM}${RANDOM}"
}

ensure_secret_latest_version() {
  local secret_name="$1"
  local env_var_name="$2"

  if gcloud secrets versions list "$secret_name" --project "$PROJECT_ID" --limit 1 --filter="state=ENABLED" --format="value(name)" 2>/dev/null | grep -q .; then
    return 0
  fi

  local secret_value="${!env_var_name-}"
  if [ -z "${secret_value}" ]; then
    secret_value="$(generate_secret)"
  fi

  printf '%s' "$secret_value" | gcloud secrets versions add "$secret_name" --project "$PROJECT_ID" --data-file=- --quiet >/dev/null
}

echo "🔐 Ensuring Secret versions exist..."
ensure_secret_latest_version "mthrb-jwt-secret" "JWT_SECRET_VALUE"
ensure_secret_latest_version "mthrb-refresh-token-secret" "REFRESH_TOKEN_SECRET_VALUE"

echo "🐳 Building & Pushing Docker images to Artifact Registry..."
cd "$SCRIPT_DIR/../../"

gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

COMPANY_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_ID}/company-service:latest"
ATTENDANCE_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_ID}/attendance:latest"
EDGE_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_ID}/edge-gateway:latest"

docker build -f services/company-service/Dockerfile -t "$COMPANY_IMAGE" .
docker build -f services/attendance/Dockerfile -t "$ATTENDANCE_IMAGE" .
docker build -f nginx/Dockerfile -t "$EDGE_IMAGE" ./nginx

docker push "$COMPANY_IMAGE"
docker push "$ATTENDANCE_IMAGE"
docker push "$EDGE_IMAGE"

cd "$TERRAFORM_DIR"
echo "🚀 Stage 2: Provisioning MongoDB, Cloud Run, and API Gateway..."
terraform apply -auto-approve

echo "✅ Provisioning Complete!"
echo ""
echo "Service URLs:"
echo "- Company A: $(terraform output -raw company_a_url 2>/dev/null || true)"
echo "- Company B: $(terraform output -raw company_b_url 2>/dev/null || true)"
echo "- Attendance: $(terraform output -raw attendance_url 2>/dev/null || true)"
echo "- Edge Gateway: $(terraform output -raw edge_gateway_url 2>/dev/null || true)"

terraform output
