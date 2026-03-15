provider "aws" {
  region = "eu-west-2"
  default_tags {
    tags = {
      Project = "Bucket Bot"
    }
  }
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

terraform {
  backend "s3" {
    bucket       = "bucket-bot-terraform-state"
    key          = "terraform/state"
    use_lockfile = true
    region       = "eu-west-2"
    encrypt      = true
  }
}




resource "aws_s3_bucket" "terraform_state_bucket" {
  bucket = "bucket-bot-terraform-state"
}



resource "aws_s3_bucket" "frontend" {
  bucket = "bucket-bot-frontend"
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "bucket-bot-frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"


  aliases = ["malifaux.uk", "www.malifaux.uk"]

  depends_on = [aws_acm_certificate_validation.frontend]
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    target_origin_id       = "frontend"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.www_redirect.arn
    }

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.frontend.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.frontend.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
        }
      }
    }]
  })
}

output "frontend_distribution_domain_name" {
  value = aws_cloudfront_distribution.frontend.domain_name
}

output "frontend_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

output "frontend_bucket_name" {
  value = aws_s3_bucket.frontend.bucket
}



resource "aws_route53_zone" "primary" {
  name = "malifaux.uk"
  # No tags needed here, default_tags will apply automatically
}


# Apex domain → CloudFront
resource "aws_route53_record" "apex" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "malifaux.uk"
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "www.malifaux.uk"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "api.malifaux.uk"
  type    = "A"
  ttl     = 300
  records = ["212.227.84.191"]
}

resource "aws_cloudfront_function" "www_redirect" {
  name    = "bucket-bot-www-redirect-function"
  runtime = "cloudfront-js-1.0"

  code = <<EOF
function handler(event) {
    var request = event.request;
    var host = request.headers.host.value;

    if (host === "www.malifaux.uk") {
        return {
            statusCode: 301,
            statusDescription: "Moved Permanently",
            headers: {
                location: { value: "https://malifaux.uk" + request.uri }
            }
        };
    }
    return request;
}
EOF
}


resource "aws_acm_certificate" "frontend" {
  provider                  = aws.us_east_1
  domain_name               = "malifaux.uk"
  validation_method         = "DNS"
  subject_alternative_names = ["www.malifaux.uk"]

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "frontend_validation" {
  for_each = {
    for dvo in aws_acm_certificate.frontend.domain_validation_options : dvo.domain_name => dvo
  }

  zone_id = aws_route53_zone.primary.zone_id
  name    = each.value.resource_record_name
  type    = each.value.resource_record_type
  records = [each.value.resource_record_value]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "frontend" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.frontend.arn
  validation_record_fqdns = [for record in aws_route53_record.frontend_validation : record.fqdn]
}

output "route53_ns" {
  value = aws_route53_zone.primary.name_servers
}

output "route53_zone_id" {
  value = aws_route53_zone.primary.zone_id
}



resource "aws_iam_user" "github_actions_deploy" {
  name = "bucket-bot-github-actions-deploy"
}

resource "aws_iam_user_policy" "github_actions_deploy" {
  name = "bucket-bot-frontend-deploy"
  user = aws_iam_user.github_actions_deploy.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ]
        Resource = [
          aws_s3_bucket.frontend.arn,
          "${aws_s3_bucket.frontend.arn}/*",
        ]
      },
      {
        Effect   = "Allow"
        Action   = "cloudfront:CreateInvalidation"
        Resource = aws_cloudfront_distribution.frontend.arn
      },
    ]
  })
}

resource "aws_iam_access_key" "github_actions_deploy" {
  user = aws_iam_user.github_actions_deploy.name
}

output "github_actions_deploy_access_key_id" {
  value = aws_iam_access_key.github_actions_deploy.id
}

output "github_actions_deploy_secret_access_key" {
  value     = aws_iam_access_key.github_actions_deploy.secret
  sensitive = true
}