#!/bin/bash
set -Eeuo pipefail

ts_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log() {
  local level="$1"
  shift
  local msg="$1"
  shift

  printf '%s level=%s msg=%q' "$(ts_utc)" "$level" "$msg"
  local kv
  for kv in "$@"; do
    printf ' %s' "$kv"
  done
  printf '\n'
}

die() {
  local msg="$1"
  shift || true
  log ERROR "$msg" "$@"
  exit 1
}

require_cmd() {
  local tool="$1"
  command -v "$tool" >/dev/null 2>&1 || die "Missing dependency" "tool=$tool"
}

require_file() {
  local file="$1"
  [ -f "$file" ] || die "Missing required file" "file=$file"
}

join_cmd() {
  local out=""
  local part
  for part in "$@"; do
    out="${out}$(printf '%q' "$part") "
  done
  printf '%s' "${out% }"
}

run() {
  local desc="$1"
  shift
  log INFO "$desc" "cmd=$(join_cmd "$@")" "stage=$STAGE"
  "$@"
}

retry() {
  local attempts="$1"
  local delay_seconds="$2"
  shift 2

  local n=1
  while true; do
    if "$@"; then
      return 0
    fi
    if [ "$n" -ge "$attempts" ]; then
      return 1
    fi
    log WARNING "Retrying command" "attempt=$n" "max_attempts=$attempts" "sleep_s=$delay_seconds" "cmd=$(join_cmd "$@")" "stage=$STAGE"
    sleep "$delay_seconds"
    n=$((n + 1))
  done
}

IMPORTED_ADDRS=()
add_imported_addr() {
  local addr="$1"
  IMPORTED_ADDRS+=("$addr")
}

ROLLBACK_ACTIONS=()
add_rollback_action() {
  local cmd="$1"
  ROLLBACK_ACTIONS+=("$cmd")
}

