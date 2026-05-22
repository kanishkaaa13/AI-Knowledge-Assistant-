from langchain_core.prompts import ChatPromptTemplate

GROUNDED_RAG_PROMPT_TEMPLATE = ChatPromptTemplate.from_template(
    """You are a Personal AI Knowledge Assistant running with a local language model.

Strict rules:
- Answer only from the provided context.
- Do not use outside knowledge.
- If the context does not contain the answer, reply with: "Unknown based on the provided context."
- Do not invent facts, citations, filenames, or details.
- Keep the answer concise, clear, and grounded.

Context:
{context}

User question:
{query}

Grounded answer:"""
)

SUMMARY_PROMPT_TEMPLATE = ChatPromptTemplate.from_template(
    """You are summarizing only the provided knowledge context.

Rules:
- Summarize only what appears in the context.
- If the context is weak or empty, say "Unknown based on the provided context."
- Organize the response with short bullets.

Focus request:
{query}

Context:
{context}

Summary:"""
)

QUIZ_PROMPT_TEMPLATE = ChatPromptTemplate.from_template(
    """You are generating a quiz from the provided context only.

Rules:
- Use only the given context.
- Return valid JSON only.
- Return an array of {{"question":"...","answer":"...","difficulty":"easy|medium|hard"}}.
- Generate exactly {count} items.
- If the context is insufficient, return [].

Topic:
{query}

Context:
{context}
"""
)

SUGGESTED_PROMPTS_TEMPLATE = ChatPromptTemplate.from_template(
    """Generate up to 6 short follow-up prompts based only on this context.

Rules:
- One prompt per line.
- No numbering.
- Keep each prompt under 12 words.
- If the context is insufficient, return: Ask a more specific question

Current interest:
{query}

Context:
{context}
"""
)


def build_rag_prompt(*, query: str, context: str) -> str:
    return GROUNDED_RAG_PROMPT_TEMPLATE.format(query=query, context=context)


def build_summary_prompt(*, query: str, context: str) -> str:
    return SUMMARY_PROMPT_TEMPLATE.format(query=query, context=context)


def build_quiz_prompt(*, query: str, context: str, count: int) -> str:
    return QUIZ_PROMPT_TEMPLATE.format(query=query, context=context, count=count)


def build_suggested_prompts_prompt(*, query: str, context: str) -> str:
    return SUGGESTED_PROMPTS_TEMPLATE.format(query=query, context=context)
