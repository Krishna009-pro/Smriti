# Smriti Datasets

This directory contains sample files and cached LLM extraction JSON outputs to demonstrate and run the **Smriti – Industrial Memory OS** pipeline.

## Contents
* `sample_pid.pdf`: A mock P&ID document used as a target for extraction pipelines.
* `sample_shift_notes.txt`: Structured/unstructured shift operator log describing an incident, action, and outcome.
* `cached_extractions/`: Contains pre-baked extraction outputs that can be loaded as fallback data if the hosted LLM API is unavailable or has network latency during live demonstrations.
  * `pid_extraction.json`: Pre-extracted equipment nodes and connects_to edges.
  * `shift_notes_extraction.json`: Pre-extracted has_known_fix experiential edges.
