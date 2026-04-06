variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
}

variable "region" {
  description = "The Google Cloud region"
  type        = string
}

variable "artifact_registry_repository_id" {
  description = "The ID of the Artifact Registry repository"
  type        = string
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
  description = "Docker image for the Company service"
  type        = string
}

variable "timezone" {
  description = "Timezone for the services"
  type        = string
  default     = "UTC"
}

variable "company_a_mongodb_uri" {
  description = "MongoDB URI for Company A"
  type        = string
}

variable "company_b_mongodb_uri" {
  description = "MongoDB URI for Company B"
  type        = string
}

variable "attendance_service_image" {
  description = "Docker image for the Attendance service"
  type        = string
}

variable "attendance_mongodb_uri" {
  description = "MongoDB URI for the Attendance service"
  type        = string
}

variable "edge_gateway_image" {
  description = "Docker image for the Edge Gateway service"
  type        = string
}