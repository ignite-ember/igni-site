igni does not host a model. You run the models on your own GPUs, register them with igni server, and every client uses them through the server. This page covers igni's own models, how to serve them, how a person or a group picks one, the small models igni runs on its own, and what the Factory is.

## igni's models

**igni 1.0** comes in two sizes.

| Model | State | Form |
|---|---|---|
| igni 1.0 4B | Released | One standalone model (bf16 safetensors, about 8.4 GB), and the LoRA adapters it was built from |
| igni 1.0 27B | Not released yet | — |

The 4B is tuned from Qwen3.5-4B with LoRA — supervised fine-tuning, then preference tuning (DPO) — and the adapters are merged into the model, so it needs no adapter at serve time. The adapters are kept separately as well, for anyone who would rather serve the base model with an adapter on top.

igni is not tied to igni's models. Any model served behind an OpenAI-compatible API works.

## Serving a model

igni server sends chat to inference nodes you run — usually vLLM — and leases one node per request. A node is registered with the model ids it answers to:

```json
[
  {"id": "gpu-01", "base_url": "http://gpu-01.internal:8000/v1",
   "model": "igni-1.0-4b", "max_concurrent": 64}
]
```

The id is whatever the node reports — with vLLM, the name you give `--served-model-name`.

**LoRA adapters are separate model ids on one node.** A vLLM node started with `--enable-lora --lora-modules sql=… docs=…` serves its base model and every adapter as its own id, from one GPU and one KV cache. List them all in the node's `models`:

```json
{"id": "gpu-02", "base_url": "http://gpu-02.internal:8000/v1",
 "models": ["igni-1.0-4b", "sql", "docs"]}
```

When an admin adds a node in the portal, the node itself is asked for its ids, so adapter names come from what the operator passed to `--lora-modules`. How nodes are added and chosen between is in [Connecting your GPUs](/docs/inference-backends).

## Choosing a model

igni has no built-in default model. A model is chosen, most specific first:

1. **An agent's own `model:`**, in its markdown front matter, for that agent.
2. **The person's choice:** `/model` in the app, `--model` on the CLI, or `models.default` in `~/.igni/config.yaml`.
3. **The group's `default_model`**, set by an org admin, for a request that names no model — usually a LoRA adapter, such as a legal team pinned to a legal-review adapter. A name no node serves is refused when it is set, with a list of what is served.
4. **The deployment's default:** the first model the chosen node advertises.

After sign-in, the client asks the server for the models it serves (`GET /v1/chat/models`) and registers each one. Only ids come back, never a node's address. Entries you wrote yourself are never overwritten. See [Administering your organisation](/docs/administering-your-organisation) for group defaults.

## The small models igni runs itself

Two kinds of model run outside the nodes you serve, and both run without a network connection.

| Model | Used by | Where it runs |
|---|---|---|
| `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions) | CodeIndex | On each developer's machine, with ONNX Runtime, shipped in the CodeIndex extension |
| `sentence-transformers/all-MiniLM-L6-v2` and the reranker `cross-encoder/ms-marco-MiniLM-L-6-v2` | Artifacts | In the documents service's embedder image, baked in at build time |
| Laya (`convaiinnovations/laya`) | Bypass mode's last check, and `host.decide` for extensions | On each developer's machine, installed with `igni-core[decisions]` |

Both CodeIndex and Artifacts keep their vectors in **Neo4j**: CodeIndex in a local database per project and commit, Artifacts in a database per organisation. See [CodeIndex](/docs/codeindex) and [Running the documents service](/docs/running-the-documents-service).

## The Factory

The Factory is the pipeline that builds igni's models. It generates and validates training data for the work igni's agent does — choosing tools, agents and skills, handing work to CodeIndex, refusing what it should, resisting prompt injection — then trains LoRA adapters with supervised fine-tuning and DPO, and evaluates the result against a fixed set of scenarios. igni 1.0 4B is its first output.

What that means for a deployment today:

- **The Factory runs at Ignite Ember, not in your deployment.** Its outputs — model weights and adapters — are handed over, and you serve them on your own nodes like any other model.
- **Nothing in igni server, the portal or the clients is the Factory.** There is no Factory service, screen or command to deploy.
- **Factory models carry no licence and no expiry.** A model you received keeps working whatever happens to the licence.
- **The Factory is a licensed module**, listed in the licence file with its own expiry and no user band. Nothing enforces it yet. See [Licensing and evaluations](/docs/licensing-and-evaluations).

**Autopilot** is listed in the licence file and requires the Factory in the same licence. It has no code in igni yet.

## Where to go next

- **[Connecting your GPUs](/docs/inference-backends)** — registering nodes, and how a request picks one.
- **[Installing igni](/docs/installing-igni)** — the clients that use these models, and pre-seeding the decision model offline.
