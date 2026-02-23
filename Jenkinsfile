pipeline {
    agent any
    
    environment {
        AWS_REGION = 'us-east-1'
        ECR_REPO = '528133971227.dkr.ecr.us-east-1.amazonaws.com/simple-app-repo'
        ECS_CLUSTER = 'simple-app-cluster'
        ECS_SERVICE = 'simple-app-service'
        IMAGE_VERSION = "${BUILD_NUMBER}"
    }
    
    triggers {
        githubPush()
    }
    
    stages {
        stage('Build') {
            steps {
                dir('app') {
                    sh 'docker build -t my-app:v${IMAGE_VERSION} .'
                }
            }
        }
        
        stage('Push to ECR') {
            steps {
                withAWS(credentials: 'aws-credentials', region: 'us-east-1') {
                    sh '''
                        aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO
                        docker tag my-app:v${IMAGE_VERSION} $ECR_REPO:v${IMAGE_VERSION}
                        docker tag my-app:v${IMAGE_VERSION} $ECR_REPO:latest
                        docker push $ECR_REPO:v${IMAGE_VERSION}
                        docker push $ECR_REPO:latest
                    '''
                }
            }
        }
        
        stage('Deploy to ECS') {
            steps {
                withAWS(credentials: 'aws-credentials', region: 'us-east-1') {
                    sh '''
                        aws ecs update-service \
                            --cluster $ECS_CLUSTER \
                            --service $ECS_SERVICE \
                            --force-new-deployment \
                            --region $AWS_REGION
                    '''
                }
            }
        }
        
        stage('Show URL') {
            steps {
                withAWS(credentials: 'aws-credentials', region: 'us-east-1') {
                    sh '''
                        aws elbv2 describe-load-balancers \
                            --names simple-app-alb \
                            --region $AWS_REGION \
                            --query 'LoadBalancers[0].DNSName' \
                            --output text
                    '''
                }
            }
        }
    }
    
    post {
        success {
            echo "✅ Version v${IMAGE_VERSION} deployed successfully!"
        }
    }
}
