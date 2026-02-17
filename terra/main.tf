
provider "aws" {
	region = "eu-west-2"
	default_tags {
		tags = {
			Project = "Bucket Bot"
		}
	}
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

resource "aws_lambda_function" "backend_lambda" {
	function_name = "bucket-bot-backend-lambda"
    role          = aws_iam_role.lambda_exec_role.arn
    handler       = "index.handler"
    runtime       = "nodejs22.x"
    filename      = "placeholders/lambda-placeholder.zip"


  # Terraform will ignore code updates after creation
  # because we will be doing this with CLI commands in github actions
  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,  # optional, safer to include
    ]
  }
}