rollback() {
  if [ "${#ROLLBACK_ACTIONS[@]}" -eq 0 ]; then
    return 0
  fi
  log WARNING "Starting rollback" "stage=$STAGE" "actions=${#ROLLBACK_ACTIONS[@]}"
  local i
  for ((i=${#ROLLBACK_ACTIONS[@]}-1; i>=0; i--)); do
    local cmd="${ROLLBACK_ACTIONS[i]}"
    log WARNING "Rollback action" "cmd=$(printf '%q' "$cmd")" "stage=$STAGE"
    eval "$cmd" || log ERROR "Rollback action failed" "cmd=$(printf '%q' "$cmd")" "stage=$STAGE"
  done
}

STATE_BASELINE_FOR_ROLLBACK=""
capture_state_baseline() {
  STATE_BASELINE_FOR_ROLLBACK="$(terraform state list 2>/dev/null || true)"
}

is_in_list() {
  local needle="$1"
  local haystack="$2"
  grep -Fxq "$needle" <<<"$haystack"
}

rollback_destroy_new_state() {
  if [ -z "${STATE_BASELINE_FOR_ROLLBACK}" ]; then
    return 0
  fi

  local imported_text=""
  local addr
  for addr in "${IMPORTED_ADDRS[@]}"; do
    imported_text="${imported_text}${addr}"$'\n'
  done

  local current_state
  current_state="$(terraform state list 2>/dev/null || true)"
  local to_destroy=()
  while IFS= read -r addr; do
    [ -z "$addr" ] && continue
    if is_in_list "$addr" "$STATE_BASELINE_FOR_ROLLBACK"; then
      continue
    fi
    if [ -n "$imported_text" ] && is_in_list "$addr" "$imported_text"; then
      continue
    fi
    to_destroy+=("$addr")
  done <<<"$current_state"

  if [ "${#to_destroy[@]}" -eq 0 ]; then
    return 0
  fi

  log WARNING "Rolling back Terraform resources created during current stage" "count=${#to_destroy[@]}" "stage=$STAGE"
  local args=()
  for addr in "${to_destroy[@]}"; do
    args+=("-target=$addr")
  done
  terraform destroy -auto-approve "${args[@]}" || true
}

on_error() {
  local exit_code="$1"
  local line="$2"
  local cmd="$3"
  log CRITICAL "Provisioning failed" "exit_code=$exit_code" "line=$line" "stage=$STAGE" "cmd=$(printf '%q' "$cmd")"
  rollback
  exit "$exit_code"
}

STAGE="init"
trap 'on_error $? $LINENO "$BASH_COMMAND"' ERR
trap 'log ERROR "Interrupted" "stage=$STAGE"; rollback; exit 130' INT TERM

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../terraform"

require_cmd terraform
require_cmd gcloud
require_cmd docker

cd "$TERRAFORM_DIR"
require_file "$TERRAFORM_DIR/versions.tf"
require_file "$TERRAFORM_DIR/main.tf"
require_file "$TERRAFORM_DIR/terraform.tfvars"

extract_tfvar() {
  local key="$1"
  grep "^[[:space:]]*${key}[[:space:]]*=" terraform.tfvars | cut -d'=' -f2 | tr -d '"[:space:]'
}

PROJECT_ID=$(extract_tfvar "project_id")
REGION=$(extract_tfvar "region")
REPOSITORY_ID=$(extract_tfvar "artifact_registry_repository_id")
OWNER_EMAIL=$(extract_tfvar "owner_email")

# Fallback to terraform output if tfvars didn't have them (though they should)
[ -z "$PROJECT_ID" ] && PROJECT_ID=$(terraform output -raw project_id 2>/dev/null || true)
[ -z "$REGION" ] && REGION=$(terraform output -raw region 2>/dev/null || true)
[ -z "$REPOSITORY_ID" ] && REPOSITORY_ID=$(terraform output -raw artifact_registry_repository_id 2>/dev/null || true)
[ -z "$OWNER_EMAIL" ] && OWNER_EMAIL=$(terraform output -raw owner_email 2>/dev/null || true)

if [ -z "$PROJECT_ID" ] || [[ "$PROJECT_ID" == *"Warning:"* ]]; then
  die "PROJECT_ID not found or invalid. Please ensure terraform.tfvars is configured." "file=$TERRAFORM_DIR/terraform.tfvars"
fi
if [ -z "${REGION:-}" ] || [[ "$REGION" == *"Warning:"* ]]; then
  REGION="us-central1"
fi
if [ -z "${REPOSITORY_ID:-}" ] || [[ "$REPOSITORY_ID" == *"Warning:"* ]]; then
  REPOSITORY_ID="mthrb-repo"
fi
if [ -z "${OWNER_EMAIL:-}" ] || [[ "$OWNER_EMAIL" == *"Warning:"* ]]; then
  die "owner_email not found. Please ensure terraform.tfvars is configured." "file=$TERRAFORM_DIR/terraform.tfvars"
fi

log INFO "Starting provisioning" "project_id=$PROJECT_ID" "region=$REGION" "repository_id=$REPOSITORY_ID"

STAGE="prereq"
run "Checking gcloud authentication" gcloud auth list --filter=status:ACTIVE --format="value(account)"
run "Checking gcloud project access" gcloud projects describe "$PROJECT_ID" --format="value(projectId)"
run "Checking Docker daemon" docker info

STAGE="terraform_init"
run "Initializing Terraform" terraform init

capture_state_baseline

STAGE="stage1"
log INFO "Stage 1 provisioning" "project_id=$PROJECT_ID" "region=$REGION"
add_rollback_action "cd \"${TERRAFORM_DIR}\" && rollback_destroy_new_state"
run "Provisioning required APIs" terraform apply -target=google_project_service.required -auto-approve
capture_state_baseline

add_imported_addr "google_service_account.cloud_run_runtime"
add_imported_addr "google_secret_manager_secret.jwt_secret"
add_imported_addr "google_secret_manager_secret.refresh_token_secret"
add_imported_addr "google_artifact_registry_repository.docker"
add_imported_addr "google_artifact_registry_repository_iam_member.docker_writer"
add_imported_addr "google_secret_manager_secret_iam_member.runtime_can_read_jwt"
add_imported_addr "google_secret_manager_secret_iam_member.runtime_can_read_refresh"
add_imported_addr "google_cloud_run_v2_service.company_a"
add_imported_addr "google_cloud_run_v2_service.company_b"
add_imported_addr "google_cloud_run_v2_service.attendance"
add_imported_addr "google_api_gateway_api.api"
add_imported_addr "google_compute_instance.mongodb"
add_imported_addr "google_compute_firewall.allow_mongodb_internal"

log INFO "Importing pre-existing resources into Terraform state" "stage=$STAGE"
terraform import google_service_account.cloud_run_runtime "projects/$PROJECT_ID/serviceAccounts/mthrb-cloudrun-runtime@$PROJECT_ID.iam.gserviceaccount.com" 2>/dev/null || true
terraform import google_secret_manager_secret.jwt_secret "projects/$PROJECT_ID/secrets/mthrb-jwt-secret" 2>/dev/null || true
terraform import google_secret_manager_secret.refresh_token_secret "projects/$PROJECT_ID/secrets/mthrb-refresh-token-secret" 2>/dev/null || true
terraform import google_artifact_registry_repository.docker "projects/$PROJECT_ID/locations/$REGION/repositories/$REPOSITORY_ID" 2>/dev/null || true

terraform import google_artifact_registry_repository_iam_member.docker_writer "projects/$PROJECT_ID/locations/$REGION/repositories/$REPOSITORY_ID/roles/artifactregistry.writer/user:$OWNER_EMAIL" 2>/dev/null || true

terraform import google_secret_manager_secret_iam_member.runtime_can_read_jwt "projects/$PROJECT_ID/secrets/mthrb-jwt-secret/roles/secretmanager.secretAccessor/serviceAccount:mthrb-cloudrun-runtime@$PROJECT_ID.iam.gserviceaccount.com" 2>/dev/null || true
terraform import google_secret_manager_secret_iam_member.runtime_can_read_refresh "projects/$PROJECT_ID/secrets/mthrb-refresh-token-secret/roles/secretmanager.secretAccessor/serviceAccount:mthrb-cloudrun-runtime@$PROJECT_ID.iam.gserviceaccount.com" 2>/dev/null || true

# Import Cloud Run services
terraform import google_cloud_run_v2_service.company_a "projects/$PROJECT_ID/locations/$REGION/services/company-a" 2>/dev/null || true
terraform import google_cloud_run_v2_service.company_b "projects/$PROJECT_ID/locations/$REGION/services/company-b" 2>/dev/null || true
terraform import google_cloud_run_v2_service.attendance "projects/$PROJECT_ID/locations/$REGION/services/attendance" 2>/dev/null || true

# Import API Gateway
terraform import google_api_gateway_api.api "projects/$PROJECT_ID/locations/global/apis/mthrb-api" 2>/dev/null || true

# Import Compute resources
terraform import google_compute_instance.mongodb "projects/$PROJECT_ID/zones/${REGION}-a/instances/mongodb-instance" 2>/dev/null || true
terraform import google_compute_firewall.allow_mongodb_internal "projects/$PROJECT_ID/global/firewalls/allow-mongodb-internal" 2>/dev/null || true

capture_state_baseline

run "Provisioning base infrastructure (Stage 1)" terraform apply \
  -target=google_project_service.required \
  -target=google_artifact_registry_repository.docker \
  -target=google_artifact_registry_repository_iam_member.docker_writer \
  -target=google_service_account.cloud_run_runtime \
  -target=google_secret_manager_secret.jwt_secret \
  -target=google_secret_manager_secret.refresh_token_secret \
  -target=google_secret_manager_secret_iam_member.runtime_can_read_jwt \
  -target=google_secret_manager_secret_iam_member.runtime_can_read_refresh \
  -auto-approve

capture_state_baseline

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

CREATED_SECRET_VERSIONS=()

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

  local out=""
  out="$(printf '%s' "$secret_value" | gcloud secrets versions add "$secret_name" --project "$PROJECT_ID" --data-file=- --quiet 2>&1)"
  local version=""
  if [[ "$out" =~ Created[[:space:]]version[[:space:]]\[([0-9]+)\] ]]; then
    version="${BASH_REMATCH[1]}"
  fi
  if [ -n "$version" ]; then
    CREATED_SECRET_VERSIONS+=("${secret_name}:${version}")
    add_rollback_action "gcloud secrets versions disable $(printf '%q' "$version") --secret=$(printf '%q' "$secret_name") --project=$(printf '%q' "$PROJECT_ID") --quiet >/dev/null 2>&1 || true"
  fi
  log INFO "Secret version ensured" "secret=$secret_name" "created_version=${version:-none}" "stage=$STAGE"
}

STAGE="secrets"
log INFO "Ensuring Secret versions exist" "stage=$STAGE"
run "Ensuring JWT secret version" ensure_secret_latest_version "mthrb-jwt-secret" "JWT_SECRET_VALUE"
run "Ensuring refresh token secret version" ensure_secret_latest_version "mthrb-refresh-token-secret" "REFRESH_TOKEN_SECRET_VALUE"

STAGE="images"
log INFO "Building & pushing Docker images" "stage=$STAGE"
cd "$SCRIPT_DIR/../../"

# retry 3 3 gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet # No longer needed for Cloud Build

COMPANY_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_ID}/company-service:latest"
ATTENDANCE_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_ID}/attendance:latest"
EDGE_GATEWAY_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_ID}/edge-gateway:latest"

