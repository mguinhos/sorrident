# Diagramas UML

Os desenhos que aparecem no `README.md` e no `docs/projeto.md` são gerados
a partir dos arquivos desta pasta.

## Como gerar

Precisa de Docker (para o PlantUML) e do `.venv` do projeto (para virar PNG):

```bash
cd docs/uml
make all      # gera os SVG e depois os PNG
make svg      # só os SVG
make png      # só os PNG
make clean    # apaga o que foi gerado
```

## O que tem aqui

| pasta ou arquivo | o que é |
|---|---|
| `src/*.plantuml` | os fontes de cada diagrama |
| `src/_estilo.puml` | o estilo de todos: mudar aqui muda em todos |
| `src/_base/` | os fontes originais, de onde os diagramas são recortados |
| `projeto.plantuml` | a visão geral das camadas, sem classes |
| `svg/` e `png/` | as imagens geradas (não edite à mão) |
| `tools/` | os scripts que ajudam a manter os desenhos |

## Os scripts

| script | o que faz |
|---|---|
| `tools/dividir.py` | recorta os diagramas grandes em menores, por pacote |
| `tools/ajustar_layout.py` | aplica o estilo e escolhe a orientação que deixa o desenho mais quadrado |
| `tools/checar_relacoes.py` | lê o código e avisa quando uma seta está errada |
| `tools/render_svg_to_png.py` | transforma os SVG em PNG |

O checador aceita `--corrigir` para arrumar sozinho as setas trocadas:

```bash
python3 tools/checar_relacoes.py            # só avisa
python3 tools/checar_relacoes.py --corrigir # arruma
```

## Por que os diagramas são pequenos

Antes existiam 8 diagramas, e alguns tinham mais de 50 classes. O PlantUML
espalhava tudo na horizontal e a imagem chegava a 32000 pixels de largura,
com as setas se cruzando. Ficava impossível de ler.

Hoje são 12 diagramas menores, com 18 a 24 classes cada, e o maior tem
3566 pixels. As regras que a gente segue:

- um diagrama por assunto, não um diagrama por pacote gigante;
- as classes de outros pacotes entram só com o nome, sem os métodos;
- construtores ficam de fora, porque são a linha mais longa e não dizem
  nada sobre a arquitetura;
- as linhas são em ângulo reto (`linetype ortho`).

## As setas

Seguimos o que o PlantUML define:

| seta | quando usar |
|---|---|
| `<\|--` | uma classe herda de outra, ou uma interface estende outra |
| `<\|..` | uma classe realiza uma interface |
| `*--` | composição: a parte não existe sem o todo |
| `o--` | agregação: a parte existe por conta própria |
| `-->` | uma classe usa a outra |
| `..>` | uma dependência mais fraca |

O `checar_relacoes.py` confere isso lendo o código, então não precisa
decorar: é só rodar antes de commitar.
