import sys
import os

# Add workspace root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from ai.extractor import ExtractionEngine

def test_extractor_initialization():
    engine = ExtractionEngine(api_key="test-key", provider="gemini")
    assert engine.api_key == "test-key"
    assert engine.provider == "gemini"

def test_extract_from_pid_placeholder():
    engine = ExtractionEngine()
    result = engine.extract_from_pid(b"dummy pdf content")
    assert "nodes" in result
    assert "edges" in result

def test_extract_from_shift_notes_placeholder():
    engine = ExtractionEngine()
    result = engine.extract_from_shift_notes("dummy text")
    assert isinstance(result, list)
