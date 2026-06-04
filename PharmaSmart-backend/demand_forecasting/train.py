"""
Standalone training script.

Run from the demand_forecasting/ directory:
    python train.py
    python train.py --no-evaluate
    python train.py --test-days 60
"""

from __future__ import annotations

import argparse
from pathlib import Path

from forecasting.pipeline import run_pipeline


def main():
    parser = argparse.ArgumentParser(description="Train PharmaSmart forecasting models")
    parser.add_argument(
        "--no-evaluate",
        action="store_true",
        help="Skip evaluation (faster)",
    )
    parser.add_argument(
        "--test-days",
        type=int,
        default=30,
        help="Number of days to hold out for evaluation (default: 30)",
    )
    args = parser.parse_args()

    run_pipeline(evaluate=not args.no_evaluate, test_days=args.test_days)


if __name__ == "__main__":
    main()
