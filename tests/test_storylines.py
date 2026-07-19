"""Acceptance tests: the 4 storyline queries from the corpus content plan.

If these pass, ingestion + hybrid retrieval are demo-ready regardless of what
else is unfinished. Run with: python3 tests/test_storylines.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ingestion.pipeline import ingest_corpus
from retrieval.hybrid_search import hybrid_search

CORPUS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "corpus")

TEST_CASES = [
    {
        "query": "What's the full history and compliance status of V-204?",
        "expected_docs": [
            "insp_v204_jan2026_corrosion.docx",
            "wo_2026_0142_v204_corrosion_repair.xlsx",
            "permit_hotwork_v204_apr2026.docx",
            "incident_2026_0032_v204_nearmiss.docx",
            "compliance_oisd105_v204_audit.docx",
        ],
    },
    {
        "query": "Why did P-101 have a seal leak and was it resolved?",
        "expected_docs": [
            "wo_2026_0098_p101_seal_leak.xlsx",
            "insp_p101_seal_wear_mar2026.docx",
            "incident_2026_0019_p101_minor_spill.docx",
        ],
    },
    {
        "query": "Is there a recurring pattern in E-305's maintenance?",
        "expected_docs": [
            "wo_2026_0155_e305_fouling_cleaning.xlsx",
            "compliance_review_e305_efficiency.docx",
        ],
    },
    {
        "query": "Was there a maintenance decision that was never formally logged?",
        "expected_docs": [
            "email_thread_pl07_maintenance_delay.txt",
        ],
    },
]


def run_tests():
    print("Ingesting corpus...")
    kg, vs, _ = ingest_corpus(CORPUS_DIR)
    print(f"Ingested. {kg.summary()}\n")

    all_passed = True

    for case in TEST_CASES:
        query = case["query"]
        expected = set(case["expected_docs"])

        results, query_entities = hybrid_search(query, kg, vs, top_k=10)
        retrieved = {r["doc_id"] for r in results}

        hit = expected & retrieved
        missed = expected - retrieved
        passed = len(missed) == 0

        all_passed = all_passed and passed

        status = "PASS" if passed else "FAIL"
        print(f"[{status}] {query}")
        print(f"  Detected query entities: {query_entities}")
        print(f"  Retrieved ({len(retrieved)}): {sorted(retrieved)}")
        if missed:
            print(f"  MISSING expected docs: {sorted(missed)}")
        print()

    print("=" * 60)
    print("ALL TESTS PASSED" if all_passed else "SOME TESTS FAILED")
    return all_passed


if __name__ == "__main__":
    ok = run_tests()
    sys.exit(0 if ok else 1)
