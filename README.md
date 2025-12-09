# Bucket Bot

A project to track rankings for UK Malifaux in-person competitive play.

## Aims

- provide a simple no-frills interface for TOs to enter results
- automatically maintain rankings data using the UK Malifaux discord

The hope is that using Discord

1. means we don't have to build a website
2. helps consolidate the community a bit

## Vague Plan

```
+-------------------+   +---------------------+   +-------------------+
| Discord Server   |<-->| Lambda (FastAPI)   |<-->| DynamoDB Table   |
| (Bot messages)   |   | (Python API)       |   | (Data storage)   |
+-------------------+   +---------------------+   +-------------------+
	^
	|
	v
+----------------------+
| Frontend (React)     |
| Vite + S3 Bucket     |
+----------------------+
```
