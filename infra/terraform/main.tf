
terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }
  required_version = ">= 1.6.0"
}

provider "oci" {
  region           = var.region
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
}

variable "compartment_ocid" {}
variable "region" {}
variable "tenancy_ocid" {}
variable "user_ocid" {}
variable "fingerprint" {}
variable "private_key_path" {}

# Streaming (Kafka API compatível no OCI)
resource "oci_streaming_stream_pool" "pool" {
  compartment_id = var.compartment_ocid
  name           = "tamaghost-pool"
  kafka_settings {
    auto_create_topics_enable = true
  }
}

resource "oci_streaming_stream" "interactions" {
  name             = "interactions"
  partitions       = 3
  retention_in_hours = 72
  stream_pool_id   = oci_streaming_stream_pool.pool.id
}

# Object Storage bucket para assets (camadas/skins)
resource "oci_objectstorage_bucket" "assets" {
  name           = "tamaghost-assets"
  compartment_id = var.compartment_ocid
  namespace      = data.oci_objectstorage_namespace.ns.namespace
  access_type    = "NoPublicAccess" # use PAR para publicar
}

data "oci_objectstorage_namespace" "ns" { compartment_id = var.compartment_ocid }

output "stream_pool_id" { value = oci_streaming_stream_pool.pool.id }
output "stream_ocid"     { value = oci_streaming_stream.interactions.id }
output "bucket_name"     { value = oci_objectstorage_bucket.assets.name }
output "bucket_namespace"{ value = data.oci_objectstorage_namespace.ns.namespace }
