from langchain_core.prompts import ChatPromptTemplate

GROUNDED_RAG_PROMPT_TEMPLATE = ChatPromptTemplate.from_template(
    """You are a helpful AI knowledge assistant powered by local AI.

  Use the following document context to answer the user's question.
  Be specific and reference the document content in your answer.
  If the context is partially relevant, use what you can and supplement with general knowledge.
  Only say you cannot find information if the context is completely unrelated to the question.

  DOCUMENT CONTEXT:
  {context}

  USER QUESTION: {query}

  ANSWER:"""
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
- Return an array of objects with this exact structure: {{"question":"...","options":["A","B","C","D"],"correct_answer":"A"}}.
- Generate exactly {count} items.
- If the context is insufficient, return [].

Topic:
{query}

Context:
{context}

Respond with valid JSON array only:"""
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
