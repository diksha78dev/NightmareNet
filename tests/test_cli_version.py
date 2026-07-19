"""Tests for the `nightmarenet --version` CLI flag and verbosity flags."""

import pytest

from nightmarenet import __version__
from nightmarenet.cli import build_parser


def test_version_flag_exits_zero(capsys):
    parser = build_parser()

    with pytest.raises(SystemExit) as exc_info:
        parser.parse_args(["--version"])

    assert exc_info.value.code == 0


def test_version_flag_prints_installed_version(capsys):
    parser = build_parser()

    with pytest.raises(SystemExit):
        parser.parse_args(["--version"])

    captured = capsys.readouterr()
    assert __version__ in captured.out
    assert "nightmarenet" in captured.out


def test_verbose_flag_parses():
    parser = build_parser()
    args = parser.parse_args(["--verbose", "train", "--config", "test.yaml"])
    assert args.verbose is True
    assert args.quiet is False


def test_verbose_short_flag_parses():
    parser = build_parser()
    args = parser.parse_args(["-v", "train", "--config", "test.yaml"])
    assert args.verbose is True
    assert args.quiet is False


def test_quiet_flag_parses():
    parser = build_parser()
    args = parser.parse_args(["--quiet", "train", "--config", "test.yaml"])
    assert args.quiet is True
    assert args.verbose is False


def test_quiet_short_flag_parses():
    parser = build_parser()
    args = parser.parse_args(["-q", "train", "--config", "test.yaml"])
    assert args.quiet is True
    assert args.verbose is False


def test_default_verbosity():
    parser = build_parser()
    args = parser.parse_args(["train", "--config", "test.yaml"])
    assert args.verbose is False
    assert args.quiet is False


def test_verbose_and_quiet_mutually_exclusive():
    from nightmarenet.cli import main
    import sys
    from io import StringIO

    # Capture stderr
    old_stderr = sys.stderr
    sys.stderr = StringIO()

    result = main(["--verbose", "--quiet", "train", "--config", "test.yaml"])

    sys.stderr.seek(0)
    error_output = sys.stderr.read()
    sys.stderr = old_stderr

    assert result == 1
    assert "mutually exclusive" in error_output
