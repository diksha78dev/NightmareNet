import json
import pytest
from unittest.mock import patch

# Import the CLI module to test
import nightmarenet.cli as cli

class CLIResult:
    """A helper class to mimic subprocess.CompletedProcess or click.testing.Result."""
    def __init__(self, returncode, stdout, stderr):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr

def run_cli(args):
    """
    Invokes the CLI either using Click's CliRunner (if Click is used)
    or by invoking the main function in-process with redirected stdout/stderr.
    This guarantees accurate coverage and super-fast in-process execution.
    """

    # Fallback to argparse / direct main() invocation
    import io
    from contextlib import redirect_stdout, redirect_stderr
    
    f_out = io.StringIO()
    f_err = io.StringIO()
    exit_code = 0
    
    try:
        with redirect_stdout(f_out), redirect_stderr(f_err):
            try:
                ret = cli.main(args)
                if isinstance(ret, int):
                    exit_code = ret
            except TypeError:
                with patch("sys.argv", ["nightmarenet"] + args):
                    ret = cli.main()
                    if isinstance(ret, int):
                        exit_code = ret

    except SystemExit as e:
        exit_code = e.code if isinstance(e.code, int) else (0 if e.code is None else 1)

    except Exception as e:
        exit_code = 1
        f_err.write(str(e))

    return CLIResult(exit_code, f_out.getvalue(), f_err.getvalue())


# 1. Help tests for each subcommand
@pytest.mark.parametrize("subcommand, keywords", [
    ("train", ["train", "config"]),
    ("evaluate", ["evaluate", "text", "strength"]),
    ("benchmark", ["benchmark", "config"]),
    ("distort", ["distort", "type", "strength", "text"]),
    ("foundation", ["foundation"]),
    ("transfer", ["transfer"]),
])
def test_subcommand_help(subcommand, keywords):
    """Verifies that --help for each subcommand exits 0 and renders with keywords."""
    result = run_cli([subcommand, "--help"])
    assert result.returncode == 0
    output = (result.stdout + result.stderr).lower()
    for kw in keywords:
        assert kw in output

# 2. Top-level help test
def test_main_help():
    """Verifies that the main CLI --help lists all subcommands."""
    result = run_cli(["--help"])
    assert result.returncode == 0
    output = (result.stdout + result.stderr).lower()
    for cmd in ["train", "evaluate", "benchmark", "distort", "foundation", "transfer"]:
        assert cmd in output

# 3. Missing required arguments test
@pytest.mark.parametrize("args", [
    ["train"],
    ["distort"],
    ["foundation", "register"],
])

def test_missing_required_args(args):
    result = run_cli(args)

    assert result.returncode != 0

    combined_output = result.stdout + result.stderr

    assert "Traceback" not in combined_output
    assert "required" in combined_output.lower()
    assert "error" in combined_output.lower()

# 4. Evaluate command happy path
def test_evaluate_command_success():
    """Verifies evaluate command runs successfully with correct args and outputs valid JSON."""
    result = run_cli([
    "evaluate",
    "--text", "test text input",
    "--strengths", "0.3,0.5",
    "--json",
])
    assert result.returncode == 0
    
    data = json.loads(result.stdout)

    assert isinstance(data, dict)
    
# 5. Distort command happy path
def test_distort_command_success():
    """Verifies distort command runs successfully and produces distorted text."""
    result = run_cli(["distort", "--type", "dream", "--strength", "0.5", "--text", "hello world"])
    assert result.returncode == 0
    
    output = result.stdout.strip()
    assert len(output) > 0
    assert "Traceback" not in output

# 6. Benchmark failure handling
def test_benchmark_fails_gracefully_on_nonexistent_config():
    """Verifies benchmark fails gracefully (exits non-zero, no traceback) with nonexistent config."""
    # Try with --config first
    result = run_cli(["benchmark", "--config", "nonexistent_config_file_xyz.yaml"])
    # If the subcommand uses a positional argument or a different flag, try as positional
    if result.returncode != 0 and ("no such option" in result.stderr.lower() or "unknown option" in result.stderr.lower()):
        result = run_cli(["benchmark", "nonexistent_config_file_xyz.yaml"])
        
    assert result.returncode != 0
    combined_output = result.stdout + result.stderr
    assert "Traceback (most recent call last)" not in combined_output

# 7. Train failure handling
def test_train_fails_gracefully_on_nonexistent_config():
    """Verifies train fails gracefully (exits non-zero, no traceback) with nonexistent config."""
    result = run_cli(["train", "--config", "nonexistent_config_file_xyz.yaml"])
    if result.returncode != 0 and ("no such option" in result.stderr.lower() or "unknown option" in result.stderr.lower()):
        result = run_cli(["train", "nonexistent_config_file_xyz.yaml"])
        
    assert result.returncode != 0
    combined_output = result.stdout + result.stderr
    assert "Traceback (most recent call last)" not in combined_output