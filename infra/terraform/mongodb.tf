resource "google_compute_instance" "mongodb" {
  name         = "mongodb-instance"
  machine_type = "e2-micro" # Free Tier eligible in us-central1
  zone         = "${var.region}-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 10
    }
  }

  network_interface {
    network = "default"
    access_config {
      # Include this block to give the VM an external IP (optional, for management)
    }
  }

  metadata_startup_script = <<-EOT
    #!/bin/bash
    apt-get update
    apt-get install -y docker.io
    systemctl start docker
    systemctl enable docker
    docker run -d --name mongodb -p 27017:27017 -v /data/db:/data/db mongo:7.0
  EOT

  tags = ["mongodb"]

  service_account {
    scopes = ["cloud-platform"]
  }
}

resource "google_compute_firewall" "allow_mongodb_internal" {
  name    = "allow-mongodb-internal"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["27017"]
  }

  # Allow internal VPC traffic only
  source_ranges = ["10.0.0.0/8"]
  target_tags   = ["mongodb"]
}
