import contextlib
import io
import json
import os
import subprocess
import sys
import tempfile
import threading
import unittest
import urllib.request
from pathlib import Path

from cellar.cli import EXIT_FAIL, EXIT_INVALID, EXIT_OK, main

ROOT = Path(__file__).resolve().parent.parent

CONFIG = {
    "integrations": [
        {"id": "inventory-report", "required": ["order_id", "sku"]},
        {"id": "finance-summary", "required": ["total_cents", "currency"]},
    ]
}


class CellarTestCase(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.dir = Path(self._tmp.name)
        self.config = self.write_config(CONFIG)

    def write_config(self, data, name="cellar.json"):
        path = self.dir / name
        path.write_text(json.dumps(data), encoding="utf-8")
        return path

    def write_csv(self, content, name="export.csv"):
        path = self.dir / name
        path.write_bytes(content if isinstance(content, bytes) else content.encode("utf-8"))
        return path

    def run_check(self, csv_path, config=None, extra=None, env=None):
        argv = ["check", "--config", str(config or self.config), "--csv", str(csv_path)] + (extra or [])
        out, err = io.StringIO(), io.StringIO()
        old_env = dict(os.environ)
        os.environ.update(env or {})
        try:
            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
                code = main(argv)
        finally:
            os.environ.clear()
            os.environ.update(old_env)
        return code, out.getvalue(), err.getvalue()


class HeaderRulesTests(CellarTestCase):
    def test_passing_export(self):
        code, out, _ = self.run_check(self.write_csv("order_id,sku,total_cents,currency\nA1,X,100,USD\n"))
        self.assertEqual(code, EXIT_OK)
        self.assertIn("PASS  inventory-report satisfies its declared requirements", out)
        self.assertIn("PASS  finance-summary satisfies its declared requirements", out)

    def test_renamed_column_fails_only_the_affected_integration(self):
        code, out, _ = self.run_check(self.write_csv("id,sku,total_cents,currency\n"))
        self.assertEqual(code, EXIT_FAIL)
        self.assertIn("FAIL  inventory-report requires order_id", out)
        self.assertIn("PASS  finance-summary satisfies its declared requirements", out)

    def test_missing_fields_across_several_integrations(self):
        code, out, _ = self.run_check(self.write_csv("sku,currency\n"))
        self.assertEqual(code, EXIT_FAIL)
        self.assertIn("FAIL  inventory-report requires order_id", out)
        self.assertIn("FAIL  finance-summary requires total_cents", out)

    def test_several_missing_columns_in_one_integration(self):
        code, out, _ = self.run_check(self.write_csv("total_cents,currency\n"))
        self.assertEqual(code, EXIT_FAIL)
        self.assertIn("FAIL  inventory-report requires order_id, sku", out)

    def test_extra_and_reordered_columns_pass(self):
        code, _, _ = self.run_check(self.write_csv("notes,currency,sku,total_cents,region,order_id\n"))
        self.assertEqual(code, EXIT_OK)

    def test_quoted_headers_pass(self):
        code, _, _ = self.run_check(self.write_csv('"order_id","sku","total_cents","currency"\n'))
        self.assertEqual(code, EXIT_OK)

    def test_names_match_exactly_including_case_and_spaces(self):
        code, out, _ = self.run_check(self.write_csv("Order_ID, sku,total_cents,currency\n"))
        self.assertEqual(code, EXIT_FAIL)
        self.assertIn("FAIL  inventory-report requires order_id, sku", out)

    def test_byte_order_mark_is_accepted(self):
        code, _, _ = self.run_check(self.write_csv(b"\xef\xbb\xbforder_id,sku,total_cents,currency\n"))
        self.assertEqual(code, EXIT_OK)

    def test_header_without_trailing_newline(self):
        code, _, _ = self.run_check(self.write_csv("order_id,sku,total_cents,currency"))
        self.assertEqual(code, EXIT_OK)


class InvalidInputTests(CellarTestCase):
    def assert_invalid(self, csv_path, fragment, config=None):
        code, out, err = self.run_check(csv_path, config=config)
        self.assertEqual(code, EXIT_INVALID)
        self.assertEqual(out, "")
        self.assertIn(fragment, err)

    def test_empty_file(self):
        self.assert_invalid(self.write_csv(""), "is empty")

    def test_blank_first_line(self):
        self.assert_invalid(self.write_csv("\norder_id,sku\n"), "is blank")

    def test_blank_header_name(self):
        self.assert_invalid(self.write_csv("order_id,,sku\n"), "blank header name in column 2")

    def test_duplicate_headers(self):
        self.assert_invalid(self.write_csv("order_id,sku,sku\n"), "duplicate header names: sku")

    def test_invalid_encoding(self):
        self.assert_invalid(self.write_csv(b"order_id,sku,\xff\xfe\n"), "not valid UTF-8")

    def test_missing_csv_file(self):
        self.assert_invalid(self.dir / "nope.csv", "not found")

    def test_missing_config_file(self):
        csv_path = self.write_csv("order_id,sku\n")
        self.assert_invalid(csv_path, "Config file not found", config=self.dir / "nope.json")

    def test_config_is_not_json(self):
        bad = self.dir / "bad.json"
        bad.write_text("{not json", encoding="utf-8")
        self.assert_invalid(self.write_csv("order_id\n"), "not valid JSON", config=bad)

    def test_invalid_configs(self):
        cases = {
            "no integrations key": ({}, '"integrations" list'),
            "empty integrations": ({"integrations": []}, "at least one integration"),
            "integration not an object": ({"integrations": ["x"]}, "must be an object"),
            "missing id": ({"integrations": [{"required": ["a"]}]}, 'non-empty string "id"'),
            "blank id": ({"integrations": [{"id": " ", "required": ["a"]}]}, 'non-empty string "id"'),
            "duplicate ids": (
                {"integrations": [{"id": "x", "required": ["a"]}, {"id": "x", "required": ["b"]}]},
                "duplicate integration id",
            ),
            "no required": ({"integrations": [{"id": "x"}]}, '"required" list'),
            "empty required": ({"integrations": [{"id": "x", "required": []}]}, '"required" list'),
            "blank column name": ({"integrations": [{"id": "x", "required": [""]}]}, "blank or non-string"),
            "non-string column name": ({"integrations": [{"id": "x", "required": [5]}]}, "blank or non-string"),
        }
        csv_path = self.write_csv("a,b\n")
        for label, (data, fragment) in cases.items():
            with self.subTest(label):
                self.assert_invalid(csv_path, fragment, config=self.write_config(data, "case.json"))


class OutputTests(CellarTestCase):
    def test_output_omits_cell_values(self):
        csv_path = self.write_csv("order_id,sku,total_cents,currency\nSECRET-123,X,100,USD\n")
        _, out, err = self.run_check(csv_path)
        self.assertNotIn("SECRET-123", out + err)

    def test_output_is_deterministic(self):
        csv_path = self.write_csv("id,sku\n")
        self.assertEqual(self.run_check(csv_path), self.run_check(csv_path))

    def test_summary_is_written_for_results(self):
        summary = self.dir / "summary.md"
        csv_path = self.write_csv("id,sku,total_cents,currency\n")
        code, _, _ = self.run_check(csv_path, extra=["--summary"], env={"GITHUB_STEP_SUMMARY": str(summary)})
        self.assertEqual(code, EXIT_FAIL)
        text = summary.read_text(encoding="utf-8")
        self.assertIn("| ❌ FAIL | inventory-report | Missing `order_id` |", text)
        self.assertIn("| ✅ PASS | finance-summary |", text)

    def test_summary_is_written_when_the_check_cannot_run(self):
        summary = self.dir / "summary.md"
        code, _, _ = self.run_check(
            self.write_csv(""), extra=["--summary"], env={"GITHUB_STEP_SUMMARY": str(summary)}
        )
        self.assertEqual(code, EXIT_INVALID)
        self.assertIn("could not run", summary.read_text(encoding="utf-8"))

    def test_no_summary_without_the_flag(self):
        summary = self.dir / "summary.md"
        self.run_check(self.write_csv("a\n"), env={"GITHUB_STEP_SUMMARY": str(summary)})
        self.assertFalse(summary.exists())


class ExampleExporterTests(CellarTestCase):
    def export(self, *flags):
        out = self.dir / "sales_export.csv"
        subprocess.run(
            [sys.executable, str(ROOT / "examples" / "sales_exporter.py"), "--out", str(out), *flags],
            check=True, capture_output=True,
        )
        return out

    def test_shipped_contracts_pass_for_the_example_exporter(self):
        code, _, _ = self.run_check(self.export(), config=ROOT / "cellar.json")
        self.assertEqual(code, EXIT_OK)

    def test_demo_break_is_caught(self):
        code, out, _ = self.run_check(self.export("--demo-break"), config=ROOT / "cellar.json")
        self.assertEqual(code, EXIT_FAIL)
        self.assertIn("FAIL  inventory-report requires order_id", out)
        self.assertIn("PASS  finance-summary satisfies its declared requirements", out)

    def test_exporter_is_deterministic(self):
        first = self.export().read_bytes()
        self.assertEqual(first, self.export().read_bytes())



class DashboardTests(CellarTestCase):
    def setUp(self):
        super().setUp()
        from cellar.server import make_server
        self.server = make_server(self.config, 0)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.base = f"http://127.0.0.1:{self.server.server_address[1]}"
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)

    def post(self, path, body):
        req = urllib.request.Request(self.base + path, json.dumps(body).encode(), method="POST")
        try:
            with urllib.request.urlopen(req) as resp:
                return resp.status, json.load(resp)
        except urllib.error.HTTPError as err:
            return err.code, json.load(err)

    def test_page_and_config_load(self):
        self.assertIn(b"Check a CSV", urllib.request.urlopen(self.base + "/").read())
        self.assertEqual(json.load(urllib.request.urlopen(self.base + "/api/config"))["config"], CONFIG)

    def test_check_endpoint_reports_the_rename(self):
        status, data = self.post("/api/check", {"csv": "id,sku,total_cents,currency\n", "config": CONFIG})
        self.assertEqual(status, 200)
        self.assertEqual([r["passed"] for r in data["results"]], [False, True])

    def test_check_endpoint_rejects_bad_input(self):
        self.assertEqual(self.post("/api/check", {"csv": "", "config": CONFIG})[0], 400)

    def test_save_config_round_trip(self):
        new = {"integrations": [{"id": "x", "required": ["a"]}]}
        self.assertEqual(self.post("/api/config", {"config": new})[0], 200)
        self.assertEqual(json.loads(self.config.read_text()), new)
        self.assertEqual(self.post("/api/config", {"config": {"integrations": []}})[0], 400)


class JsonFormatTests(CellarTestCase):
    def test_json_output(self):
        code, out, _ = self.run_check(self.write_csv("id,sku\n"), extra=["--format", "json"])
        data = json.loads(out)
        self.assertEqual((code, data["passed"], data["results"][0]["missing"]), (EXIT_FAIL, False, ["order_id"]))


if __name__ == "__main__":
    unittest.main()
