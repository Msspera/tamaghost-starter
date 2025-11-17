
# Terraform (OCI) — mínimo

Este módulo cria:
- **Stream Pool** e **Stream** `interactions` (para eventos).
- **Bucket** `tamaghost-assets` no Object Storage (publique suas camadas/skins via PAR).

## Uso

1. Preencha `terraform.tfvars`:
```hcl
tenancy_ocid     = "ocid1.tenancy.oc1..aaaa..."
user_ocid        = "ocid1.user.oc1..aaaa..."
fingerprint      = "xx:xx:xx:..."
private_key_path = "~/.oci/oci_api_key.pem"
region           = "sa-saopaulo-1"
compartment_ocid = "ocid1.compartment.oc1..aaaa..."
```

2. Execute:
```bash
terraform init
terraform apply
```
