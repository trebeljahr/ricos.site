terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

module "next_image_optimizer" {
  source = "milliHQ/next-js-image-optimization/aws"

  next_image_domains = ["d2yc5hwphhmqkk.cloudfront.net", "www.trebeljahr.com", "trebeljahr.com"]
  next_image_formats = ["image/avif", "image/webp"]
  next_image_base_origin = "https://trebeljahr.com"
  // source_bucket_id = "arn:aws:s3:::images.trebeljahr.com"
}

output "domain" {
  value = module.next_image_optimizer.cloudfront_domain_name
}