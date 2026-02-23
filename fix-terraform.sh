#!/bin/bash

echo "========================================="
echo "🔧 AUTOMATED TERRAFORM FIX SCRIPT"
echo "========================================="

# Step 1: Fix security group in main.tf
echo "📌 Step 1: Fixing security group in main.tf..."

# Backup main.tf
cp main.tf main.tf.bak

# Use sed to replace the security group section (works on both Linux and Git Bash)
sed -i '/resource "aws_security_group" "ecs" {/,/}/c\
resource "aws_security_group" "ecs" {\
  name        = "${var.project_name}-sg"\
  description = "Allow all traffic"\
  vpc_id      = aws_vpc.main.id\
\
  ingress {\
    from_port   = 0\
    to_port     = 0\
    protocol    = "-1"\
    cidr_blocks = ["0.0.0.0/0"]\
  }\
\
  egress {\
    from_port   = 0\
    to_port     = 0\
    protocol    = "-1"\
    cidr_blocks = ["0.0.0.0/0"]\
  }\
\
  tags = {\
    Name = "${var.project_name}-sg"\
  }\
}' main.tf

echo "✅ Security group fixed!"

# Step 2: Find and delete conflicting resources
echo ""
echo "📌 Step 2: Finding and deleting conflicting resources..."

# Find and delete target groups with name bluegreen-tg
TG_ARNS=$(aws elbv2 describe-target-groups --region us-east-1 --query 'TargetGroups[?starts_with(TargetGroupName, `bluegreen-tg`)].TargetGroupArn' --output text)
for TG_ARN in $TG_ARNS; do
    echo "Deleting target group: $TG_ARN"
    aws elbv2 delete-target-group --target-group-arn $TG_ARN --region us-east-1
done

# Find and delete clusters with name bluegreen-cluster
CLUSTER_ARNS=$(aws ecs list-clusters --region us-east-1 --query 'clusterArns[?contains(@, `bluegreen-cluster`)]' --output text)
for CLUSTER_ARN in $CLUSTER_ARNS; do
    echo "Deleting cluster: $CLUSTER_ARN"
    aws ecs delete-cluster --cluster $CLUSTER_ARN --region us-east-1
done

# Find and delete load balancers with name bluegreen-alb
LB_ARNS=$(aws elbv2 describe-load-balancers --region us-east-1 --query 'LoadBalancers[?starts_with(LoadBalancerName, `bluegreen-alb`)].LoadBalancerArn' --output text)
for LB_ARN in $LB_ARNS; do
    echo "Deleting load balancer: $LB_ARN"
    aws elbv2 delete-load-balancer --load-balancer-arn $LB_ARN --region us-east-1
done

# Find and delete ECR repositories with name bluegreen-app
REPO_NAMES=$(aws ecr describe-repositories --region us-east-1 --query 'repositories[?starts_with(repositoryName, `bluegreen-app`)].repositoryName' --output text)
for REPO_NAME in $REPO_NAMES; do
    echo "Deleting ECR repository: $REPO_NAME"
    # First delete all images
    IMAGE_IDS=$(aws ecr list-images --repository-name $REPO_NAME --region us-east-1 --query 'imageIds' --output json)
    if [ "$IMAGE_IDS" != "[]" ] && [ "$IMAGE_IDS" != "null" ]; then
        aws ecr batch-delete-image --repository-name $REPO_NAME --image-ids "$IMAGE_IDS" --region us-east-1 > /dev/null 2>&1
    fi
    # Then delete repository
    aws ecr delete-repository --repository-name $REPO_NAME --force --region us-east-1 > /dev/null 2>&1
done

echo "✅ All conflicting resources deleted!"
echo "⏳ Waiting 30 seconds for AWS to stabilize..."
sleep 30

# Step 3: Clean terraform and reapply
echo ""
echo "📌 Step 3: Cleaning terraform and reapplying..."

# Backup any important files
mkdir -p backup
cp *.tf backup/ 2>/dev/null

# Clean terraform
rm -rf .terraform terraform.tfstate* *.backup *.bak

# Reinitialize terraform
echo "Initializing terraform..."
terraform init

# Apply with auto-approve
echo ""
echo "📌 Step 4: Applying terraform configuration..."
terraform apply -auto-approve

# Step 5: Show outputs
echo ""
echo "========================================="
echo "✅ TERRAFORM APPLY COMPLETE!"
echo "========================================="
terraform output

# Step 6: Push Docker image if needed
echo ""
echo "📌 Step 5: Pushing Docker image to ECR..."

# Get ECR URL from terraform output
ECR_URL=$(terraform output -raw ecr_repository_url 2>/dev/null)

if [ ! -z "$ECR_URL" ]; then
    echo "ECR Repository: $ECR_URL"
    
    # Check if Docker image exists
    if [ -f ~/fresh-ecs-project/app/Dockerfile ]; then
        cd ~/fresh-ecs-project/app
        
        # Build image
        echo "Building Docker image..."
        docker build -t bluegreen-app:latest .
        
        # Login to ECR
        echo "Logging into ECR..."
        aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 528133971227.dkr.ecr.us-east-1.amazonaws.com
        
        # Tag and push
        echo "Pushing image to ECR..."
        docker tag bluegreen-app:latest $ECR_URL:latest
        docker push $ECR_URL:latest
        
        # Force new deployment
        CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)
        SERVICE_NAME=$(terraform output -raw ecs_service_name)
        
        echo "Forcing new deployment..."
        aws ecs update-service --cluster $CLUSTER_NAME --service $SERVICE_NAME --force-new-deployment --region us-east-1
        
        echo "✅ Docker image pushed and deployment triggered!"
    else
        echo "⚠️  App directory not found. Please push Docker image manually."
    fi
else
    echo "⚠️  Could not get ECR URL. Please push Docker image manually."
fi

echo ""
echo "========================================="
echo "🎉 ALL DONE! Load balancer URL:"
echo "========================================="
terraform output load_balancer_dns
echo ""
echo "If the app doesn't work immediately, wait 2-3 minutes for tasks to start."