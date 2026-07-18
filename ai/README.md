# Smriti AI Engine

This is a local Python package that handles LLM-based structured extraction from plant documents.

## Directory Structure
* `ai/`: Package module directory.
  * `extractor.py`: Implementation of LLM-based P&ID and shift note parsing.
* `pyproject.toml`: Package installer configuration.

## Getting Started

### Installation
You can install this package in editable mode inside your virtual environment:
```bash
cd backend
# Make sure virtual environment is active
pip install -e ../ai
```

### Usage
```python
from ai import ExtractionEngine

engine = ExtractionEngine(api_key="your-api-key")
result = engine.extract_from_pid(file_bytes)
```
