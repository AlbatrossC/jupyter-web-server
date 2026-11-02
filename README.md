# Jupyter Web Server

A shared, read-only browser for the Information Retrieval (IR) and Bioinformatics (BIF) exercise answers and datasets stored in this repository.

## Run locally

```sh
npm run dev
```

Open `http://localhost:8000/tree`. The file browser lists content from `content/IR/` and `content/BIF/`. Python answer files and datasets are served from those folders directly; no external repository is required.

The viewer displays saved files and notebook outputs. It does not execute code.
