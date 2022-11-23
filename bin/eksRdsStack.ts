import { constructId } from '@tinystacks/iac-utils';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as cdk from 'aws-cdk-lib';
import {
  VPC,
  EKS,
  EksHelmChart,
  Rds,
  SecurityGroups,
  Alb
} from '@tinystacks/aws-cdk-constructs';
import { Ec2Action } from 'aws-cdk-lib/aws-cloudwatch-actions';

export class EksRdsStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, stackProps?: cdk.StackProps) {
        super(scope, id, stackProps);
        
        // Create VPC
        const vpcConstruct = new VPC(this, constructId(id + '-eks-vpc'), {
          internetAccess: true
        });
        
        // Create Security Group
        const sgRules = [
          { name: 'SSH', port: ec2.Port.tcp(22), peer: ec2.Peer.anyIpv4() },
          { name: 'HTTP', port: ec2.Port.tcp(80), peer: ec2.Peer.anyIpv4() },
          { name: 'HTTPS', port: ec2.Port.tcp(443), peer: ec2.Peer.anyIpv4() },
          { name: 'Postgres', port: ec2.Port.tcp(5432), peer: ec2.Peer.anyIpv4() },
        ]

        const commonSecurityGroup = new SecurityGroups(this, constructId(id + 'eks-vpc'), {
          vpc: vpcConstruct.vpc,
          securityGroupName: 'common',
          securityGroupRulesList: sgRules
        });

        // Create RDS Postgres

        const rdsConstruct = new Rds(this, constructId(id + 'rds-postgres'), {
          instanceIdentifier: id + '-rds-postgres',
          vpc: vpcConstruct.vpc,
          databaseEngine: rds.DatabaseInstanceEngine.POSTGRES,
          securityGroupsList: [commonSecurityGroup.securityGroup],
          instanceType: ec2.InstanceType.of(
            ec2.InstanceClass.BURSTABLE3,
            ec2.InstanceSize.MICRO,
          ),
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        });

        // const albStack = new Alb(this, id + '-eks-alb', {
        //     applicationPort: 80,
        //     vpc: vpcConstruct.vpc,
        //     healthCheckPath: '/',
        //     albSecurityGroup: commonSecurityGroup.securityGroup,
        // });
            // vpcSsmParamName: createVpcStack.ssmParameterName,clusterNameSsmParamName: eksStackStack.clusterNameSsmParamName })
        
        // Launch EKS cluster
        const eksConstruct = new EKS(this, constructId(id + 'eks-cluster'), {
          clusterName: id + '-eks-cluster',
          vpc: vpcConstruct.vpc,
          internetAccess: true,
          minimumCapacity: 1,
          maximumCapacity: 2
        });

        // Deploy Helm Chart
        new EksHelmChart(this, constructId(id + 'helm-chart'), {
          eksCluster: eksConstruct.cluster,
          chartName: 'hello-world',
          repository: 'https://helm.github.io/examples',
          values: {
            'DB_HOST': rdsConstruct.db.dbInstanceEndpointAddress,
            'DB_PORT': rdsConstruct.db.dbInstanceEndpointPort,
            'DB_SECRET_ARN': rdsConstruct.dbSecret?.secretName,
            'DB_NAME': rdsConstruct.dbName,
            'DB_USERNAME': rdsConstruct.dbUsername,
            image: {
                respository: 'public.ecr.aws/tinystacks/aws-docker-templates-express:latest-x86',
                pullPolicy: 'IfNotPresent',
                tag: ''
            }
          }
        });
    }
}