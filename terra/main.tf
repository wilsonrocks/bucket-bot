
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

resource "aws_s3_bucket" "old_frontend_bucket" {
  
}

resource "aws_s3_bucket" "frontend_bucket" {}   



# GOOGLE STUFF

resource "google_artifact_registry_repository" "app" {
  location      = var.gcp_region
  repository_id = "docker"
  description   = "Docker images for Cloud Run"
  format        = "DOCKER"
}

resource "google_cloud_run_v2_service" "app" {
  name     = "app"
  location = var.gcp_region

  template {
    containers {
      image = var.image_url
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }
  }
}