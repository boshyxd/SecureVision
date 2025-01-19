terraform {
  required_providers {
    solacebroker = {
      source  = "registry.terraform.io/solaceproducts/solacebroker"
      version = "~> 1.1.1"
    }
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0.1"
    }
  }
}

provider "solacebroker" {
  username = var.solace_username
  password = var.solace_password
  url      = var.solace_url
}

resource "solacebroker_msg_vpn_queue" "url_data" {
  msg_vpn_name = var.msg_vpn_name
  queue_name   = "url-data"

  access_type         = "exclusive"
  max_msg_size        = 10000000
  max_msg_spool_usage = 5000
  permission          = "consume"
  ingress_enabled     = true
  egress_enabled      = true
}

resource "solacebroker_msg_vpn_queue_subscription" "scanner_subscription" {
  msg_vpn_name       = solacebroker_msg_vpn_queue.url_data.msg_vpn_name
  queue_name         = solacebroker_msg_vpn_queue.url_data.queue_name
  subscription_topic = "urls/parsed/#"
}

resource "solacebroker_msg_vpn_queue_subscription" "data_subscription" {
  msg_vpn_name       = solacebroker_msg_vpn_queue.url_data.msg_vpn_name
  queue_name         = solacebroker_msg_vpn_queue.url_data.queue_name
  subscription_topic = "urls/scanned/#"
}

provider "docker" {}

resource "docker_volume" "db_data" {
  name = "db_data"
}

resource "docker_network" "securevision_network" {
  name = "securevision_network"
}

# API service
resource "docker_image" "api" {
  name = var.api_image_name
}

resource "docker_container" "api" {
  name  = "securevision_api"
  image = docker_image.api.image_id
  ports {
    internal = var.api_port
    external = var.api_port
  }
  env = [
    "MYSQL_HOST=${var.mysql_host}",
    "MYSQL_PASSWORD=${var.mysql_password}",
    "MYSQL_PORT=${var.mysql_port}",
    "MYSQL_DB=${var.mysql_db}",
    "MYSQL_USER=${var.mysql_user}",
    "MQTT_URL=${var.mqtt_url}",
    "MQTT_USERNAME=${var.mqtt_username}",
    "MQTT_PASSWORD=${var.mqtt_password}",
    "GROQ_API_KEY=${var.groq_api_key}",
    "SHODAN_API_KEY=${var.shodan_api_key}",
    "VIRUSTOTAL_API_KEY=${var.virustotal_api_key}",
  ]
  networks_advanced {
    name = docker_network.securevision_network.name
  }
}

# Frontend service
resource "docker_image" "frontend" {
  name = var.client_image_name
}

resource "docker_container" "frontend" {
  name  = "securevision_client"
  image = docker_image.frontend.image_id
  ports {
    internal = var.client_port
    external = var.client_port
  }
  env = [
    "NEXT_PUBLIC_API_URL=http://localhost:${var.api_port}/api/v1"
  ]
  networks_advanced {
    name = docker_network.securevision_network.name
  }
}
# Data workers
resource "docker_image" "data_worker" {
  name = var.worker_image_name
}

resource "docker_container" "data_worker" {
  count   = var.worker_nodes
  name    = "securevision_data_worker_${count.index}"
  image   = docker_image.data_worker.image_id
  restart = "always"
  env = [
    "MQTT_URL=${var.mqtt_url}",
    "MQTT_USERNAME=${var.mqtt_username}",
    "MQTT_PASSWORD=${var.mqtt_password}",
    "API_URL=http://${docker_container.api.name}:${var.api_port}/api/v1",
    "SHODAN_API_KEY=${var.shodan_api_key}",
    "VIRUSTOTAL_API_KEY=${var.virustotal_api_key}",
  ]

  networks_advanced {
    name = docker_network.securevision_network.name
  }
}

# DB service
resource "docker_image" "mysql" {
  name = "mysql:latest"
}

resource "docker_container" "db" {
  name    = var.mysql_host
  image   = docker_image.mysql.image_id
  env     = ["MYSQL_ROOT_PASSWORD=${var.mysql_root_password}"]
  restart = "always"
  volumes {
    volume_name    = docker_volume.db_data.name
    container_path = "/var/lib/mysql"
  }
  ports {
    internal = var.mysql_port
    external = var.mysql_port
  }
  networks_advanced {
    name = docker_network.securevision_network.name
  }
}
