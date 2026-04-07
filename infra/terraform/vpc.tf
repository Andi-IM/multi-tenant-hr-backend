resource "google_compute_network" "private_network" {
  project                  = var.project_id
  name                    = "mthrb-private-network"
  auto_create_subnetworks = false
  routing_mode             = "REGIONAL"
}

resource "google_vpc_access_connector" "connector" {
  provider      = google-beta
  project       = var.project_id
  name          = "mthrb-vpc-connector"
  region        = var.region
  network       = google_compute_network.private_network.name
  ip_cidr_range = "192.168.0.0/28"
  machine_type  = "e2-micro"
  min_instances = 2
  max_instances = 3
}