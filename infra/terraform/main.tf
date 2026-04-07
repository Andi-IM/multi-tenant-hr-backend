locals {
  required_services = toset([
    "run.googleapis.com",
    "apigateway.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "servicemanagement.googleapis.com",
    "servicecontrol.googleapis.com",
    "iamcredentials.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "cloudbuild.googleapis.com",
  ])
}

resource "google_project_service" "required" {
  for_each           = local.required_services
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "docker" {
  project       = var.project_id
  location      = var.region
  repository_id = var.artifact_registry_repository_id
  format        = "DOCKER"

  depends_on = [google_project_service.required]
}

resource "google_artifact_registry_repository_iam_member" "docker_writer" {
  project    = var.project_id
  location   = var.region
  repository = google_artifact_registry_repository.docker.name
  role       = "roles/artifactregistry.writer"
  member     = "user:${var.owner_email}"
}

resource "google_secret_manager_secret" "jwt_secret" {
  project   = var.project_id
  secret_id = "mthrb-jwt-secret"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret" "refresh_token_secret" {
  project   = var.project_id
  secret_id = "mthrb-refresh-token-secret"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_service_account" "cloud_run_runtime" {
  project      = var.project_id
  account_id   = "mthrb-cloudrun-runtime"
  display_name = "MTHRB Cloud Run Runtime"

  depends_on = [google_project_service.required]
}

resource "google_service_account" "edge_gateway" {
  project      = var.project_id
  account_id   = "mthrb-edge-gateway"
  display_name = "MTHRB Edge Gateway Service Account"

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_iam_member" "runtime_can_read_jwt" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.jwt_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "runtime_can_read_refresh" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.refresh_token_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_runtime.email}"
}

resource "google_cloud_run_v2_service" "company_a" {
  provider              = google-beta
  project               = var.project_id
  name                  = "company-a"
  location              = var.region
  deletion_protection   = false

  ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    service_account = google_service_account.cloud_run_runtime.email

    scaling {
      min_instance_count = var.cloud_run_min_instances
      max_instance_count = var.cloud_run_max_instances
    }

    containers {
      image = local.company_service_image

      ports {
        container_port = 8080
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "TZ"
        value = var.timezone
      }

      env {
        name  = "COMPANY_ID"
        value = "A"
      }

      env {
        name  = "MONGODB_URI"
        value = local.mongodb_internal_uri
      }

      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "REFRESH_TOKEN_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.refresh_token_secret.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [
    google_project_service.required,
    google_secret_manager_secret_iam_member.runtime_can_read_jwt,
    google_secret_manager_secret_iam_member.runtime_can_read_refresh,
  ]
}

resource "google_cloud_run_v2_service" "company_b" {
  provider            = google-beta
  project             = var.project_id
  name                = "company-b"
  location            = var.region
  deletion_protection = false

  ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    service_account = google_service_account.cloud_run_runtime.email

    scaling {
      min_instance_count = var.cloud_run_min_instances
      max_instance_count = var.cloud_run_max_instances
    }

    containers {
      image = local.company_service_image

      ports {
        container_port = 8080
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "TZ"
        value = var.timezone
      }

      env {
        name  = "COMPANY_ID"
        value = "B"
      }

      env {
        name  = "MONGODB_URI"
        value = local.mongodb_internal_uri
      }

      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "REFRESH_TOKEN_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.refresh_token_secret.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [
    google_project_service.required,
    google_secret_manager_secret_iam_member.runtime_can_read_jwt,
    google_secret_manager_secret_iam_member.runtime_can_read_refresh,
  ]
}

resource "google_cloud_run_v2_service" "attendance" {
  provider            = google-beta
  project             = var.project_id
  name                = "attendance"
  location            = var.region
  deletion_protection = false

  ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    service_account = google_service_account.cloud_run_runtime.email

    scaling {
      min_instance_count = var.cloud_run_min_instances
      max_instance_count = var.cloud_run_max_instances
    }

    containers {
      image = local.attendance_service_image

      ports {
        container_port = 8080
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "TZ"
        value = var.timezone
      }

      env {
        name  = "MONGODB_URI"
        value = local.mongodb_internal_uri
      }

      env {
        name  = "COMPANY_A_SERVICE_URL"
        value = google_cloud_run_v2_service.company_a.uri
      }

      env {
        name  = "COMPANY_B_SERVICE_URL"
        value = google_cloud_run_v2_service.company_b.uri
      }

      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [
    google_project_service.required,
    google_secret_manager_secret_iam_member.runtime_can_read_jwt,
  ]
}

resource "google_cloud_run_v2_service" "edge_gateway" {
  provider            = google-beta
  project             = var.project_id
  name                = "edge-gateway"
  location            = var.region
  deletion_protection = false

  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.edge_gateway.email

    containers {
      image = local.edge_gateway_image

      ports {
        container_port = 8080
      }


      env {
        name  = "COMPANY_A_SERVICE_URL"
        value = google_cloud_run_v2_service.company_a.uri
      }

      env {
        name  = "COMPANY_B_SERVICE_URL"
        value = google_cloud_run_v2_service.company_b.uri
      }

      env {
        name  = "ATTENDANCE_SERVICE_URL"
        value = google_cloud_run_v2_service.attendance.uri
      }
    }
  }

  depends_on = [
    google_project_service.required,
    google_cloud_run_v2_service.company_a,
    google_cloud_run_v2_service.company_b,
    google_cloud_run_v2_service.attendance,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public_edge_gateway" {
  provider = google-beta
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.edge_gateway.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "gateway_invokes_company_a" {
  provider = google-beta
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.company_a.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.edge_gateway.email}"
}

resource "google_cloud_run_v2_service_iam_member" "gateway_invokes_company_b" {
  provider = google-beta
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.company_b.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.edge_gateway.email}"
}

resource "google_cloud_run_v2_service_iam_member" "gateway_invokes_attendance" {
  provider = google-beta
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.attendance.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.edge_gateway.email}"
}

