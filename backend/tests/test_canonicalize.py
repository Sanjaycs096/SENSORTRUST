"""
SensorTrust — Cryptographic Canonicalization & SHA-256 Tests
Verifies RFC 8785 JSON Canonicalization Scheme (JCS) determinism,
number formatting, Unicode encoding, and cross-language parity with TypeScript.
"""

import pytest
from app.core.canonicalize import (
    canonicalize_json,
    compute_sha256_hex,
    canonicalize_observation,
    compute_observation_digest
)
from app.services.seed_service import SEED_DATA


def test_canonical_json_key_order_determinism():
    """Verify that dictionary key insertion order does not affect the canonical output string."""
    obj_a = {
        "b": 2,
        "a": 1,
        "nested": {"z": 10, "m": 5}
    }
    obj_b = {
        "nested": {"m": 5, "z": 10},
        "a": 1,
        "b": 2
    }

    canon_a = canonicalize_json(obj_a)
    canon_b = canonicalize_json(obj_b)

    assert canon_a == canon_b
    assert canon_a == '{"a":1,"b":2,"nested":{"m":5,"z":10}}'

    hash_a = compute_sha256_hex(canon_a)
    hash_b = compute_sha256_hex(canon_b)
    assert hash_a == hash_b
    assert hash_a.startswith("0x")
    assert len(hash_a) == 66  # "0x" + 64 hex characters


def test_ecmascript_number_formatting():
    """Verify numbers follow ECMAScript standard per RFC 8785 (integers without decimal, floats without trailing zeros)."""
    data = {
        "int_val": 42,
        "float_zero_decimal": 42.0,
        "float_decimal": 24.2,
        "float_coord": 77.3
    }
    canon = canonicalize_json(data)
    assert '"float_zero_decimal":42' in canon
    assert '"int_val":42' in canon
    assert '"float_decimal":24.2' in canon
    assert '"float_coord":77.3' in canon


def test_unicode_and_special_character_handling():
    """Verify Unicode strings are preserved in UTF-8 per RFC 8785 without ASCII escapes."""
    data = {
        "city": "दिल्ली",  # Delhi in Devanagari
        "quote": 'Clean "Air" Protocol',
        "symbol": "µg/m³"
    }
    canon = canonicalize_json(data)
    assert '"city":"दिल्ली"' in canon
    assert '"symbol":"µg/m³"' in canon
    assert r'\"Air\"' in canon


def test_cross_language_parity_on_seed_dataset():
    """
    Critical integrity test:
    Verify that all 5 seed observations produce the exact same canonical JSON
    and SHA-256 digests in Python as calculated by the TypeScript engine.
    """
    expected_digests = {
        "urn:uuid:7c9e6679-7425-40de-944b-e07fc1f90ae7": "0x8c045e60a5c9a5947f52546a6d833d7b51972e4242dc1593869d459dfe6baf16",
        "urn:uuid:f48a1290-b384-48ac-9457-36209bcae812": "0x170ed5395fb9ea9026af8a107c06c2f1a085d107469d87d79af4bc0491fcf799",
        "urn:uuid:3b9944a1-098e-4a6c-9477-d4fa4c882190": "0xef449689eaec7a74008582803cdf3afbfec1038a4dbf0ed92ae0808fbe6041ee",
        "urn:uuid:8a1c9201-3829-41fa-8910-c09a827419ef": "0x9328c086eee7ad18d765ab2a2a063eb764efe2a190a1c889b68c64ccd07977e6",
        "urn:uuid:91823746-1290-4820-bca1-748291038472": "0x96e96293c9d41361f8434a1552b34ed94aceae385f6a672eba40d1c0464010fa",
    }

    for item in SEED_DATA:
        obs_payload = item["observation"]
        obs_id = obs_payload["observationId"]
        python_digest = compute_observation_digest(obs_payload)
        expected = expected_digests[obs_id]

        assert python_digest == expected, (
            f"Digest mismatch for observation {obs_id}:\n"
            f"Computed: {python_digest}\n"
            f"Expected: {expected}"
        )


def test_tamper_detection_in_digest():
    """Verify that even a minimal 0.1 delta in measurement alters the digest completely."""
    base_payload = SEED_DATA[0]["observation"].copy()
    digest_original = compute_observation_digest(base_payload)

    tampered_payload = dict(base_payload)
    tampered_payload["value"] = tampered_payload["value"] + 0.1
    digest_tampered = compute_observation_digest(tampered_payload)

    assert digest_original != digest_tampered
