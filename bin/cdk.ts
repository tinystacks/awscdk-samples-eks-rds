#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EksRdsStack } from './eksRdsStack';

const app = new cdk.App();

new EksRdsStack(app, process.env.STACK_NAME as string, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEAULT_REGION
  }
});