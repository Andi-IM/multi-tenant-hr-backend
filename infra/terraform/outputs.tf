output "artifact_registry_repository" {
  value = google_artifact_registry_repository.docker.name
}

output "company_a_url" {
  value = google_cloud_run_v2_service.company_a.uri
}

output "company_b_url" {
  value = google_cloud_run_v2_service.company_b.uri
}

output "attendance_url" {
  value = google_cloud_run_v2_service.attendance.uri
}

# edge_gateway_url output removed

output "api_gateway_hostname" {
  value = google_api_gateway_gateway.gateway.default_hostname
}

output "project_id" {
  value = var.project_id
}

output "region" {
  value = var.region
}

output "artifact_registry_repository_id" {
  value = var.artifact_registry_repository_id
}
