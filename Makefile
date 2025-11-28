.PHONY: help install test run examples clean format lint

help:
	@echo "Risk Assessment Agent - Python"
	@echo ""
	@echo "Available commands:"
	@echo "  make install   - Install dependencies"
	@echo "  make test      - Run tests"
	@echo "  make run       - Start the API server"
	@echo "  make examples  - Run example scripts"
	@echo "  make format    - Format code with black"
	@echo "  make lint      - Lint code with flake8"
	@echo "  make clean     - Remove build artifacts"

install:
	pip install -r requirements.txt

install-dev:
	pip install -r requirements.txt
	pip install pytest pytest-asyncio black flake8 mypy

test:
	python test_risk_assessment.py

run:
	python -m uvicorn risk_assessment_agent.api:app --reload --port 8000

examples:
	python -m risk_assessment_agent.examples

format:
	black risk_assessment_agent/ test_risk_assessment.py

lint:
	flake8 risk_assessment_agent/ --max-line-length=100 --ignore=E203,W503

type-check:
	mypy risk_assessment_agent/ --ignore-missing-imports

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf build/ dist/

build:
	python setup.py sdist bdist_wheel

.DEFAULT_GOAL := help
