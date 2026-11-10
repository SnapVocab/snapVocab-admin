pipeline {
    agent { label 'spring' }
    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }
    triggers { githubPush() }
    environment {
        DEPLOY_DIR = '/opt/snapvocab/admin'
    }
    stages {
        stage('Checkout prod') {
            steps {
                checkout scm
                script {
                    def sha = sh(script: 'git rev-parse --short=12 HEAD', returnStdout: true).trim()
                    env.ADMIN_IMAGE = "snapvocab-admin:build-${env.BUILD_NUMBER}-${sha}"
                }
                sh 'test "$(git rev-parse HEAD)" = "$(git rev-parse refs/remotes/origin/prod)"'
            }
        }
        stage('Test and build Docker image') {
            steps {
                sh '''
                    set -eu
                    test -r "$DEPLOY_DIR/.env.production"
                    FRONTEND_ENV_SHA=$(sha256sum "$DEPLOY_DIR/.env.production" | cut -d ' ' -f 1)
                    DOCKER_BUILDKIT=1 docker build --network host --build-arg FRONTEND_ENV_SHA="$FRONTEND_ENV_SHA" --secret id=frontend_env,src="$DEPLOY_DIR/.env.production" -t "$ADMIN_IMAGE" .
                '''
            }
        }
        stage('Deploy production') {
            steps { sh 'sh deploy/deploy.sh' }
        }
    }
}
