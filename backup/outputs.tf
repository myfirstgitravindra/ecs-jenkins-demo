output "vpc_id" {
  value = aws_vpc.main.id
}

output "subnet_ids" {
  value = aws_subnet.public[*].id
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "load_balancer_dns" {
  value = "http://${aws_lb.main.dns_name}"
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.app.name
}
