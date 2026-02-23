# Create VPC
VPC_ID=$(aws ec2 create-vpc \
    --cidr-block 10.0.0.0/16 \
    --region us-east-1 \
    --query 'Vpc.VpcId' \
    --output text)

# Enable DNS hostnames
aws ec2 modify-vpc-attribute \
    --vpc-id $VPC_ID \
    --enable-dns-hostnames \
    --region us-east-1

# Create Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway \
    --region us-east-1 \
    --query 'InternetGateway.InternetGatewayId' \
    --output text)

# Attach IGW to VPC
aws ec2 attach-internet-gateway \
    --internet-gateway-id $IGW_ID \
    --vpc-id $VPC_ID \
    --region us-east-1

# Create public subnets
SUBNET_1_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.1.0/24 \
    --availability-zone us-east-1a \
    --region us-east-1 \
    --query 'Subnet.SubnetId' \
    --output text)

SUBNET_2_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.2.0/24 \
    --availability-zone us-east-1b \
    --region us-east-1 \
    --query 'Subnet.SubnetId' \
    --output text)

# Enable auto-assign public IP
aws ec2 modify-subnet-attribute \
    --subnet-id $SUBNET_1_ID \
    --map-public-ip-on-launch \
    --region us-east-1

aws ec2 modify-subnet-attribute \
    --subnet-id $SUBNET_2_ID \
    --map-public-ip-on-launch \
    --region us-east-1

# Create route table
RT_ID=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --region us-east-1 \
    --query 'RouteTable.RouteTableId' \
    --output text)

# Add route to internet
aws ec2 create-route \
    --route-table-id $RT_ID \
    --destination-cidr-block 0.0.0.0/0 \
    --gateway-id $IGW_ID \
    --region us-east-1

# Associate subnets
aws ec2 associate-route-table \
    --route-table-id $RT_ID \
    --subnet-id $SUBNET_1_ID \
    --region us-east-1

aws ec2 associate-route-table \
    --route-table-id $RT_ID \
    --subnet-id $SUBNET_2_ID \
    --region us-east-1

# Create security group (allow all traffic)
SG_ID=$(aws ec2 create-security-group \
    --group-name bluegreen-sg \
    --description "Allow all traffic" \
    --vpc-id $VPC_ID \
    --region us-east-1 \
    --query 'GroupId' \
    --output text)

# Allow all inbound traffic
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol all \
    --port 0-65535 \
    --cidr 0.0.0.0/0 \
    --region us-east-1

echo "✅ VPC Created: $VPC_ID"
echo "✅ Subnet 1: $SUBNET_1_ID"
echo "✅ Subnet 2: $SUBNET_2_ID"
echo "✅ Security Group: $SG_ID"
