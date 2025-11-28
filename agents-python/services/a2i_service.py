"""
Amazon Augmented AI (A2I) Service

Handles human-in-the-loop review escalation for high-risk contracts.
"""

import boto3
import time
from typing import List, Optional

from types.risk_scoring_types import HumanLoopRequest, HumanLoopResponse


class A2IService:
    """Amazon A2I service for human review escalation"""

    def __init__(self, flow_definition_arn: str, region: str = "us-east-1"):
        """
        Initialize A2I service

        Args:
            flow_definition_arn: A2I flow definition ARN
            region: AWS region
        """
        self.flow_definition_arn = flow_definition_arn
        self.region = region
        self.client = boto3.client('sagemaker-a2i-runtime', region_name=region)

    def create_human_loop(self, request: HumanLoopRequest) -> HumanLoopResponse:
        """
        Create a human loop for manual review

        Args:
            request: Human loop request

        Returns:
            HumanLoopResponse with ARN and status
        """
        try:
            response = self.client.start_human_loop(
                HumanLoopName=request.human_loop_name,
                FlowDefinitionArn=request.flow_definition_arn or self.flow_definition_arn,
                HumanLoopInput={
                    'InputContent': str(request.input_content)
                },
                DataAttributes=request.data_attributes or {}
            )

            print(f"Human loop created: {response.get('HumanLoopArn', '')}")

            return HumanLoopResponse(
                human_loop_arn=response.get('HumanLoopArn', ''),
                human_loop_name=request.human_loop_name,
                status='InProgress'
            )

        except Exception as e:
            print(f"Error creating human loop: {e}")
            raise Exception(f"Failed to create human loop: {str(e)}")

    def get_human_loop_status(self, human_loop_name: str) -> HumanLoopResponse:
        """
        Get human loop status

        Args:
            human_loop_name: Human loop name

        Returns:
            HumanLoopResponse with current status
        """
        try:
            response = self.client.describe_human_loop(
                HumanLoopName=human_loop_name
            )

            return HumanLoopResponse(
                human_loop_arn=response.get('HumanLoopArn', ''),
                human_loop_name=human_loop_name,
                status=response.get('HumanLoopStatus', 'Unknown'),
                output_destination=response.get('HumanLoopOutput', {}).get('OutputS3Uri')
            )

        except Exception as e:
            print(f"Error getting human loop status: {e}")
            raise Exception(f"Failed to get human loop status: {str(e)}")

    def stop_human_loop(self, human_loop_name: str) -> None:
        """
        Stop a human loop

        Args:
            human_loop_name: Human loop name
        """
        try:
            self.client.stop_human_loop(HumanLoopName=human_loop_name)
            print(f"Human loop stopped: {human_loop_name}")
        except Exception as e:
            print(f"Error stopping human loop: {e}")
            raise Exception(f"Failed to stop human loop: {str(e)}")

    def list_human_loops(
        self,
        flow_definition_arn: Optional[str] = None,
        created_after: Optional[str] = None,
        max_results: int = 100
    ) -> List[dict]:
        """
        List human loops by status

        Args:
            flow_definition_arn: Flow definition ARN (optional)
            created_after: Filter by creation date (optional)
            max_results: Maximum number of results

        Returns:
            List of human loop summaries
        """
        try:
            params = {
                'FlowDefinitionArn': flow_definition_arn or self.flow_definition_arn,
                'MaxResults': max_results,
                'SortOrder': 'Descending'
            }

            if created_after:
                params['CreationTimeAfter'] = created_after

            response = self.client.list_human_loops(**params)
            return response.get('HumanLoopSummaries', [])

        except Exception as e:
            print(f"Error listing human loops: {e}")
            raise Exception(f"Failed to list human loops: {str(e)}")

    def is_human_loop_complete(self, human_loop_name: str) -> bool:
        """
        Check if human loop is complete

        Args:
            human_loop_name: Human loop name

        Returns:
            True if complete, False otherwise
        """
        status = self.get_human_loop_status(human_loop_name)
        return status.status in ['Completed', 'Failed', 'Stopped']

    def wait_for_completion(
        self,
        human_loop_name: str,
        max_wait_time_seconds: int = 3600,
        poll_interval_seconds: int = 30
    ) -> HumanLoopResponse:
        """
        Wait for human loop completion

        Args:
            human_loop_name: Human loop name
            max_wait_time_seconds: Maximum wait time (default: 1 hour)
            poll_interval_seconds: Polling interval (default: 30 seconds)

        Returns:
            HumanLoopResponse when complete

        Raises:
            Exception if timeout or loop fails
        """
        start_time = time.time()

        while time.time() - start_time < max_wait_time_seconds:
            status = self.get_human_loop_status(human_loop_name)

            if status.status == 'Completed':
                print(f"Human loop completed: {human_loop_name}")
                return status
            elif status.status in ['Failed', 'Stopped']:
                raise Exception(f"Human loop {status.status.lower()}: {human_loop_name}")

            # Wait before polling again
            time.sleep(poll_interval_seconds)

        raise Exception(f"Human loop timed out after {max_wait_time_seconds}s: {human_loop_name}")
