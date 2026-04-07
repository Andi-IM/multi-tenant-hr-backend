locals {
  # Derive Artifact Registry URLs automatically
  repository_url = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repository_id}"
  
  # Image URLs using the 'latest' tag by default
  company_service_image    = "${local.repository_url}/company-service:latest"
  attendance_service_image = "${local.repository_url}/attendance:latest"
  # edge_gateway_image removed

  # MongoDB URI using the internal IP of the GCE instance (we'll define this later)
  # This avoids manual entry of DB strings.
  mongodb_internal_uri = "mongodb://${google_compute_instance.mongodb.network_interface[0].network_ip}:27017"
}
