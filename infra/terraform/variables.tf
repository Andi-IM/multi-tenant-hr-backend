variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
}

variable "region" {
  description = "The Google Cloud region"
  type        = string
  default     = "us-central1"
}

variable "artifact_registry_repository_id" {
  description = "The ID of the Artifact Registry repository"
  type        = string
  default     = "mthrb-repo"
}

variable "cloud_run_min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0
}

variable "cloud_run_max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 1
}

variable "company_service_image" {
  description = "Docker image for the Company service (automatically derived if empty)"
  type        = string
  default     = ""
}

variable "timezone" {
  description = "Timezone for the services"
  type        = string
  default     = "UTC"
}

variable "company_a_mongodb_uri" {
  description = "MongoDB URI for Company A (automatically derived if empty)"
  type        = string
  default     = ""
}

variable "company_b_mongodb_uri" {
  description = "MongoDB URI for Company B (automatically derived if empty)"
  type        = string
  default     = ""
}

variable "attendance_service_image" {
  description = "Docker image for the Attendance service (automatically derived if empty)"
  type        = string
  default     = ""
}

variable "attendance_mongodb_uri" {
  description = "MongoDB URI for the Attendance service (automatically derived if empty)"
  type        = string
  default     = ""
}

variable "edge_gateway_image" {
  description = "Docker image for the Edge Gateway service (automatically derived if empty)"
  type        = string
  default     = ""
}