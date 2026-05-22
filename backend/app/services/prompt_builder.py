from langchain_core.prompts import ChatPromptTemplate

RAG_PROMPT_TEMPLATE = ChatPromptTemplate.from_template(
    """You are a Personal AI Knowledge Assistant.

Use only the provided context to answer the user's question. If the answer is not in the context, say that the current knowledge base does not contain enough information and suggest what document or detail would help.

Context:
{context}

User question:
{query}

Answer in a concise but helpful way. Cite the relevant document titles inline when useful."""
)


def build_rag_prompt(*, query: str, context: str) -> str:
    return RAG_PROMPT_TEMPLATE.format(query=query, context=context)
