"""
Shim: load ml-service/app.py as module `app` so space_app can `import app as ml_app`.
Sets FASHION_ML_ROOT to this directory (hf-space) for static assets (PNG/JSON).
"""
from __future__ import annotations

import importlib.util
import os
import sys

_HFSPACE = os.path.dirname(os.path.abspath(__file__))
_MLSERVICE = os.path.abspath(os.path.join(_HFSPACE, "..", "ml-service"))
os.environ.setdefault("FASHION_ML_ROOT", _HFSPACE)

_spec = importlib.util.spec_from_file_location("app", os.path.join(_MLSERVICE, "app.py"))
_app = importlib.util.module_from_spec(_spec)
sys.modules["app"] = _app
assert _spec.loader is not None
_spec.loader.exec_module(_app)
