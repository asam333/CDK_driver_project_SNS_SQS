import { Stack, StackProps, Duration} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';

export interface MonitoringStackProps extends StackProps {
  loggingLambdaLogGroupName: string;
  cleanerLambda: lambda.Function;
}

export class MonitoringStack extends Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { loggingLambdaLogGroupName, cleanerLambda } = props;

    const loggingLambdaLogGroup = logs.LogGroup.fromLogGroupName(
      this,
      'ImportedLoggingLambdaLogGroup',
      loggingLambdaLogGroupName
    );

    new logs.MetricFilter(this, 'SizeDeltaMetricFilter', {
      logGroup: loggingLambdaLogGroup,
      filterPattern: logs.FilterPattern.literal('{"object_name": *,"size_delta": *}'),
      metricNamespace: 'Assignment4App',
      metricName: 'TotalObjectSize',
      metricValue: '$.size_delta'
    });

    const metric = new cloudwatch.Metric({
      namespace: 'Assignment4App',
      metricName: 'TotalObjectSize',
      statistic: 'Sum',
      period: Duration.minutes(1)
    });

    const alarm = new cloudwatch.Alarm(this, 'SizeAlarm', {
      metric,
      threshold: 20,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    const alarmTopic = new sns.Topic(this, 'AlarmTopic');
    alarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));
    alarmTopic.addSubscription(new subs.LambdaSubscription(cleanerLambda));
  }
}
