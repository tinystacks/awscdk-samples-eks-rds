import { constructId } from '@tinystacks/iac-utils';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as cdk from 'aws-cdk-lib';
import {
  VPC,
  EKS,
  EksHelmChart,
  Rds,
  SecurityGroups
} from '@tinystacks/aws-cdk-constructs';

export interface EksRdsStackProps {
  image: string;
  eksMinimumCapacity: number;
  eksMaximumCapacity: number;
  helmRepository: string;
}

export class EksRdsStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: EksRdsStackProps, stackProps?: cdk.StackProps) {
        super(scope, id, stackProps);

       const { 
        image, 
        eksMinimumCapacity, 
        eksMaximumCapacity, 
        helmRepository
       } = props;
        
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
            ec2.InstanceSize.MICRO
          ),
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        });
        
        // Launch EKS cluster
        const eksConstruct = new EKS(this, constructId(id + 'eks-cluster'), {
          clusterName: id + '-eks-cluster',
          vpc: vpcConstruct.vpc,
          internetAccess: true,
          minimumCapacity: eksMinimumCapacity,
          maximumCapacity: eksMaximumCapacity
        });

        // Deploy Helm Chart
        new EksHelmChart(this, constructId(id + 'helm-chart'), {
          eksCluster: eksConstruct.cluster,
          chartName: id + 'helm-chart',
          repository: helmRepository,
          values: {
            'DB_HOST': rdsConstruct.db.dbInstanceEndpointAddress,
            'DB_PORT': rdsConstruct.db.dbInstanceEndpointPort,
            'DB_SECRET_ARN': rdsConstruct.dbSecret?.secretName,
            'DB_NAME': rdsConstruct.dbName,
            'DB_USERNAME': rdsConstruct.dbUsername,
            image: {
                respository: image,
                pullPolicy: 'IfNotPresent',
                tag: ''
            }
          }
        });
    }
}