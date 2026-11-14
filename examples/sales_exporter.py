"""A tiny sales exporter that stands in for your real one.

It writes a CSV from synthetic seed data, so the check never touches real
customer data. Run it with --demo-break to simulate the pull request that
renames order_id to id.
"""

import argparse
import csv
import random
from pathlib import Path

COLUMNS = ["order_id", "sku", "total_cents", "currency"]


def synthetic_rows(seed: int = 1234, count: int = 5):
    rng = random.Random(seed)
    skus = ["MUG-01", "TEE-02", "CAP-03", "BAG-04"]
    for number in range(1, count + 1):
        yield [f"ORD-{number:04d}", rng.choice(skus), rng.randrange(500, 9000), "USD"]


def export(path: Path, demo_break: bool = False) -> None:
    columns = ["id" if (demo_break and name == "order_id") else name for name in COLUMNS]
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(columns)
        writer.writerows(synthetic_rows())


def main() -> None:
    parser = argparse.ArgumentParser(description="Write a synthetic sales export.")
    parser.add_argument("--out", default="build/sales_export.csv")
    parser.add_argument("--demo-break", action="store_true", help="rename order_id to id")
    args = parser.parse_args()
    export(Path(args.out), demo_break=args.demo_break)
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
