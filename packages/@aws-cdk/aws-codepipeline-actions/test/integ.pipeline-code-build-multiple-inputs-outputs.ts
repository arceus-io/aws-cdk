import codebuild = require('@aws-cdk/aws-codebuild');
import codecommit = require('@aws-cdk/aws-codecommit');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import s3 = require('@aws-cdk/aws-s3');
import cdk = require('@aws-cdk/cdk');
import cpactions = require('../lib');

const app = new cdk.App();

const stack = new cdk.Stack(app, 'aws-cdk-codepipeline-codebuild-multiple-inputs-outputs');

const repository = new codecommit.Repository(stack, 'MyRepo', {
  repositoryName: 'MyIntegTestTempRepo',
});
const bucket = new s3.Bucket(stack, 'MyBucket', {
  versioned: true,
  removalPolicy: cdk.RemovalPolicy.Destroy,
});

const pipeline = new codepipeline.Pipeline(stack, 'Pipeline', {
  artifactBucket: bucket,
});

const sourceAction1 = new cpactions.CodeCommitSourceAction({
  actionName: 'Source1',
  repository,
});
const sourceAction2 = new cpactions.S3SourceAction({
  actionName: 'Source2',
  bucketKey: 'some/path',
  bucket,
});
pipeline.addStage({
  name: 'Source',
  actions: [
    sourceAction1,
    sourceAction2,
  ],
});

const project = new codebuild.PipelineProject(stack, 'MyBuildProject');
const buildAction = new cpactions.CodeBuildBuildAction({
  actionName: 'Build1',
  project,
  inputArtifact: sourceAction1.outputArtifact,
  additionalInputArtifacts: [
    sourceAction2.outputArtifact,
  ],
  additionalOutputArtifactNames: [
    'CustomOutput1',
  ],
});
const testAction = new cpactions.CodeBuildTestAction({
  actionName: 'Build2',
  project,
  inputArtifact: sourceAction2.outputArtifact,
  additionalInputArtifacts: [
    sourceAction1.outputArtifact,
  ],
  additionalOutputArtifactNames: [
    'CustomOutput2',
  ],
});
pipeline.addStage({
  name: 'Build',
  actions: [
    buildAction,
    testAction,
  ],
});

// some assertions on the Action helper methods
if (buildAction.additionalOutputArtifacts().length !== 1) {
  throw new Error(`Expected build Action to have 1 additional output artifact, but was: ${buildAction.additionalOutputArtifacts()}`);
}
buildAction.additionalOutputArtifact('CustomOutput1'); // that it doesn't throw

if (testAction.outputArtifact) {
  throw new Error(`Expected test Action output Artifact to be undefined, was: ${testAction.outputArtifact}`);
}
if (testAction.additionalOutputArtifacts().length !== 1) {
  throw new Error(`Expected test Action to have 1 additional output artifact, but was: ${testAction.additionalOutputArtifacts()}`);
}
testAction.additionalOutputArtifact('CustomOutput2'); // that it doesn't throw

app.run();
