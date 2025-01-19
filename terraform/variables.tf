# Docker Variables

variable "api_image_name" {
  type    = string
  default = "securevision-api:latest"
}

variable "client_image_name" {
  type    = string
  default = "securevision-client:latest"
}

# Solace Broker Variables

variable "solace_username" {
  type        = string
  description = "Username for Solace broker authentication"
}

variable "solace_password" {
  type        = string
  description = "Password for Solace broker authentication"
  sensitive   = true
}

variable "solace_url" {
  type        = string
  description = "URL of the Solace broker management endpoint"
}

variable "msg_vpn_name" {
  type        = string
  description = "Name of the Message VPN"
}

# MySQL Variables

variable "mysql_user" {
  type        = string
  description = "User for MySQL database"
  default     = "root"
}

variable "mysql_root_password" {
  type        = string
  description = "Root password for MySQL database"
  sensitive   = true
}

variable "mysql_password" {
  type        = string
  description = "Password for the MySQL database"
  sensitive   = true
}

variable "mysql_port" {
  type        = number
  description = "Port for MySQL"
  default     = 3306
}

variable "mysql_db" {
  type        = string
  description = "Database name"
  default     = "securevision"
}

variable "mysql_host" {
  type        = string
  description = "MySQL hostname"
  default     = "securevision_db"
}

# API and Client Variables

variable "groq_api_key" {
  type        = string
  description = "API key for Groq AI services"
  sensitive   = true
}

variable "shodan_api_key" {
  type        = string
  description = "API key for Shodan services"
  sensitive   = true
}

variable "virustotal_api_key" {
  type        = string
  description = "API key for Virustotal services"
  sensitive   = true
}

variable "app_env" {
  type        = string
  description = "The environment for the API (development, test, production)"
  default     = "development"
}

variable "api_debug" {
  type        = string
  description = "Whether the app is in debug mode"
  default     = true
}

variable "api_internal_host" {
  type        = string
  description = "Host for the API (internal)"
  default     = "0.0.0.0"
}

variable "api_port" {
  type        = number
  description = "Port for the API"
  default     = 8000
}

variable "client_port" {
  type        = number
  description = "Port for the Web Client (before reverse proxy)"
  default     = 3000
}

# MQTT Variables

variable "mqtt_url" {
  type        = string
  description = "The URL for the MQTT event broker (SSL)"
}

variable "mqtt_username" {
  type        = string
  description = "The username for use by MQTT clients"
}

variable "mqtt_password" {
  type        = string
  description = "The password for use by MQTT clients"
  sensitive   = true
}

variable "ws_queue_url" {
  type        = string
  description = "The URL for the MQTT event broker (WSS)"
}




