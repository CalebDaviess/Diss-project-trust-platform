"""conduct-detection-engine — toxic text/voice conduct-detection package.

Pipeline (see dissertation-vault/04-architecture/ml-module.md):
    generate_dataset -> features -> train -> evaluate, served by app (POST /score).

Detects toxic conduct (chat/voice abuse) as a calibrated 0-100 score. It does NOT
detect cheating — cheating is detected by third-party anti-cheat and ingested by
the platform (see Anti-Cheat-Integration.md).
"""

__version__ = "0.1.0"

