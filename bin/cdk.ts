#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EksRdsStack } from './eksRdsStack';

const app = new cdk.App();

const image =  process.env.image || 'public.ecr.aws/tinystacks/aws-docker-templates-express:latest-x86';
const eksMinimumCapacity = Number(process.env.eksMinimumCapacity) || 1;
const eksMaximumCapacity = Number(process.env.eksMaximumCapacity) || 2;
const helmRepository =  process.env.helmRepository || 'https://helm.github.io/examples';

new EksRdsStack(app, process.env.STACK_NAME as string, {
  image, 
  eksMinimumCapacity, 
  eksMaximumCapacity, 
  helmRepository
 }, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEAULT_REGION
  }
});