variable "gcp_project_id" {
  type        = string
  description = "The GCP project ID."
}

variable "environment_name" {
  type        = string
  description = "The name of the deployment environment (e.g., dev, pr-123, main)."
}

variable "db_password" {
  type        = string
  description = "Password for the Cloud SQL database user"
  sensitive   = true
  default     = "changeme-in-production" # Override in terraform.tfvars
}