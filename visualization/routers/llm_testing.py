"""
AIOBS LLM Testing API
Real-time LLM testing, benchmarking, and evaluation endpoints
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from ..services.llm_testing_service import (
    get_llm_testing_service,
    LLMTestCase,
    LLMTestResult,
    TestCategory,
    TestDifficulty,
    TestStatus,
    ProviderConfig,
    TestRunProgress,
    TestRunSummary,
    LiveTestEvent,
)

router = APIRouter(prefix="/api/llm-testing", tags=["llm-testing"])
logger = logging.getLogger("aiobs.llm_testing")


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================


class ProviderConfigRequest(BaseModel):
    """Provider configuration request"""
    name: str = Field(..., description="Provider display name")
    provider: str = Field(..., description="Provider type (openai, anthropic, mistral, mock)")
    model: str = Field(..., description="Model name")
    api_key: Optional[str] = Field(None, description="API key (optional, uses env var if not provided)")
    base_url: Optional[str] = Field(None, description="Custom base URL")
    max_tokens: int = Field(2048, description="Maximum tokens")
    temperature: float = Field(0.7, description="Temperature (0-1)")
    timeout: float = Field(60.0, description="Request timeout in seconds")


class SingleTestRequest(BaseModel):
    """Request to run a single test"""
    prompt: str = Field(..., min_length=1, max_length=10000, description="Test prompt")
    expected_behavior: Optional[str] = Field(None, description="Expected behavior description")
    ground_truth: Optional[str] = Field(None, description="Expected answer for verification")
    category: str = Field("accuracy", description="Test category")
    provider: ProviderConfigRequest = Field(..., description="Provider configuration")


class TestSuiteRunRequest(BaseModel):
    """Request to run a test suite"""
    suite_id: str = Field(..., description="Test suite ID")
    providers: List[ProviderConfigRequest] = Field(..., min_length=1, description="Providers to test")


class CustomTestCaseRequest(BaseModel):
    """Request to create a custom test case"""
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field("", max_length=1000)
    prompt: str = Field(..., min_length=1, max_length=10000)
    expected_behavior: Optional[str] = None
    ground_truth: Optional[str] = None
    category: str = "accuracy"
    tags: List[str] = []
    difficulty: str = "medium"
    timeout: int = 30000


class TestResultResponse(BaseModel):
    """Test result response"""
    test_id: str
    test_name: str
    category: str
    status: str
    score: float
    duration: float
    response_content: str
    model: str
    provider: str
    insights: List[str]
    suggestions: List[str]
    issues: List[Dict[str, Any]]
    metrics: Dict[str, Any]


class TestRunResponse(BaseModel):
    """Test run response"""
    run_id: str
    suite_name: str
    status: str
    progress: Dict[str, Any]
    summary: Dict[str, Any]
    results: List[TestResultResponse]
    start_time: str
    end_time: Optional[str]


class TestSuiteInfo(BaseModel):
    """Test suite information"""
    id: str
    name: str
    description: str
    test_count: int
    categories: List[str]


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


def _convert_provider_config(config: ProviderConfigRequest) -> ProviderConfig:
    """Convert request config to service config"""
    return ProviderConfig(
        name=config.name,
        provider=config.provider,
        model=config.model,
        api_key=config.api_key,
        base_url=config.base_url,
        max_tokens=config.max_tokens,
        temperature=config.temperature,
        timeout=config.timeout,
    )


def _result_to_response(result: LLMTestResult) -> TestResultResponse:
    """Convert test result to response model"""
    return TestResultResponse(
        test_id=result.test_id,
        test_name=result.test_name,
        category=result.category.value,
        status=result.status.value,
        score=result.score,
        duration=result.duration,
        response_content=result.response.content,
        model=result.response.model,
        provider=result.response.provider,
        insights=result.analysis.insights,
        suggestions=result.analysis.suggestions,
        issues=[
            {
                "type": issue.issue_type.value,
                "severity": issue.severity.value,
                "description": issue.description,
                "recommendation": issue.recommendation,
            }
            for issue in result.analysis.detected_issues
        ],
        metrics={
            "latency": {
                "total_ms": result.metrics.latency.total_ms,
                "time_to_first_token": result.metrics.latency.time_to_first_token,
                "tokens_per_second": result.metrics.latency.tokens_per_second,
            },
            "quality": {
                "accuracy": result.metrics.quality.accuracy,
                "relevance": result.metrics.quality.relevance,
                "coherence": result.metrics.quality.coherence,
                "completeness": result.metrics.quality.completeness,
            },
            "cost": {
                "input_tokens": result.metrics.cost.input_tokens,
                "output_tokens": result.metrics.cost.output_tokens,
                "estimated_cost": result.metrics.cost.estimated_cost,
            },
            "safety": {
                "toxicity_score": result.metrics.safety.toxicity_score,
                "bias_score": result.metrics.safety.bias_score,
                "harmfulness_score": result.metrics.safety.harmfulness_score,
            },
        },
    )


# =============================================================================
# TEST SUITE ENDPOINTS
# =============================================================================


@router.get("/suites", response_model=List[TestSuiteInfo])
async def get_test_suites():
    """
    Get all available test suites

    Returns a list of test suites with their metadata including:
    - Suite ID, name, and description
    - Number of tests
    - Categories covered
    """
    service = get_llm_testing_service()
    suites = service.get_available_suites()

    return [
        TestSuiteInfo(
            id=s["id"],
            name=s["name"],
            description=s["description"],
            test_count=s["test_count"],
            categories=s["categories"],
        )
        for s in suites
    ]


@router.get("/suites/{suite_id}")
async def get_test_suite(suite_id: str):
    """
    Get details of a specific test suite

    Returns complete suite information including all test cases
    """
    service = get_llm_testing_service()
    suite = service.get_suite(suite_id)

    if not suite:
        raise HTTPException(status_code=404, detail=f"Test suite not found: {suite_id}")

    return {
        "success": True,
        "data": {
            "id": suite.id,
            "name": suite.name,
            "description": suite.description,
            "config": {
                "parallel_execution": suite.config.parallel_execution,
                "max_concurrent": suite.config.max_concurrent,
                "retry_on_failure": suite.config.retry_on_failure,
                "stop_on_first_failure": suite.config.stop_on_first_failure,
                "timeout_ms": suite.config.timeout_ms,
            },
            "tests": [
                {
                    "id": t.id,
                    "name": t.name,
                    "category": t.category.value,
                    "description": t.description,
                    "difficulty": t.difficulty.value,
                    "tags": t.tags,
                    "timeout": t.timeout,
                }
                for t in suite.tests
            ],
            "created_at": suite.created_at.isoformat(),
            "updated_at": suite.updated_at.isoformat(),
        },
    }


@router.get("/categories")
async def get_test_categories():
    """
    Get all available test categories with descriptions
    """
    categories = [
        {"id": "accuracy", "name": "Accuracy & Factuality", "description": "Tests factual correctness"},
        {"id": "hallucination", "name": "Hallucination Detection", "description": "Tests for fabricated information"},
        {"id": "security", "name": "Security & Adversarial", "description": "Tests security vulnerabilities"},
        {"id": "reasoning", "name": "Reasoning & Logic", "description": "Tests logical capabilities"},
        {"id": "consistency", "name": "Consistency", "description": "Tests response consistency"},
        {"id": "instruction_following", "name": "Instruction Following", "description": "Tests adherence to instructions"},
        {"id": "toxicity", "name": "Toxicity", "description": "Tests for harmful content"},
        {"id": "bias", "name": "Bias Detection", "description": "Tests for biased responses"},
        {"id": "latency", "name": "Latency & Performance", "description": "Tests response time"},
        {"id": "cost_efficiency", "name": "Cost Efficiency", "description": "Tests token usage efficiency"},
    ]

    return {"success": True, "data": categories}


# =============================================================================
# TEST EXECUTION ENDPOINTS
# =============================================================================


@router.post("/run/single", response_model=TestResultResponse)
async def run_single_test(request: SingleTestRequest):
    """
    Run a single ad-hoc test

    Execute a custom prompt against a specified provider and get detailed results.

    Example:
    ```json
    {
        "prompt": "What is the capital of France?",
        "ground_truth": "Paris",
        "category": "accuracy",
        "provider": {
            "name": "OpenAI GPT-4",
            "provider": "openai",
            "model": "gpt-4o-mini",
            "max_tokens": 1024,
            "temperature": 0.7
        }
    }
    ```
    """
    service = get_llm_testing_service()

    # Create test case
    test_case = LLMTestCase(
        id=f"adhoc-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        name="Ad-hoc Test",
        category=TestCategory(request.category),
        description="Ad-hoc test execution",
        prompt=request.prompt,
        expected_behavior=request.expected_behavior,
        ground_truth=request.ground_truth,
        tags=["adhoc"],
        difficulty=TestDifficulty.MEDIUM,
        timeout=30000,
    )

    # Convert provider config
    provider_config = _convert_provider_config(request.provider)

    # Execute test
    result = await service.execute_test(test_case, provider_config)

    return _result_to_response(result)


@router.post("/run/suite")
async def run_test_suite(request: TestSuiteRunRequest):
    """
    Run a complete test suite

    Execute all tests in a suite against one or more providers.
    Results are collected and summarized.

    Example:
    ```json
    {
        "suite_id": "security",
        "providers": [
            {
                "name": "GPT-4",
                "provider": "openai",
                "model": "gpt-4o",
                "max_tokens": 2048
            }
        ]
    }
    ```
    """
    service = get_llm_testing_service()

    # Convert provider configs
    providers = [_convert_provider_config(p) for p in request.providers]

    try:
        # Execute suite
        test_run = await service.execute_test_suite(request.suite_id, providers)

        return {
            "success": True,
            "data": {
                "run_id": test_run.id,
                "suite_name": test_run.suite_name,
                "status": test_run.status,
                "progress": {
                    "total": test_run.progress.total,
                    "completed": test_run.progress.completed,
                    "passed": test_run.progress.passed,
                    "failed": test_run.progress.failed,
                    "percent_complete": test_run.progress.percent_complete,
                },
                "summary": {
                    "total_tests": test_run.summary.total_tests,
                    "passed_tests": test_run.summary.passed_tests,
                    "failed_tests": test_run.summary.failed_tests,
                    "pass_rate": test_run.summary.pass_rate,
                    "average_score": test_run.summary.average_score,
                    "average_latency": test_run.summary.average_latency,
                    "total_cost": test_run.summary.total_cost,
                    "recommendations": test_run.summary.recommendations,
                },
                "results": [_result_to_response(r) for r in test_run.results],
                "start_time": test_run.start_time.isoformat(),
                "end_time": test_run.end_time.isoformat() if test_run.end_time else None,
            },
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Suite execution error: {e}")
        raise HTTPException(status_code=500, detail=f"Test execution failed: {str(e)}")


@router.post("/run/custom")
async def run_custom_tests(
    tests: List[CustomTestCaseRequest],
    providers: List[ProviderConfigRequest],
):
    """
    Run custom test cases

    Execute a list of custom test cases against specified providers.
    """
    service = get_llm_testing_service()

    # Convert test cases
    test_cases = []
    for i, t in enumerate(tests):
        try:
            category = TestCategory(t.category)
        except ValueError:
            category = TestCategory.ACCURACY

        try:
            difficulty = TestDifficulty(t.difficulty)
        except ValueError:
            difficulty = TestDifficulty.MEDIUM

        test_cases.append(LLMTestCase(
            id=f"custom-{i}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            name=t.name,
            category=category,
            description=t.description,
            prompt=t.prompt,
            expected_behavior=t.expected_behavior,
            ground_truth=t.ground_truth,
            tags=t.tags,
            difficulty=difficulty,
            timeout=t.timeout,
        ))

    # Convert provider configs
    provider_configs = [_convert_provider_config(p) for p in providers]

    # Execute tests
    results = []
    for test in test_cases:
        for provider in provider_configs:
            result = await service.execute_test(test, provider)
            results.append(_result_to_response(result))

    # Calculate summary
    passed = sum(1 for r in results if r.status == "passed")
    failed = sum(1 for r in results if r.status == "failed")
    total = len(results)

    return {
        "success": True,
        "data": {
            "summary": {
                "total": total,
                "passed": passed,
                "failed": failed,
                "pass_rate": passed / total if total > 0 else 0,
            },
            "results": results,
        },
    }


# =============================================================================
# ACTIVE RUNS MANAGEMENT
# =============================================================================


@router.get("/runs/active")
async def get_active_runs():
    """
    Get all currently active test runs
    """
    service = get_llm_testing_service()
    runs = service.get_active_runs()

    return {
        "success": True,
        "data": [
            {
                "run_id": run.id,
                "suite_name": run.suite_name,
                "status": run.status,
                "progress": {
                    "total": run.progress.total,
                    "completed": run.progress.completed,
                    "percent_complete": run.progress.percent_complete,
                    "current_test": run.progress.current_test,
                },
                "start_time": run.start_time.isoformat(),
            }
            for run in runs
        ],
    }


@router.post("/runs/{run_id}/cancel")
async def cancel_test_run(run_id: str):
    """
    Cancel an active test run
    """
    service = get_llm_testing_service()
    success = service.cancel_test_run(run_id)

    if not success:
        raise HTTPException(status_code=404, detail=f"Test run not found: {run_id}")

    return {"success": True, "message": f"Test run {run_id} cancelled"}


# =============================================================================
# WEBSOCKET FOR REAL-TIME STREAMING
# =============================================================================


@router.websocket("/stream")
async def stream_test_events(websocket: WebSocket):
    """
    WebSocket endpoint for real-time test event streaming

    Events are streamed as JSON messages with the following format:
    {
        "event_type": "test_started" | "test_completed" | "test_failed" | "suite_started" | "suite_completed" | "suite_progress",
        "timestamp": "ISO timestamp",
        "data": { ... event-specific data ... }
    }

    Send messages to start tests:
    {
        "action": "run_suite",
        "suite_id": "security",
        "providers": [{ "name": "GPT-4", "provider": "openai", "model": "gpt-4o" }]
    }

    Or run a single test:
    {
        "action": "run_single",
        "prompt": "What is 2+2?",
        "category": "accuracy",
        "provider": { "name": "GPT-4", "provider": "openai", "model": "gpt-4o" }
    }
    """
    await websocket.accept()

    service = get_llm_testing_service()
    event_queue: asyncio.Queue[LiveTestEvent] = asyncio.Queue()

    def event_handler(event: LiveTestEvent):
        event_queue.put_nowait(event)

    unsubscribe = service.on_event(event_handler)

    async def send_events():
        """Task to send events to client"""
        try:
            while True:
                event = await event_queue.get()
                await websocket.send_json({
                    "event_type": event.event_type,
                    "timestamp": event.timestamp.isoformat(),
                    "data": event.data,
                })
        except Exception as e:
            logger.error(f"Error sending event: {e}")

    async def receive_commands():
        """Task to receive commands from client"""
        try:
            while True:
                data = await websocket.receive_json()
                action = data.get("action")

                if action == "run_suite":
                    suite_id = data.get("suite_id")
                    providers_data = data.get("providers", [])

                    providers = [
                        ProviderConfig(
                            name=p.get("name", "Default"),
                            provider=p.get("provider", "mock"),
                            model=p.get("model", "mock-model"),
                            api_key=p.get("api_key"),
                            max_tokens=p.get("max_tokens", 2048),
                            temperature=p.get("temperature", 0.7),
                            timeout=p.get("timeout", 60.0),
                        )
                        for p in providers_data
                    ]

                    # Run suite in background
                    asyncio.create_task(
                        service.execute_test_suite(suite_id, providers)
                    )

                    await websocket.send_json({
                        "event_type": "command_accepted",
                        "timestamp": datetime.utcnow().isoformat(),
                        "data": {"action": "run_suite", "suite_id": suite_id},
                    })

                elif action == "run_single":
                    prompt = data.get("prompt")
                    category = data.get("category", "accuracy")
                    provider_data = data.get("provider", {})

                    test_case = LLMTestCase(
                        id=f"ws-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}",
                        name="WebSocket Test",
                        category=TestCategory(category),
                        description="Test via WebSocket",
                        prompt=prompt,
                        ground_truth=data.get("ground_truth"),
                        tags=["websocket"],
                        difficulty=TestDifficulty.MEDIUM,
                        timeout=30000,
                    )

                    provider = ProviderConfig(
                        name=provider_data.get("name", "Default"),
                        provider=provider_data.get("provider", "mock"),
                        model=provider_data.get("model", "mock-model"),
                        api_key=provider_data.get("api_key"),
                        max_tokens=provider_data.get("max_tokens", 2048),
                        temperature=provider_data.get("temperature", 0.7),
                        timeout=provider_data.get("timeout", 60.0),
                    )

                    # Run test in background
                    asyncio.create_task(
                        service.execute_test(test_case, provider)
                    )

                    await websocket.send_json({
                        "event_type": "command_accepted",
                        "timestamp": datetime.utcnow().isoformat(),
                        "data": {"action": "run_single"},
                    })

                elif action == "cancel":
                    run_id = data.get("run_id")
                    success = service.cancel_test_run(run_id)
                    await websocket.send_json({
                        "event_type": "cancel_result",
                        "timestamp": datetime.utcnow().isoformat(),
                        "data": {"run_id": run_id, "success": success},
                    })

        except WebSocketDisconnect:
            logger.info("WebSocket client disconnected")
        except Exception as e:
            logger.error(f"Error receiving command: {e}")

    try:
        # Run both tasks concurrently
        await asyncio.gather(
            send_events(),
            receive_commands(),
        )
    finally:
        unsubscribe()


# =============================================================================
# BENCHMARK ENDPOINTS
# =============================================================================


@router.get("/benchmarks/providers")
async def compare_providers():
    """
    Get provider comparison benchmarks

    Returns comparative metrics for different LLM providers
    """
    # Mock benchmark data for demonstration
    benchmarks = {
        "providers": [
            {
                "name": "OpenAI GPT-4o",
                "provider": "openai",
                "model": "gpt-4o",
                "metrics": {
                    "accuracy": 0.94,
                    "latency_p50": 450,
                    "latency_p95": 1200,
                    "cost_per_1k_tokens": 0.005,
                    "safety_score": 0.98,
                    "reliability": 0.99,
                },
            },
            {
                "name": "Anthropic Claude 3 Sonnet",
                "provider": "anthropic",
                "model": "claude-3-sonnet",
                "metrics": {
                    "accuracy": 0.92,
                    "latency_p50": 380,
                    "latency_p95": 980,
                    "cost_per_1k_tokens": 0.006,
                    "safety_score": 0.99,
                    "reliability": 0.98,
                },
            },
            {
                "name": "Mistral Large",
                "provider": "mistral",
                "model": "mistral-large",
                "metrics": {
                    "accuracy": 0.89,
                    "latency_p50": 320,
                    "latency_p95": 850,
                    "cost_per_1k_tokens": 0.008,
                    "safety_score": 0.95,
                    "reliability": 0.97,
                },
            },
        ],
        "updated_at": datetime.utcnow().isoformat(),
    }

    return {"success": True, "data": benchmarks}


@router.get("/benchmarks/trends")
async def get_benchmark_trends(
    provider: Optional[str] = None,
    days: int = 7,
):
    """
    Get benchmark trends over time

    Returns historical benchmark data for trend analysis
    """
    # Mock trend data
    import random
    from datetime import timedelta

    trends = []
    base_date = datetime.utcnow()

    for i in range(days):
        date = base_date - timedelta(days=i)
        trends.append({
            "date": date.strftime("%Y-%m-%d"),
            "accuracy": 0.90 + random.random() * 0.05,
            "latency_p50": 300 + random.random() * 200,
            "cost": 0.004 + random.random() * 0.002,
            "tests_run": random.randint(50, 200),
            "pass_rate": 0.85 + random.random() * 0.1,
        })

    return {
        "success": True,
        "data": {
            "provider": provider or "all",
            "days": days,
            "trends": sorted(trends, key=lambda x: x["date"]),
        },
    }


# =============================================================================
# HEALTH & STATUS
# =============================================================================


@router.get("/status")
async def get_testing_service_status():
    """
    Get the status of the LLM testing service
    """
    service = get_llm_testing_service()
    active_runs = service.get_active_runs()
    suites = service.get_available_suites()

    return {
        "success": True,
        "data": {
            "status": "online",
            "active_runs": len(active_runs),
            "available_suites": len(suites),
            "total_test_cases": sum(s["test_count"] for s in suites),
            "features": {
                "real_time_streaming": True,
                "multi_provider_support": True,
                "custom_tests": True,
                "benchmarking": True,
            },
        },
    }
