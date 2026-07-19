import pytest

from nightmarenet.utils.tracking import ExperimentTracker


def test_mlflow_tracker_basic(tmp_path):
    # Use local file backend for mlflow
    mlruns_dir = tmp_path / "mlruns"
    tracking_uri = f"file://{mlruns_dir}"

    config = {
        "tracking": {"backend": "mlflow", "tracking_uri": tracking_uri, "experiment": "TestMLflow"}
    }

    tracker = ExperimentTracker(
        backend="mlflow",
        project="TestMLflow",
        config=config,
    )

    # Check if mlflow is installed (soft-skip if not)
    if tracker.backend == "none":
        pytest.skip("mlflow is not installed")

    # Log params
    tracker.log_config({"training": {"learning_rate": 0.001, "batch_size": 32}})

    # Log metrics
    tracker.log_metrics({"loss": 0.5, "accuracy": 0.9})

    # Log artifact
    artifact_file = tmp_path / "test_artifact.txt"
    artifact_file.write_text("hello world")
    tracker.log_artifact(str(artifact_file))

    # Finish run
    tracker.finish()

    # Verify using mlflow API
    import mlflow

    client = mlflow.tracking.MlflowClient(tracking_uri=tracking_uri)
    experiment = client.get_experiment_by_name("TestMLflow")
    assert experiment is not None

    runs = client.search_runs([experiment.experiment_id])
    assert len(runs) == 1

    run = runs[0]

    assert run.data.params.get("training/learning_rate") == "0.001"
    assert run.data.params.get("training/batch_size") == "32"

    assert float(run.data.metrics.get("loss")) == 0.5
    assert float(run.data.metrics.get("accuracy")) == 0.9
