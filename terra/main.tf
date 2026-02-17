
provider "aws" {
	region = "eu-west-2"
	default_tags {
		tags = {
			Project = "Bucket Bot"
		}
	}
}


# Google Cloud provider configuration
provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
}


terraform {
	backend "s3" {
		bucket         = "bucket-bot-terraform-state"
		key            = "terraform/state"
		use_lockfile   = true
		region         = "eu-west-2"
		encrypt        = true
	}
}

resource "aws_s3_bucket" "terraform_state_bucket" {
	bucket = "bucket-bot-terraform-state"
}

resource "aws_s3_bucket" "user_uploads_bucket" {
	bucket = "bucket-bot-user-uploads"
}


resource "aws_s3_bucket" "frontend_bucket" {}   



# GOOGLE STUFF

resource "google_artifact_registry_repository" "app" {
  location      = var.gcp_region
  repository_id = "docker"
  description   = "Docker images for Cloud Run"
  format        = "DOCKER"
}



resource "google_project_service" "artifactregistry" {
  service = "artifactregistry.googleapis.com"
}
resource "google_project_service" "run" {
  service = "run.googleapis.com"
}

resource "google_cloud_run_v2_service" "backend" {
  name     = "bucket-bot"
  location = var.gcp_region

  template {
    containers {
      image = "gcr.io/cloudrun/hello"
      ports {
        container_port = 9999
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }
  }


  lifecycle {
    ignore_changes = [
      template[0].containers[0].image
    ]
  }
}



resource "google_cloud_run_v2_service_iam_member" "public" {
  name   = google_cloud_run_v2_service.backend.id  # full resource name
  role   = "roles/run.invoker"
  member = "allUsers"
}

output "backend_service_url" {
  description = "The public URL of the backend Cloud Run service"
  value       = google_cloud_run_v2_service.backend.uri
}

output "backend_service_id" {
  description = "The full resource name of the backend Cloud Run service"
  value       = google_cloud_run_v2_service.backend.id
}


resource "google_service_account" "ci" {
  account_id   = "github-actions"
  display_name = "GitHub Actions CI Service Account"
}
resource "google_project_iam_member" "ci_roles" {
  project = var.gcp_project
  role    = "roles/run.admin"   # e.g., for Cloud Run deploy
  member  = "serviceAccount:${google_service_account.ci.email}"
}

resource "google_service_account_key" "ci_key" {
  service_account_id = google_service_account.ci.name
  key_algorithm      = "KEY_ALG_RSA_2048"
  private_key_type   = "TYPE_GOOGLE_CREDENTIALS_FILE"
}

output "ci_sa_key" {
  value     = google_service_account_key.ci_key.private_key
  sensitive = true
}
