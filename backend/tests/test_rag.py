"""Base de conhecimento: chunking, recuperação e serviço."""
from __future__ import annotations

import pytest

from sorridente.container import ApplicationContainer
from sorridente.core.models import KnowledgeDocument
from sorridente.rag import (
    BM25Retriever,
    HybridRetriever,
    InMemoryVectorStore,
    ParagraphChunker,
    TfIdfEmbedder,
    VectorRetriever,
)
from sorridente.rag.text import normalize, stem, tokenize



DOCUMENTOS = [
    KnowledgeDocument(
        id="d1",
        title="Cuidados com o aparelho fixo",
        content=(
            "Escove os dentes após todas as refeições com escova ortodôntica.\n\n"
            "Evite alimentos duros como gelo e castanhas, e pegajosos como caramelo."
        ),
    ),
    KnowledgeDocument(
        id="d2",
        title="Política de faltas",
        content="Remarcações são gratuitas com 24 horas de antecedência. Faltas sem aviso podem ser cobradas.",
    ),
    KnowledgeDocument(
        id="d3",
        title="Contenção após o tratamento",
        content="Sem contenção os dentes voltam à posição original, o que chamamos de recidiva.",
    ),
]


def test_normalizacao_e_tokenizacao() -> None:
    assert normalize("Manutenção Ortodôntica") == "manutencao ortodontica"
    tokens = tokenize("Quais são os cuidados com o aparelho fixo?")
    assert stem("cuidado") in tokens and stem("aparelhos") in tokens
    assert "os" not in tokens  # stopword removida


def test_radicalizacao_aproxima_familias_de_palavras() -> None:
    assert stem("remarcar") == stem("remarcações".replace("ç", "c").replace("õ", "o"))
    assert stem("estacionar") == stem("estacionamento")
    assert stem("consulta") == stem("consultas")
    # não encurta demais palavras curtas
    assert stem("dor") == "dor"


def test_chunker_divide_por_paragrafo() -> None:
    chunks = ParagraphChunker(max_chars=120, min_chars=20).split(DOCUMENTOS[0])
    assert len(chunks) >= 2
    assert all(c.document_id == "d1" for c in chunks)
    assert all(c.title == "Cuidados com o aparelho fixo" for c in chunks)


async def test_recuperacao_vetorial_encontra_documento_certo() -> None:
    retriever = VectorRetriever(ParagraphChunker(), TfIdfEmbedder(), InMemoryVectorStore())
    assert await retriever.reindex(DOCUMENTOS) > 0

    resultados = await retriever.retrieve("posso comer castanha com aparelho?", limit=2)
    assert resultados and resultados[0].chunk.document_id == "d1"


async def test_bm25_encontra_termo_exato() -> None:
    retriever = BM25Retriever(ParagraphChunker())
    await retriever.reindex(DOCUMENTOS)
    resultados = await retriever.retrieve("recidiva", limit=1)
    assert resultados and resultados[0].chunk.document_id == "d3"


async def test_hibrido_combina_os_dois() -> None:
    hibrido = HybridRetriever(
        [
            VectorRetriever(ParagraphChunker(), TfIdfEmbedder(), InMemoryVectorStore()),
            BM25Retriever(ParagraphChunker()),
        ]
    )
    await hibrido.reindex(DOCUMENTOS)
    resultados = await hibrido.retrieve("preciso remarcar minha consulta", limit=2)
    assert resultados[0].chunk.document_id == "d2"


async def test_indice_vazio_nao_quebra() -> None:
    retriever = VectorRetriever(ParagraphChunker(), TfIdfEmbedder(), InMemoryVectorStore())
    assert await retriever.reindex([]) == 0
    assert await retriever.retrieve("qualquer coisa") == []


async def test_servico_indexa_faqs_e_procedimentos(container: ApplicationContainer) -> None:
    fontes = await container.knowledge_service.sources()
    origens = {d.source for d in fontes}
    assert {"manual", "faq", "procedimento", "clinica"} <= origens
    assert container.knowledge_service.indexed_chunks > 0


async def test_busca_responde_sobre_convenio(container: ApplicationContainer) -> None:
    contexto = await container.knowledge_service.answer_context("vocês aceitam convênio?")
    assert contexto["encontrado"] is True
    texto = " ".join(t["conteudo"].lower() for t in contexto["trechos"])
    assert "dental" in texto or "convênio" in texto


async def test_documento_novo_entra_no_indice(container: ApplicationContainer) -> None:
    await container.knowledge_service.create(
        "Estacionamento",
        "A clínica tem convênio com o estacionamento do prédio ao lado, com 2 horas gratuitas.",
        ["estacionamento", "carro"],
    )
    contexto = await container.knowledge_service.answer_context("onde posso estacionar o carro?")
    assert contexto["encontrado"] is True
    assert any("estacionamento" in t["conteudo"].lower() for t in contexto["trechos"])
