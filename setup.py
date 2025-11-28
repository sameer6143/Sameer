"""
Setup script for Risk Assessment Agent
"""

from setuptools import setup, find_packages

with open("README_PYTHON.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="risk-assessment-agent",
    version="1.0.0",
    author="Risk Assessment Team",
    author_email="team@example.com",
    description="A comprehensive risk assessment system for e-commerce transactions",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/risk-assessment-agent",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "License :: Other/Proprietary License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-asyncio>=0.21.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
            "mypy>=1.6.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "risk-assessment-api=risk_assessment_agent.api:main",
        ],
    },
)