run "Building & Pushing company-service image" retry 3 5 gcloud builds submit . --config cloudbuild.yaml --substitutions=_TAG="$COMPANY_IMAGE",_DOCKERFILE="services/company-service/Dockerfile",_CONTEXT="."
run "Building & Pushing attendance image" retry 3 5 gcloud builds submit . --config cloudbuild.yaml --substitutions=_TAG="$ATTENDANCE_IMAGE",_DOCKERFILE="services/attendance/Dockerfile",_CONTEXT="."
run "Building & Pushing edge-gateway image" retry 3 5 gcloud builds submit . --config cloudbuild.yaml --substitutions=_TAG="$EDGE_GATEWAY_IMAGE",_DOCKERFILE="nginx/Dockerfile",_CONTEXT="nginx"

cd "$TERRAFORM_DIR"
STAGE="stage2"
log INFO "Stage 2 provisioning" "stage=$STAGE"
add_rollback_action "cd \"${TERRAFORM_DIR}\" && rollback_destroy_new_state"
retry 2 8 terraform apply -auto-approve

STAGE="done"
log INFO "Provisioning complete" "stage=$STAGE"
log INFO "Service URLs" "company_a_url=$(terraform output -raw company_a_url 2>/dev/null || true)" "company_b_url=$(terraform output -raw company_b_url 2>/dev/null || true)" "attendance_url=$(terraform output -raw attendance_url 2>/dev/null || true)"
terraform output
