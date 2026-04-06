variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "asia-southeast2"
}

variable "artifact_registry_repository_id" {
  type    = string
  default = "mthrb"
}

variable "company_service_image" {
  type = string
}

variable "attendance_service_image" {
  type = string
}

variable "edge_gateway_image" {
  type = string
}

variable "company_a_mongodb_uri" {
  type      = string
  sensitive = true
}

variable "company_b_mongodb_uri" {
  type      = string
  sensitive = true
}

variable "attendance_mongodb_uri" {
  type      = string
  sensitive = true
}

variable "timezone" {
  type    = string
  default = "Asia/Jakarta"
}

variable "cloud_run_min_instances" {
  type    = number
  default = 0
}

variable "cloud_run_max_instances" {
  type    = number
  default = 10
}
