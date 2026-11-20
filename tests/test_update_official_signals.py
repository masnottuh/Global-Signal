import json
import sys
import unittest
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from update_official_signals import (  # noqa: E402
    build_board,
    format_board_unit_label,
    parse_dol_us_claims,
    parse_fed_h10_broad_dollar,
    parse_treasury_yield_curve,
)

FIXTURES = Path(__file__).resolve().parent / "fixtures"


def _raw() -> dict[str, str]:
    return {
        "treasury_yield_curve": (FIXTURES / "treasury_yield_curve.csv").read_text(),
        "dol_us_claims": (FIXTURES / "dol_us_claims.csv").read_text(),
        "fed_h10": (FIXTURES / "fed_h10_broad_dollar.csv").read_text(),
    }


class ParseTests(unittest.TestCase):
    def test_treasury_spreads(self):
        sig = parse_treasury_yield_curve(_raw()["treasury_yield_curve"])
        self.assertEqual(sig["as_of"], "2026-11-19")
        self.assertEqual(sig["y10y"], 5.04)
        self.assertEqual(sig["spread_10y_3m"], 0.70)
        self.assertEqual(sig["spread_10y_2y"], 0.28)
        self.assertEqual(sig["shape_10y_3m"], "upward-sloping")
        self.assertEqual(sig["status"], "ok")

    def test_claims_converts_thousands_and_skips_incomplete(self):
        sig = parse_dol_us_claims(_raw()["dol_us_claims"])
        self.assertEqual(sig["as_of"], "2026-11-07")
        self.assertEqual(sig["sa_initial_claims"], 202_000)
        self.assertEqual(sig["sa_initial_claims_4w_avg"], 195_750)
        self.assertEqual(sig["prior_week_sa_initial_claims"], 191_000)
        self.assertEqual(sig["sa_initial_wow"], 11_000)

    def test_h10_skips_nd_and_reads_unit(self):
        sig = parse_fed_h10_broad_dollar(_raw()["fed_h10"])
        self.assertEqual(sig["as_of"], "2026-11-13")
        self.assertEqual(sig["index"], 122.6503)
        self.assertEqual(sig["unit"], "Jan 1997=100")

    def test_unit_labels(self):
        self.assertEqual(format_board_unit_label("Index:_2017_100"), "2017=100")
        self.assertEqual(format_board_unit_label("Index:_2022_100"), "2022=100")
        self.assertEqual(format_board_unit_label("Index:_1997_Jan_100"), "Jan 1997=100")


class FallbackTests(unittest.TestCase):
    def test_fresh_board_from_local_files(self):
        board = build_board(
            previous={},
            retrieved_at=datetime(2026, 11, 20, 16, 0, 0),
            raw=_raw(),
            fetch=False,
        )
        self.assertEqual(board["signals"]["treasury_yield_curve"]["status"], "ok")
        self.assertEqual(board["signals"]["jobless_claims"]["sa_initial_claims"], 202_000)
        self.assertEqual(board["signals"]["broad_dollar"]["index"], 122.6503)
        self.assertFalse(board["refresh_errors"])

    def test_keeps_last_good_values_when_a_source_fails(self):
        previous = build_board(
            previous={},
            retrieved_at=datetime(2026, 11, 20, 16, 0, 0),
            raw=_raw(),
            fetch=False,
        )
        raw = _raw()
        raw["dol_us_claims"] = None  # simulate a 403 / missing download
        board = build_board(
            previous=previous,
            retrieved_at=datetime(2026, 11, 21, 16, 0, 0),
            raw=raw,
            fetch=False,
        )
        claims = board["signals"]["jobless_claims"]
        self.assertEqual(claims["status"], "cached")
        self.assertEqual(claims["as_of"], "2026-11-07")
        self.assertEqual(claims["sa_initial_claims"], 202_000)
        self.assertIn("jobless_claims", board["refresh_errors"])
        self.assertTrue(board["refresh_errors"]["jobless_claims"])
        # others still refresh
        self.assertEqual(board["signals"]["treasury_yield_curve"]["status"], "ok")
        self.assertIn("no value was invented", claims["cache_note"].lower())

    def test_does_not_invent_values_without_a_cache(self):
        board = build_board(
            previous={},
            retrieved_at=datetime(2026, 11, 20, 16, 0, 0),
            raw={"treasury_yield_curve": None, "dol_us_claims": None, "fed_h10": None},
            fetch=False,
        )
        for sig in board["signals"].values():
            self.assertEqual(sig["status"], "unavailable")
            self.assertIsNone(sig["as_of"])
            self.assertIn("No value was invented", sig["note"])

    def test_cli_writes_json(self, tmp_name="official-signals.json"):
        import tempfile
        from update_official_signals import main

        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / tmp_name
            rc = main(["--out", str(out), "--raw-dir", str(FIXTURES)])
            self.assertEqual(rc, 0)
            data = json.loads(out.read_text())
            self.assertEqual(data["signals"]["broad_dollar"]["as_of"], "2026-11-13")


if __name__ == "__main__":
    unittest.main()
