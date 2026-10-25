"""
SensorTrust — Deterministic Canonical Serializer and Hasher (RFC 8785)
Guarantees that any independent party produces the exact same cryptographic hash
from an observation or review record regardless of whitespace or key ordering.
Cross-language parity with TypeScript src/core/canonicalize.ts.
"""

import json
import hashlib
import math
from typing import Any, Dict


def canonicalize_json(obj: Any, omit_none: bool = False) -> str:
    """
    Deterministically serializes an arbitrary JSON-compatible object
    strictly conforming to RFC 8785 (JSON Canonicalization Scheme - JCS)
    and TypeScript canonicalizeJson().

    Rules:
    1. Null: serialized as "null"
    2. Booleans: serialized as "true" or "false"
    3. Numbers: ECMAScript-compliant formatting:
       - Integers formatted without trailing decimals (e.g. 42 -> "42")
       - Floats with zero fractional component format as integer (e.g. 42.0 -> "42")
       - Floats format without trailing zeros (e.g. 77.30 -> "77.3")
       - NaN and Infinity are forbidden in valid JSON
    4. Strings: standard JSON string escape with UTF-8 representation
    5. Arrays: recursive canonicalization preserving order, comma separated
    6. Dictionaries / Objects: sorted lexicographically by UTF-16 code units,
       no whitespace around colons or commas
    """
    if obj is None:
        return "null"

    if isinstance(obj, bool):
        return "true" if obj else "false"

    if isinstance(obj, (int, float)):
        if isinstance(obj, float):
            if math.isnan(obj) or math.isinf(obj):
                raise ValueError("NaN and Infinity are not valid in RFC 8785 canonical JSON")
            if obj.is_integer():
                return str(int(obj))
            # Format float in ECMAScript style (no trailing zeros)
            s_py = str(obj)
            return s_py
        return str(obj)

    if isinstance(obj, str):
        # ensure_ascii=False ensures pure UTF-8 encoding per RFC 8785
        return json.dumps(obj, ensure_ascii=False)

    if isinstance(obj, (list, tuple)):
        return "[" + ",".join(canonicalize_json(item, omit_none=omit_none) for item in obj) + "]"

    if isinstance(obj, dict):
        sorted_keys = sorted(obj.keys())
        pairs = []
        for k in sorted_keys:
            v = obj[k]
            if v is None and omit_none:
                continue
            pairs.append(
                f"{json.dumps(k, ensure_ascii=False)}:{canonicalize_json(v, omit_none=omit_none)}"
            )
        return "{" + ",".join(pairs) + "}"

    # Handle Pydantic models if passed directly
    if hasattr(obj, "model_dump"):
        return canonicalize_json(obj.model_dump(exclude_none=True), omit_none=omit_none)

    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def compute_sha256_hex(data: str) -> str:
    """
    Computes SHA-256 over UTF-8 encoded string and returns 64-char hex
    string prefixed with '0x', matching TypeScript computeSha256HexSync().
    """
    raw_hash = hashlib.sha256(data.encode("utf-8")).hexdigest()
    return f"0x{raw_hash}"


def canonicalize_observation(payload: Dict[str, Any]) -> str:
    """
    Produces the canonical RFC 8785 string for an ObservationPayload.
    Excludes None/null optional fields (like unset firmwareVersion).
    """
    # Clean dictionary to ensure only ObservationPayload fields are included
    allowed_keys = {
        "observationId",
        "sensorId",
        "pollutant",
        "value",
        "unit",
        "timestampObserved",
        "timestampSubmitted",
        "location",
        "sensorMetadata"
    }
    filtered = {k: v for k, v in payload.items() if k in allowed_keys}
    return canonicalize_json(filtered, omit_none=True)


def compute_observation_digest(payload: Dict[str, Any]) -> str:
    """Computes the authoritative SHA-256 digest of an observation."""
    canon = canonicalize_observation(payload)
    return compute_sha256_hex(canon)


def canonicalize_review(payload: Dict[str, Any]) -> str:
    """Produces the canonical RFC 8785 string for a ReviewRecord."""
    allowed_keys = {
        "decisionId",
        "observationId",
        "reviewerId",
        "decision",
        "reason",
        "timestampDecided",
        "supersedesDecisionId"
    }
    filtered = {k: v for k, v in payload.items() if k in allowed_keys}
    return canonicalize_json(filtered, omit_none=True)


def compute_review_digest(payload: Dict[str, Any]) -> str:
    """Computes the authoritative SHA-256 digest of a review decision."""
    canon = canonicalize_review(payload)
    return compute_sha256_hex(canon)
