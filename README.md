# Jupyter Web Server

A shared, read-only Jupyter Notebook browser. It serves the notebook UI and proxies content from a public subject repository, so subject files stay in their own repo.

## Run locally

```sh
npm run dev
```

Open `http://localhost:8000/tree`. The server reads the host-to-repository map in `content-sources.json`. Local requests use the default source.

## Content sources

`content-sources.json` maps hostnames to GitHub owner, repository, branch, and content root. The `cl1.ruchir.dev` host currently reads the `CL1/` folder from `ruxir-ig/cl1`. To add CL2 later, add a `cl2.ruchir.dev` entry that reads the `CL2/` folder from `ruxir-ig/cl2`, push that repo, and attach the host to this Vercel project.

Each content root must contain a `manifest.json` with paths relative to that root. Generate it with that content repo's manifest script.

The viewer displays saved notebook cells and outputs. It does not execute code.
