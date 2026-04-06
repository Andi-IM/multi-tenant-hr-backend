# GCP Provisioning Guide (From Zero)

This guide explains how to provision the entire Multi-Tenant HR Backend infrastructure on GCP from scratch.

## Prerequisites

1.  **Google Cloud SDK (gcloud)** installed and authenticated.
2.  **Docker** installed and running.
3.  **Terraform** (v1.5+) installed.
4.  **Enabled billing** on your GCP project.

## Step 1: Configure Variables

Create or update `infra/terraform/terraform.tfvars` with your project details:

```hcl
project_id                      = "your-project-id"
region                          = "us-central1"
artifact_registry_repository_id = "mthrb-repo"
timezone                        = "Asia/Jakarta"
```

## Step 2: Run the Provisioning Script

The `provision.sh` script automates the two-stage deployment process. It creates the Artifact Registry, builds and pushes your Docker images, and then deploys the Cloud Run services and MongoDB VM.

From the root of the repository, run:

```bash
sh infra/scripts/provision.sh
```

## What This Script Does

1.  **Stage 1 (Terraform)**: Enables required GCP APIs and creates the Artifact Registry repository.
2.  **Image Build (Docker)**:
    *   Builds `company-service` image.
    *   Builds `attendance` image.
    *   Builds `edge-gateway` (Nginx) image.
3.  **Image Push (Docker)**: Pushes these images to the new Artifact Registry.
4.  **Stage 2 (Terraform)**:
    *   Provisions a **MongoDB** instance on GCE (`e2-micro`).
    *   Deploys **Cloud Run** services using the pushed images.
    *   Configures **API Gateway** as the single entry point.

## After Provisioning

Once the script completes, it will output the **API Gateway Hostname**. You can use this URL to access your multi-tenant HR backend.

Example:
`https://mthrb-gateway-xxxxx.uc.gateway.dev/v1/attendance`
